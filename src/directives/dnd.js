// ═══════════════════════════════════════════════════════════════════════
//  DIRECTIVES: drag, drop, drag-list, drag-multiple
// ═══════════════════════════════════════════════════════════════════════

import { evaluate, _execStatement, resolve } from "../evaluate.js";
import { findContext } from "../dom.js";
import { createContext } from "../context.js";
import { registerDirective, processTree, _disposeChildren } from "../registry.js";
import { _onDispose, _warn } from "../globals.js";

// ─── Module-scoped DnD coordination state ─────────────────────────────
const _dndState = {
  dragging: null,       // { item, type, effect, sourceEl, sourceCtx, sourceList, sourceIndex, listDirective }
  selected: new Map(),  // group → Set<{ item, el, ctx }>
  placeholder: null,    // current placeholder DOM element
};

// ─── Inject built-in DnD styles (once) ────────────────────────────────

// Count visible children, recursing through display:contents wrappers
function _countVisibleChildren(el) {
  let count = 0;
  for (const child of el.children) {
    if (child.classList.contains("nojs-drop-placeholder")) continue;
    const style = child.style || {};
    if (style.display === "contents") {
      count += _countVisibleChildren(child);
    } else {
      count++;
    }
  }
  return count;
}

function _injectDndStyles() {
  if (typeof document === "undefined") return;
  if (document.querySelector("style[data-nojs-dnd]")) return;

  const css = `
.nojs-dragging {
  opacity: 0.5;
  cursor: grabbing !important;
}
.nojs-drag-over {
  outline: 2px dashed #3b82f6;
  outline-offset: -2px;
}
.nojs-drop-placeholder {
  border: 2px dashed #3b82f6;
  border-radius: 6px;
  background: color-mix(in srgb, #3b82f6 6%, transparent);
  box-sizing: border-box;
  min-height: 2.5rem;
  transition: all 0.15s ease;
  pointer-events: none;
}
.nojs-drop-reject {
  outline: 2px dashed #ef4444;
  outline-offset: -2px;
  background: color-mix(in srgb, #ef4444 4%, transparent);
}
.nojs-selected {
  outline: 2px solid #3b82f6;
  outline-offset: 1px;
}
[drag-axis="x"] { touch-action: pan-y; }
[drag-axis="y"] { touch-action: pan-x; }
@keyframes nojs-drop-settle {
  from { transform: scale(1.05); opacity: 0.8; }
  to   { transform: scale(1);    opacity: 1; }
}
.nojs-drop-settle {
  animation: nojs-drop-settle 0.2s ease-out;
}
.nojs-drag-list-empty {
  min-height: 3rem;
}
`.trim();

  const style = document.createElement("style");
  style.setAttribute("data-nojs-dnd", "");
  style.textContent = css;
  document.head.appendChild(style);
}

// ─── Helper: calculate drop index from mouse position ─────────────────
function _calcDropIndex(el, mouseX, mouseY, sortDir) {
  const children = [...el.children].filter(
    (c) => !c.classList.contains("nojs-drop-placeholder")
  );
  if (children.length === 0) return 0;

  for (let i = 0; i < children.length; i++) {
    // Use first visible child for display:contents wrappers
    const measured = children[i].style && children[i].style.display === "contents"
      ? (children[i].firstElementChild || children[i])
      : children[i];
    const rect = measured.getBoundingClientRect();
    if (sortDir === "horizontal") {
      const midX = rect.left + rect.width / 2;
      if (mouseX < midX) return i;
    } else if (sortDir === "grid") {
      const midX = rect.left + rect.width / 2;
      const midY = rect.top + rect.height / 2;
      if (mouseY < midY && mouseX < midX) return i;
      if (mouseY < rect.top + rect.height && mouseX < midX) return i;
    } else {
      // vertical (default)
      const midY = rect.top + rect.height / 2;
      if (mouseY < midY) return i;
    }
  }
  return children.length;
}

// ─── Helper: manage placeholder ───────────────────────────────────────
function _insertPlaceholder(el, index, placeholderAttr, placeholderClass) {
  _removePlaceholder();

  let ph;
  if (placeholderAttr === "auto") {
    ph = document.createElement("div");
    ph.className = placeholderClass || "nojs-drop-placeholder";
    // Size placeholder to match the dragged item
    if (_dndState.dragging && _dndState.dragging.sourceEl) {
      const srcEl = _dndState.dragging.sourceEl.firstElementChild || _dndState.dragging.sourceEl;
      const rect = srcEl.getBoundingClientRect();
      if (rect.height > 0) ph.style.height = rect.height + "px";
      if (rect.width > 0) ph.style.width = rect.width + "px";
    }
  } else {
    // Template ID
    const tpl = document.getElementById(
      placeholderAttr.startsWith("#") ? placeholderAttr.slice(1) : placeholderAttr
    );
    if (tpl && tpl.content) {
      ph = document.createElement("div");
      ph.style.display = "contents";
      ph.className = placeholderClass || "nojs-drop-placeholder";
      ph.appendChild(tpl.content.cloneNode(true));
    } else {
      ph = document.createElement("div");
      ph.className = placeholderClass || "nojs-drop-placeholder";
    }
  }

  ph.classList.add("nojs-drop-placeholder");
  const children = [...el.children].filter(
    (c) => !c.classList.contains("nojs-drop-placeholder")
  );

  if (index >= children.length) {
    el.appendChild(ph);
  } else {
    el.insertBefore(ph, children[index]);
  }
  _dndState.placeholder = ph;
}

function _removePlaceholder() {
  if (_dndState.placeholder) {
    _dndState.placeholder.remove();
    _dndState.placeholder = null;
  }
}

// ─── Helper: check if type is accepted ────────────────────────────────
function _isTypeAccepted(dragType, acceptAttr) {
  if (!acceptAttr || acceptAttr === "*") return true;
  const accepted = acceptAttr.split(",").map((s) => s.trim());
  return accepted.includes(dragType);
}

// ─── Helper: build stacked-cards ghost for multi-drag ─────────────────
function _buildStackGhost(sourceEl, count) {
  const ghost = document.createElement("div");
  ghost.style.cssText = "position:fixed;top:-9999px;left:-9999px;pointer-events:none;z-index:99999;";

  const measured = sourceEl.style && sourceEl.style.display === "contents"
    ? (sourceEl.firstElementChild || sourceEl) : sourceEl;
  const rect = measured.getBoundingClientRect();
  const w = rect.width;
  const h = rect.height;
  const cs = getComputedStyle(measured);
  const maxStack = Math.min(count, 3);

  // Stack layers (back to front)
  for (let i = maxStack - 1; i >= 0; i--) {
    const layer = document.createElement("div");
    const offset = i * 4;
    layer.style.cssText =
      "position:absolute;" +
      "top:" + offset + "px;left:" + offset + "px;" +
      "width:" + w + "px;height:" + h + "px;" +
      "border-radius:" + cs.borderRadius + ";" +
      "box-shadow:0 1px 4px rgba(0,0,0,0.12);" +
      "overflow:hidden;box-sizing:border-box;";

    if (i === 0) {
      // Top card: clone content
      for (const child of measured.childNodes) layer.appendChild(child.cloneNode(true));
      layer.style.background = cs.backgroundColor || "#fff";
      layer.style.border = cs.border;
      layer.style.padding = cs.padding;
      layer.style.fontSize = cs.fontSize;
      layer.style.color = cs.color;
      layer.style.fontFamily = cs.fontFamily;
    } else {
      // Back cards: solid fill
      layer.style.background = cs.backgroundColor || "#fff";
      layer.style.border = cs.border || "1px solid #ddd";
    }
    ghost.appendChild(layer);
  }

  // Count badge
  const badge = document.createElement("div");
  badge.textContent = count;
  badge.style.cssText =
    "position:absolute;top:-6px;right:-6px;" +
    "min-width:22px;height:22px;padding:0 5px;" +
    "background:#3b82f6;color:#fff;border-radius:11px;" +
    "display:flex;align-items:center;justify-content:center;" +
    "font-size:11px;font-weight:700;border:2px solid #fff;" +
    "box-shadow:0 1px 3px rgba(0,0,0,0.2);";
  ghost.appendChild(badge);

  // Container size
  ghost.style.width = (w + (maxStack - 1) * 4) + "px";
  ghost.style.height = (h + (maxStack - 1) * 4) + "px";

  return ghost;
}

// ═══════════════════════════════════════════════════════════════════════
//  DRAG DIRECTIVE
// ═══════════════════════════════════════════════════════════════════════

registerDirective("drag", {
  priority: 15,
  init(el, name, expr) {
    _injectDndStyles();
    const ctx = findContext(el);

    const type = el.getAttribute("drag-type") || "default";
    const effect = el.getAttribute("drag-effect") || "move";
    const handleSel = el.getAttribute("drag-handle");
    const imageSel = el.getAttribute("drag-image");
    const imageOffsetAttr = el.getAttribute("drag-image-offset") || "0,0";
    const disabledExpr = el.getAttribute("drag-disabled");
    const dragClass = el.getAttribute("drag-class") || "nojs-dragging";
    const ghostClass = el.getAttribute("drag-ghost-class");

    // Set draggable
    el.draggable = true;

    // Accessibility
    el.setAttribute("aria-grabbed", "false");
    if (!el.getAttribute("tabindex")) el.setAttribute("tabindex", "0");

    // Handle restriction: prevent drag from non-handle areas
    let _handleAllowed = true;
    if (handleSel) {
      const mousedownHandler = (e) => {
        _handleAllowed = !!e.target.closest(handleSel);
      };
      el.addEventListener("mousedown", mousedownHandler);
      _onDispose(() => el.removeEventListener("mousedown", mousedownHandler));
    }

    // Drag start
    const dragstartHandler = (e) => {
      // Handle check
      if (handleSel && !_handleAllowed) {
        e.preventDefault();
        return;
      }

      // Disabled check
      if (disabledExpr && evaluate(disabledExpr, ctx)) {
        e.preventDefault();
        return;
      }

      const item = evaluate(expr, ctx);

      // Check for multi-select
      const group = el.getAttribute("drag-group");
      let dragItem = item;
      if (group && _dndState.selected.has(group)) {
        const selectedSet = _dndState.selected.get(group);
        if (selectedSet.size > 0) {
          // If this element is selected, drag all selected items
          const hasThis = [...selectedSet].some((s) => s.el === el);
          if (hasThis) {
            dragItem = [...selectedSet].map((s) => s.item);
          }
        }
      }

      // Store dragging state
      _dndState.dragging = {
        item: dragItem,
        type,
        effect,
        sourceEl: el,
        sourceCtx: ctx,
        sourceList: null,
        sourceIndex: null,
        listDirective: null,
      };

      // Set dataTransfer
      if (e.dataTransfer) {
        e.dataTransfer.effectAllowed = effect;
        e.dataTransfer.setData("text/plain", "");

        // Multi-select: stacked cards drag image
        if (Array.isArray(dragItem) && dragItem.length > 1 && e.dataTransfer.setDragImage) {
          const ghost = _buildStackGhost(el, dragItem.length);
          document.body.appendChild(ghost);
          const rect = el.getBoundingClientRect();
          e.dataTransfer.setDragImage(ghost, rect.width / 2, rect.height / 2);
          requestAnimationFrame(() => ghost.remove());
        } else if (imageSel && e.dataTransfer.setDragImage) {
          // Custom drag image
          if (imageSel === "none") {
            const empty = document.createElement("div");
            empty.style.cssText = "width:1px;height:1px;opacity:0;position:fixed;top:-999px";
            document.body.appendChild(empty);
            const [ox, oy] = imageOffsetAttr.split(",").map(Number);
            e.dataTransfer.setDragImage(empty, ox || 0, oy || 0);
            requestAnimationFrame(() => empty.remove());
          } else {
            const imgEl = el.querySelector(imageSel);
            if (imgEl) {
              const [ox, oy] = imageOffsetAttr.split(",").map(Number);
              if (ghostClass) imgEl.classList.add(ghostClass);
              e.dataTransfer.setDragImage(imgEl, ox || 0, oy || 0);
            }
          }
        }
      }

      // Apply drag class to dragged element (and all selected items if multi-select)
      dragClass.split(/\s+/).filter(Boolean).forEach((c) => el.classList.add(c));
      if (Array.isArray(dragItem) && group && _dndState.selected.has(group)) {
        for (const s of _dndState.selected.get(group)) {
          if (s.el !== el) dragClass.split(/\s+/).filter(Boolean).forEach((c) => s.el.classList.add(c));
        }
      }

      // ARIA
      el.setAttribute("aria-grabbed", "true");

      // Dispatch custom event
      el.dispatchEvent(
        new CustomEvent("drag-start", {
          bubbles: true,
          detail: { item: dragItem, index: _dndState.dragging.sourceIndex, el },
        })
      );
    };

    // Drag end
    const dragendHandler = () => {
      // Remove drag class from this element and all selected items
      dragClass.split(/\s+/).filter(Boolean).forEach((c) => el.classList.remove(c));
      const group = el.getAttribute("drag-group");
      if (group && _dndState.selected.has(group)) {
        for (const s of _dndState.selected.get(group)) {
          dragClass.split(/\s+/).filter(Boolean).forEach((c) => s.el.classList.remove(c));
        }
      }

      // ARIA
      el.setAttribute("aria-grabbed", "false");

      // Ghost class cleanup
      if (ghostClass && imageSel && imageSel !== "none") {
        const imgEl = el.querySelector(imageSel);
        if (imgEl) imgEl.classList.remove(ghostClass);
      }

      // Dispatch custom event
      el.dispatchEvent(
        new CustomEvent("drag-end", {
          bubbles: true,
          detail: {
            item: _dndState.dragging?.item,
            index: _dndState.dragging?.sourceIndex,
            dropped: _dndState.dragging === null,
          },
        })
      );

      // Clear dragging state
      _dndState.dragging = null;
      _removePlaceholder();
    };

    el.addEventListener("dragstart", dragstartHandler);
    el.addEventListener("dragend", dragendHandler);
    _onDispose(() => {
      el.removeEventListener("dragstart", dragstartHandler);
      el.removeEventListener("dragend", dragendHandler);
    });

    // Reactive disabled toggle
    if (disabledExpr) {
      function updateDisabled() {
        const disabled = !!evaluate(disabledExpr, ctx);
        el.draggable = !disabled;
        if (disabled) el.removeAttribute("aria-grabbed");
        else el.setAttribute("aria-grabbed", "false");
      }
      const unwatchDisabled = ctx.$watch(updateDisabled);
      _onDispose(unwatchDisabled);
    }

    // Keyboard DnD support
    const keydownHandler = (e) => {
      // Clear stale state from elements removed from DOM
      if (_dndState.dragging && !_dndState.dragging.sourceEl.isConnected) {
        _dndState.dragging = null;
      }
      if (e.key === " " && !_dndState.dragging) {
        e.preventDefault();
        const item = evaluate(expr, ctx);
        _dndState.dragging = {
          item,
          type,
          effect,
          sourceEl: el,
          sourceCtx: ctx,
          sourceList: null,
          sourceIndex: null,
          listDirective: null,
        };
        dragClass.split(/\s+/).filter(Boolean).forEach((c) => el.classList.add(c));
        el.setAttribute("aria-grabbed", "true");
        el.dispatchEvent(
          new CustomEvent("drag-start", {
            bubbles: true,
            detail: { item, index: null, el },
          })
        );
      } else if (e.key === "Escape" && _dndState.dragging && _dndState.dragging.sourceEl === el) {
        e.preventDefault();
        dragClass.split(/\s+/).filter(Boolean).forEach((c) => el.classList.remove(c));
        el.setAttribute("aria-grabbed", "false");
        _dndState.dragging = null;
        _removePlaceholder();
      }
    };
    el.addEventListener("keydown", keydownHandler);
    _onDispose(() => el.removeEventListener("keydown", keydownHandler));
  },
});

// ═══════════════════════════════════════════════════════════════════════
//  DROP DIRECTIVE
// ═══════════════════════════════════════════════════════════════════════

registerDirective("drop", {
  priority: 15,
  init(el, name, expr) {
    _injectDndStyles();
    const ctx = findContext(el);

    const acceptAttr = el.getAttribute("drop-accept") || "default";
    const dropEffect = el.getAttribute("drop-effect") || "move";
    const dropClass = el.getAttribute("drop-class") || "nojs-drag-over";
    const rejectClass = el.getAttribute("drop-reject-class") || "nojs-drop-reject";
    const disabledExpr = el.getAttribute("drop-disabled");
    const maxExpr = el.getAttribute("drop-max");
    const sortDir = el.getAttribute("drop-sort");
    const placeholderAttr = el.getAttribute("drop-placeholder");
    const placeholderClass = el.getAttribute("drop-placeholder-class");

    // Accessibility
    el.setAttribute("aria-dropeffect", dropEffect);

    // Track dragenter/dragleave depth for nested elements
    let _enterDepth = 0;

    const dragoverHandler = (e) => {
      if (!_dndState.dragging) return;

      // Disabled check
      if (disabledExpr && evaluate(disabledExpr, ctx)) return;

      const typeOk = _isTypeAccepted(_dndState.dragging.type, acceptAttr);
      let maxOk = true;
      if (maxExpr) {
        const max = evaluate(maxExpr, ctx);
        const childCount = _countVisibleChildren(el);
        if (typeof max === "number" && childCount >= max) maxOk = false;
      }

      if (!typeOk || !maxOk) {
        rejectClass.split(/\s+/).filter(Boolean).forEach((c) => el.classList.add(c));
        dropClass.split(/\s+/).filter(Boolean).forEach((c) => el.classList.remove(c));
        _removePlaceholder();
        return;
      }

      rejectClass.split(/\s+/).filter(Boolean).forEach((c) => el.classList.remove(c));

      e.preventDefault();
      if (e.dataTransfer) e.dataTransfer.dropEffect = dropEffect;

      // Sortable: calculate index and show placeholder
      if (sortDir) {
        const idx = _calcDropIndex(el, e.clientX, e.clientY, sortDir);
        if (placeholderAttr) {
          _insertPlaceholder(el, idx, placeholderAttr, placeholderClass);
        }
        // Dispatch throttled drag-over event
        el.dispatchEvent(
          new CustomEvent("drag-over", {
            bubbles: false,
            detail: { item: _dndState.dragging.item, index: idx },
          })
        );
      }
    };

    const dragenterHandler = (e) => {
      if (!_dndState.dragging) return;
      if (disabledExpr && evaluate(disabledExpr, ctx)) return;

      _enterDepth++;
      if (_enterDepth === 1) {
        const typeOk = _isTypeAccepted(_dndState.dragging.type, acceptAttr);
        let maxOk = true;
        if (maxExpr) {
          const max = evaluate(maxExpr, ctx);
          const childCount = _countVisibleChildren(el);
          if (typeof max === "number" && childCount >= max) maxOk = false;
        }

        if (typeOk && maxOk) {
          dropClass.split(/\s+/).filter(Boolean).forEach((c) => el.classList.add(c));
          el.dispatchEvent(
            new CustomEvent("drag-enter", {
              bubbles: false,
              detail: { item: _dndState.dragging.item, type: _dndState.dragging.type },
            })
          );
        } else {
          rejectClass.split(/\s+/).filter(Boolean).forEach((c) => el.classList.add(c));
        }
      }
    };

    const dragleaveHandler = (e) => {
      if (!_dndState.dragging) return;

      _enterDepth--;
      if (_enterDepth <= 0) {
        _enterDepth = 0;
        dropClass.split(/\s+/).filter(Boolean).forEach((c) => el.classList.remove(c));
        rejectClass.split(/\s+/).filter(Boolean).forEach((c) => el.classList.remove(c));
        _removePlaceholder();

        el.dispatchEvent(
          new CustomEvent("drag-leave", {
            bubbles: false,
            detail: { item: _dndState.dragging.item },
          })
        );
      }
    };

    const dropHandler = (e) => {
      e.preventDefault();
      e.stopPropagation();
      _enterDepth = 0;

      if (!_dndState.dragging) return;
      if (disabledExpr && evaluate(disabledExpr, ctx)) return;
      if (!_isTypeAccepted(_dndState.dragging.type, acceptAttr)) return;

      // Max capacity check
      if (maxExpr) {
        const max = evaluate(maxExpr, ctx);
        const childCount = _countVisibleChildren(el);
        if (typeof max === "number" && childCount >= max) return;
      }

      const dragItem = _dndState.dragging.item;
      const dragType = _dndState.dragging.type;
      const dragEffect = _dndState.dragging.effect;

      // Calculate drop index
      let dropIndex = 0;
      if (sortDir) {
        dropIndex = _calcDropIndex(el, e.clientX, e.clientY, sortDir);
      }

      // Remove visual feedback
      dropClass.split(/\s+/).filter(Boolean).forEach((c) => el.classList.remove(c));
      rejectClass.split(/\s+/).filter(Boolean).forEach((c) => el.classList.remove(c));
      _removePlaceholder();

      // Execute drop expression with implicit variables
      const extraVars = {
        $drag: dragItem,
        $dragType: dragType,
        $dragEffect: dragEffect,
        $dropIndex: dropIndex,
        $source: {
          list: _dndState.dragging.sourceList,
          index: _dndState.dragging.sourceIndex,
          el: _dndState.dragging.sourceEl,
        },
        $target: { list: null, index: dropIndex, el },
        $el: el,
      };

      _execStatement(expr, ctx, extraVars);

      // Clear dragging state BEFORE dispatch to prevent re-entry
      _dndState.dragging = null;

      // Dispatch custom event after expression runs
      el.dispatchEvent(
        new CustomEvent("drop", {
          bubbles: false,
          detail: {
            item: dragItem,
            index: dropIndex,
            source: extraVars.$source,
            target: extraVars.$target,
            effect: dragEffect,
          },
        })
      );
    };

    // Keyboard: Enter/Space to drop when item is grabbed
    const keydownHandler = (e) => {
      if (!_dndState.dragging) return;
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        dropHandler(e);
      }
    };

    el.addEventListener("dragover", dragoverHandler);
    el.addEventListener("dragenter", dragenterHandler);
    el.addEventListener("dragleave", dragleaveHandler);
    el.addEventListener("drop", dropHandler);
    el.addEventListener("keydown", keydownHandler);
    _onDispose(() => {
      el.removeEventListener("dragover", dragoverHandler);
      el.removeEventListener("dragenter", dragenterHandler);
      el.removeEventListener("dragleave", dragleaveHandler);
      el.removeEventListener("drop", dropHandler);
      el.removeEventListener("keydown", keydownHandler);
    });
  },
});

// ═══════════════════════════════════════════════════════════════════════
//  DRAG-LIST DIRECTIVE (Sortable List Shorthand)
// ═══════════════════════════════════════════════════════════════════════

// Keep a registry of drag-list elements for cross-list communication
const _dragListRegistry = new Map(); // el → { listPath, ctx, el }

registerDirective("drag-list", {
  priority: 10,
  init(el, name, listPath) {
    _injectDndStyles();
    const ctx = findContext(el);

    const tplId = el.getAttribute("template");
    const keyProp = el.getAttribute("drag-list-key");
    const itemName = el.getAttribute("drag-list-item") || "item";
    const sortDir = el.getAttribute("drop-sort") || "vertical";
    const type = el.getAttribute("drag-type") || ("__draglist_" + listPath);
    const acceptAttr = el.getAttribute("drop-accept") || type;
    const copyMode = el.hasAttribute("drag-list-copy");
    const removeMode = el.hasAttribute("drag-list-remove");
    const disabledDragExpr = el.getAttribute("drag-disabled");
    const disabledDropExpr = el.getAttribute("drop-disabled");
    const maxExpr = el.getAttribute("drop-max");
    const placeholderAttr = el.getAttribute("drop-placeholder");
    const placeholderClass = el.getAttribute("drop-placeholder-class");
    const dragClass = el.getAttribute("drag-class") || "nojs-dragging";
    const dropClass = el.getAttribute("drop-class") || "nojs-drag-over";
    const rejectClass = el.getAttribute("drop-reject-class") || "nojs-drop-reject";
    const settleClass = el.getAttribute("drop-settle-class") || "nojs-drop-settle";
    const emptyClass = el.getAttribute("drop-empty-class") || "nojs-drag-list-empty";

    // Accessibility
    el.setAttribute("role", "listbox");
    el.setAttribute("aria-dropeffect", copyMode ? "copy" : "move");

    // Register for cross-list communication
    const listInfo = { listPath, ctx, el };
    _dragListRegistry.set(el, listInfo);
    _onDispose(() => _dragListRegistry.delete(el));

    let _enterDepth = 0;
    let _prevList = null;

    // ─── Render items ──────────────────────────────────────────────────
    function renderItems() {
      const list = resolve(listPath, ctx);
      if (!Array.isArray(list)) return;

      // Same reference & items already rendered — propagate to children
      // without rebuilding the DOM (preserves focus, input state, etc.)
      if (list === _prevList && list.length > 0 && el.children.length > 0) {
        for (const child of el.children) {
          if (child.__ctx && child.__ctx.$notify) child.__ctx.$notify();
        }
        return;
      }
      _prevList = list;

      const tpl = tplId ? document.getElementById(tplId) : null;
      if (!tpl) return;

      _disposeChildren(el);
      el.innerHTML = "";
      const count = list.length;

      list.forEach((item, i) => {
        const childData = {
          [itemName]: item,
          $index: i,
          $count: count,
          $first: i === 0,
          $last: i === count - 1,
          $even: i % 2 === 0,
          $odd: i % 2 !== 0,
        };
        const childCtx = createContext(childData, ctx);

        const clone = tpl.content.cloneNode(true);
        const wrapper = document.createElement("div");
        wrapper.style.display = "contents";
        wrapper.__ctx = childCtx;
        wrapper.setAttribute("role", "option");

        // Append clone first so we can access the visible child
        wrapper.appendChild(clone);
        el.appendChild(wrapper);

        // The drag source is the first visible child
        // (display:contents wrapper has no box, so draggable must be on a rendered element)
        const dragEl = wrapper.firstElementChild || wrapper;
        dragEl.draggable = true;
        dragEl.setAttribute("aria-grabbed", "false");
        if (!dragEl.getAttribute("tabindex")) dragEl.setAttribute("tabindex", "0");

        // Per-item drag handlers (on wrapper so events from dragEl bubble up to them)
        const itemDragstart = (e) => {
          if (disabledDragExpr && evaluate(disabledDragExpr, ctx)) {
            e.preventDefault();
            return;
          }
          _dndState.dragging = {
            item,
            type,
            effect: copyMode ? "copy" : "move",
            sourceEl: wrapper,
            sourceCtx: childCtx,
            sourceList: list,
            sourceIndex: i,
            listDirective: { el, listPath, ctx, keyProp, copyMode, removeMode },
          };
          if (e.dataTransfer) {
            e.dataTransfer.effectAllowed = copyMode ? "copy" : "move";
            e.dataTransfer.setData("text/plain", "");
          }
          dragClass.split(/\s+/).filter(Boolean).forEach((c) => dragEl.classList.add(c));
          dragEl.setAttribute("aria-grabbed", "true");

          el.dispatchEvent(
            new CustomEvent("drag-start", {
              bubbles: true,
              detail: { item, index: i, el: dragEl },
            })
          );
        };

        const itemDragend = () => {
          dragClass.split(/\s+/).filter(Boolean).forEach((c) => dragEl.classList.remove(c));
          dragEl.setAttribute("aria-grabbed", "false");

          // If drag-list-remove and item was NOT dropped in a target, no action
          // If dragging state is still set, it wasn't dropped
          if (_dndState.dragging && _dndState.dragging.sourceEl === wrapper) {
            _dndState.dragging = null;
          }
          _removePlaceholder();
        };

        wrapper.addEventListener("dragstart", itemDragstart);
        wrapper.addEventListener("dragend", itemDragend);

        // Keyboard DnD on items
        const itemKeydown = (e) => {
          if (e.key === " " && !_dndState.dragging) {
            e.preventDefault();
            _dndState.dragging = {
              item,
              type,
              effect: copyMode ? "copy" : "move",
              sourceEl: wrapper,
              sourceCtx: childCtx,
              sourceList: list,
              sourceIndex: i,
              listDirective: { el, listPath, ctx, keyProp, copyMode, removeMode },
            };
            dragClass.split(/\s+/).filter(Boolean).forEach((c) => dragEl.classList.add(c));
            dragEl.setAttribute("aria-grabbed", "true");
          } else if (e.key === "Escape" && _dndState.dragging && _dndState.dragging.sourceEl === wrapper) {
            e.preventDefault();
            dragClass.split(/\s+/).filter(Boolean).forEach((c) => dragEl.classList.remove(c));
            dragEl.setAttribute("aria-grabbed", "false");
            _dndState.dragging = null;
            _removePlaceholder();
          } else if ((e.key === "ArrowDown" || e.key === "ArrowRight") && _dndState.dragging && _dndState.dragging.sourceEl === wrapper) {
            e.preventDefault();
            // Navigate to next item via wrapper siblings
            const nextWrapper = wrapper.nextElementSibling;
            if (nextWrapper) {
              const nextEl = nextWrapper.firstElementChild || nextWrapper;
              nextEl.focus();
            }
          } else if ((e.key === "ArrowUp" || e.key === "ArrowLeft") && _dndState.dragging && _dndState.dragging.sourceEl === wrapper) {
            e.preventDefault();
            const prevWrapper = wrapper.previousElementSibling;
            if (prevWrapper) {
              const prevEl = prevWrapper.firstElementChild || prevWrapper;
              prevEl.focus();
            }
          }
        };
        wrapper.addEventListener("keydown", itemKeydown);

        // Register cleanup on wrapper so disposers run when _disposeChildren(el) is called
        wrapper.__disposers = wrapper.__disposers || [];
        wrapper.__disposers.push(
          () => wrapper.removeEventListener("dragstart", itemDragstart),
          () => wrapper.removeEventListener("dragend", itemDragend),
          () => wrapper.removeEventListener("keydown", itemKeydown),
        );

        processTree(wrapper);
      });

      // Toggle empty class so the container remains a viable drop target
      const isEmpty = list.length === 0;
      emptyClass.split(/\s+/).filter(Boolean).forEach((c) => el.classList.toggle(c, isEmpty));
    }

    // ─── Drop zone handlers on the list container ─────────────────────
    const dragoverHandler = (e) => {
      if (!_dndState.dragging) return;
      if (disabledDropExpr && evaluate(disabledDropExpr, ctx)) return;

      const typeOk = _isTypeAccepted(_dndState.dragging.type, acceptAttr);
      let maxOk = true;
      if (maxExpr) {
        const max = evaluate(maxExpr, ctx);
        const list = resolve(listPath, ctx);
        if (typeof max === "number" && Array.isArray(list) && list.length >= max) maxOk = false;
      }

      if (!typeOk || !maxOk) {
        rejectClass.split(/\s+/).filter(Boolean).forEach((c) => el.classList.add(c));
        dropClass.split(/\s+/).filter(Boolean).forEach((c) => el.classList.remove(c));
        _removePlaceholder();
        return;
      }

      rejectClass.split(/\s+/).filter(Boolean).forEach((c) => el.classList.remove(c));

      e.preventDefault();
      if (e.dataTransfer) e.dataTransfer.dropEffect = copyMode ? "copy" : "move";

      const idx = _calcDropIndex(el, e.clientX, e.clientY, sortDir);
      if (placeholderAttr) {
        _insertPlaceholder(el, idx, placeholderAttr, placeholderClass);
      }
    };

    const dragenterHandler = (e) => {
      if (!_dndState.dragging) return;
      if (disabledDropExpr && evaluate(disabledDropExpr, ctx)) return;

      _enterDepth++;
      if (_enterDepth === 1) {
        const typeOk = _isTypeAccepted(_dndState.dragging.type, acceptAttr);
        let maxOk = true;
        if (maxExpr) {
          const max = evaluate(maxExpr, ctx);
          const list = resolve(listPath, ctx);
          if (typeof max === "number" && Array.isArray(list) && list.length >= max) maxOk = false;
        }

        if (typeOk && maxOk) {
          dropClass.split(/\s+/).filter(Boolean).forEach((c) => el.classList.add(c));
          el.dispatchEvent(
            new CustomEvent("drag-enter", {
              bubbles: false,
              detail: { item: _dndState.dragging.item, type: _dndState.dragging.type },
            })
          );
        } else {
          rejectClass.split(/\s+/).filter(Boolean).forEach((c) => el.classList.add(c));
        }
      }
    };

    const dragleaveHandler = () => {
      if (!_dndState.dragging) return;
      _enterDepth--;
      if (_enterDepth <= 0) {
        _enterDepth = 0;
        dropClass.split(/\s+/).filter(Boolean).forEach((c) => el.classList.remove(c));
        rejectClass.split(/\s+/).filter(Boolean).forEach((c) => el.classList.remove(c));
        _removePlaceholder();
        el.dispatchEvent(
          new CustomEvent("drag-leave", {
            bubbles: false,
            detail: { item: _dndState.dragging?.item },
          })
        );
      }
    };

    const dropHandler = (e) => {
      e.preventDefault();
      e.stopPropagation();
      _enterDepth = 0;

      if (!_dndState.dragging) return;
      if (disabledDropExpr && evaluate(disabledDropExpr, ctx)) return;
      if (!_isTypeAccepted(_dndState.dragging.type, acceptAttr)) return;

      // Max check
      if (maxExpr) {
        const max = evaluate(maxExpr, ctx);
        const list = resolve(listPath, ctx);
        if (typeof max === "number" && Array.isArray(list) && list.length >= max) return;
      }

      const dragItem = _dndState.dragging.item;
      const sourceInfo = _dndState.dragging.listDirective;
      const sourceIndex = _dndState.dragging.sourceIndex;

      const dropIndex = _calcDropIndex(el, e.clientX, e.clientY, sortDir);

      // Remove visual feedback
      dropClass.split(/\s+/).filter(Boolean).forEach((c) => el.classList.remove(c));
      rejectClass.split(/\s+/).filter(Boolean).forEach((c) => el.classList.remove(c));
      _removePlaceholder();

      const targetList = resolve(listPath, ctx);
      if (!Array.isArray(targetList)) return;

      // Self-drop check: same list, same position
      const isSameList = sourceInfo && sourceInfo.el === el;
      if (isSameList && sourceIndex === dropIndex) {
        _dndState.dragging = null;
        return;
      }
      // Same list, but adjacent position (effectively same position)
      if (isSameList && sourceIndex + 1 === dropIndex) {
        _dndState.dragging = null;
        return;
      }

      // Perform the list mutation
      let newTargetList = [...targetList];

      if (isSameList) {
        // Same-list reorder
        const [moved] = newTargetList.splice(sourceIndex, 1);
        const insertAt = sourceIndex < dropIndex ? dropIndex - 1 : dropIndex;
        newTargetList.splice(insertAt, 0, moved);
        ctx.$set(listPath, newTargetList);

        el.dispatchEvent(
          new CustomEvent("reorder", {
            bubbles: true,
            detail: { list: newTargetList, item: dragItem, from: sourceIndex, to: insertAt },
          })
        );
      } else {
        // Cross-list transfer
        const itemToInsert = copyMode ? (typeof dragItem === "object" ? { ...dragItem } : dragItem) : dragItem;
        newTargetList.splice(dropIndex, 0, itemToInsert);
        ctx.$set(listPath, newTargetList);

        // Remove from source if move mode
        if (sourceInfo && !sourceInfo.copyMode && (removeMode || sourceInfo.removeMode)) {
          const sourceList = resolve(sourceInfo.listPath, sourceInfo.ctx);
          if (Array.isArray(sourceList) && sourceIndex != null) {
            const newSourceList = sourceList.filter((_, idx) => idx !== sourceIndex);
            sourceInfo.ctx.$set(sourceInfo.listPath, newSourceList);

            sourceInfo.el.dispatchEvent(
              new CustomEvent("remove", {
                bubbles: true,
                detail: { list: newSourceList, item: dragItem, index: sourceIndex },
              })
            );
          }
        }

        el.dispatchEvent(
          new CustomEvent("receive", {
            bubbles: true,
            detail: {
              list: newTargetList,
              item: dragItem,
              from: sourceIndex,
              fromList: sourceInfo ? resolve(sourceInfo.listPath, sourceInfo.ctx) : null,
            },
          })
        );
      }

      // Settle animation (apply to visible child, not display:contents wrapper)
      requestAnimationFrame(() => {
        const children = [...el.children];
        const targetChild = children[isSameList ? (sourceIndex < dropIndex ? dropIndex - 1 : dropIndex) : dropIndex];
        if (targetChild) {
          const animEl = targetChild.firstElementChild || targetChild;
          settleClass.split(/\s+/).filter(Boolean).forEach((c) => animEl.classList.add(c));
          animEl.addEventListener("animationend", () => {
            settleClass.split(/\s+/).filter(Boolean).forEach((c) => animEl.classList.remove(c));
          }, { once: true });
        }
      });

      // Clear dragging state
      _dndState.dragging = null;
    };

    // Keyboard: Enter/Space to drop
    const keydownHandler = (e) => {
      if (!_dndState.dragging) return;
      if (!_isTypeAccepted(_dndState.dragging.type, acceptAttr)) return;
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        // Simulate drop at the focused element's position
        const focused = el.querySelector(":focus");
        if (focused) {
          const measured = focused.style?.display === "contents"
            ? (focused.firstElementChild || focused) : focused;
          const rect = measured.getBoundingClientRect();
          const fakeEvent = {
            preventDefault() {},
            stopPropagation() {},
            clientX: rect.left + rect.width / 2,
            clientY: rect.top + rect.height + 1,
            dataTransfer: null,
          };
          dropHandler(fakeEvent);
        }
      }
    };

    el.addEventListener("dragover", dragoverHandler);
    el.addEventListener("dragenter", dragenterHandler);
    el.addEventListener("dragleave", dragleaveHandler);
    el.addEventListener("drop", dropHandler);
    el.addEventListener("keydown", keydownHandler);
    _onDispose(() => {
      el.removeEventListener("dragover", dragoverHandler);
      el.removeEventListener("dragenter", dragenterHandler);
      el.removeEventListener("dragleave", dragleaveHandler);
      el.removeEventListener("drop", dropHandler);
      el.removeEventListener("keydown", keydownHandler);
    });

    // ─── Reactive rendering ──────────────────────────────────────────
    const unwatchList = ctx.$watch(renderItems);
    _onDispose(unwatchList);
    renderItems();
  },
});

// ═══════════════════════════════════════════════════════════════════════
//  DRAG-MULTIPLE DIRECTIVE
// ═══════════════════════════════════════════════════════════════════════

registerDirective("drag-multiple", {
  priority: 16,
  init(el, name) {
    const ctx = findContext(el);
    const group = el.getAttribute("drag-group");
    const selectClass = el.getAttribute("drag-multiple-class") || "nojs-selected";

    if (!group) {
      _warn("drag-multiple requires drag-group attribute");
      return;
    }

    // Initialize group set if needed
    if (!_dndState.selected.has(group)) {
      _dndState.selected.set(group, new Set());
    }
    const selectedSet = _dndState.selected.get(group);

    const clickHandler = (e) => {
      const dragExpr = el.getAttribute("drag");
      const item = dragExpr ? evaluate(dragExpr, ctx) : null;
      const entry = { item, el, ctx };

      if (e.ctrlKey || e.metaKey) {
        // Additive selection
        const existing = [...selectedSet].find((s) => s.el === el);
        if (existing) {
          selectedSet.delete(existing);
          selectClass.split(/\s+/).filter(Boolean).forEach((c) => el.classList.remove(c));
        } else {
          selectedSet.add(entry);
          selectClass.split(/\s+/).filter(Boolean).forEach((c) => el.classList.add(c));
        }
      } else {
        // Replace selection
        for (const s of selectedSet) {
          selectClass.split(/\s+/).filter(Boolean).forEach((c) => s.el.classList.remove(c));
        }
        selectedSet.clear();
        selectedSet.add(entry);
        selectClass.split(/\s+/).filter(Boolean).forEach((c) => el.classList.add(c));
      }
    };

    el.addEventListener("click", clickHandler);
    _onDispose(() => {
      el.removeEventListener("click", clickHandler);
      // Remove this element from the selection set
      const existing = [...selectedSet].find((s) => s.el === el);
      if (existing) selectedSet.delete(existing);
    });

    // Escape clears selection for this group
    const escHandler = (e) => {
      if (e.key === "Escape") {
        for (const s of selectedSet) {
          selectClass.split(/\s+/).filter(Boolean).forEach((c) => s.el.classList.remove(c));
        }
        selectedSet.clear();
      }
    };
    window.addEventListener("keydown", escHandler);
    _onDispose(() => window.removeEventListener("keydown", escHandler));
  },
});
