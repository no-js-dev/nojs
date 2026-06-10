// ═══════════════════════════════════════════════════════════════════════
//  DIRECTIVES: foreach, each, for  (aliases — single handler)
//  Self-repeating pattern: the element with each/foreach/for IS the
//  repeating template. It gets cloned N times as siblings. The parent
//  element becomes the container.
// ═══════════════════════════════════════════════════════════════════════

import { createContext } from "../context.js";
import { _watchExpr, _warn, _currentEl, _setCurrentEl } from "../globals.js";
import { evaluate, resolve } from "../evaluate.js";
import { findContext, _cloneTemplate } from "../dom.js";
import { registerDirective, processTree, _disposeTree } from "../registry.js";

// Directive and companion attribute names that must be stripped from clones
// to prevent double-execution and re-initialization.
const _LOOP_ATTRS = [
  "foreach", "each", "for", "from",
  "filter", "sort", "limit", "offset", "key", "index",
  "else", "template",
  "animate-enter", "animate-leave", "animate-stagger", "animate-duration", "animate",
];

// Strips all loop-related directive attributes from a cloned element.
function _stripLoopAttrs(clone) {
  for (let i = 0; i < _LOOP_ATTRS.length; i++) {
    clone.removeAttribute(_LOOP_ATTRS[i]);
  }
}

// Collects managed clones between the start and end comment markers.
// Returns a snapshot (array) of element nodes in the managed range.
function _getManagedClones(startMarker, endMarker) {
  const clones = [];
  let node = startMarker.nextSibling;
  while (node && node !== endMarker) {
    if (node.nodeType === 1) clones.push(node); // Element nodes only
    node = node.nextSibling;
  }
  return clones;
}

// Removes all nodes between markers (including text/comment nodes),
// disposing each element first (Safety Rule 1: dispose before removal).
function _clearManagedClones(startMarker, endMarker) {
  let node = startMarker.nextSibling;
  while (node && node !== endMarker) {
    const next = node.nextSibling;
    if (node.nodeType === 1) _disposeTree(node);
    node.parentNode.removeChild(node);
    node = next;
  }
}

// Returns true when `el` carries a loop directive that the loop handler
// will actually claim. `foreach`/`each` always belong to the loop handler.
// A bare `for` only counts when its value is loop-shaped ("item in list")
// or the deprecated `from` companion attribute is present — this mirrors
// the loop handler's own init bail-out, so HTML's native `for` attribute
// on label/output elements is never misclassified as a loop.
export function _isLoopElement(el) {
  if (el.hasAttribute("foreach") || el.hasAttribute("each")) return true;
  if (!el.hasAttribute("for")) return false;
  const v = el.getAttribute("for") || "";
  if (/^\w+\s+in\s+\S+$/.test(v)) return true;
  return el.hasAttribute("from") && /^\w+$/.test(v);
}

// Applies enter animation to a clone element.
function _applyEnterAnim(clone, animEnter, stagger, i) {
  if (!animEnter) return;
  clone.classList.add(animEnter);
  clone.addEventListener(
    "animationend",
    () => clone.classList.remove(animEnter),
    { once: true },
  );
  if (stagger) clone.style.animationDelay = i * stagger + "ms";
}

const _loopHandler = {
  priority: 10,
  init(el, name, expr) {
    const ctx = findContext(el);
    let itemName, listPath;
    const match = expr.match(/^(\w+)\s+in\s+(\S+)$/);
    if (match) {
      [, itemName, listPath] = match;
    } else {
      const fromAttr = el.getAttribute("from");
      if (!fromAttr || !/^\w+$/.test(expr)) return;
      itemName = expr;
      listPath = fromAttr;
      console.warn(
        `[NoJS] "${name}" with "from" is deprecated. Use ${name}="${itemName} in ${listPath}" instead.`,
      );
    }
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
    let prevList = null;
    // Tracks the last rendered (post-filter/sort/slice) list for delta optimization.
    let prevRendered = null;
    // True while the else template's content is rendered between the markers.
    // Guards the same-ref fast path (else nodes are not item clones) and
    // dedups redundant empty updates (rebuilding would wipe input state).
    let elseRendered = false;
    // Warn once per element when the else template id cannot be resolved.
    let elseTplWarned = false;
    // Delta optimization is disabled when filter/sort/offset modify rendered order.
    const hasPipeline = !!(filterExpr || sortProp || offset);

    // ── Self-repeating setup ──────────────────────────────────────────
    // The element with the loop directive IS the template. Insert comment
    // markers at its position, then remove it from the DOM. Clones are
    // inserted as siblings between the markers.
    const parent = el.parentNode;
    const startMarker = document.createComment("foreach");
    const endMarker = document.createComment("/foreach");
    parent.insertBefore(startMarker, el);
    parent.insertBefore(endMarker, el.nextSibling);
    // Remove el from the visible DOM — it becomes the template source.
    parent.removeChild(el);

    // key → cloned element node.
    const keyMap = new Map();

    // Creates a clone of `el` for one loop iteration. When a `template`
    // attribute is set, the clone's children are replaced with the
    // external template's content (the element tag wraps the template).
    function _makeClone(childData) {
      const clone = el.cloneNode(true);
      _stripLoopAttrs(clone);
      // Reset __declared so processTree processes the clone fresh.
      clone.__declared = false;

      // When template attribute is set, replace children with template content
      if (tplId) {
        const tplContent = document.getElementById(tplId)?.content.cloneNode(true);
        if (tplContent) {
          clone.innerHTML = "";
          clone.appendChild(tplContent);
        }
      }

      clone.__ctx = createContext(childData, ctx);
      return clone;
    }

    function update() {
      let list = /[\[\]()\s+\-*\/!?:&|]/.test(listPath)
        ? evaluate(listPath, ctx)
        : resolve(listPath, ctx);
      // Non-array values (null, undefined, …) are treated as an empty list:
      // stale clones are cleared and the else template (if any) renders.
      if (!Array.isArray(list)) list = [];

      // Same-reference optimisation: propagate to managed clones without DOM
      // rebuild. Skipped while the else template is showing — the managed
      // nodes are template content, not item clones.
      const managedClones = _getManagedClones(startMarker, endMarker);
      if (!elseRendered && list === prevList && list.length > 0 && managedClones.length > 0) {
        for (const clone of managedClones) {
          if (clone.__ctx && clone.__ctx.$notify) clone.__ctx.$notify();
        }
        return;
      }
      prevList = list;

      // Filter — reuse a single proxy context, mutating its target per item
      if (filterExpr) {
        const filterData = { [itemName]: undefined, [indexName]: 0 };
        const filterCtx = createContext(filterData, ctx);
        const filterRaw = filterCtx.__raw;
        list = list.filter((item, i) => {
          filterRaw[itemName] = item;
          filterRaw[indexName] = i;
          // Invalidate _collectKeys cache since we bypassed the proxy setter
          delete filterRaw.__collectKeysCache;
          return !!evaluate(filterExpr, filterCtx);
        });
      }

      // Sort
      if (sortProp) {
        const desc = sortProp.startsWith("-");
        const key = desc ? sortProp.slice(1) : sortProp;
        list = [...list].sort((a, b) => {
          const va = resolve(key, a) ?? a?.[key];
          const vb = resolve(key, b) ?? b?.[key];
          // Total ordering: nullish/NaN keys sort after comparable values so
          // the comparator never returns 0 for genuinely unequal/incomparable
          // operands (which would break sort stability and ordering).
          const aBad = va == null || (typeof va === "number" && Number.isNaN(va));
          const bBad = vb == null || (typeof vb === "number" && Number.isNaN(vb));
          // Bad keys always sink to the end regardless of sort direction.
          if (aBad || bBad) {
            if (aBad && bBad) return 0;
            return aBad ? 1 : -1;
          }
          const r = va < vb ? -1 : va > vb ? 1 : 0;
          return desc ? -r : r;
        });
      }

      // Offset and limit
      list = list.slice(offset, offset + limit);

      // Empty state — show else template at marker position
      if (list.length === 0 && elseTpl) {
        // Dedup: already showing the else template — rebuilding it would
        // wipe any input state inside the template content.
        if (elseRendered) {
          prevRendered = null;
          return;
        }
        // Always clear stale item clones first — even when the else template
        // id cannot be resolved, previously rendered items must not linger.
        _clearManagedClones(startMarker, endMarker);
        keyMap.clear();
        const tplClone = _cloneTemplate(elseTpl);
        if (tplClone) {
          // Insert the else template content between markers
          parent.insertBefore(tplClone, endMarker);
          // Process the inserted nodes
          let node = startMarker.nextSibling;
          while (node && node !== endMarker) {
            if (node.nodeType === 1) processTree(node);
            node = node.nextSibling;
          }
          elseRendered = true;
        } else if (!elseTplWarned) {
          elseTplWarned = true;
          _warn(`${name}: else template "${elseTpl}" not found`, el);
        }

        prevRendered = null;
        return;
      }

      // Empty list without else template — just clear
      if (list.length === 0) {
        _clearManagedClones(startMarker, endMarker);
        keyMap.clear();
        elseRendered = false;
        prevRendered = null;
        return;
      }

      // Items are about to render — every render path below clears the
      // managed range (renderItems, keyed reconcile, delta append), so any
      // previously rendered else template content is replaced.
      elseRendered = false;

      if (keyExpr) {
        reconcileItems(list, list.length);
        prevRendered = null;
        return;
      }

      // ── Length-delta append optimization (keyless) ─────────────────────
      // When the list grew and the existing prefix items are unchanged,
      // append only the new items instead of tearing down and rebuilding
      // everything. Falls back to full rebuild when filter/sort/offset are
      // active (rendered order may differ from source order), when the list
      // shrunk, or when any existing item reference changed.
      function tryDeltaAppend() {
        if (hasPipeline) return false;
        if (!prevRendered) return false;
        const oldLen = prevRendered.length;
        const newLen = list.length;
        if (newLen <= oldLen) return false;
        const currentClones = _getManagedClones(startMarker, endMarker);
        if (currentClones.length !== oldLen) return false;
        // Shallow compare: every existing item reference must be identical.
        for (let j = 0; j < oldLen; j++) {
          if (list[j] !== prevRendered[j]) return false;
        }
        // Prefix matches — update $count and $last on existing children,
        // then append only the delta items.
        const count = newLen;
        for (let j = 0; j < oldLen; j++) {
          const childCtx = currentClones[j].__ctx;
          if (childCtx) {
            const raw = childCtx.__raw;
            raw.$count = count;
            raw.$last = false;
            // Invalidate _collectKeys cache since we bypassed the proxy setter
            delete raw.__collectKeysCache;
            childCtx.$notify();
          }
        }
        for (let i = oldLen; i < newLen; i++) {
          const childData = {
            [itemName]: list[i],
            [indexName]: i,
            $index: i,
            $count: count,
            $first: false,
            $last: i === count - 1,
            $even: i % 2 === 0,
            $odd: i % 2 !== 0,
          };
          const clone = _makeClone(childData);
          parent.insertBefore(clone, endMarker);
          processTree(clone);
          _applyEnterAnim(clone, animEnter, stagger, i);
        }
        prevRendered = list.slice();
        return true;
      }

      function renderItems() {
        const count = list.length;
        _clearManagedClones(startMarker, endMarker);
        list.forEach((item, i) => {
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
          const clone = _makeClone(childData);
          parent.insertBefore(clone, endMarker);
          processTree(clone);
          _applyEnterAnim(clone, animEnter, stagger, i);
        });
        prevRendered = list.slice();
      }

      // Animate out old items if animate-leave is set
      const currentClones = _getManagedClones(startMarker, endMarker);
      if (animLeave && currentClones.length > 0) {
        let remaining = currentClones.length;
        currentClones.forEach((clone) => {
          clone.classList.add(animLeave);
          const done = () => {
            clone.classList.remove(animLeave);
            remaining--;
            if (remaining <= 0) {
              renderItems();
            }
          };
          clone.addEventListener("animationend", done, { once: true });
          // || 0: unblocks the next render on the next tick when no CSS animation fires.
          setTimeout(done, animDuration || 0);
        });
      } else if (!tryDeltaAppend()) {
        renderItems();
      }
    }

    // Key-based reconciliation — applied to the final (filtered, sorted,
    // sliced) list so keys always correspond to what is actually rendered.
    function reconcileItems(list, count) {
      // On first render clear any residual content so only managed nodes appear.
      if (keyMap.size === 0) _clearManagedClones(startMarker, endMarker);

      // Reuse a single proxy context for key evaluation (same pattern as filter)
      const keyData = { [itemName]: undefined, [indexName]: 0 };
      const keyCtx = createContext(keyData, ctx);
      const keyRaw = keyCtx.__raw;
      const newOrder = list.map((item, i) => {
        keyRaw[itemName] = item;
        keyRaw[indexName] = i;
        // Invalidate _collectKeys cache since we bypassed the proxy setter
        delete keyRaw.__collectKeysCache;
        return { key: evaluate(keyExpr, keyCtx), item, i };
      });

      const nextKeySet = new Set(newOrder.map((e) => e.key));

      for (const [key, wrapper] of keyMap) {
        if (!nextKeySet.has(key)) {
          _disposeTree(wrapper);
          wrapper.remove();
          keyMap.delete(key);
        }
      }

      newOrder.forEach(({ key, item, i }) => {
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
          const clone = _makeClone(childData);
          keyMap.set(key, clone);
          parent.insertBefore(clone, endMarker);
          processTree(clone);
          _applyEnterAnim(clone, animEnter, stagger, i);
        } else {
          Object.assign(keyMap.get(key).__ctx.__raw, childData);
          keyMap.get(key).__ctx.$notify();
        }
      });

      // Reorder: ensure DOM order matches the new list order.
      // Work with a mutable snapshot so moves are tracked correctly.
      const managedClones = _getManagedClones(startMarker, endMarker);
      for (let i = 0; i < newOrder.length; i++) {
        const itemNode = keyMap.get(newOrder[i].key);
        if (itemNode !== managedClones[i]) {
          parent.insertBefore(itemNode, managedClones[i] ?? endMarker);
          // Refresh the snapshot after a move so subsequent comparisons
          // reference the current DOM order, not the stale snapshot.
          const fromIdx = managedClones.indexOf(itemNode);
          if (fromIdx !== -1) managedClones.splice(fromIdx, 1);
          managedClones.splice(i, 0, itemNode);
        }
      }
    }

    // Redirect _currentEl to parent so _onDispose and fn._el reference a
    // connected DOM node instead of the removed template element.
    const savedEl = _currentEl;
    _setCurrentEl(parent);
    _watchExpr(listPath, ctx, update);
    update();
    _setCurrentEl(savedEl);
  },
};

registerDirective("foreach", _loopHandler);
registerDirective("each", _loopHandler);
registerDirective("for", _loopHandler);
