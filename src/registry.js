// ═══════════════════════════════════════════════════════════════════════
//  DIRECTIVE REGISTRY & DOM PROCESSING
// ═══════════════════════════════════════════════════════════════════════

import { _currentEl, _setCurrentEl, _storeWatchers, _warn, _bulkDisposing, _setBulkDisposing } from "./globals.js";
import { _i18nListeners } from "./i18n.js";
import { _devtoolsEmit, _ctxRegistry } from "./devtools.js";

const _directives = new Map();
let _frozen = false;
const _coreDirectives = new Set();

export function registerDirective(name, handler) {
  if (_frozen && _coreDirectives.has(name)) {
    _warn(`Cannot override core directive "${name}".`);
    return;
  }
  _directives.set(name, {
    priority: handler.priority ?? 50,
    init: handler.init,
  });
  if (!_frozen) _coreDirectives.add(name);
}

export function _freezeDirectives() {
  _frozen = true;
}

function _matchDirective(attrName) {
  if (_directives.has(attrName))
    return { directive: _directives.get(attrName), match: attrName };
  // Pattern matches
  const patterns = ["class-*", "on:*", "style-*", "bind-*"];
  for (const p of patterns) {
    const prefix = p.replace("*", "");
    if (attrName.startsWith(prefix) && _directives.has(p)) {
      return { directive: _directives.get(p), match: p };
    }
  }
  return null;
}

export function processElement(el) {
  if (el.__declared) return;
  el.__declared = true;

  const matched = [];
  for (const attr of [...el.attributes]) {
    const m = _matchDirective(attr.name);
    if (m) {
      matched.push({
        name: attr.name,
        value: attr.value,
        priority: m.directive.priority,
        init: m.directive.init,
      });
    }
  }

  matched.sort((a, b) => a.priority - b.priority);
  const prev = _currentEl;
  for (const m of matched) {
    _setCurrentEl(el);
    m.init(el, m.name, m.value);
  }
  _setCurrentEl(prev);

  if (matched.length > 0) {
    _devtoolsEmit("directive:init", {
      element: el.tagName?.toLowerCase(),
      directives: matched.map((m) => ({ name: m.name, value: m.value })),
    });
  }
}

export function processTree(root) {
  if (!root) return;
  if (root.nodeType === 1 && !root.__declared) processElement(root);
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
  while (walker.nextNode()) {
    const node = walker.currentNode;
    if (node.tagName === "TEMPLATE" || node.tagName === "SCRIPT") continue;
    if (!node.__declared) processElement(node);
  }
}

// ═══════════════════════════════════════════════════════════════════════
//  PRE-COMPILED TEMPLATE DIRECTIVES — Task 4.2
//  On the first processTree of a template clone, record which directives
//  exist at which tree-walker positions (a "template descriptor").
//  For subsequent clones, apply directives directly using the descriptor
//  without re-scanning attributes or re-matching directive names.
//
//  Strategy: depth-first tree-walker order index.  Both compilation and
//  application use the same TreeWalker traversal, so position `n` in the
//  descriptor always maps to position `n` in any structurally-identical
//  clone.  This avoids fragile child-index path arithmetic across
//  fragment/single-root/multi-root wrapping variations.
// ═══════════════════════════════════════════════════════════════════════

// Template source → descriptor object
const _tplDescriptors = new WeakMap();

// Compile a template's directive descriptor by walking a reference clone.
// Called once per template source. Returns:
// { total: number, entries: Map<dfsIndex, directives[]> }
// where dfsIndex is the 0-based tree-walker position (root = 0, then DFS).
export function _compileTemplate(tpl) {
  if (_tplDescriptors.has(tpl)) return _tplDescriptors.get(tpl);

  // Task 2.6: shortcut — if the template carries a pre-built descriptor
  // (injected by the compiler as a data-nojs-desc JSON attribute), parse
  // it directly and skip the runtime TreeWalker + attribute scan entirely.
  const descAttr = tpl.getAttribute ? tpl.getAttribute("data-nojs-desc") : null;
  if (descAttr) {
    try {
      const raw = JSON.parse(descAttr);
      // raw is { total: number, entries: { [dfsIndex]: [{ name, priority? }] } }
      const entries = new Map();
      for (const [idxStr, dirList] of Object.entries(raw.entries || {})) {
        const resolved = dirList.map((d) => {
          const m = _matchDirective(d.name);
          return m ? { name: d.name, priority: m.directive.priority, init: m.directive.init } : null;
        }).filter(Boolean);
        if (resolved.length > 0) {
          resolved.sort((a, b) => a.priority - b.priority);
          entries.set(Number(idxStr), resolved);
        }
      }
      const descriptor = { total: raw.total || 0, entries };
      _tplDescriptors.set(tpl, descriptor);
      return descriptor;
    } catch (_) {
      // Fall through to runtime scan on parse error
    }
  }

  // Clone to walk without side effects
  const content = tpl.content ? tpl.content : tpl;
  const refClone = content.cloneNode(true);

  // For DocumentFragment, wrap in a temporary element for TreeWalker
  let walkRoot;
  const isFragment = refClone.nodeType === 11;
  if (isFragment) {
    walkRoot = document.createElement("div");
    walkRoot.appendChild(refClone);
  } else {
    walkRoot = refClone;
  }

  const entries = new Map();
  let idx = 0;
  let total = 0;

  // Walk in the same order as processTree
  function scanElement(el) {
    const myIdx = idx;
    total++;
    const matched = [];
    for (const attr of [...el.attributes]) {
      const m = _matchDirective(attr.name);
      if (m) {
        matched.push({
          name: attr.name,
          priority: m.directive.priority,
          init: m.directive.init,
        });
      }
    }
    if (matched.length > 0) {
      matched.sort((a, b) => a.priority - b.priority);
      entries.set(myIdx, matched);
    }
  }

  if (walkRoot.nodeType === 1) { scanElement(walkRoot); idx++; }
  const walker = document.createTreeWalker(walkRoot, NodeFilter.SHOW_ELEMENT);
  while (walker.nextNode()) {
    const node = walker.currentNode;
    if (node.tagName === "TEMPLATE" || node.tagName === "SCRIPT") continue;
    scanElement(node);
    idx++;
  }

  const descriptor = { total, entries };
  _tplDescriptors.set(tpl, descriptor);
  return descriptor;
}

// Process a cloned tree using a pre-compiled descriptor.
// `root` is the live DOM node (the loop item after _makeLoopItem).
// `descriptor` is from _compileTemplate.
// Falls back to full processTree on structure mismatch.
export function processTreeFromDescriptor(root, descriptor) {
  if (!root || !descriptor) { processTree(root); return; }
  if (descriptor.entries.size === 0) {
    // No directives in this template — just mark everything declared
    if (root.nodeType === 1) root.__declared = true;
    const w = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
    while (w.nextNode()) w.currentNode.__declared = true;
    return;
  }

  // Phase 6: For small templates (few directive entries relative to total
  // elements), skip building the full elements[] array. Instead, use a
  // single TreeWalker pass that applies directives at matching DFS positions
  // and marks everything else as declared.  This avoids the overhead of two
  // TreeWalkers + an intermediate array allocation for simple templates.

  // Determine offset: walk once to count elements so we can detect
  // single-root unwrap.  For small trees this is cheap.
  let liveCount = 0;
  if (root.nodeType === 1) liveCount++;
  const countWalker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
  while (countWalker.nextNode()) {
    const n = countWalker.currentNode;
    if (n.tagName !== "TEMPLATE" && n.tagName !== "SCRIPT") liveCount++;
  }

  let offset = 0;
  if (liveCount === descriptor.total - 1) {
    offset = 1; // single-root: skip the wrapper div index
  } else if (liveCount !== descriptor.total) {
    // Structure mismatch — fall back to full processTree
    processTree(root);
    return;
  }

  const prev = _currentEl;
  let ok = true;
  let idx = 0;

  // Single-pass TreeWalker: apply directives at matching DFS positions
  function _applyAtIndex(el) {
    const dfsIdx = idx + offset;
    idx++;

    const directives = descriptor.entries.get(dfsIdx);
    if (!directives) {
      if (!el.__declared) el.__declared = true;
      return true;
    }

    if (el.__declared) return true;

    // Quick structure sanity check: first directive attribute must exist
    if (!el.hasAttribute(directives[0].name)) return false;

    el.__declared = true;
    for (const d of directives) {
      _setCurrentEl(el);
      const actualValue = el.getAttribute(d.name);
      d.init(el, d.name, actualValue !== null ? actualValue : "");
    }

    if (directives.length > 0) {
      _devtoolsEmit("directive:init", {
        element: el.tagName?.toLowerCase(),
        directives: directives.map((d) => ({ name: d.name, value: el.getAttribute(d.name) || "" })),
      });
    }
    return true;
  }

  if (root.nodeType === 1) {
    ok = _applyAtIndex(root);
  }
  if (ok) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
    while (walker.nextNode()) {
      const node = walker.currentNode;
      if (node.tagName === "TEMPLATE" || node.tagName === "SCRIPT") continue;
      if (!_applyAtIndex(node)) { ok = false; break; }
    }
  }

  _setCurrentEl(prev);

  if (!ok) {
    // Fallback: processTree handles already-declared elements gracefully
    processTree(root);
  }
}

// ─── Disposal: proactive cleanup of watchers/listeners/disposers ────────

function _disposeElement(node) {
  const ctxId = node.__ctx?.__raw?.__devtoolsId;

  if (node.__ctx && node.__ctx.__listeners) {
    for (const fn of node.__ctx.__listeners) {
      _storeWatchers.delete(fn);
      _i18nListeners.delete(fn);
    }
    node.__ctx.__listeners.clear();
  }
  if (node.__disposers) {
    node.__disposers.forEach((fn) => fn());
    node.__disposers = null;
  }
  node.__declared = false;

  if (ctxId != null) {
    _ctxRegistry.delete(ctxId);
    _devtoolsEmit("ctx:disposed", {
      id: ctxId,
      elementTag: node.tagName?.toLowerCase(),
    });
  }
}

export function _disposeTree(root) {
  if (!root) return;
  _disposeElement(root);
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
  while (walker.nextNode()) _disposeElement(walker.currentNode);
}

export function _disposeChildren(parent) {
  if (!parent) return;
  // Phase 6: set bulk disposing flag so _cleanupDeps skips per-key removal
  const wasBulk = _bulkDisposing;
  _setBulkDisposing(true);
  try {
    const walker = document.createTreeWalker(parent, NodeFilter.SHOW_ELEMENT);
    while (walker.nextNode()) _disposeElement(walker.currentNode);
  } finally {
    _setBulkDisposing(wasBulk);
  }
}
