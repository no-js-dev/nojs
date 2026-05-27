// ═══════════════════════════════════════════════════════════════════════
//  DIRECTIVES: foreach, each, for  (aliases — single handler)
// ═══════════════════════════════════════════════════════════════════════

import { createContext } from "../context.js";
import { _watchExpr } from "../globals.js";
import { evaluate, resolve } from "../evaluate.js";
import { findContext, _cloneTemplate } from "../dom.js";
import { registerDirective, processTree, _disposeChildren } from "../registry.js";

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
    // Delta optimization is disabled when filter/sort/offset modify rendered order.
    const hasPipeline = !!(filterExpr || sortProp || offset);

    // Capture inline children as template fragment (before any render).
    // When no external template is specified, the element's children become
    // the repeating unit and the element itself acts as the container.
    let inlineTemplate = null;
    if (!tplId && el.childNodes.length > 0) {
      inlineTemplate = document.createDocumentFragment();
      while (el.firstChild) inlineTemplate.appendChild(el.firstChild);
    }

    // key → item node (root element or wrapper div for multi-root templates).
    const keyMap = new Map();

    function update() {
      let list = /[\[\]()\s+\-*\/!?:&|]/.test(listPath)
        ? evaluate(listPath, ctx)
        : resolve(listPath, ctx);
      if (!Array.isArray(list)) return;

      // Same-reference optimisation: propagate to children without DOM rebuild.
      if (list === prevList && list.length > 0 && el.children.length > 0) {
        for (const child of el.children) {
          if (child.__ctx && child.__ctx.$notify) child.__ctx.$notify();
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
          const r = va < vb ? -1 : va > vb ? 1 : 0;
          return desc ? -r : r;
        });
      }

      // Offset and limit
      list = list.slice(offset, offset + limit);

      // Empty state
      if (list.length === 0 && elseTpl) {
        const clone = _cloneTemplate(elseTpl);
        if (clone) {
          _disposeChildren(el);
          keyMap.clear();
          el.innerHTML = "";
          el.appendChild(clone);
          processTree(el);
        }
        prevRendered = null;
        return;
      }

      if (keyExpr) {
        reconcileForeachItems(list, list.length);
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
        if (el.children.length !== oldLen) return false;
        // Shallow compare: every existing item reference must be identical.
        for (let j = 0; j < oldLen; j++) {
          if (list[j] !== prevRendered[j]) return false;
        }
        // Prefix matches — update $count and $last on existing children,
        // then append only the delta items.
        const count = newLen;
        for (let j = 0; j < oldLen; j++) {
          const childCtx = el.children[j].__ctx;
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
          const clone = tplId
            ? document.getElementById(tplId)?.content.cloneNode(true)
            : inlineTemplate?.cloneNode(true);
          if (!clone) return false;
          const { node, applyAnim } = _makeLoopItem(clone, createContext(childData, ctx), animEnter, stagger, i);
          el.appendChild(node);
          processTree(node);
          applyAnim();
        }
        prevRendered = list.slice();
        return true;
      }

      function renderForeachItems() {
        const count = list.length;
        _disposeChildren(el);
        el.innerHTML = "";
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
          const clone = tplId
            ? document.getElementById(tplId)?.content.cloneNode(true)
            : inlineTemplate?.cloneNode(true);
          if (!clone) return;
          const { node, applyAnim } = _makeLoopItem(clone, createContext(childData, ctx), animEnter, stagger, i);
          el.appendChild(node);
          processTree(node);
          applyAnim();
        });
        prevRendered = list.slice();
      }

      // Animate out old items if animate-leave is set
      if (animLeave && el.children.length > 0) {
        const oldItems = [...el.children];
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
      } else if (!tryDeltaAppend()) {
        renderForeachItems();
      }
    }

    // Key-based reconciliation for foreach — mirrors each's reconcileItems.
    // Applied to the final (filtered, sorted, sliced) list so keys always
    // correspond to what is actually rendered.
    function reconcileForeachItems(list, count) {
      // On first render clear any residual content so only managed nodes appear.
      if (keyMap.size === 0) el.innerHTML = "";

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
          _disposeChildren(wrapper);
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
          const clone = tplId
            ? document.getElementById(tplId)?.content.cloneNode(true)
            : inlineTemplate?.cloneNode(true);
          if (!clone) return;
          const { node, applyAnim } = _makeLoopItem(clone, createContext(childData, ctx), animEnter, stagger, i);
          keyMap.set(key, node);
          el.appendChild(node);
          processTree(node);
          applyAnim();
        } else {
          Object.assign(keyMap.get(key).__ctx.__raw, childData);
          keyMap.get(key).__ctx.$notify();
        }
      });

      for (let i = 0; i < newOrder.length; i++) {
        const itemNode = keyMap.get(newOrder[i].key);
        if (itemNode !== el.children[i]) el.insertBefore(itemNode, el.children[i] ?? null);
      }
    }

    _watchExpr(listPath, ctx, update);
    update();
  },
};

registerDirective("foreach", _loopHandler);
registerDirective("each", _loopHandler);
registerDirective("for", _loopHandler);
