// ═══════════════════════════════════════════════════════════════════════
//  DIRECTIVES: each, foreach
// ═══════════════════════════════════════════════════════════════════════

import { createContext, createLightContext, _collectKeys } from "../context.js";
import { _watchExpr, _factories } from "../globals.js";
import { evaluate, resolve, _evalFast, _parseAndCache } from "../evaluate.js";
import { findContext, _cloneTemplate } from "../dom.js";
import { registerDirective, processTree, _disposeChildren, _compileTemplate, processTreeFromDescriptor } from "../registry.js";
import { _animateOut } from "../animations.js";

// Task 2.1: O(n log n) Longest Increasing Subsequence algorithm.
// Returns indices of `arr` that form the LIS.  Used to minimise DOM moves
// during keyed reconciliation — nodes whose old positions form an increasing
// subsequence are already in order and do NOT need insertBefore().
// Reference: Vue 3's `getSequence()` implementation.
function getSequence(arr) {
  const len = arr.length;
  // `result` holds indices into `arr` whose values form the current best LIS.
  const result = [0];
  // `predecessors[i]` stores the index that comes before arr[i] in the LIS.
  const predecessors = new Array(len);

  for (let i = 1; i < len; i++) {
    const val = arr[i];
    // -1 means "new item, has no old position" — always needs a move.
    if (val === -1) continue;

    const lastIdx = result[result.length - 1];
    // If val extends the current LIS, append it.
    if (arr[lastIdx] < val) {
      predecessors[i] = lastIdx;
      result.push(i);
      continue;
    }

    // Binary search for the first element in result >= val.
    let lo = 0, hi = result.length - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (arr[result[mid]] < val) lo = mid + 1;
      else hi = mid;
    }

    if (val < arr[result[lo]]) {
      if (lo > 0) predecessors[i] = result[lo - 1];
      result[lo] = i;
    }
  }

  // Back-trace to build the actual LIS index list.
  let length = result.length;
  let idx = result[length - 1];
  while (length-- > 0) {
    result[length] = idx;
    idx = predecessors[idx];
  }
  return result;
}

// Task 2.1 + 2.2: LIS-based DOM reorder using a JS childOrder array.
// Builds an oldPositions[] array mapping new indices to their current position
// in childOrder, computes LIS to identify nodes already in order, and only
// moves the rest via insertBefore.  Updates childOrder in place.
// `newNodes` is the desired node order (array of DOM nodes).
// `childOrder` is the current JS position array (mutated in place).
// `el` is the parent element.
function _reorderWithLIS(el, newNodes, childOrder) {
  const count = newNodes.length;

  // Build a reverse lookup: node → current position in childOrder
  const posMap = new Map();
  for (let i = 0; i < childOrder.length; i++) posMap.set(childOrder[i], i);

  // Build oldPositions: for each new index, what was its old position?
  // -1 means "newly inserted, not in old order".
  const oldPositions = new Array(count);
  for (let i = 0; i < count; i++) {
    const pos = posMap.get(newNodes[i]);
    oldPositions[i] = pos !== undefined ? pos : -1;
  }

  // Quick check: already in order?
  let inOrder = childOrder.length === count;
  if (inOrder) {
    for (let i = 0; i < count; i++) {
      if (childOrder[i] !== newNodes[i]) { inOrder = false; break; }
    }
  }
  if (inOrder) return;

  // Compute LIS of oldPositions (ignoring -1 entries, handled inside getSequence)
  const lisIndices = getSequence(oldPositions);
  const lisSet = new Set(lisIndices);

  // Move nodes not in the LIS.  Iterate backwards so that each insertBefore
  // anchors on a node whose position is already finalised.
  for (let i = count - 1; i >= 0; i--) {
    if (lisSet.has(i)) continue;
    const node = newNodes[i];
    const anchor = i + 1 < count ? newNodes[i + 1] : null;
    el.insertBefore(node, anchor);
  }

  // Sync childOrder to the new desired order
  childOrder.length = count;
  for (let i = 0; i < count; i++) childOrder[i] = newNodes[i];
}

// Creates the item node for a loop iteration.
// Single-root templates: attaches __ctx directly to the root element (no wrapper div).
// Multi-root templates: wraps in a div[display:contents] to host __ctx.
function _makeLoopItem(source, childCtx, animEnter, stagger, i) {
  const isFragment = source.nodeType === 11; // Node.DOCUMENT_FRAGMENT_NODE
  let node, animTarget;

  if (isFragment) {
    const roots = source.children;
    if (roots.length === 1) {
      node = roots[0];
      node.__ctx = childCtx;
      animTarget = node;
    } else {
      node = document.createElement("div");
      node.style.display = "contents";
      node.__ctx = childCtx;
      node.appendChild(source);
      animTarget = node.firstElementChild || node;
    }
  } else {
    node = source;
    node.__ctx = childCtx;
    animTarget = node;
  }

  function applyAnim() {
    if (!animEnter) return;
    animTarget.classList.add(animEnter);
    animTarget.addEventListener(
      "animationend",
      () => animTarget.classList.remove(animEnter),
      { once: true },
    );
    if (stagger) animTarget.style.animationDelay = i * stagger + "ms";
  }

  return { node, applyAnim };
}

// Evaluate a key expression against a lightweight scope derived from the
// parent context, without creating a full Proxy context.  This avoids the
// overhead of createContext() + Proxy for every item during reconciliation.
function _evalKeyFast(keyAst, parentCtx, itemName, item, indexName, index) {
  const { keys, vals } = _collectKeys(parentCtx);
  const scope = {};
  for (let i = 0; i < keys.length; i++) scope[keys[i]] = vals[keys[i]];
  scope[itemName] = item;
  scope[indexName || "$index"] = index;
  return _evalFast(keyAst, scope);
}

registerDirective("each", {
  priority: 10,
  init(el, name, expr) {
    const ctx = findContext(el);
    const match = expr.match(/^(\w+)\s+in\s+(\S+)$/);
    if (!match) return;
    const [, itemName, listPath] = match;
    const tplId = el.getAttribute("template");
    const elseTpl = el.getAttribute("else");
    const keyExpr = el.getAttribute("key");
    const animEnter =
      el.getAttribute("animate-enter") || el.getAttribute("animate");
    const animLeave = el.getAttribute("animate-leave");
    const stagger = parseInt(el.getAttribute("animate-stagger")) || 0;
    const animDuration = parseInt(el.getAttribute("animate-duration")) || 0;
    let prevList = null;
    // key → item node (root element or wrapper div for multi-root templates).
    const keyMap = new Map();
    // Pre-parse the key expression AST once for fast evaluation
    const keyAst = keyExpr ? _parseAndCache(keyExpr) : null;
    // Task 2.2: JS position array — avoids live HTMLCollection reads.
    const childOrder = [];
    // Task 4.2: cached template descriptor for pre-compiled directives.
    let _tplDescriptor = null;
    let _tplDescriptorSource = null;

    function _getDescriptor(tpl) {
      if (_tplDescriptorSource === tpl && _tplDescriptor !== null) return _tplDescriptor;
      _tplDescriptorSource = tpl;
      _tplDescriptor = _compileTemplate(tpl);
      return _tplDescriptor;
    }

    function update() {
      let list = /[\[\]()\s+\-*\/!?:&|]/.test(listPath)
        ? evaluate(listPath, ctx)
        : resolve(listPath, ctx);
      if (!Array.isArray(list)) return;

      // Same-reference optimisation: propagate to children without DOM rebuild.
      // Task 2.2: use childOrder instead of el.children for the length check.
      if (list === prevList && list.length > 0 && childOrder.length > 0) {
        for (let ci = 0; ci < childOrder.length; ci++) {
          const child = childOrder[ci];
          if (child.__ctx && child.__ctx.$notify) child.__ctx.$notify();
        }
        return;
      }
      prevList = list;

      // Empty state
      if (list.length === 0 && elseTpl) {
        const clone = _cloneTemplate(elseTpl);
        if (clone) {
          _disposeChildren(el);
          keyMap.clear();
          childOrder.length = 0; // Task 2.2: sync on clear
          el.innerHTML = "";
          el.appendChild(clone);
          processTree(el);
        }
        return;
      }

      const tpl = tplId ? document.getElementById(tplId) : null;
      if (!tpl) return;

      // Animate out old items if animate-leave is set
      if (animLeave && childOrder.length > 0) {
        const oldItems = [...childOrder];
        let remaining = oldItems.length;
        oldItems.forEach((child) => {
          const target = child.firstElementChild || child;
          target.classList.add(animLeave);
          const done = () => {
            target.classList.remove(animLeave);
            remaining--;
            if (remaining <= 0) renderItems(tpl, list);
          };
          target.addEventListener("animationend", done, { once: true });
          // || 0: unblocks the next render on the next tick when no CSS animation fires.
          setTimeout(done, animDuration || 0);
        });
      } else {
        renderItems(tpl, list);
      }
    }

    function renderItems(tpl, list) {
      if (keyExpr) {
        reconcileItems(tpl, list);
      } else {
        rebuildItems(tpl, list);
      }
    }

    // Key-based reconciliation: reuses existing wrapper divs for items whose
    // key is still present in the new list, only creating/removing DOM nodes
    // for items that genuinely appeared or disappeared.
    function reconcileItems(tpl, list) {
      const count = list.length;

      // Evaluate keys using lightweight scope (no Proxy creation per item)
      // Task 1.5: reuse cached key when item reference is unchanged.
      const newOrder = new Array(count);
      for (let i = 0; i < count; i++) {
        const item = list[i];
        let key;
        // Check if an existing node for this item already has a cached key
        // Only reuse when the item object reference is identical.
        let cachedNode = null;
        for (const [, node] of keyMap) {
          if (node.__ctx && node.__ctx.__raw[itemName] === item && node.__key !== undefined) {
            cachedNode = node;
            break;
          }
        }
        if (cachedNode) {
          key = cachedNode.__key;
        } else {
          key = _evalKeyFast(keyAst, ctx, itemName, item, "$index", i);
        }
        newOrder[i] = { key, item, i };
      }

      // Build set of keys present in the new list
      const nextKeySet = new Set();
      for (let i = 0; i < count; i++) nextKeySet.add(newOrder[i].key);

      // Detect whether this is a same-keys reconciliation (reorder / update only)
      const sameSize = nextKeySet.size === keyMap.size;
      let allKeysMatch = sameSize;
      if (sameSize) {
        for (const key of nextKeySet) {
          if (!keyMap.has(key)) { allKeysMatch = false; break; }
        }
      }

      // Task 1.4: Single-removal fast path — when exactly one item was removed,
      // find it, dispose+remove its DOM, delete from keyMap, update $index on
      // subsequent items, and skip full reconciliation.
      if (!allKeysMatch && nextKeySet.size === keyMap.size - 1) {
        let missingKey = null;
        for (const key of keyMap.keys()) {
          if (!nextKeySet.has(key)) {
            if (missingKey !== null) { missingKey = null; break; } // more than 1 missing — bail
            missingKey = key;
          }
        }
        if (missingKey !== null) {
          const wrapper = keyMap.get(missingKey);
          // Task 2.2: remove from childOrder
          const rmIdx = childOrder.indexOf(wrapper);
          if (rmIdx !== -1) childOrder.splice(rmIdx, 1);
          _disposeChildren(wrapper);
          wrapper.remove();
          keyMap.delete(missingKey);

          // Update $index and positional metadata on surviving items
          for (let idx = 0; idx < count; idx++) {
            const { key, item, i } = newOrder[idx];
            const node = keyMap.get(key);
            if (node) {
              node.__key = key; // Task 1.5: refresh cached key
              const raw = node.__ctx.__raw;
              const itemChanged = raw[itemName] !== item;
              const indexChanged = raw.$index !== i;
              if (itemChanged || indexChanged) {
                const childData = {
                  [itemName]: item,
                  $index: i,
                  $count: count,
                  $first: i === 0,
                  $last: i === count - 1,
                  $even: i % 2 === 0,
                  $odd: i % 2 !== 0,
                };
                Object.assign(raw, childData);
                node.__ctx.$notify();
              }
            }
          }

          // Task 2.1 + 2.2: LIS-based reorder using childOrder
          const desiredNodes = new Array(count);
          for (let i = 0; i < count; i++) desiredNodes[i] = keyMap.get(newOrder[i].key);
          _reorderWithLIS(el, desiredNodes, childOrder);
          return;
        }
      }

      // Remove wrappers whose keys are no longer in the list.
      if (!allKeysMatch) {
        for (const [key, wrapper] of keyMap) {
          if (!nextKeySet.has(key)) {
            // Task 2.2: remove from childOrder
            const rmIdx = childOrder.indexOf(wrapper);
            if (rmIdx !== -1) childOrder.splice(rmIdx, 1);
            _disposeChildren(wrapper);
            wrapper.remove();
            keyMap.delete(key);
          }
        }
      }

      // Create new wrappers and update existing ones.
      // When all keys match (swap / partial update), we can be smarter:
      // only notify items whose data actually changed.
      for (let idx = 0; idx < count; idx++) {
        const { key, item, i } = newOrder[idx];
        const childData = {
          [itemName]: item,
          $index: i,
          $count: count,
          $first: i === 0,
          $last: i === count - 1,
          $even: i % 2 === 0,
          $odd: i % 2 !== 0,
        };

        if (!keyMap.has(key)) {
          const clone = tpl.content.cloneNode(true);
          const childCtx = createLightContext(childData, ctx);
          const { node, applyAnim } = _makeLoopItem(clone, childCtx, animEnter, stagger, i);
          node.__key = key; // Task 1.5: cache key on the node
          keyMap.set(key, node);
          el.appendChild(node); // placed at end; reordered below
          childOrder.push(node); // Task 2.2: track in childOrder
          // Task 2.5: use factory when available (Level 4 integration)
          const factory = tplId && _factories[tplId];
          if (factory) {
            factory(node, childCtx, _watchExpr);
          } else {
            // Task 4.2: use pre-compiled descriptor when available
            processTreeFromDescriptor(node, _getDescriptor(tpl));
          }
          applyAnim();
        } else {
          const wrapper = keyMap.get(key);
          wrapper.__key = key; // Task 1.5: refresh cached key
          const raw = wrapper.__ctx.__raw;
          // Check if the item data or positional metadata actually changed
          // before firing a potentially expensive notify to all watchers.
          const itemChanged = raw[itemName] !== item;
          const indexChanged = raw.$index !== i;
          if (itemChanged || indexChanged) {
            Object.assign(raw, childData);
            wrapper.__ctx.$notify();
          }
        }
      }

      // Task 2.1 + 2.2: LIS-based reorder using childOrder
      const desiredNodes = new Array(count);
      for (let i = 0; i < count; i++) desiredNodes[i] = keyMap.get(newOrder[i].key);
      _reorderWithLIS(el, desiredNodes, childOrder);
    }

    // Full rebuild: dispose all children and recreate from scratch.
    // Used when no `key` attribute is set (backward-compatible behaviour).
    function rebuildItems(tpl, list) {
      const count = list.length;
      _disposeChildren(el);
      el.innerHTML = "";
      childOrder.length = 0; // Task 2.2: sync on clear

      // Use a DocumentFragment to batch DOM insertions and avoid
      // triggering layout recalculations for each individual append.
      const frag = document.createDocumentFragment();

      for (let i = 0; i < count; i++) {
        const item = list[i];
        const childData = {
          [itemName]: item,
          $index: i,
          $count: count,
          $first: i === 0,
          $last: i === count - 1,
          $even: i % 2 === 0,
          $odd: i % 2 !== 0,
        };
        const clone = tpl.content.cloneNode(true);
        const { node, applyAnim } = _makeLoopItem(clone, createLightContext(childData, ctx), animEnter, stagger, i);
        frag.appendChild(node);
        node.__applyAnim = applyAnim; // Phase 6: stash on node to avoid separate array
        childOrder.push(node); // Task 2.2: track in childOrder
      }

      el.appendChild(frag);

      // Process trees after all nodes are in the DOM to allow findContext
      // and other DOM-dependent lookups to work correctly.
      // Task 2.5: use factory when available (Level 4 integration)
      const factory = tplId && _factories[tplId];
      if (factory) {
        for (let i = 0; i < childOrder.length; i++) {
          const node = childOrder[i];
          factory(node, node.__ctx, _watchExpr);
          node.__applyAnim();
          node.__applyAnim = undefined;
        }
      } else {
        // Phase 6: iterate childOrder directly — no pendingNodes[] allocation.
        // Task 4.2: use pre-compiled descriptor when available
        const desc = _getDescriptor(tpl);
        for (let i = 0; i < childOrder.length; i++) {
          const node = childOrder[i];
          processTreeFromDescriptor(node, desc);
          node.__applyAnim();
          node.__applyAnim = undefined;
        }
      }
    }

    _watchExpr(expr, ctx, update);
    update();
  },
});

registerDirective("foreach", {
  priority: 10,
  init(el, name, itemName) {
    const ctx = findContext(el);
    const fromPath = el.getAttribute("from");
    const indexName = el.getAttribute("index") || "$index";
    const elseTpl = el.getAttribute("else");
    const filterExpr = el.getAttribute("filter");
    const sortProp = el.getAttribute("sort");
    const limit = parseInt(el.getAttribute("limit")) || Infinity;
    const offset = parseInt(el.getAttribute("offset")) || 0;
    const tplId = el.getAttribute("template");
    const keyExpr = el.getAttribute("key");
    const animEnter = el.getAttribute("animate-enter") || el.getAttribute("animate");
    const animLeave = el.getAttribute("animate-leave");
    const stagger = parseInt(el.getAttribute("animate-stagger")) || 0;
    const animDuration = parseInt(el.getAttribute("animate-duration")) || 0;

    if (!fromPath || !itemName) return;

    const templateContent = tplId
      ? null // Will use external template
      : el.cloneNode(true); // Use the element itself as template

    // Prevent infinite recursion: strip directive attributes from inline template clone
    if (templateContent) {
      templateContent.removeAttribute("foreach");
      templateContent.removeAttribute("from");
      templateContent.removeAttribute("index");
      templateContent.removeAttribute("filter");
      templateContent.removeAttribute("sort");
      templateContent.removeAttribute("limit");
      templateContent.removeAttribute("offset");
      templateContent.removeAttribute("else");
      templateContent.removeAttribute("template");
      templateContent.removeAttribute("key");
      templateContent.removeAttribute("animate-enter");
      templateContent.removeAttribute("animate");
      templateContent.removeAttribute("animate-leave");
      templateContent.removeAttribute("animate-stagger");
      templateContent.removeAttribute("animate-duration");
    }

    // key → item node (root element or wrapper div for multi-root templates).
    const keyMap = new Map();
    // Pre-parse the key expression AST once for fast evaluation
    const keyAst = keyExpr ? _parseAndCache(keyExpr) : null;
    // Task 2.2: JS position array — avoids live HTMLCollection reads.
    const childOrder = [];
    // Task 4.2: cached template descriptor for pre-compiled directives.
    let _tplDescriptor = null;
    let _tplDescriptorSource = null;

    function _getDescriptor(source) {
      if (_tplDescriptorSource === source && _tplDescriptor !== null) return _tplDescriptor;
      _tplDescriptorSource = source;
      _tplDescriptor = _compileTemplate(source);
      return _tplDescriptor;
    }

    function update() {
      let list = resolve(fromPath, ctx);
      if (!Array.isArray(list)) return;

      // Filter
      if (filterExpr) {
        list = list.filter((item, i) => {
          const tempCtx = createLightContext(
            { [itemName]: item, [indexName]: i },
            ctx,
          );
          return !!evaluate(filterExpr, tempCtx);
        });
      }

      // Sort
      if (sortProp) {
        const desc = sortProp.startsWith("-");
        const key = desc ? sortProp.slice(1) : sortProp;
        list = [...list].sort((a, b) => {
          const va = resolve(key, a) ?? a?.[key];
          const vb = resolve(key, b) ?? b?.[key];
          const r = va < vb ? -1 : va > vb ? 1 : 0;
          return desc ? -r : r;
        });
      }

      // Offset and limit
      list = list.slice(offset, offset + limit);

      // Empty
      if (list.length === 0 && elseTpl) {
        const clone = _cloneTemplate(elseTpl);
        if (clone) {
          _disposeChildren(el);
          keyMap.clear();
          childOrder.length = 0; // Task 2.2: sync on clear
          el.innerHTML = "";
          el.appendChild(clone);
          processTree(el);
        }
        return;
      }

      const tpl = tplId ? document.getElementById(tplId) : null;
      const count = list.length;

      if (keyExpr) {
        reconcileForeachItems(tpl, list, count);
        return;
      }

      function renderForeachItems() {
        _disposeChildren(el);
        el.innerHTML = "";
        childOrder.length = 0; // Task 2.2: sync on clear

        // Use a DocumentFragment to batch DOM insertions
        const frag = document.createDocumentFragment();

        for (let i = 0; i < count; i++) {
          const item = list[i];
          const childData = {
            [itemName]: item,
            [indexName]: i,
            $index: i,
            $count: count,
            $first: i === 0,
            $last: i === count - 1,
            $even: i % 2 === 0,
            $odd: i % 2 !== 0,
          };
          const clone = tpl ? tpl.content.cloneNode(true) : templateContent.cloneNode(true);
          const { node, applyAnim } = _makeLoopItem(clone, createLightContext(childData, ctx), animEnter, stagger, i);
          frag.appendChild(node);
          node.__applyAnim = applyAnim; // Phase 6: stash on node to avoid separate array
          childOrder.push(node); // Task 2.2: track in childOrder
        }

        el.appendChild(frag);

        // Task 2.5: use factory when available (Level 4 integration)
        const factory = tplId && _factories[tplId];
        if (factory) {
          for (let i = 0; i < childOrder.length; i++) {
            const node = childOrder[i];
            factory(node, node.__ctx, _watchExpr);
            node.__applyAnim();
            node.__applyAnim = undefined;
          }
        } else {
          // Phase 6: iterate childOrder directly — no pendingNodes[] allocation.
          // Task 4.2: use pre-compiled descriptor when available
          const descSource = tpl || templateContent;
          const desc = _getDescriptor(descSource);
          for (let i = 0; i < childOrder.length; i++) {
            const node = childOrder[i];
            processTreeFromDescriptor(node, desc);
            node.__applyAnim();
            node.__applyAnim = undefined;
          }
        }
      }

      // Animate out old items if animate-leave is set
      if (animLeave && childOrder.length > 0) {
        const oldItems = [...childOrder];
        let remaining = oldItems.length;
        oldItems.forEach((child) => {
          const target = child.firstElementChild || child;
          target.classList.add(animLeave);
          const done = () => {
            target.classList.remove(animLeave);
            remaining--;
            if (remaining <= 0) renderForeachItems();
          };
          target.addEventListener("animationend", done, { once: true });
          // || 0: unblocks the next render on the next tick when no CSS animation fires.
          setTimeout(done, animDuration || 0);
        });
      } else {
        renderForeachItems();
      }
    }

    // Key-based reconciliation for foreach — mirrors each's reconcileItems.
    // Applied to the final (filtered, sorted, sliced) list so keys always
    // correspond to what is actually rendered.
    function reconcileForeachItems(tpl, list, count) {
      // On first render the element may still hold its original inline template
      // markup (the same content that was captured into templateContent).
      // Clear it so only managed wrappers appear as children.
      if (keyMap.size === 0) {
        el.innerHTML = "";
        childOrder.length = 0; // Task 2.2: sync on clear
      }

      // Evaluate keys using lightweight scope (no Proxy creation per item)
      // Task 1.5: reuse cached key when item reference is unchanged.
      const newOrder = new Array(count);
      for (let i = 0; i < count; i++) {
        const item = list[i];
        let key;
        let cachedNode = null;
        for (const [, node] of keyMap) {
          if (node.__ctx && node.__ctx.__raw[itemName] === item && node.__key !== undefined) {
            cachedNode = node;
            break;
          }
        }
        if (cachedNode) {
          key = cachedNode.__key;
        } else {
          key = _evalKeyFast(keyAst, ctx, itemName, item, indexName, i);
        }
        newOrder[i] = { key, item, i };
      }

      // Build set of keys present in the new list
      const nextKeySet = new Set();
      for (let i = 0; i < count; i++) nextKeySet.add(newOrder[i].key);

      // Detect whether this is a same-keys reconciliation
      const sameSize = nextKeySet.size === keyMap.size;
      let allKeysMatch = sameSize;
      if (sameSize) {
        for (const key of nextKeySet) {
          if (!keyMap.has(key)) { allKeysMatch = false; break; }
        }
      }

      // Task 1.4: Single-removal fast path — when exactly one item was removed,
      // find it, dispose+remove its DOM, delete from keyMap, update metadata on
      // surviving items, and skip full reconciliation.
      if (!allKeysMatch && nextKeySet.size === keyMap.size - 1) {
        let missingKey = null;
        for (const key of keyMap.keys()) {
          if (!nextKeySet.has(key)) {
            if (missingKey !== null) { missingKey = null; break; }
            missingKey = key;
          }
        }
        if (missingKey !== null) {
          const wrapper = keyMap.get(missingKey);
          // Task 2.2: remove from childOrder
          const rmIdx = childOrder.indexOf(wrapper);
          if (rmIdx !== -1) childOrder.splice(rmIdx, 1);
          _disposeChildren(wrapper);
          wrapper.remove();
          keyMap.delete(missingKey);

          // Update $index and positional metadata on surviving items
          for (let idx = 0; idx < count; idx++) {
            const { key, item, i } = newOrder[idx];
            const node = keyMap.get(key);
            if (node) {
              node.__key = key; // Task 1.5: refresh cached key
              const raw = node.__ctx.__raw;
              const itemChanged = raw[itemName] !== item;
              const indexChanged = raw.$index !== i;
              if (itemChanged || indexChanged) {
                const childData = {
                  [itemName]: item,
                  [indexName]: i,
                  $index: i,
                  $count: count,
                  $first: i === 0,
                  $last: i === count - 1,
                  $even: i % 2 === 0,
                  $odd: i % 2 !== 0,
                };
                Object.assign(raw, childData);
                node.__ctx.$notify();
              }
            }
          }

          // Task 2.1 + 2.2: LIS-based reorder using childOrder
          const desiredNodes = new Array(count);
          for (let i = 0; i < count; i++) desiredNodes[i] = keyMap.get(newOrder[i].key);
          _reorderWithLIS(el, desiredNodes, childOrder);
          return;
        }
      }

      if (!allKeysMatch) {
        for (const [key, wrapper] of keyMap) {
          if (!nextKeySet.has(key)) {
            // Task 2.2: remove from childOrder
            const rmIdx = childOrder.indexOf(wrapper);
            if (rmIdx !== -1) childOrder.splice(rmIdx, 1);
            _disposeChildren(wrapper);
            wrapper.remove();
            keyMap.delete(key);
          }
        }
      }

      for (let idx = 0; idx < count; idx++) {
        const { key, item, i } = newOrder[idx];
        const childData = {
          [itemName]: item,
          [indexName]: i,
          $index: i,
          $count: count,
          $first: i === 0,
          $last: i === count - 1,
          $even: i % 2 === 0,
          $odd: i % 2 !== 0,
        };

        if (!keyMap.has(key)) {
          const clone = tpl ? tpl.content.cloneNode(true) : templateContent.cloneNode(true);
          const childCtx = createLightContext(childData, ctx);
          const { node, applyAnim } = _makeLoopItem(clone, childCtx, animEnter, stagger, i);
          node.__key = key; // Task 1.5: cache key on the node
          keyMap.set(key, node);
          el.appendChild(node);
          childOrder.push(node); // Task 2.2: track in childOrder
          // Task 2.5: use factory when available (Level 4 integration)
          const factory = tplId && _factories[tplId];
          if (factory) {
            factory(node, childCtx, _watchExpr);
          } else {
            // Task 4.2: use pre-compiled descriptor when available
            processTreeFromDescriptor(node, _getDescriptor(tpl || templateContent));
          }
          applyAnim();
        } else {
          const wrapper = keyMap.get(key);
          wrapper.__key = key; // Task 1.5: refresh cached key
          const raw = wrapper.__ctx.__raw;
          const itemChanged = raw[itemName] !== item;
          const indexChanged = raw.$index !== i;
          if (itemChanged || indexChanged) {
            Object.assign(raw, childData);
            wrapper.__ctx.$notify();
          } else {
            wrapper.__ctx.$notify();
          }
        }
      }

      // Task 2.1 + 2.2: LIS-based reorder using childOrder (foreach)
      const desiredNodes = new Array(count);
      for (let i = 0; i < count; i++) desiredNodes[i] = keyMap.get(newOrder[i].key);
      _reorderWithLIS(el, desiredNodes, childOrder);
    }

    _watchExpr(fromPath, ctx, update);
    update();
  },
});
