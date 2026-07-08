// ═══════════════════════════════════════════════════════════════════════
//  DIRECTIVE REGISTRY & DOM PROCESSING
// ═══════════════════════════════════════════════════════════════════════

import { _currentEl, _setCurrentEl, _deleteStoreWatcher, _i18nListeners, _warn } from "./globals.js";
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
  // Single Map.get avoids has+get double lookup on every exact match
  const exact = _directives.get(attrName);
  if (exact) return { directive: exact, match: attrName };
  // Wildcard prefixes all start with c(lass-), o(n:), s(tyle-), or b(ind-).
  // Skip the pattern loop entirely for plain attrs (id, href, data-*, aria-*, etc.)
  const c0 = attrName.charCodeAt(0);
  if (c0 !== 99 /* c */ && c0 !== 111 /* o */ && c0 !== 115 /* s */ && c0 !== 98 /* b */) return null;
  for (let i = 0; i < _MATCH_PATTERNS.length; i++) {
    const { pattern, prefix } = _MATCH_PATTERNS[i];
    if (attrName.startsWith(prefix)) {
      const d = _directives.get(pattern);
      if (d) return { directive: d, match: pattern };
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
      });
    }
  }

  // Fast path: skip sort/dispatch/emit for elements with no directives (the common case)
  if (matched.length === 0) return;
  // Sort only when multiple directives need priority ordering
  if (matched.length > 1) matched.sort((a, b) => a.priority - b.priority);

  const prev = _currentEl;
  for (let i = 0; i < matched.length; i++) {
    _setCurrentEl(el);
    matched[i].init(el, matched[i].name, matched[i].value);
  }
  _setCurrentEl(prev);

  _devtoolsEmit("directive:init", {
    element: el.tagName?.toLowerCase(),
    directives: matched.map((m) => ({ name: m.name, value: m.value })),
  });
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
  // When root is in a live document, use the O(1) isConnected check instead
  // of O(depth) root.contains(node) to detect nodes removed during processing.
  // For DocumentFragment roots (not connected), skip the guard entirely —
  // nothing can be removed from a document mid-walk in that case.
  const checkConnected = root.isConnected;
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    if (node.tagName === "TEMPLATE" || node.tagName === "SCRIPT") continue;
    if (checkConnected && !node.isConnected) continue;
    if (!node.__declared) processElement(node);
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
