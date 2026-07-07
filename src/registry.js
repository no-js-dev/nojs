// ═══════════════════════════════════════════════════════════════════════
//  DIRECTIVE REGISTRY & DOM PROCESSING
// ═══════════════════════════════════════════════════════════════════════

import { _currentEl, _setCurrentEl, _deleteStoreWatcher, _i18nListeners, _warn } from "./globals.js";
import { _devtoolsEmit, _ctxRegistry } from "./devtools.js";
import { findContext } from "./dom.js";
import { evaluate } from "./evaluate.js";

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
    gated: !!handler.gated,
  });
  _coreDirectives.add(name);
}

export function _freezeDirectives() {
  _frozen = true;
}

export function _removeCoreDirective(name) {
  if (!_frozen) {
    _warn(`_removeCoreDirective("${name}") can only be called after init.`);
    return;
  }
  if (!_coreDirectives.has(name)) {
    _warn(`_removeCoreDirective: "${name}" is not a registered core directive.`);
    return;
  }
  _coreDirectives.delete(name);
  _directives.delete(name);
}

// ─── Pattern-match prefixes for wildcard directives (hoisted, static) ────────
const _MATCH_PATTERNS = Object.freeze([
  { pattern: "class-*", prefix: "class-" },
  { pattern: "on:*",    prefix: "on:" },
  { pattern: "style-*", prefix: "style-" },
  { pattern: "bind-*",  prefix: "bind-" },
]);

function _matchDirective(attrName) {
  if (_directives.has(attrName))
    return { directive: _directives.get(attrName), match: attrName };
  // Pattern matches
  for (let i = 0; i < _MATCH_PATTERNS.length; i++) {
    const { pattern, prefix } = _MATCH_PATTERNS[i];
    if (attrName.startsWith(prefix) && _directives.has(pattern)) {
      return { directive: _directives.get(pattern), match: pattern };
    }
  }
  return null;
}

export function processElement(el) {
  if (el.__declared) return;
  el.__declared = true;

  const matched = [];
  const attrs = el.attributes;
  for (let i = 0, len = attrs.length; i < len; i++) {
    const attr = attrs[i];
    const m = _matchDirective(attr.name);
    if (m) {
      matched.push({
        name: attr.name,
        value: attr.value,
        priority: m.directive.priority,
        init: m.directive.init,
        gated: m.directive.gated,
      });
    }
  }

  matched.sort((a, b) => a.priority - b.priority);

  // ─── If-gate: evaluate the if expression once per element pass ────────
  // Gated directives (e.g. get, page-*) that run BEFORE if (priority 10)
  // are deferred when the element's if condition is falsy.  The gate reads
  // the attribute directly so it works regardless of directive priority.
  let ifGateFalsy = false;
  const hasGated = matched.some((m) => m.gated);
  if (hasGated && el.hasAttribute("if")) {
    const ifExpr = el.getAttribute("if");
    const ctx = findContext(el);
    ifGateFalsy = !evaluate(ifExpr, ctx);
  }

  const prev = _currentEl;
  for (const m of matched) {
    if (m.gated && ifGateFalsy) {
      el.__gatedDirs = el.__gatedDirs || [];
      el.__gatedDirs.push({ name: m.name, value: m.value, init: m.init });
      continue;
    }
    _setCurrentEl(el);
    m.init(el, m.name, m.value);
  }
  _setCurrentEl(prev);

  // Save a persistent copy so deactivation can re-gate for the next cycle
  if (el.__gatedDirs && el.__gatedDirs.length > 0) {
    el.__gatedDirsMeta = el.__gatedDirs.map((d) => ({ ...d }));
  }

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
  // Snapshot all elements before processing. Structural directives (loops,
  // conditionals) may remove nodes from the DOM during init, which derails
  // the TreeWalker — a detached currentNode cannot navigate to siblings.
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  for (const node of nodes) {
    if (node.tagName === "TEMPLATE" || node.tagName === "SCRIPT") continue;
    if (!root.contains(node)) continue; // Skip nodes removed during earlier processing
    if (!node.__declared) processElement(node);
  }
}

// ─── If-gate: activate / deactivate gated directives ────────────────────
// Called from the `if` directive's render function to run or tear down
// directives registered with `gated: true`.  Disposers are kept in a
// separate bucket (`__gateDisposers`) so deactivation never touches the
// `if` directive's own watcher stored in `__disposers`.

export function _activateGated(el) {
  if (!el.__gatedDirs || el.__gatedDirs.length === 0) return;
  const prev = _currentEl;
  const dirs = el.__gatedDirs;
  el.__gatedDirs = [];
  el.__gateDisposers = el.__gateDisposers || [];

  for (const desc of dirs) {
    _setCurrentEl(el);
    // Snapshot the disposers array length before init so we can redirect
    // any newly-registered disposers into __gateDisposers.
    el.__disposers = el.__disposers || [];
    const before = el.__disposers.length;
    try {
      desc.init(el, desc.name, desc.value);
    } catch (err) {
      _warn(`gated directive "${desc.name}" activation error:`, err);
    }
    // Move newly-added disposers to the gate bucket
    if (el.__disposers.length > before) {
      const newDisposers = el.__disposers.splice(before);
      el.__gateDisposers.push(...newDisposers);
    }
  }
  _setCurrentEl(prev);
}

export function _deactivateGated(el) {
  // Run + clear gate disposers
  if (el.__gateDisposers) {
    for (const fn of el.__gateDisposers) {
      try { fn(); } catch (err) { _warn("gate disposer error:", err); }
    }
    el.__gateDisposers = [];
  }
  // Re-capture descriptors for the next truthy flip
  if (el.__gatedDirsMeta) {
    el.__gatedDirs = el.__gatedDirsMeta.map((d) => ({ ...d }));
  }
}

// ─── Disposal: proactive cleanup of watchers/listeners/disposers ────────

function _disposeElement(node) {
  const ctxId = node.__ctx?.__raw?.__devtoolsId;

  if (node.__ctx && node.__ctx.__listeners) {
    for (const fn of node.__ctx.__listeners) {
      _deleteStoreWatcher(fn);
      _i18nListeners.delete(fn);
    }
    node.__ctx.__listeners.clear();
  }
  if (node.__disposers) {
    node.__disposers.forEach((fn) => fn());
    node.__disposers = null;
  }
  // Also clean up gated directive disposers on full teardown
  if (node.__gateDisposers) {
    node.__gateDisposers.forEach((fn) => fn());
    node.__gateDisposers = null;
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
  const walker = document.createTreeWalker(parent, NodeFilter.SHOW_ELEMENT);
  while (walker.nextNode()) _disposeElement(walker.currentNode);
}
