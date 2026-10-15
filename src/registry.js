// ═══════════════════════════════════════════════════════════════════════
//  DIRECTIVE REGISTRY & DOM PROCESSING
// ═══════════════════════════════════════════════════════════════════════

import { _config, _currentEl, _setCurrentEl, _deleteStoreWatcher, _deleteRouteWatcher, _i18nListeners, _log, _warn } from "./globals.js";
import { _devtoolsEmit, _ctxRegistry } from "./devtools.js";
import { findContext } from "./dom.js";
import { evaluate } from "./evaluate.js";
import { _isDraining } from "./context.js";

const _directives = new Map();
let _frozen = false;
const _coreDirectives = new Set();

export function registerDirective(name, handler) {
  if (_frozen && (_coreDirectives.has(name) || (_config.strictDirectives && _coveredByCoreWildcard(name)))) {
    _warn(`Cannot override core directive "${name}".`);
    return;
  }
  const shadowed = _frozen && _coveredByCoreWildcard(name);
  if (shadowed) _log(`Directive "${name}" shadows core "${shadowed}" for that attribute.`);
  _directives.set(name, {
    priority: handler.priority ?? 50,
    init: handler.init,
    gated: !!handler.gated,
  });
  _coreDirectives.add(name);
  _matchCache.clear();
  _registryVersion++;
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
  _matchCache.clear();
  _registryVersion++;
}

// ─── Pattern-match prefixes for wildcard directives (hoisted, static) ────────
const _MATCH_PATTERNS = Object.freeze([
  { pattern: "class-*", prefix: "class-" },
  { pattern: "on:*",    prefix: "on:" },
  { pattern: "style-*", prefix: "style-" },
  { pattern: "bind-*",  prefix: "bind-" },
]);

// The frozen core wildcard (e.g. "bind-*") that would already match `name`, or null.
function _coveredByCoreWildcard(name) {
  for (let i = 0; i < _MATCH_PATTERNS.length; i++) {
    const { pattern, prefix } = _MATCH_PATTERNS[i];
    if (name.startsWith(prefix) && _coreDirectives.has(pattern)) return pattern;
  }
  return null;
}

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

// Memoized directive matching keyed by the element's attribute-name
// signature. Loop clones (and any repeated markup) share identical
// attribute sets, so matching + priority sort runs once per shape instead
// of once per element. Descriptors hold no attribute values — those are
// read per element at init time. Invalidated whenever the directive
// registry changes.
const _matchCache = new Map();
const _MATCH_CACHE_MAX = 500;

function _matchedForElement(el) {
  const attrs = el.attributes;
  const len = attrs.length;
  let sig = "";
  for (let i = 0; i < len; i++) sig += attrs[i].name + "\0";

  let matched = _matchCache.get(sig);
  if (matched === undefined) {
    matched = [];
    for (let i = 0; i < len; i++) {
      const attrName = attrs[i].name;
      const m = _matchDirective(attrName);
      if (m) {
        matched.push({
          name: attrName,
          priority: m.directive.priority,
          init: m.directive.init,
          gated: m.directive.gated,
        });
      }
    }
    matched.sort((a, b) => a.priority - b.priority);
    // Bounded FIFO eviction: dropping the oldest signature keeps the hot
    // loop-clone shapes cached; a clear-all here would re-match and re-sort
    // every live shape on the next update pass.
    if (_matchCache.size >= _MATCH_CACHE_MAX)
      _matchCache.delete(_matchCache.keys().next().value);
    _matchCache.set(sig, matched);
  }
  return matched;
}

export function processElement(el, matched, values) {
  if (el.__declared) return;
  el.__declared = true;

  if (!matched) matched = _matchedForElement(el);

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

  // Descriptors are shared across same-shaped elements; attribute values
  // are per-element. Snapshot them before any init runs — an init may
  // mutate the element's attributes. Callers with identical markup (loop
  // clones) pass pre-captured values; inits must never mutate the array.
  if (!values) {
    values = new Array(matched.length);
    for (let i = 0; i < matched.length; i++) values[i] = el.getAttribute(matched[i].name);
  }

  const prev = _currentEl;
  for (let i = 0; i < matched.length; i++) {
    const m = matched[i];
    if (m.gated && ifGateFalsy) {
      el.__gatedDirs = el.__gatedDirs || [];
      el.__gatedDirs.push({ name: m.name, value: values[i], init: m.init });
      continue;
    }
    _setCurrentEl(el);
    // Safety Rule 8: a throwing init must not abort the rest of the render.
    try {
      m.init(el, m.name, values[i]);
    } catch (err) {
      _warn(`directive "${m.name}" init error on <${el.tagName.toLowerCase()}>:`, err);
      // Outside a batch drain, rethrown once the outermost walk finishes
      // (_endWalk) so callers see the same error they did before isolation.
      if (_walkDepth > 0 && !_isDraining()) (_walkErrors || (_walkErrors = [])).push(err);
    } finally {
      _setCurrentEl(prev);
    }
  }

  // Save a persistent copy so deactivation can re-gate for the next cycle
  if (el.__gatedDirs && el.__gatedDirs.length > 0) {
    el.__gatedDirsMeta = el.__gatedDirs.map((d) => ({ ...d }));
  }

  if (matched.length > 0) {
    _devtoolsEmit("directive:init", {
      element: el.tagName?.toLowerCase(),
      directives: matched.map((m, i) => ({ name: m.name, value: values[i] })),
    });
  }
}

// ─── Process plans: precomputed directive walks for repeated markup ──────
// A plan captures, for one template shape, every element that carries a
// matched directive: its child-index path from the root, the shared match
// descriptors, and the attribute-value snapshot. Structurally identical
// clones (loop rows) replay the plan with direct children[] hops instead of
// a TreeWalker + per-element attribute scans. Semantics match processTree:
// nodes are resolved up front (snapshot), and nodes detached by an earlier
// init are skipped.

// Plans cache match descriptors computed against the directive registry at
// build time; a later registerDirective/_removeCoreDirective would leave
// them matching against a stale registry. Callers stamp plans with
// _registryVersion and rebuild on mismatch.
export let _registryVersion = 0;

export function _buildProcessPlan(root) {
  const plan = [];
  const walk = (node, path) => {
    if (node.tagName === "TEMPLATE" || node.tagName === "SCRIPT") return;
    const matched = _matchedForElement(node);
    if (matched.length > 0) {
      const values = new Array(matched.length);
      for (let i = 0; i < matched.length; i++) values[i] = node.getAttribute(matched[i].name);
      plan.push({ path, matched, values });
    }
    const kids = node.children;
    for (let i = 0; i < kids.length; i++) walk(kids[i], path.concat(i));
  };
  walk(root, []);
  plan.registryVersion = _registryVersion;
  return plan;
}

// Init errors collected during the outermost processTree/_runProcessPlan.
let _walkDepth = 0;
let _walkErrors = null;

function _endWalk() {
  if (--_walkDepth > 0 || !_walkErrors) return;
  const err = _walkErrors[0];
  _walkErrors = null;
  throw err;
}

export function _runProcessPlan(root, plan) {
  _walkDepth++;
  try {
    _runPlanNodes(root, plan);
  } catch (err) {
    if (--_walkDepth === 0) _walkErrors = null;
    throw err;
  }
  _endWalk();
}

function _runPlanNodes(root, plan) {
  const len = plan.length;
  // Resolve every planned node before running any init — ANY init may mutate
  // the tree mid-run (structural directives detach/reparent, bind-html
  // replaces children), and a live children[] lookup after that would land
  // on the wrong node or a freshly-created one that this plan's shared
  // descriptors don't describe. The containment check below then skips
  // nodes an earlier init removed, matching processTree semantics.
  const nodes = new Array(len);
  for (let i = 0; i < len; i++) {
    const path = plan[i].path;
    let node = root;
    for (let j = 0; j < path.length && node; j++) node = node.children[path[j]];
    nodes[i] = node;
  }
  for (let i = 0; i < len; i++) {
    const node = nodes[i];
    if (!node) continue;
    if (node !== root && !root.contains(node)) continue;
    if (!node.__declared) processElement(node, plan[i].matched, plan[i].values);
  }
}

export function processTree(root) {
  if (!root) return;
  _walkDepth++;
  try {
    _processTreeNodes(root);
  } catch (err) {
    if (--_walkDepth === 0) _walkErrors = null;
    throw err;
  }
  _endWalk();
}

function _processTreeNodes(root) {
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

// `discard` marks a subtree that is being removed from the DOM for good
// (cleared/replaced loop clones): disposers tagged `_elOnly` — pure
// element-local removeEventListener cleanups — are skipped, since the node
// and its handlers are garbage-collected together. Timers, observers and
// window/document listeners always run.
function _disposeElement(node, discard) {
  const ctxId = _config.devtools ? node.__ctx?.__raw?.__devtoolsId : null;

  if (node.__ctx && node.__ctx.__listeners) {
    for (const fn of node.__ctx.__listeners) {
      _deleteStoreWatcher(fn);
      _i18nListeners.delete(fn);
    }
    node.__ctx.__listeners.clear();
  }
  // Data-registered watchers (see _watchExpr): delete each fn from its
  // context chain and the store/route/i18n registries — the same cleanup
  // the per-watcher dispose closure used to do. Must run on discard too:
  // ancestor contexts outlive the discarded subtree, and stale fns in
  // their listener Sets are retained memory until the next notify sweep.
  if (node.__watcherFns) {
    for (const fn of node.__watcherFns) {
      let c = fn._wctx;
      while (c && c.__isProxy) {
        c.__listeners.delete(fn);
        c = c.$parent;
      }
      _deleteStoreWatcher(fn);
      _deleteRouteWatcher(fn);
      _i18nListeners.delete(fn);
    }
    node.__watcherFns = null;
  }
  if (node.__disposers) {
    for (const fn of node.__disposers) {
      if (discard && fn._elOnly) continue;
      try { fn(); } catch (err) { _warn("disposer error:", err); }
    }
    node.__disposers = null;
  }
  // Also clean up gated directive disposers on full teardown
  if (node.__gateDisposers) {
    for (const fn of node.__gateDisposers) {
      try { fn(); } catch (err) { _warn("gate disposer error:", err); }
    }
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

export function _disposeTree(root, discard) {
  if (!root) return;
  _disposeElement(root, discard);
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
  while (walker.nextNode()) _disposeElement(walker.currentNode, discard);
}

export function _disposeChildren(parent, discard) {
  if (!parent) return;
  const walker = document.createTreeWalker(parent, NodeFilter.SHOW_ELEMENT);
  while (walker.nextNode()) _disposeElement(walker.currentNode, discard);
}
