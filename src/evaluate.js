// ═══════════════════════════════════════════════════════════════════════
//  EXPRESSION EVALUATOR
// ═══════════════════════════════════════════════════════════════════════

import { _stores, _routerInstance, _filters, _warn, _notifyStoreWatchers, _globals } from "./globals.js";
import { _i18n } from "./i18n.js";
import { _collectKeys } from "./context.js";
import {
  _tokenize, _parseExpr, _parseStatements, _parsePipes, _parseAndCache,
  _exprCache, _stmtCache, _pipeCache,
} from "./parser.js";

// Re-export parser symbols for backward compatibility
export { _exprCache, _stmtCache, _parseAndCache, _parseStatements, _parsePipes, _tokenize, _parseExpr, _pipeCache };

// ---------------------------------------------------------------------------
// AST tree-walking evaluator
// ---------------------------------------------------------------------------
const _FORBIDDEN_PROPS = { __proto__: 1, constructor: 1, prototype: 1 };

/* Safe subset of JS globals available in expressions (no eval/Function/process) */
const _SAFE_GLOBALS = {
  Array, Object, String, Number, Boolean, Math, Date, RegExp, Map, Set,
  JSON, parseInt, parseFloat, isNaN, isFinite, Infinity, NaN, undefined,
  Error, Symbol, console,
};

// Explicit allow-list for browser globals accessible in template expressions.
// Using an allow-list (opt-in) rather than a deny-list (opt-out) ensures that
// network and storage APIs — fetch, XMLHttpRequest, localStorage, sessionStorage,
// WebSocket, indexedDB — are unreachable from template code by default, closing
// the surface where interpolated external data could trigger unintended requests.
// window, document, and location are further wrapped in Proxy objects below
// to block sensitive sub-properties (fetch, cookie, navigation, etc.).

// ── Security proxies for window, document, and location ─────────────────
// Even though window/document are on the allow-list, we wrap them in Proxy
// objects that block access to sensitive sub-properties (network, storage,
// cookie, eval, etc.) while still allowing safe DOM / measurement APIs.

const _BLOCKED_WINDOW_PROPS = new Set([
  'fetch', 'XMLHttpRequest', 'localStorage', 'sessionStorage',
  'WebSocket', 'indexedDB', 'eval', 'Function', 'importScripts',
  'open', 'postMessage',
]);
// Props on window that must return safe proxies instead of raw objects
const _WINDOW_PROXY_OVERRIDES = {}; // populated after proxy creation below

const _BLOCKED_DOCUMENT_PROPS = new Set([
  'cookie', 'domain', 'write', 'writeln', 'execCommand',
]);

const _safeWindow = typeof globalThis !== 'undefined' && typeof globalThis.window !== 'undefined'
  ? new Proxy(globalThis.window, {
      get(target, prop, receiver) {
        if (typeof prop === 'string' && _BLOCKED_WINDOW_PROPS.has(prop)) return undefined;
        if (typeof prop === 'string' && prop in _WINDOW_PROXY_OVERRIDES) return _WINDOW_PROXY_OVERRIDES[prop];
        return Reflect.get(target, prop, receiver);
      },
      set(target, prop, value) {
        // Block writes to dangerous window properties from expressions;
        // allow writing user-defined properties (e.g. window.__myHelper)
        if (typeof prop === 'string' && _BLOCKED_WINDOW_PROPS.has(prop)) return true;
        if (prop === 'name' || prop === 'status') return true; // anti-exfiltration
        target[prop] = value;
        return true;
      },
    })
  : undefined;

const _safeDocument = typeof globalThis !== 'undefined' && typeof globalThis.document !== 'undefined'
  ? new Proxy(globalThis.document, {
      get(target, prop, receiver) {
        if (typeof prop === 'string' && _BLOCKED_DOCUMENT_PROPS.has(prop)) return undefined;
        if (prop === 'defaultView') return _safeWindow;
        return Reflect.get(target, prop, receiver);
      },
      set(target, prop, value) {
        if (typeof prop === 'string' && _BLOCKED_DOCUMENT_PROPS.has(prop)) return true;
        target[prop] = value;
        return true;
      },
    })
  : undefined;

// Read-only location wrapper — exposes common getters via a plain object with
// property descriptors that read from the real location. Navigation methods are
// replaced with no-ops. Using a plain object avoids Proxy invariant violations
// on non-configurable properties (like location.assign).
const _LOCATION_READ_PROPS = [
  'href', 'pathname', 'search', 'hash', 'origin',
  'hostname', 'port', 'protocol', 'host',
];
const _locationNoop = () => {};

const _safeLocation = typeof globalThis !== 'undefined' && typeof globalThis.location !== 'undefined'
  ? (() => {
      const loc = {};
      for (const prop of _LOCATION_READ_PROPS) {
        Object.defineProperty(loc, prop, {
          get() { return globalThis.location[prop]; },
          set() { /* silently ignore writes */ },
          enumerable: true, configurable: false,
        });
      }
      loc.assign = _locationNoop;
      loc.replace = _locationNoop;
      loc.reload = _locationNoop;
      loc.toString = () => globalThis.location.href;
      return Object.freeze(loc);
    })()
  : undefined;

// Read-only history wrapper — exposes state and length as read-only getters,
// replaces navigation methods with no-ops. Prevents expressions from
// manipulating browser history (pushState, back, forward, etc.).
const _HISTORY_READ_PROPS = ['length', 'state', 'scrollRestoration'];

const _safeHistory = typeof globalThis !== 'undefined' && typeof globalThis.history !== 'undefined'
  ? (() => {
      const h = {};
      for (const prop of _HISTORY_READ_PROPS) {
        Object.defineProperty(h, prop, {
          get() { return globalThis.history[prop]; },
          enumerable: true, configurable: false,
        });
      }
      h.pushState = _locationNoop;
      h.replaceState = _locationNoop;
      h.back = _locationNoop;
      h.forward = _locationNoop;
      h.go = _locationNoop;
      return Object.freeze(h);
    })()
  : undefined;

// Navigator proxy — blocks sendBeacon (data exfiltration) and credentials
const _BLOCKED_NAVIGATOR_PROPS = new Set(['sendBeacon', 'credentials']);
const _safeNavigator = typeof globalThis !== 'undefined' && typeof globalThis.navigator !== 'undefined'
  ? new Proxy(globalThis.navigator, {
      get(target, prop, receiver) {
        if (typeof prop === 'string' && _BLOCKED_NAVIGATOR_PROPS.has(prop)) return undefined;
        return Reflect.get(target, prop, receiver);
      },
      set() { return true; }, // navigator props are browser-enforced read-only
    })
  : undefined;

// Wire window.location → _safeLocation, window.document → _safeDocument,
// window.history → _safeHistory, window.navigator → _safeNavigator
// so accessing via the window proxy returns safe versions
if (_safeLocation) _WINDOW_PROXY_OVERRIDES.location = _safeLocation;
if (_safeDocument) _WINDOW_PROXY_OVERRIDES.document = _safeDocument;
if (_safeHistory) _WINDOW_PROXY_OVERRIDES.history = _safeHistory;
if (_safeNavigator) _WINDOW_PROXY_OVERRIDES.navigator = _safeNavigator;

const _BROWSER_GLOBALS = new Set([
  'window', 'document', 'console', 'location', 'history',
  'navigator', 'screen', 'performance', 'crypto',
  // setTimeout/setInterval allow deferred execution from template expressions;
  // necessary for legitimate use cases (e.g. debounce patterns in event handlers).
  'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval',
  'requestAnimationFrame', 'cancelAnimationFrame',
  // alert/confirm/prompt are included for completeness and backward compatibility
  // (e.g. confirm dialogs before delete). They are discouraged in production UIs —
  // prefer custom modal components for a better user experience.
  'alert', 'confirm', 'prompt',
  'CustomEvent', 'Event', 'URL', 'URLSearchParams',
  'FormData', 'FileReader', 'Blob', 'Promise',
]);

function _evalNode(node, scope) {
  try {
    if (!node) return undefined;

    switch (node.type) {

      case 'Literal':
        return node.value;

      case 'Identifier':
        if (node.name in scope) return scope[node.name];
        if (node.name in _SAFE_GLOBALS) return _SAFE_GLOBALS[node.name];
        if (_BROWSER_GLOBALS.has(node.name) && typeof globalThis !== 'undefined') {
          if (node.name === 'window') return _safeWindow;
          if (node.name === 'document') return _safeDocument;
          if (node.name === 'location') return _safeLocation;
          if (node.name === 'history') return _safeHistory;
          if (node.name === 'navigator') return _safeNavigator;
          return globalThis[node.name];
        }
        return undefined;

      case 'Forbidden':
        return undefined;

      case 'BinaryExpr': {
        // Short-circuit operators evaluate lazily
        if (node.op === '&&') {
          const l = _evalNode(node.left, scope);
          return l ? _evalNode(node.right, scope) : l;
        }
        if (node.op === '||') {
          const l = _evalNode(node.left, scope);
          return l ? l : _evalNode(node.right, scope);
        }
        if (node.op === '??') {
          const l = _evalNode(node.left, scope);
          return (l === null || l === undefined) ? _evalNode(node.right, scope) : l;
        }
        const left = _evalNode(node.left, scope);
        const right = _evalNode(node.right, scope);
        switch (node.op) {
          case '+': return left + right;
          case '-': return left - right;
          case '*': return left * right;
          case '/': return left / right;
          case '%': return left % right;
          case '**': return left ** right;
          case '===': return left === right;
          case '!==': return left !== right;
          case '==': return left == right;
          case '!=': return left != right;
          case '>': return left > right;
          case '<': return left < right;
          case '>=': return left >= right;
          case '<=': return left <= right;
          case 'in': return (right && typeof right === 'object') ? (left in right) : undefined;
          case 'instanceof': return left instanceof right;
          case '&': return left & right;
          case '|': return left | right;
          case '^': return left ^ right;
          case '<<': return left << right;
          case '>>': return left >> right;
          case '>>>': return left >>> right;
          default: return undefined;
        }
      }

      case 'UnaryExpr': {
        if (node.op === 'typeof') {
          // Special: if identifier not in scope, return "undefined" string
          if (node.argument && node.argument.type === 'Identifier' && !(node.argument.name in scope)) {
            return 'undefined';
          }
          return typeof _evalNode(node.argument, scope);
        }
        // Prefix ++ / --
        if (node.op === '++' || node.op === '--') {
          const oldVal = _evalNode(node.argument, scope);
          const newVal = node.op === '++' ? oldVal + 1 : oldVal - 1;
          return node.prefix ? newVal : oldVal;
        }
        const arg = _evalNode(node.argument, scope);
        switch (node.op) {
          case '!': return !arg;
          case '-': return -arg;
          case '+': return +arg;
          case '~': return ~arg;
          case 'void': return undefined;
          default: return undefined;
        }
      }

      case 'ConditionalExpr': {
        return _evalNode(node.test, scope)
          ? _evalNode(node.consequent, scope)
          : _evalNode(node.alternate, scope);
      }

      case 'MemberExpr':
      case 'OptionalMemberExpr': {
        const obj = _evalNode(node.object, scope);
        if (obj == null) return undefined;
        const prop = node.computed
          ? _evalNode(node.property, scope)
          : node.property.name || node.property.value;
        if (_FORBIDDEN_PROPS[prop]) return undefined;
        return obj[prop];
      }

      case 'CallExpr':
      case 'OptionalCallExpr': {
        // Evaluate args (handle spread)
        const evalArgs = (args) => {
          const result = [];
          for (let i = 0; i < args.length; i++) {
            if (args[i].type === 'SpreadElement') {
              const spread = _evalNode(args[i].argument, scope);
              if (spread && typeof spread[Symbol.iterator] === 'function') {
                result.push(...spread);
              }
            } else {
              result.push(_evalNode(args[i], scope));
            }
          }
          return result;
        };

        if (node.callee.type === 'MemberExpr' || node.callee.type === 'OptionalMemberExpr') {
          const thisObj = _evalNode(node.callee.object, scope);
          if (thisObj == null) {
            if (node.type === 'OptionalCallExpr' || node.callee.type === 'OptionalMemberExpr') return undefined;
            return undefined;
          }
          const prop = node.callee.computed
            ? _evalNode(node.callee.property, scope)
            : node.callee.property.name;
          if (_FORBIDDEN_PROPS[prop]) return undefined;
          const fn = thisObj[prop];
          if (typeof fn !== 'function') return undefined;
          return fn.apply(thisObj, evalArgs(node.args));
        }

        const fn = _evalNode(node.callee, scope);
        if (fn == null && node.type === 'OptionalCallExpr') return undefined;
        if (typeof fn !== 'function') return undefined;
        return fn.apply(undefined, evalArgs(node.args));
      }

      case 'ArrayExpr': {
        const arr = [];
        for (let i = 0; i < node.elements.length; i++) {
          const el = node.elements[i];
          if (el.type === 'SpreadElement') {
            const spread = _evalNode(el.argument, scope);
            if (spread && typeof spread[Symbol.iterator] === 'function') {
              arr.push(...spread);
            }
          } else {
            arr.push(_evalNode(el, scope));
          }
        }
        return arr;
      }

      case 'ObjectExpr': {
        const obj = {};
        for (let i = 0; i < node.properties.length; i++) {
          const prop = node.properties[i];
          if (prop.spread) {
            const src = _evalNode(prop.value, scope);
            if (src && typeof src === 'object') {
              for (const k of Object.keys(src)) {
                if (!_FORBIDDEN_PROPS[k]) obj[k] = src[k];
              }
            }
          } else {
            const key = prop.computed ? _evalNode(prop.key, scope) : prop.key;
            if (_FORBIDDEN_PROPS[key]) continue;
            obj[key] = _evalNode(prop.value, scope);
          }
        }
        return obj;
      }

      case 'SpreadElement':
        return _evalNode(node.argument, scope);

      case 'ArrowFunction':
        return function (...callArgs) {
          const childScope = Object.create(scope);
          for (let i = 0; i < node.params.length; i++) {
            const p = node.params[i];
            if (typeof p === 'string' && p.startsWith('...')) {
              childScope[p.slice(3)] = callArgs.slice(i);
              break;
            }
            childScope[p] = callArgs[i];
          }
          return _evalNode(node.body, childScope);
        };

      case 'TemplateLiteral': {
        let result = node.parts[0];
        for (let i = 0; i < node.expressions.length; i++) {
          result += String(_evalNode(node.expressions[i], scope));
          result += node.parts[i + 1];
        }
        return result;
      }

      case 'PostfixExpr': {
        // In expression context, return the current value (no mutation)
        return _evalNode(node.argument, scope);
      }

      case 'AssignExpr': {
        // In expression context, evaluate and return the RHS
        return _evalNode(node.right, scope);
      }

      default:
        return undefined;
    }
  } catch (_e) {
    return undefined;
  }
}

// ---------------------------------------------------------------------------
// Statement executor (for on:*, watch, etc.)
// ---------------------------------------------------------------------------

// Assign a value to an AST target node (Identifier or MemberExpr)
function _assignToTarget(target, value, scope) {
  if (target.type === "Identifier") {
    scope[target.name] = value;
  } else if (target.type === "MemberExpr" || target.type === "OptionalMemberExpr") {
    const obj = _evalNode(target.object, scope);
    if (obj == null) return;
    const prop = target.computed
      ? _evalNode(target.property, scope)
      : target.property.name || target.property.value;
    if (_FORBIDDEN_PROPS[prop]) return;
    obj[prop] = value;
  }
}

// Execute a single statement node with mutation support
function _execStmtNode(node, scope) {
  if (!node) return undefined;
  switch (node.type) {
    case "AssignExpr": {
      const rhs = _evalNode(node.right, scope);
      let value;
      if (node.op === "=") {
        value = rhs;
      } else {
        const lhs = _evalNode(node.left, scope);
        switch (node.op) {
          case "+=": value = lhs + rhs; break;
          case "-=": value = lhs - rhs; break;
          case "*=": value = lhs * rhs; break;
          case "/=": value = lhs / rhs; break;
          case "%=": value = lhs % rhs; break;
          default: value = rhs;
        }
      }
      _assignToTarget(node.left, value, scope);
      return value;
    }
    case "PostfixExpr": {
      const oldVal = _evalNode(node.argument, scope);
      const newVal = node.op === "++" ? oldVal + 1 : oldVal - 1;
      _assignToTarget(node.argument, newVal, scope);
      return oldVal;
    }
    case "UnaryExpr": {
      if (node.op === "++" || node.op === "--") {
        const oldVal = _evalNode(node.argument, scope);
        const newVal = node.op === "++" ? oldVal + 1 : oldVal - 1;
        _assignToTarget(node.argument, newVal, scope);
        return newVal;
      }
      return _evalNode(node, scope);
    }
    default: {
      // In statement context, throw for undefined function calls
      // so error-boundary directives can catch the error
      if (node.type === "CallExpr" && node.callee.type === "Identifier") {
        const name = node.callee.name;
        if (!(name in scope) && !(name in _SAFE_GLOBALS) && !_BROWSER_GLOBALS.has(name)) {
          throw new ReferenceError(name + " is not defined");
        }
      }
      return _evalNode(node, scope);
    }
  }
}

function _applyFilter(value, filterStr) {
  const colonIdx = filterStr.indexOf(":");
  let name, argStr;
  if (colonIdx === -1) {
    name = filterStr.trim();
    argStr = null;
  } else {
    name = filterStr.substring(0, colonIdx).trim();
    argStr = filterStr.substring(colonIdx + 1).trim();
  }
  const fn = _filters[name];
  if (!fn) {
    _warn(`Unknown filter: ${name}`);
    return value;
  }
  // Parse args: split by comma but respect quotes
  const args = argStr ? _parseFilterArgs(argStr) : [];
  return fn(value, ...args);
}

function _parseFilterArgs(str) {
  const args = [];
  let current = "";
  let inStr = false;
  let strChar = "";
  for (const ch of str) {
    if (inStr) {
      if (ch === strChar) {
        inStr = false;
        continue;
      }
      current += ch;
      continue;
    }
    if (ch === "'" || ch === '"') {
      inStr = true;
      strChar = ch;
      continue;
    }
    if (ch === ",") {
      args.push(current.trim());
      current = "";
      continue;
    }
    current += ch;
  }
  if (current.trim()) args.push(current.trim());
  // Try to parse numbers
  return args.map((a) => {
    const n = Number(a);
    return isNaN(n) ? a : n;
  });
}

// Build a flat scope object from a context chain, adding special $ variables.
// Shared by evaluate() and _execStatement() to avoid duplication.
function _buildScope(ctx) {
  const { keys, vals } = _collectKeys(ctx);
  const scope = {};
  for (let i = 0; i < keys.length; i++) scope[keys[i]] = vals[keys[i]];
  if (!("$store"  in scope)) scope.$store  = _stores;
  if (!("$route"  in scope)) scope.$route  = _routerInstance?.current;
  if (!("$router" in scope)) scope.$router = _routerInstance;
  if (!("$i18n"   in scope)) scope.$i18n   = _i18n;
  if (!("$refs"   in scope)) scope.$refs   = ctx.$refs;
  if (!("$form"   in scope)) scope.$form   = ctx.$form || null;
  for (const gk in _globals) {
    const key = "$" + gk;
    if (!(key in scope)) scope[key] = _globals[gk];
  }
  return scope;
}

// Fast-path evaluation: skip pipe parsing, scope building, and cache lookups
// when called from a hot loop with a pre-built scope and pre-parsed AST.
export function _evalFast(ast, scope) {
  try {
    return _evalNode(ast, scope);
  } catch (_e) {
    return undefined;
  }
}

export function evaluate(expr, ctx) {
  if (expr == null || expr === "") return undefined;
  try {
    // Cache pipe-split results to avoid re-scanning every evaluation
    let pipes = _pipeCache.get(expr);
    if (!pipes) {
      pipes = _parsePipes(expr);
      _pipeCache.set(expr, pipes);
    }
    const mainExpr = pipes[0];

    // Parse expression into AST (cached)
    const ast = _parseAndCache(mainExpr);

    // Fast path: when there are no pipe filters and ctx is a Proxy context,
    // evaluate directly against it. The Proxy's get/has traps already handle
    // the full scope chain (own keys, parent keys, $store, $refs, $route,
    // $router, $i18n, $form, plugin globals), so we skip the expensive
    // _buildScope() that creates a new object and copies all keys on every call.
    let result;
    if (pipes.length === 1 && ctx && ctx.__isProxy) {
      result = _evalNode(ast, ctx);
    } else {
      const scope = _buildScope(ctx);
      result = _evalNode(ast, scope);
      for (let i = 1; i < pipes.length; i++) {
        result = _applyFilter(result, pipes[i]);
      }
    }

    return result;
  } catch (e) {
    _warn("Expression error:", expr, e.message);
    return undefined;
  }
}

// Execute a statement (for on:* handlers)
export function _execStatement(expr, ctx, extraVars = {}) {
  try {
    const scope = _buildScope(ctx);
    Object.assign(scope, extraVars);

    // Snapshot context chain values for write-back comparison
    const chainKeys = new Set();
    let _wCtx = ctx;
    while (_wCtx && _wCtx.__isProxy) {
      for (const k of Object.keys(_wCtx.__raw)) chainKeys.add(k);
      _wCtx = _wCtx.$parent;
    }
    const originals = {};
    for (const k of chainKeys) {
      if (!k.startsWith("$") && k in scope) originals[k] = scope[k];
    }

    // Parse and execute statements
    const stmts = _parseStatements(expr);
    for (let i = 0; i < stmts.length; i++) _execStmtNode(stmts[i], scope);

    // Write back changed values to owning context
    for (const k of chainKeys) {
      if (k.startsWith("$")) continue;
      if (!(k in scope)) continue;
      const newVal = scope[k];
      const oldVal = originals[k];
      if (newVal !== oldVal) {
        let c = ctx;
        while (c && c.__isProxy) {
          if (k in c.__raw) { c.$set(k, newVal); break; }
          c = c.$parent;
        }
      } else if (typeof newVal === "object" && newVal !== null) {
        let c = ctx;
        while (c && c.__isProxy) {
          if (k in c.__raw) { c.$notify(); break; }
          c = c.$parent;
        }
      }
    }

    // Write back new variables created during execution.
    // Skip extraVars keys (e.g. __val, $el, $event) — they are execution-local
    // and must not be persisted to the reactive context.
    for (const k in scope) {
      if (k.startsWith("$") || chainKeys.has(k) || k in extraVars) continue;
      ctx.$set(k, scope[k]);
    }

    // Notify global store watchers when expression touches $store
    if (typeof expr === "string" && expr.includes("$store")) {
      _notifyStoreWatchers();
    }
  } catch (e) {
    _warn("Expression error:", expr, e.message);
    // Dispatch a custom DOM event so error-boundary directives can catch it
    if (extraVars.$el) {
      extraVars.$el.dispatchEvent(
        new CustomEvent("nojs:error", { bubbles: true, detail: { message: e.message, error: e } })
      );
    }
  }
}

export function resolve(path, ctx) {
  return path.split(".").reduce((o, k) => o?.[k], ctx);
}

// Interpolate strings like "/users/{user.id}?q={search}"
// Note: interpolated values are encoded with encodeURIComponent, which encodes
// "/" as "%2F". Path segments that intentionally contain "/" must be passed
// as pre-encoded strings or concatenated outside of {} placeholders.
export function _interpolate(str, ctx) {
  return str.replace(/\{([^}]+)\}/g, (_, expr) => {
    const val = evaluate(expr.trim(), ctx);
    if (val == null) return "";
    return encodeURIComponent(String(val));
  });
}
