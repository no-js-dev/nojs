// ═══════════════════════════════════════════════════════════════════════
//  DIRECTIVE: sse (Server-Sent Events / EventSource)
// ═══════════════════════════════════════════════════════════════════════

import {
  _log,
  _warn,
  _stores,
  _notifyStoreWatchers,
  _onDispose,
  _addStoreWatcher,
  _deleteStoreWatcher,
  _addRouteWatcher,
  _deleteRouteWatcher,
  _watchI18n,
  _i18nListeners,
  _extractStoreName,
  _currentEl,
} from "../globals.js";
import { createContext } from "../context.js";
import { _execStatement, _interpolate } from "../evaluate.js";
import { findContext, _cloneTemplate } from "../dom.js";
import { registerDirective, processTree, _disposeChildren } from "../registry.js";
import { _isLoopElement } from "./loops.js";

// Per-origin connection tracking: Map<origin, Set<EventSource>>
const _originConnections = new Map();

function _trackConnection(origin, es) {
  let set = _originConnections.get(origin);
  if (!set) {
    set = new Set();
    _originConnections.set(origin, set);
  }
  set.add(es);
  if (set.size >= 6) {
    _warn(
      "SSE: " + set.size + " connections to " + origin +
      ". Browsers limit HTTP/1.1 to 6 concurrent connections per origin. Consider HTTP/2 or reducing open streams."
    );
  }
}

function _untrackConnection(origin, es) {
  const set = _originConnections.get(origin);
  if (set) {
    set.delete(es);
    if (set.size === 0) _originConnections.delete(origin);
  }
}

registerDirective("sse", {
  priority: 1,
  gated: true,
  init(el, name, url) {
    if (_isLoopElement(el)) {
      _warn("sse: SSE directive on a loop element is not supported — move it to a parent or child element", el);
      return;
    }
    const asKey = el.getAttribute("as") || "data";
    const sseEvent = el.getAttribute("sse-event") || null;
    const insertRaw = el.getAttribute("sse-insert");
    const insertMode = insertRaw === "append" || insertRaw === "prepend"
      ? insertRaw : "replace";
    const limitAttr = el.getAttribute("sse-limit");
    const hasLimit = el.hasAttribute("sse-limit");
    const limitParsed = hasLimit ? parseInt(limitAttr, 10) : 0;
    if (hasLimit && (isNaN(limitParsed) || limitParsed <= 0)) {
      _warn('sse-limit="' + limitAttr + '" is not a valid positive integer; ignoring.');
    }
    const limit = (isNaN(limitParsed) || limitParsed <= 0) ? 0 : limitParsed;
    const withCredentials = el.hasAttribute("sse-credentials");
    const intoStore = el.getAttribute("into");
    const errorTpl = el.getAttribute("error");
    const thenExpr = el.getAttribute("then");

    // Warnings per PRD: both must ship
    if (limit > 0 && insertMode === "replace") {
      _warn("sse-limit has no effect without sse-insert (append or prepend).");
    }
    if (insertMode !== "replace" && !limit) {
      _warn(
        'sse-insert="' + insertMode + '" without sse-limit may cause unbounded memory growth on long-lived streams. Set sse-limit to cap the array.'
      );
    }

    const parentCtx = el.parentElement
      ? findContext(el.parentElement)
      : createContext();
    const ctx = el.__ctx || createContext({}, parentCtx);
    el.__ctx = ctx;

    // Initialize data and $sse state
    if (insertMode !== "replace") {
      ctx.$set(asKey, []);
    }
    ctx.$set("$sse", { connecting: true, open: false, error: false });

    let _es = null;
    let _origin = null;
    let _lastResolvedUrl = null;

    function _updateSseState(connecting, open, error) {
      ctx.$set("$sse", { connecting, open, error });
    }

    function _closeConnection() {
      if (_es) {
        _log("SSE: closing connection");
        _es.close();
        if (_origin) _untrackConnection(_origin, _es);
        _es = null;
        _origin = null;
      }
    }

    function _renderError() {
      if (!errorTpl) return;
      const clone = _cloneTemplate(errorTpl);
      if (!clone) return;
      const tplEl = document.getElementById(errorTpl.replace("#", ""));
      const vn = tplEl?.getAttribute("var") || "err";
      const childCtx = createContext({ [vn]: { message: "SSE connection closed" } }, ctx);
      const wrapper = document.createElement("div");
      wrapper.style.display = "contents";
      wrapper.__ctx = childCtx;
      wrapper.appendChild(clone);
      // Safety Rule 1: dispose children before clearing DOM
      _disposeChildren(el);
      el.innerHTML = "";
      el.appendChild(wrapper);
      processTree(wrapper);
    }

    function _openConnection(resolvedUrl) {
      _closeConnection();

      // Reset accumulated data on reconnect to new URL
      if (insertMode !== "replace") {
        ctx.$set(asKey, []);
      }

      _updateSseState(true, false, false);
      _lastResolvedUrl = resolvedUrl;
      _log("SSE: connecting to", resolvedUrl);

      // Resolve origin for connection tracking
      try {
        _origin = new URL(resolvedUrl, window.location.origin).origin;
      } catch {
        _origin = window.location.origin;
      }

      const es = new EventSource(resolvedUrl, { withCredentials });
      _es = es;
      _trackConnection(_origin, es);

      // NOTE: disposal is registered ONCE during directive init via
      // _onDispose(_closeConnection), not per-connection. This ensures
      // cleanup works even when _openConnection is called from reactive
      // watcher callbacks where _currentEl may be null (S1 fix).

      es.onopen = function () {
        if (!el.isConnected) { es.close(); return; }
        _log("SSE: connection opened", resolvedUrl);
        _updateSseState(false, true, false);
      };

      es.onerror = function () {
        if (!el.isConnected) { es.close(); return; }
        if (es.readyState === EventSource.CLOSED) {
          _log("SSE: connection closed by server", resolvedUrl);
          _updateSseState(false, false, true);
          if (_origin) _untrackConnection(_origin, es);
          if (_es === es) { _es = null; _origin = null; }
          _renderError();
        } else {
          // Auto-reconnecting (CONNECTING): not terminal
          _log("SSE: auto-reconnecting", resolvedUrl);
          _updateSseState(true, false, false);
        }
      };

      // Listen to named event or default "message"
      const eventName = sseEvent || "message";

      function onMessage(e) {
        if (!el.isConnected) { es.close(); return; }

        _log("SSE: message received on", eventName);

        // Parse data: JSON with raw-string fallback
        let parsed;
        try {
          parsed = JSON.parse(e.data);
        } catch {
          parsed = e.data;
        }

        // Update context variable based on insert mode
        if (insertMode === "append") {
          const arr = Array.isArray(ctx[asKey]) ? [...ctx[asKey]] : [];
          arr.push(parsed);
          if (limit > 0 && arr.length > limit) arr.shift();
          ctx.$set(asKey, arr);
        } else if (insertMode === "prepend") {
          const arr = Array.isArray(ctx[asKey]) ? [...ctx[asKey]] : [];
          arr.unshift(parsed);
          if (limit > 0 && arr.length > limit) arr.pop();
          ctx.$set(asKey, arr);
        } else {
          ctx.$set(asKey, parsed);
        }

        // Store dual-write
        if (intoStore) {
          if (!_stores[intoStore]) _stores[intoStore] = createContext({});
          _stores[intoStore].$set(asKey, ctx[asKey]);
          _notifyStoreWatchers(intoStore);
        }

        if (thenExpr) _execStatement(thenExpr, ctx, { $event: parsed });
      }

      es.addEventListener(eventName, onMessage);
    }

    // Safety Rule 2: register connection cleanup ONCE during init.
    // _closeConnection uses closure variables (_es, _origin) so it always
    // closes whatever the current connection is, including after reconnects.
    // Registered here (synchronous init path) where _currentEl is guaranteed
    // to be set — NOT inside _openConnection, which may be called from
    // reactive watcher callbacks where _currentEl is null.
    _onDispose(_closeConnection);

    // Initial connection
    const initialUrl = _interpolate(url, ctx);
    _openConnection(initialUrl);

    // Reactive URL watching (ancestor-watch pattern from http.js)
    const hasInterpolation = /\{[^}]+\}/.test(url);
    if (hasInterpolation) {
      function onAncestorChange() {
        const newUrl = _interpolate(url, ctx);
        if (newUrl !== _lastResolvedUrl) {
          _log("SSE: URL changed, reconnecting", _lastResolvedUrl, "→", newUrl);
          _openConnection(newUrl);
        }
      }

      // Watch all ancestor contexts for changes
      let ancestor = parentCtx;
      while (ancestor && ancestor.__isProxy) {
        const unwatch = ancestor.$watch(onAncestorChange);
        _onDispose(unwatch);
        ancestor = ancestor.$parent;
      }

      // Subscribe to global reactive sources
      if (url.includes("$store")) {
        const partition = _extractStoreName(url) || "*";
        _addStoreWatcher(onAncestorChange, partition);
        onAncestorChange._el = _currentEl;
        _onDispose(() => _deleteStoreWatcher(onAncestorChange));
      }
      if (url.includes("$route")) {
        _addRouteWatcher(onAncestorChange);
        onAncestorChange._el = _currentEl;
        _onDispose(() => _deleteRouteWatcher(onAncestorChange));
      }
      if (url.includes("$i18n")) {
        _watchI18n(onAncestorChange);
        onAncestorChange._el = _currentEl;
        _onDispose(() => _i18nListeners.delete(onAncestorChange));
      }
    }
  },
});
