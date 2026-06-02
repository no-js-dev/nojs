// ═══════════════════════════════════════════════════════════════════════
//  DIRECTIVES: ref, use, call
// ═══════════════════════════════════════════════════════════════════════

import {
  _refs,
  _stores,
  _notifyStoreWatchers,
  _emitEvent,
  _routerInstance,
  _warn,
  _onDispose,
  _SENSITIVE_HEADERS,
} from "../globals.js";
import { _devtoolsEmit } from "../devtools.js";
import { createContext } from "../context.js";
import { evaluate, _execStatement, _interpolate } from "../evaluate.js";
import { _doFetch } from "../fetch.js";
import { findContext, _cloneTemplate } from "../dom.js";
import { registerDirective, processTree, _disposeChildren } from "../registry.js";

registerDirective("ref", {
  priority: 5,
  init(el, name, refName) {
    _refs[refName] = el;
    _onDispose(() => {
      if (_refs[refName] === el) delete _refs[refName];
    });
  },
});

registerDirective("use", {
  priority: 10,
  init(el, name, tplId) {
    const ctx = findContext(el);
    const clone = _cloneTemplate(tplId);
    if (!clone) return;

    // Collect var-* attributes
    const vars = {};
    for (const attr of [...el.attributes]) {
      if (attr.name.startsWith("var-")) {
        const varName = attr.name.replace("var-", "");
        vars[varName] = evaluate(attr.value, ctx);
      }
    }

    const childCtx = createContext(vars, ctx);

    // Handle slots
    const slots = {};
    for (const child of [...el.children]) {
      const slotName = child.getAttribute("slot") || "default";
      if (!slots[slotName])
        slots[slotName] = document.createDocumentFragment();
      slots[slotName].appendChild(child.cloneNode(true));
    }

    // Replace <slot> elements in template
    const slotEls = clone.querySelectorAll("slot");
    for (const slotEl of slotEls) {
      const slotName = slotEl.getAttribute("name") || "default";
      if (slots[slotName]) {
        slotEl.replaceWith(slots[slotName]);
      }
    }

    _disposeChildren(el);
    el.innerHTML = "";
    const wrapper = document.createElement("div");
    wrapper.style.display = "contents";
    wrapper.__ctx = childCtx;
    wrapper.appendChild(clone);
    el.appendChild(wrapper);
    processTree(wrapper);
  },
});

registerDirective("call", {
  priority: 20,
  init(el, name, url) {
    const ctx = findContext(el);
    const method = el.getAttribute("method") || "get";
    const asKey = el.getAttribute("as") || "data";
    const intoStore = el.getAttribute("into");
    const successTpl = el.getAttribute("success");
    const errorTpl = el.getAttribute("error");
    const loadingTpl = el.getAttribute("loading");
    const thenExpr = el.getAttribute("then");
    const confirmMsg = el.getAttribute("confirm");
    const bodyAttr = el.getAttribute("body");
    const redirectPath = el.getAttribute("redirect");
    const headersAttr = el.getAttribute("headers");

    const originalChildren = [...el.childNodes].map((n) => n.cloneNode(true));
    let _activeAbort = null;
    // Tracks the last appended success/error result wrapper so it can be
    // disposed and removed before a new one is appended (Rule 1) — otherwise
    // every click leaks a wrapper with its own context/listeners/watchers.
    let _resultWrapper = null;

    function _clearResultWrapper() {
      if (_resultWrapper) {
        _disposeChildren(_resultWrapper);
        _resultWrapper.remove();
        _resultWrapper = null;
      }
    }
    // Clean up any lingering wrapper when the call element itself is disposed.
    _onDispose(_clearResultWrapper);

    const clickHandler = async (e) => {
      e.preventDefault();
      if (confirmMsg && !window.confirm(confirmMsg)) return;

      // SwitchMap: abort previous in-flight request
      if (_activeAbort) _activeAbort.abort();
      _activeAbort = new AbortController();

      const resolvedUrl = _interpolate(url, ctx);

      // Show loading template
      if (loadingTpl) {
        const clone = _cloneTemplate(loadingTpl);
        if (clone) {
          _disposeChildren(el);
          el.innerHTML = "";
          el.appendChild(clone);
          processTree(el);
          el.disabled = true;
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
        );

        // Restore original children
        if (loadingTpl) {
          _disposeChildren(el);
          el.innerHTML = "";
          for (const child of originalChildren)
            el.appendChild(child.cloneNode(true));
          el.disabled = false;
        }

        if (asKey) ctx.$set(asKey, data);
        if (intoStore) {
          if (!_stores[intoStore]) _stores[intoStore] = createContext({});
          _stores[intoStore].$set(asKey, data);
          _notifyStoreWatchers(intoStore);
        }
        if (thenExpr) _execStatement(thenExpr, ctx, { result: data });
        if (successTpl) {
          const clone = _cloneTemplate(successTpl);
          const target = el.closest("[route-view]") || el.parentElement;
          if (clone && target) {
            const tplEl = document.getElementById(
              successTpl.replace("#", ""),
            );
            const vn = tplEl?.getAttribute("var") || "result";
            const childCtx = createContext({ [vn]: data }, ctx);
            // Dispose/remove the previous result wrapper before appending.
            _clearResultWrapper();
            const wrapper = document.createElement("div");
            wrapper.style.display = "contents";
            wrapper.__ctx = childCtx;
            wrapper.appendChild(clone);
            target.appendChild(wrapper);
            _resultWrapper = wrapper;
            processTree(wrapper);
          }
        }

        if (redirectPath && _routerInstance)
          _routerInstance.push(redirectPath);

        _emitEvent("fetch:success", { url: resolvedUrl, data });
        _devtoolsEmit("fetch:success", { method, url: resolvedUrl });
      } catch (err) {
        // SwitchMap: silently ignore aborted requests
        if (err.name === "AbortError") return;

        _warn(`call ${method.toUpperCase()} ${resolvedUrl} failed:`, err.message);

        // Restore original children
        if (loadingTpl) {
          _disposeChildren(el);
          el.innerHTML = "";
          for (const child of originalChildren)
            el.appendChild(child.cloneNode(true));
          el.disabled = false;
        }

        _emitEvent("fetch:error", { url: resolvedUrl, error: err });
        _emitEvent("error", { url: resolvedUrl, error: err });
        _devtoolsEmit("fetch:error", { method, url: resolvedUrl, error: err.message });

        if (errorTpl) {
          const clone = _cloneTemplate(errorTpl);
          const target = el.closest("[route-view]") || el.parentElement;
          if (clone && target) {
            const tplEl = document.getElementById(errorTpl.replace("#", ""));
            const vn = tplEl?.getAttribute("var") || "err";
            const childCtx = createContext(
              { [vn]: { message: err.message, status: err.status, body: err.body } },
              ctx,
            );
            // Dispose/remove the previous result wrapper before appending.
            _clearResultWrapper();
            const wrapper = document.createElement("div");
            wrapper.style.display = "contents";
            wrapper.__ctx = childCtx;
            wrapper.appendChild(clone);
            target.appendChild(wrapper);
            _resultWrapper = wrapper;
            processTree(wrapper);
          }
        }
      }
    };
    el.addEventListener("click", clickHandler);
    _onDispose(() => el.removeEventListener("click", clickHandler));
  },
});
