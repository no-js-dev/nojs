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
import { registerDirective, processTree, _disposeChildren, _disposeTree } from "../registry.js";
import { _devtoolsEmit } from "../devtools.js";

const HTTP_METHODS = ["get", "post", "put", "patch", "delete"];

// ─── Sentinel helpers ──────────────────────────────────────────────────────
// Sentinel: a zero-height div used as a positional anchor for append/prepend
// insertion modes. It carries no directives (Rule 9) — only a data attribute.

function _createSentinel() {
  const sentinel = document.createElement("div");
  sentinel.setAttribute("data-nojs-sentinel", "");
  sentinel.style.height = "0";
  sentinel.style.overflow = "hidden";
  sentinel.style.pointerEvents = "none";
  return sentinel;
}

// Find the nearest scrollable ancestor by walking up the DOM and checking
// computed overflow-y. Falls back to document.documentElement.
function _findScrollContainer(el) {
  let node = el.parentElement;
  while (node && node !== document.documentElement) {
    const overflowY = getComputedStyle(node).overflowY;
    if (overflowY === "scroll" || overflowY === "auto") return node;
    node = node.parentElement;
  }
  return document.documentElement;
}

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
      const trigger = el.getAttribute("get-trigger");
      const threshold = el.getAttribute("get-threshold") || "0px";

      // ── get-insert: append | prepend | (absent = replace) ──
      // Only applies to GET method; ignored on POST/PUT/PATCH/DELETE.
      const insertRaw = method === "get" ? el.getAttribute("get-insert") : null;
      const insertMode = method === "get" && el.hasAttribute("get-insert")
        ? (insertRaw === "prepend" ? "prepend" : "append")
        : "replace";
      const isInsertMode = insertMode !== "replace";

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

      // ── Sentinel management for insert modes ──
      let _sentinel = null;
      let _isFirstFetch = true;

      function _insertSentinel() {
        _sentinel = _createSentinel();
        if (insertMode === "append") {
          el.appendChild(_sentinel);
        } else {
          el.insertBefore(_sentinel, el.firstChild);
        }
        // Register sentinel removal on dispose (Rule 2)
        _onDispose(() => {
          if (_sentinel && _sentinel.parentNode) {
            _sentinel.parentNode.removeChild(_sentinel);
          }
          _sentinel = null;
        });
      }

      // Insert sentinel at init time for insert modes
      if (isInsertMode) _insertSentinel();

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

      // ── Reset for insert modes (used by el.refresh()) ──
      function _resetInsertMode() {
        // Dispose all accumulated children (Rule 1)
        for (const child of [...el.children]) _disposeTree(child);
        // Remove sentinel
        if (_sentinel && _sentinel.parentNode) {
          _sentinel.parentNode.removeChild(_sentinel);
        }
        _sentinel = null;
        // Clear container
        el.innerHTML = "";
        // Reset first-fetch flag
        _isFirstFetch = true;
        // Recreate sentinel at correct position
        _insertSentinel();
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
            // In insert mode after first fetch, show loading inline (not replacing)
            if (isInsertMode && !_isFirstFetch) {
              _showLoadingInline(clone);
            } else {
              _disposeChildren(el);
              el.innerHTML = "";
              el.appendChild(clone);
              processTree(el);
            }
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
              // In insert mode after first fetch, show empty inline
              if (isInsertMode && !_isFirstFetch) {
                _removeInlineLoading();
                _insertContentAtEdge(clone);
                processTree(clone);
              } else {
                _disposeChildren(el);
                el.innerHTML = "";
                el.appendChild(clone);
                processTree(el);
              }
            }
            return;
          }

          _hideSkeleton();

          // ── Context accumulation for insert modes ──
          if (isInsertMode && !_isFirstFetch) {
            const prev = ctx[asKey];
            if (Array.isArray(prev) && Array.isArray(data)) {
              // Concatenate arrays: append adds new at end, prepend adds new at start
              const accumulated = insertMode === "append"
                ? [...prev, ...data]
                : [...data, ...prev];
              ctx.$set(asKey, accumulated);
            } else {
              // Non-array values are replaced
              ctx.$set(asKey, data);
            }
          } else {
            ctx.$set(asKey, data);
          }

          // Write to global store if into attribute is present
          if (intoStore) {
            if (!_stores[intoStore]) _stores[intoStore] = createContext({});
            _stores[intoStore].$set(asKey, ctx[asKey]);
            _notifyStoreWatchers(intoStore);
          }

          // ── Insert mode: append/prepend content ──
          if (isInsertMode && !_isFirstFetch) {
            _removeInlineLoading();

            // Clone original children to render this page's content
            const wrapper = document.createElement("div");
            wrapper.style.display = "contents";
            const childCtx = createContext({ [asKey]: data }, ctx);
            wrapper.__ctx = childCtx;
            for (const child of originalChildren)
              wrapper.appendChild(child.cloneNode(true));

            if (insertMode === "prepend") {
              // Scroll position preservation for prepend
              const scrollContainer = _findScrollContainer(el);
              const oldScrollTop = scrollContainer.scrollTop;
              const oldScrollHeight = scrollContainer.scrollHeight;

              // Insert after sentinel (sentinel stays at top)
              if (_sentinel && _sentinel.nextSibling) {
                el.insertBefore(wrapper, _sentinel.nextSibling);
              } else {
                el.appendChild(wrapper);
              }
              processTree(wrapper);

              // Adjust scroll position so user does not see a jump
              const newScrollHeight = scrollContainer.scrollHeight;
              scrollContainer.scrollTop = oldScrollTop + (newScrollHeight - oldScrollHeight);
            } else {
              // Append: insert before sentinel (sentinel stays at bottom)
              if (_sentinel) {
                el.insertBefore(wrapper, _sentinel);
              } else {
                el.appendChild(wrapper);
              }
              processTree(wrapper);
            }

            _isFirstFetch = false;
          } else {
            // ── Replace mode (default) or first fetch in insert mode ──
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

            // For insert modes, reinsert sentinel after first fetch content
            if (isInsertMode) {
              _isFirstFetch = false;
              // Remove old sentinel if present and reinsert at edge
              if (_sentinel && _sentinel.parentNode) {
                _sentinel.parentNode.removeChild(_sentinel);
              }
              _sentinel = _createSentinel();
              if (insertMode === "append") {
                el.appendChild(_sentinel);
              } else {
                el.insertBefore(_sentinel, el.firstChild);
              }
            }
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

              if (isInsertMode && !_isFirstFetch) {
                // In insert mode after first fetch, show error inline
                // without removing existing content
                _removeInlineLoading();
                _insertContentAtEdge(wrapper);
              } else {
                _disposeChildren(el);
                el.innerHTML = "";
                el.appendChild(wrapper);
              }
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

      // ── Inline loading/content helpers for insert modes ──
      function _showLoadingInline(clone) {
        const wrapper = document.createElement("div");
        wrapper.style.display = "contents";
        wrapper.setAttribute("data-nojs-inline-loading", "");
        wrapper.appendChild(clone);
        _insertContentAtEdge(wrapper);
        processTree(wrapper);
      }

      function _removeInlineLoading() {
        const loading = el.querySelector("[data-nojs-inline-loading]");
        if (loading) {
          _disposeTree(loading);
          loading.parentNode.removeChild(loading);
        }
      }

      // Insert a node at the container edge (before sentinel for append,
      // after sentinel for prepend).
      function _insertContentAtEdge(node) {
        if (insertMode === "append" && _sentinel) {
          el.insertBefore(node, _sentinel);
        } else if (insertMode === "prepend" && _sentinel) {
          if (_sentinel.nextSibling) {
            el.insertBefore(node, _sentinel.nextSibling);
          } else {
            el.appendChild(node);
          }
        } else {
          el.appendChild(node);
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
        // ── get-trigger dispatch ──────────────────────────────────────
        if (trigger === "none") {
          // Manual only — no auto-fire, no observer, no listener.
          // el.refresh() (exposed below) is the only way to trigger.
        } else if (trigger === "visible") {
          // Lazy load: fire once when the element enters the viewport.
          if (typeof IntersectionObserver !== "undefined") {
            const observer = new IntersectionObserver(
              (entries) => {
                for (const entry of entries) {
                  if (entry.isIntersecting && el.isConnected) {
                    observer.disconnect();
                    doRequest();
                    break;
                  }
                }
              },
              { rootMargin: threshold },
            );
            observer.observe(el);
            _onDispose(() => observer.disconnect());
          } else {
            // Fallback: fire immediately when IntersectionObserver unavailable
            _warn('IntersectionObserver not available, get-trigger="visible" falling back to immediate fetch');
            if (el.isConnected) doRequest();
          }
        } else if (trigger === "hover") {
          // Prefetch on hover: fire on first mouseenter.
          const useOnce = refreshInterval <= 0;
          const hoverHandler = () => {
            doRequest();
          };
          if (useOnce) {
            el.addEventListener("mouseenter", hoverHandler, { once: true });
          } else {
            el.addEventListener("mouseenter", hoverHandler);
          }
          // Always register cleanup — element may be disposed before hover fires,
          // and even { once: true } does not remove if never triggered (Rule 2).
          _onDispose(() => el.removeEventListener("mouseenter", hoverHandler));
        } else {
          // Default: immediate fire (current behavior, no trigger attribute)
          if (el.isConnected) doRequest();
        }
      } else {
        // Non-GET on non-FORM: attach click listener
        const clickHandler = (e) => {
          e.preventDefault();
          doRequest();
        };
        el.addEventListener("click", clickHandler);
        _onDispose(() => el.removeEventListener("click", clickHandler));
      }

      // Reactive URL watching: re-fetch when {expressions} in URL change.
      // Suppressed for get-trigger="none" — manual-only trigger means no
      // automatic fetching, including reactive URL changes.
      const hasInterpolation = /\{[^}]+\}/.test(url);
      if (hasInterpolation && trigger !== "none") {
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
      // For insert modes, wrap to reset before fetching (full reset on refresh)
      if (isInsertMode) {
        el.refresh = function () {
          _resetInsertMode();
          doRequest();
        };
      } else {
        el.refresh = doRequest;
      }
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
