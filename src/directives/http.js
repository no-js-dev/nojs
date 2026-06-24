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
import { evaluate, _execStatement, _interpolate, _FORBIDDEN_PROPS } from "../evaluate.js";
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
  sentinel.setAttribute("aria-hidden", "true");
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
      const triggerLabel = el.getAttribute("get-trigger-label") || "Load More";

      // ── get-cursor: cursor-based pagination ──
      const hasGetCursor = method === "get" && el.hasAttribute("get-cursor");
      const cursorFieldAttr = hasGetCursor
        ? el.getAttribute("get-cursor-field") || null
        : null;

      // ── get-page: initial page number for offset-based pagination ──
      const hasGetPage = method === "get" && el.hasAttribute("get-page");
      const initialPage = hasGetPage
        ? (parseInt(el.getAttribute("get-page"), 10) || 1)
        : null;

      // ── Mutual exclusivity: get-cursor vs get-page ──
      if (hasGetCursor && hasGetPage) {
        _warn("get-cursor and get-page are mutually exclusive; using cursor-based pagination");
      }

      // ── get-threshold: rootMargin for IntersectionObserver ──
      // Default differs by trigger type: 200px for scroll, 0px for visible.
      const thresholdRaw = el.getAttribute("get-threshold");
      const threshold = thresholdRaw
        || (trigger === "scroll" ? "200px" : "0px");

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

      // ── Initialize pagination context variables ──
      if (hasGetCursor) {
        // Cursor starts as empty string so {cursor} resolves to "" on first request
        ctx.$set("cursor", "");
      } else if (hasGetPage) {
        ctx.$set("page", initialPage);
      }

      // ── Pagination state ──
      const isPaginationTrigger = trigger === "scroll" || trigger === "button";
      let _fetching = false;    // Concurrency guard for pagination
      let _endOfData = false;   // End-of-data flag — stops further pagination
      let _scrollObserver = null; // IntersectionObserver for scroll trigger
      let _loadMoreBtn = null;  // Auto-generated button for button trigger

      // Validate pagination triggers require get-insert
      if (isPaginationTrigger && !isInsertMode) {
        _warn(`get-trigger="${trigger}" requires get-insert to be set. Falling back to "${trigger === "scroll" ? "visible" : "immediate"}" behavior.`);
      }

      // Mutual exclusion: scroll/button + refresh
      const _suppressRefresh = isPaginationTrigger && isInsertMode && refreshInterval > 0;
      if (_suppressRefresh) {
        _warn(`get-trigger="${trigger}" is mutually exclusive with refresh. The refresh interval is being ignored.`);
      }

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
      let _sentinelGen = 0; // Generation counter to invalidate stale disposers
      let _isFirstFetch = true;

      function _insertSentinel() {
        // Remove previous sentinel from DOM before creating a new one
        if (_sentinel && _sentinel.parentNode) {
          _sentinel.parentNode.removeChild(_sentinel);
        }
        // Increment generation so any previously registered disposer becomes a no-op
        const gen = ++_sentinelGen;
        _sentinel = _createSentinel();
        if (insertMode === "append") {
          el.appendChild(_sentinel);
        } else {
          el.insertBefore(_sentinel, el.firstChild);
        }
        // Register sentinel removal on dispose (Rule 2).
        // The generation check prevents stale disposers from accumulating work.
        _onDispose(() => {
          if (gen !== _sentinelGen) return; // superseded by a newer sentinel
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

      // ── Cursor extraction helpers ──────────────────────────────────────

      // Resolve a dot-notation path (e.g. "pagination.nextToken") on an object.
      function _resolveField(obj, path) {
        const parts = path.split(".");
        let current = obj;
        for (const part of parts) {
          if (current == null || typeof current !== "object") return undefined;
          if (_FORBIDDEN_PROPS[part]) {
            _warn("Blocked access to forbidden property '" + part + "' in get-cursor-field");
            return undefined;
          }
          current = current[part];
        }
        return current;
      }

      // Default cursor field names to probe when get-cursor-field is absent.
      const _DEFAULT_CURSOR_FIELDS = ["cursor", "next_cursor", "nextCursor", "next"];

      // Extract cursor from response header or body per ADR Decision 7.
      // Returns the next cursor value (string/null) or undefined if not found.
      function _extractCursor(data, meta) {
        // Priority 1: X-NoJS-Cursor response header
        if (meta && meta.headers) {
          const headerCursor = meta.headers.get("X-NoJS-Cursor");
          if (headerCursor != null) return headerCursor || null;
        }
        // Priority 2: JSON body field lookup (only when response is object)
        if (data != null && typeof data === "object" && !Array.isArray(data)) {
          if (cursorFieldAttr) {
            // Custom field via get-cursor-field (supports dot notation)
            const val = _resolveField(data, cursorFieldAttr);
            return val !== undefined ? (val || null) : null;
          }
          // Default field probe
          for (const field of _DEFAULT_CURSOR_FIELDS) {
            const val = data[field];
            if (val != null && val !== "") return val;
          }
        }
        return null;
      }

      // Extract the renderable data array from a cursor-paginated response.
      // When cursor comes from the JSON body, the response is typically an
      // object like { data: [...], cursor: "abc" }. This finds the first
      // array-valued field in the response root.
      function _extractCursorData(data) {
        // If root is already an array, use it directly
        if (Array.isArray(data)) return data;
        // If root is an object, find the first array-valued field
        if (data != null && typeof data === "object") {
          for (const key of Object.keys(data)) {
            if (Array.isArray(data[key])) return data[key];
          }
        }
        // Fallback: use data as-is
        return data;
      }

      async function doRequest() {
        // Concurrency guard: skip if a paginated fetch is already in-flight
        if (isPaginationTrigger && isInsertMode && _fetching) return;

        // SwitchMap: abort previous in-flight request
        if (_activeAbort) _activeAbort.abort();
        _activeAbort = new AbortController();
        const myAbort = _activeAbort;

        // Confirmation
        if (confirmMsg && !window.confirm(confirmMsg)) {
          _clearFormSubmitting();
          return;
        }

        if (isPaginationTrigger && isInsertMode) _fetching = true;

        // Remove load-more button while fetch is in-flight
        if (trigger === "button" && isInsertMode && !_isFirstFetch) {
          _removeLoadMoreButton();
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
          // Pass meta object to capture response headers for pagination
          const _responseMeta = {};
          const data = await _doFetch(
            resolvedUrl,
            method,
            reqBody,
            extraHeaders,
            el,
            _activeAbort.signal,
            retryCount,
            retryDelay,
            _responseMeta,
          );

          // ── Cursor extraction (before caching to cache renderable data) ──
          let _nextCursor = null;
          let renderData = data;
          if (hasGetCursor) {
            _nextCursor = _extractCursor(data, _responseMeta);
            // When cursor came from body, extract the renderable data array
            const headerCursor = _responseMeta.headers
              && _responseMeta.headers.get("X-NoJS-Cursor");
            if (headerCursor == null) {
              renderData = _extractCursorData(data);
            }
          }

          // Cache response (use renderData for cursor mode)
          if (method === "get") _cacheSet(cacheKey, hasGetCursor ? renderData : data, cacheStrategy);

          // ── End-of-data detection for pagination ──
          const _effectiveData = hasGetCursor ? renderData : data;
          const _isEmptyData = _effectiveData == null
            || (Array.isArray(_effectiveData) && _effectiveData.length === 0)
            || _effectiveData === "";
          const _isLastPageHeader = _responseMeta.headers
            && _responseMeta.headers.get("X-NoJS-Last-Page") === "true";
          const _isCursorExhausted = hasGetCursor && _nextCursor == null;
          const _isEndOfData = _isEmptyData || _isLastPageHeader || _isCursorExhausted;

          // Check empty (or end-of-data for paginated fetches)
          if (_isEmptyData) {
            _hideSkeleton();
            // Update cursor even on empty — next request should not retry
            if (hasGetCursor) ctx.$set("cursor", "");
            if (isPaginationTrigger && isInsertMode) _handleEndOfData();
            if (emptyTpl) {
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
            }
            return;
          }

          _hideSkeleton();

          // ── Update cursor context variable ──
          if (hasGetCursor) {
            ctx.$set("cursor", _nextCursor || "");
          }

          // ── Context accumulation for insert modes ──
          if (isInsertMode && !_isFirstFetch) {
            const prev = ctx[asKey];
            if (Array.isArray(prev) && Array.isArray(_effectiveData)) {
              // Concatenate arrays: append adds new at end, prepend adds new at start
              const accumulated = insertMode === "append"
                ? [...prev, ..._effectiveData]
                : [..._effectiveData, ...prev];
              ctx.$set(asKey, accumulated);
            } else {
              // Non-array values are replaced
              ctx.$set(asKey, _effectiveData);
            }
          } else {
            ctx.$set(asKey, _effectiveData);
          }

          // Write to global store if into attribute is present
          if (intoStore) {
            if (!_stores[intoStore]) _stores[intoStore] = createContext({});
            _stores[intoStore].$set(asKey, _effectiveData);
            _notifyStoreWatchers(intoStore);
          }

          // ── Insert mode: append/prepend content ──
          if (isInsertMode && !_isFirstFetch) {
            _removeInlineLoading();

            // Clone original children to render this page's content
            const wrapper = document.createElement("div");
            wrapper.style.display = "contents";
            const childCtx = createContext({ [asKey]: _effectiveData }, ctx);
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
                const childCtx = createContext({ [vn]: _effectiveData }, ctx);
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
              // Increment generation so any previously registered disposer becomes a no-op
              const gen = ++_sentinelGen;
              _sentinel = _createSentinel();
              if (insertMode === "append") {
                el.appendChild(_sentinel);
              } else {
                el.insertBefore(_sentinel, el.firstChild);
              }
              // Register dispose for the re-created sentinel (Rule 2)
              _onDispose(() => {
                if (gen !== _sentinelGen) return; // superseded by a newer sentinel
                if (_sentinel && _sentinel.parentNode) {
                  _sentinel.parentNode.removeChild(_sentinel);
                }
                _sentinel = null;
              });
            }
          }

          // ── Page auto-increment for pagination (skip when cursor mode) ──
          if (hasGetPage && !hasGetCursor && isPaginationTrigger && isInsertMode) {
            ctx.$set("page", ctx.page + 1);
          }

          // ── End-of-data: header or cursor exhaustion (non-empty response) ──
          if ((_isLastPageHeader || _isCursorExhausted) && isPaginationTrigger && isInsertMode) {
            _handleEndOfData();
          } else if (isPaginationTrigger && isInsertMode && !_endOfData) {
            // Re-render load-more button or reconnect scroll observer
            _afterPaginatedFetch();
          }

          // Then expression
          if (thenExpr) _execStatement(thenExpr, ctx, { result: _effectiveData });

          // Redirect
          if (redirectPath && _routerInstance)
            _routerInstance.push(redirectPath);

          _emitEvent("fetch:success", { url: resolvedUrl, data: _effectiveData });
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
                _removeInlineError();
                wrapper.setAttribute("data-nojs-inline-error", "");
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
          if (isPaginationTrigger && isInsertMode) _fetching = false;
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

      function _removeInlineError() {
        const error = el.querySelector("[data-nojs-inline-error]");
        if (error) {
          _disposeTree(error);
          error.parentNode.removeChild(error);
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

      // ── Pagination helpers ─────────────────────────────────────────────

      // Stop all pagination activity: disconnect observer, remove button/sentinel,
      // render empty template if available.
      function _handleEndOfData() {
        _endOfData = true;
        // Disconnect scroll observer
        if (_scrollObserver) {
          _scrollObserver.disconnect();
          _scrollObserver = null;
        }
        // Remove load-more button
        _removeLoadMoreButton();
        // Remove sentinel
        if (_sentinel && _sentinel.parentNode) {
          _sentinel.parentNode.removeChild(_sentinel);
        }
        _sentinel = null;
        // Emit end event
        _emitEvent("fetch:end", { url });
      }

      // After a successful paginated fetch, set up the next trigger.
      function _afterPaginatedFetch() {
        if (trigger === "button") {
          _renderLoadMoreButton();
        }
        if (trigger === "scroll") {
          // Create observer on first call (deferred from init to wait for
          // sentinel repositioning after first fetch).
          if (!_scrollObserver) {
            _setupScrollObserver();
          } else if (_sentinel) {
            // Re-observe sentinel (may have been recreated during reset)
            _scrollObserver.observe(_sentinel);
          }
        }
      }

      // Render a load-more button at the container edge.
      function _renderLoadMoreButton() {
        _removeLoadMoreButton();
        const btn = document.createElement("button");
        btn.setAttribute("data-nojs-load-more", "");
        btn.setAttribute("type", "button");
        btn.setAttribute("aria-label", triggerLabel);
        btn.textContent = triggerLabel;
        _loadMoreBtn = btn;
        const clickHandler = () => {
          if (_endOfData || _fetching) return;
          doRequest();
        };
        btn.addEventListener("click", clickHandler);
        // Cleanup via _onDispose (Rule 2)
        _onDispose(() => {
          btn.removeEventListener("click", clickHandler);
        });
        _insertContentAtEdge(btn);
      }

      // Remove the current load-more button from the DOM.
      function _removeLoadMoreButton() {
        if (_loadMoreBtn && _loadMoreBtn.parentNode) {
          _loadMoreBtn.parentNode.removeChild(_loadMoreBtn);
        }
        _loadMoreBtn = null;
        // Also remove any orphaned load-more buttons
        const existing = el.querySelector("[data-nojs-load-more]");
        if (existing && existing.parentNode) {
          existing.parentNode.removeChild(existing);
        }
      }

      // Create an IntersectionObserver on the sentinel for scroll trigger.
      function _setupScrollObserver() {
        if (typeof IntersectionObserver === "undefined") {
          // Feature detection: fall back to button trigger and warn
          _warn('IntersectionObserver not available, get-trigger="scroll" falling back to button trigger');
          _renderLoadMoreButton();
          return;
        }
        _scrollObserver = new IntersectionObserver(
          (entries) => {
            for (const entry of entries) {
              if (entry.isIntersecting && el.isConnected && !_endOfData && !_fetching) {
                doRequest();
                break;
              }
            }
          },
          { rootMargin: threshold },
        );
        if (_sentinel) _scrollObserver.observe(_sentinel);
        _onDispose(() => {
          if (_scrollObserver) {
            _scrollObserver.disconnect();
            _scrollObserver = null;
          }
        });
      }

      // ── Reset pagination state (used by reactive URL change and el.refresh) ──
      function _resetPagination() {
        _endOfData = false;
        _fetching = false;
        if (hasGetCursor) {
          ctx.$set("cursor", "");
        } else if (hasGetPage) {
          ctx.$set("page", initialPage);
        }
        _removeLoadMoreButton();
        // Reset insert mode content
        _resetInsertMode();
        // Reconnect scroll observer to the new sentinel — always recreate
        // because _handleEndOfData() sets _scrollObserver to null.
        if (trigger === "scroll" && _sentinel) {
          if (_scrollObserver) _scrollObserver.disconnect();
          _scrollObserver = null;
          _setupScrollObserver();
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
            queueMicrotask(() => { if (el.isConnected) doRequest(); });
          }
        } else if (trigger === "scroll" && isInsertMode) {
          // Infinite scroll: fire initial request. The IntersectionObserver
          // is created lazily in _afterPaginatedFetch() after the first fetch
          // completes and the sentinel is repositioned.
          queueMicrotask(() => { if (el.isConnected) doRequest(); });
        } else if (trigger === "scroll" && !isInsertMode) {
          // scroll without get-insert — fall back to visible behavior (warned above)
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
            queueMicrotask(() => { if (el.isConnected) doRequest(); });
          }
        } else if (trigger === "button" && isInsertMode) {
          // Load-more button: fire initial request, then render button after.
          queueMicrotask(() => { if (el.isConnected) doRequest(); });
        } else if (trigger === "button" && !isInsertMode) {
          // button without get-insert — fall back to immediate (warned above)
          queueMicrotask(() => { if (el.isConnected) doRequest(); });
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
          queueMicrotask(() => { if (el.isConnected) doRequest(); });
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

        // For pagination: strip the {page} or {cursor} token to detect
        // non-pagination URL changes. If only the pagination variable changed
        // (auto-increment or cursor update), proceed normally. If other parts
        // changed, reset pagination and fetch fresh.
        const _hasPaginationToken = hasGetPage || hasGetCursor;
        const _urlWithoutPagination = hasGetCursor
          ? url.replace(/\{cursor\}/g, "__CURSOR__")
          : hasGetPage
            ? url.replace(/\{page\}/g, "__PAGE__")
            : null;
        let _lastNonPaginationUrl = _urlWithoutPagination
          ? _interpolate(_urlWithoutPagination, ctx)
          : null;

        function onAncestorChange() {
          const newUrl = _interpolate(url, ctx);
          if (newUrl !== _lastResolvedUrl) {
            _lastResolvedUrl = newUrl;

            // Check if non-pagination URL parts changed (reset trigger)
            if (isPaginationTrigger && isInsertMode && _urlWithoutPagination) {
              const newNonPaginationUrl = _interpolate(_urlWithoutPagination, ctx);
              if (newNonPaginationUrl !== _lastNonPaginationUrl) {
                _lastNonPaginationUrl = newNonPaginationUrl;
                if (_debounceTimer) clearTimeout(_debounceTimer);
                if (debounceMs > 0) {
                  _debounceTimer = setTimeout(() => {
                    _resetPagination();
                    doRequest();
                  }, debounceMs);
                } else {
                  _resetPagination();
                  doRequest();
                }
                return;
              }
            }

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

        // Subscribe to global reactive sources ($store, $route, $i18n) so
        // URL expressions like get="/api/{$store.auth.token}" or
        // get="/users/{$route.params.id}" trigger re-fetch on change.
        // Without these, only local ancestor context changes fire.
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

      // Expose doRequest for programmatic re-fetch via $refs
      // For pagination insert modes, full reset before fetching
      if (isPaginationTrigger && isInsertMode) {
        el.refresh = function () {
          _resetPagination();
          doRequest();
        };
      } else if (isInsertMode) {
        el.refresh = function () {
          _resetInsertMode();
          doRequest();
        };
      } else {
        el.refresh = doRequest;
      }
      _onDispose(() => { delete el.refresh; });

      // Polling — suppressed for scroll/button pagination triggers
      if (refreshInterval > 0 && !_suppressRefresh) {
        const id = setInterval(() => {
          if (!el.isConnected) { clearInterval(id); return; }
          doRequest();
        }, refreshInterval);
        _onDispose(() => clearInterval(id));
      }
    },
  });
}
