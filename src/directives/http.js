// ═══════════════════════════════════════════════════════════════════════
//  DIRECTIVES: get, post, put, patch, delete
// ═══════════════════════════════════════════════════════════════════════

import {
  _config,
  _warn,
  _stores,
  _notifyStoreWatchers,
  _emitEvent,
  _routerInstance,
  _onDispose,
  _SENSITIVE_HEADERS,
} from "../globals.js";
import { createContext } from "../context.js";
import { evaluate, _execStatement, _interpolate } from "../evaluate.js";
import { _doFetch, _cacheGet, _cacheSet } from "../fetch.js";
import { findContext, _clearDeclared, _cloneTemplate } from "../dom.js";
import { registerDirective, processTree, _disposeChildren } from "../registry.js";
import { _devtoolsEmit } from "../devtools.js";

const HTTP_METHODS = ["get", "post", "put", "patch", "delete"];

for (const method of HTTP_METHODS) {
  registerDirective(method, {
    priority: 1,
    init(el, name, url) {
      const asKey = el.getAttribute("as") || "data";
      const loadingTpl = el.getAttribute("loading");
      const errorTpl = el.getAttribute("error");
      const emptyTpl = el.getAttribute("empty");
      const successTpl = el.getAttribute("success");
      const thenExpr = el.getAttribute("then");
      const redirectPath = el.getAttribute("redirect");
      const confirmMsg = el.getAttribute("confirm");
      const _MIN_REFRESH_MS = 250;
      const _rawRefresh = parseInt(el.getAttribute("refresh")) || 0;
      // Clamp tiny positive intervals to a sane floor so a small/typo value
      // (e.g. refresh="1") cannot spin up a tight polling loop.
      const refreshInterval =
        _rawRefresh > 0 ? Math.max(_rawRefresh, _MIN_REFRESH_MS) : 0;
      const cachedRaw = el.getAttribute("cached");
      const cacheStrategy = el.hasAttribute("cached")
        ? cachedRaw || "memory"
        : "none";
      const bodyAttr = el.getAttribute("body");
      const headersAttr = el.getAttribute("headers");
      const varName = el.getAttribute("var");
      const intoStore = el.getAttribute("into");
      const retryCount =
        parseInt(el.getAttribute("retry")) || _config.retries;
      const retryDelay =
        parseInt(el.getAttribute("retry-delay")) || _config.retryDelay || 1000;
      const paramsAttr = el.getAttribute("params");
      const skeletonId = el.getAttribute("skeleton");

      const parentCtx = el.parentElement
        ? findContext(el.parentElement)
        : createContext();
      const ctx = el.__ctx || createContext({}, parentCtx);
      el.__ctx = ctx;

      const originalChildren = [...el.childNodes].map((n) =>
        n.cloneNode(true),
      );

      let _activeAbort = null;

      // Abort any in-flight request on disposal so a late response cannot
      // mutate a disposed context or re-process a detached node (Rule 2).
      _onDispose(() => {
        if (_activeAbort) _activeAbort.abort();
        _activeAbort = null;
      });

      // skeleton= helpers: show/hide a referenced DOM element by ID while
      // the request is in flight, preventing CLS from content appearing late.
      function _showSkeleton() {
        if (!skeletonId) return;
        const skeleton = document.getElementById(skeletonId);
        if (skeleton) skeleton.style.removeProperty("display");
      }
      function _hideSkeleton() {
        if (!skeletonId) return;
        const skeleton = document.getElementById(skeletonId);
        if (skeleton) skeleton.style.display = "none";
      }

      function _clearFormSubmitting() {
        if (el.tagName !== "FORM") return;
        if (el.__nojsResetSubmitting) {
          el.__nojsResetSubmitting();
          return;
        }
        const ctx = findContext(el);
        const formCtx = ctx?.$form;
        if (!formCtx) return;
        formCtx.submitting = false;
        ctx.$set("$form", { ...formCtx });
      }

      async function doRequest() {
        // SwitchMap: abort previous in-flight request
        if (_activeAbort) _activeAbort.abort();
        _activeAbort = new AbortController();
        const myAbort = _activeAbort;

        // Confirmation
        if (confirmMsg && !window.confirm(confirmMsg)) {
          _clearFormSubmitting();
          return;
        }

        _showSkeleton();

        let resolvedUrl = _interpolate(url, ctx);

        // Append query params. Build entries manually so array values expand
        // to repeated keys (?tag=a&tag=b) and objects are JSON-encoded rather
        // than coerced to "[object Object]"/comma-joined strings.
        if (paramsAttr) {
          const paramsObj = evaluate(paramsAttr, ctx);
          if (paramsObj && typeof paramsObj === "object") {
            const sp = new URLSearchParams();
            for (const [key, value] of Object.entries(paramsObj)) {
              if (value == null) continue;
              if (Array.isArray(value)) {
                for (const v of value) {
                  if (v == null) continue;
                  sp.append(key, typeof v === "object" ? JSON.stringify(v) : String(v));
                }
              } else if (typeof value === "object") {
                sp.append(key, JSON.stringify(value));
              } else {
                sp.append(key, String(value));
              }
            }
            const qs = sp.toString();
            if (qs) {
              const sep = resolvedUrl.includes("?") ? "&" : "?";
              resolvedUrl += sep + qs;
            }
          }
        }

        const cacheKey = method + ":" + resolvedUrl;

        // Check cache
        if (method === "get") {
          const cached = _cacheGet(cacheKey, cacheStrategy);
          if (cached != null) {
            _hideSkeleton();
            ctx.$set(asKey, cached);
            _clearDeclared(el);
            processTree(el);
            return;
          }
        }

        // Show loading
        if (loadingTpl) {
          const clone = _cloneTemplate(loadingTpl);
          if (clone) {
            _disposeChildren(el);
            el.innerHTML = "";
            el.appendChild(clone);
            processTree(el);
          }
        }

        try {
          let reqBody = null;
          if (bodyAttr) {
            const interpolated = _interpolate(bodyAttr, ctx);
            try {
              reqBody = JSON.parse(interpolated);
            } catch {
              reqBody = interpolated;
            }
          }

          // For forms, collect form data
          if (el.tagName === "FORM") {
            const formData = new FormData(el);
            reqBody = Object.fromEntries(formData.entries());
          }

          const extraHeaders = headersAttr ? JSON.parse(headersAttr) : {};
          if (headersAttr) {
            for (const k of Object.keys(extraHeaders)) {
              const lower = k.toLowerCase();
              if (_SENSITIVE_HEADERS.has(lower) || /^x-(auth|api)-/.test(lower)) {
                _warn(`Sensitive header "${k}" is set inline on a headers attribute. Use NoJS.config({ headers }) or an interceptor to avoid exposing credentials in HTML source.`);
              }
            }
          }
          const data = await _doFetch(
            resolvedUrl,
            method,
            reqBody,
            extraHeaders,
            el,
            _activeAbort.signal,
            retryCount,
            retryDelay,
          );

          // Cache response
          if (method === "get") _cacheSet(cacheKey, data, cacheStrategy);

          // Check empty
          if (
            emptyTpl &&
            (data == null || (Array.isArray(data) && data.length === 0))
          ) {
            _hideSkeleton();
            const clone = _cloneTemplate(emptyTpl);
            if (clone) {
              _disposeChildren(el);
              el.innerHTML = "";
              el.appendChild(clone);
              processTree(el);
            }
            return;
          }

          _hideSkeleton();
          ctx.$set(asKey, data);

          // Write to global store if into attribute is present
          if (intoStore) {
            if (!_stores[intoStore]) _stores[intoStore] = createContext({});
            _stores[intoStore].$set(asKey, data);
            _notifyStoreWatchers(intoStore);
          }

          // Success template
          if (successTpl) {
            const clone = _cloneTemplate(successTpl);
            if (clone) {
              _disposeChildren(el);
              el.innerHTML = "";
              // Inject var
              const tplEl = document.getElementById(
                successTpl.replace("#", ""),
              );
              const vn = tplEl?.getAttribute("var") || varName || "result";
              const childCtx = createContext({ [vn]: data }, ctx);
              const wrapper = document.createElement("div");
              wrapper.style.display = "contents";
              wrapper.__ctx = childCtx;
              wrapper.appendChild(clone);
              el.appendChild(wrapper);
              processTree(wrapper);
            }
          } else {
            // Restore original children and re-process
            _disposeChildren(el);
            el.innerHTML = "";
            for (const child of originalChildren)
              el.appendChild(child.cloneNode(true));
            _clearDeclared(el);
            processTree(el);
          }

          // Then expression
          if (thenExpr) _execStatement(thenExpr, ctx, { result: data });

          // Redirect
          if (redirectPath && _routerInstance)
            _routerInstance.push(redirectPath);

          _emitEvent("fetch:success", { url: resolvedUrl, data });
          _devtoolsEmit("fetch:success", { method, url: resolvedUrl });
        } catch (err) {
          // SwitchMap: silently ignore aborted requests
          if (err.name === "AbortError") return;

          _hideSkeleton();
          _warn(
            `${method.toUpperCase()} ${resolvedUrl} failed:`,
            err.message,
          );
          _emitEvent("fetch:error", { url: resolvedUrl, error: err });
          _emitEvent("error", { url: resolvedUrl, error: err });
          _devtoolsEmit("fetch:error", { method, url: resolvedUrl, error: err.message });

          if (errorTpl) {
            const clone = _cloneTemplate(errorTpl);
            if (clone) {
              _disposeChildren(el);
              el.innerHTML = "";
              const tplEl = document.getElementById(
                errorTpl.replace("#", ""),
              );
              const vn = tplEl?.getAttribute("var") || "err";
              const childCtx = createContext(
                {
                  [vn]: {
                    message: err.message,
                    status: err.status,
                    body: err.body,
                  },
                },
                ctx,
              );
              const wrapper = document.createElement("div");
              wrapper.style.display = "contents";
              wrapper.__ctx = childCtx;
              wrapper.appendChild(clone);
              el.appendChild(wrapper);
              processTree(wrapper);
            }
          }
        } finally {
          if (el.tagName === "FORM" && method !== "get") {
            if (!myAbort.signal.aborted && _activeAbort === myAbort) {
              _clearFormSubmitting();
            }
          }
        }
      }

      // For forms, intercept submit
      if (el.tagName === "FORM" && method !== "get") {
        const submitHandler = (e) => {
          e.preventDefault();
          doRequest();
        };
        el.addEventListener("submit", submitHandler);
        _onDispose(() => el.removeEventListener("submit", submitHandler));
      } else if (method === "get") {
        if (el.isConnected) doRequest();
      } else {
        // Non-GET on non-FORM: attach click listener
        const clickHandler = (e) => {
          e.preventDefault();
          doRequest();
        };
        el.addEventListener("click", clickHandler);
        _onDispose(() => el.removeEventListener("click", clickHandler));
      }

      // Reactive URL watching: re-fetch when {expressions} in URL change
      const hasInterpolation = /\{[^}]+\}/.test(url);
      if (hasInterpolation) {
        const debounceMs = parseInt(el.getAttribute("debounce")) || 0;
        let _lastResolvedUrl = _interpolate(url, ctx);
        let _debounceTimer = null;

        function onAncestorChange() {
          const newUrl = _interpolate(url, ctx);
          if (newUrl !== _lastResolvedUrl) {
            _lastResolvedUrl = newUrl;
            if (_debounceTimer) clearTimeout(_debounceTimer);
            if (debounceMs > 0) {
              _debounceTimer = setTimeout(doRequest, debounceMs);
            } else {
              doRequest();
            }
          }
        }

        _onDispose(() => {
          if (_debounceTimer) clearTimeout(_debounceTimer);
        });

        // Watch all ancestor contexts for changes
        let ancestor = parentCtx;
        while (ancestor && ancestor.__isProxy) {
          const unwatch = ancestor.$watch(onAncestorChange);
          _onDispose(unwatch);
          ancestor = ancestor.$parent;
        }
      }

      // Expose doRequest for programmatic re-fetch via $refs
      el.refresh = doRequest;
      _onDispose(() => { delete el.refresh; });

      // Polling
      if (refreshInterval > 0) {
        const id = setInterval(() => {
          if (!el.isConnected) { clearInterval(id); return; }
          doRequest();
        }, refreshInterval);
        _onDispose(() => clearInterval(id));
      }
    },
  });
}
