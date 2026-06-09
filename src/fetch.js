// ═══════════════════════════════════════════════════════════════════════
//  FETCH HELPER, URL RESOLUTION & CACHE
// ═══════════════════════════════════════════════════════════════════════

import { _config, _interceptors, _cache, _plugins, _SENSITIVE_HEADERS, _SENSITIVE_RESPONSE_HEADERS, _log, _warn, _CANCEL, _RESPOND, _REPLACE } from "./globals.js";

const _MAX_CACHE = 200;
const _INTERCEPTOR_TIMEOUT = 5000;
let _interceptorDepth = 0;
const _MAX_INTERCEPTOR_DEPTH = 1;
const _responseOriginals = new WeakMap();

function _withTimeout(promise, ms, label) {
  let id;
  return Promise.race([
    promise.finally(() => clearTimeout(id)),
    new Promise((_, reject) => {
      id = setTimeout(() => reject(new Error(label)), ms);
    }),
  ]);
}

function _isSensitiveHeader(name) {
  return _SENSITIVE_HEADERS.has(name.toLowerCase()) || /^x-(auth|api)-/i.test(name);
}

// URL param redaction helper
function _redactUrlParams(url) {
  try {
    const u = new URL(url, "http://localhost");
    for (const key of [...u.searchParams.keys()]) {
      if (/token|key|secret|auth|password|credential/i.test(key)) {
        u.searchParams.set(key, "[REDACTED]");
      }
    }
    // Return just the path+search if it was a relative URL
    return url.startsWith("http") ? u.href : u.pathname + u.search;
  } catch {
    return url;
  }
}

// Response redaction helper for untrusted interceptors
function _redactResponse(response) {
  const redactedHeaders = new Headers(response.headers);
  for (const h of _SENSITIVE_RESPONSE_HEADERS) {
    redactedHeaders.delete(h);
  }
  const redactedUrl = _redactUrlParams(response.url);
  const redacted = Object.freeze({
    status: response.status,
    ok: response.ok,
    statusText: response.statusText,
    headers: redactedHeaders,
    url: redactedUrl,
  });
  _responseOriginals.set(redacted, response);
  return redacted;
}

export function resolveUrl(url, el) {
  if (
    url.startsWith("http://") ||
    url.startsWith("https://") ||
    url.startsWith("//")
  )
    return url;
  let node = el;
  while (node) {
    const base = node.getAttribute?.("base");
    if (base) return base.replace(/\/+$/, "") + "/" + url.replace(/^\/+/, "");
    node = node.parentElement;
  }
  if (_config.baseApiUrl)
    return (
      _config.baseApiUrl.replace(/\/+$/, "") + "/" + url.replace(/^\/+/, "")
    );
  return url;
}

export async function _doFetch(
  url,
  method = "GET",
  body = null,
  extraHeaders = {},
  el = null,
  externalSignal = null,
  retries = undefined,
  retryDelay = undefined,
  meta = null,
) {
  const fullUrl = resolveUrl(url, el);
  if (_config.credentials !== "omit" && fullUrl.startsWith("http://")) {
    _warn("Credentials sent over insecure HTTP:", fullUrl);
  }
  const upperMethod = method.toUpperCase();
  let opts = {
    method: upperMethod,
    headers: { ...(_config.headers || {}), ...extraHeaders },
    credentials: _config.credentials,
  };

  if (body && upperMethod !== "GET") {
    if (typeof body === "string") {
      try {
        JSON.parse(body);
        opts.headers["Content-Type"] = "application/json";
        opts.body = body;
      } catch {
        opts.body = body;
      }
    } else if (body instanceof FormData) {
      opts.body = body;
    } else {
      opts.headers["Content-Type"] = "application/json";
      opts.body = JSON.stringify(body);
    }
  }

  // CSRF — only inject for same-origin requests to prevent token leakage
  if (_config.csrf && upperMethod !== "GET") {
    const isSameOrigin = !fullUrl.startsWith("http") ||
      (typeof window !== "undefined" && new URL(fullUrl, window.location.href).origin === window.location.origin);
    if (isSameOrigin) {
      opts.headers[_config.csrf.header || "X-CSRF-Token"] =
        _config.csrf.token || "";
    }
  }

  // ── Request interceptors ──
  // Strip sensitive headers before passing to interceptors (only when interceptors exist)
  const hasRequestInterceptors = _interceptors.request.length > 0;
  const sensitiveHeaders = {};
  if (hasRequestInterceptors) {
    for (const key of Object.keys(opts.headers)) {
      if (_isSensitiveHeader(key)) {
        sensitiveHeaders[key] = opts.headers[key];
        delete opts.headers[key];
      }
    }
  }

  _interceptorDepth++;
  try {
    if (_interceptorDepth <= _MAX_INTERCEPTOR_DEPTH) {
      for (let i = 0; i < _interceptors.request.length; i++) {
        const entry = _interceptors.request[i];
        const fn = entry.fn ?? entry;
        const isTrusted = entry.pluginName && _plugins.get(entry.pluginName)?.options?.trusted === true;

        const interceptorOpts = isTrusted
          ? { ...opts, headers: { ...opts.headers, ...sensitiveHeaders } }
          : { ...opts, headers: { ...opts.headers } };

        const result = await _withTimeout(
          Promise.resolve(fn(fullUrl, interceptorOpts)),
          _INTERCEPTOR_TIMEOUT,
          "Interceptor timeout",
        ).catch(e => {
          _warn(`Request interceptor [${i}] error:`, e.message);
          return undefined;
        });

        if (result && result[_CANCEL]) {
          _log("Request cancelled by interceptor", i);
          throw new DOMException("Request cancelled by interceptor", "AbortError");
        }
        if (result && result[_RESPOND] !== undefined) {
          _log("Request short-circuited by interceptor", i);
          return result[_RESPOND];
        }
        if (result && typeof result === "object" && !result[_CANCEL] && result[_RESPOND] === undefined) {
          if (result.headers && typeof result.headers === "object") {
            const safeHeaders = { ...opts.headers };
            for (const [key, value] of Object.entries(result.headers)) {
              if (_isSensitiveHeader(key)) {
                // Only trusted interceptors may update sensitive headers
                // (e.g. an auth-token refresh). Their value overrides the
                // originally-stripped one when re-applied below.
                if (isTrusted) sensitiveHeaders[key] = value;
              } else {
                safeHeaders[key] = value;
              }
            }
            opts.headers = safeHeaders;
          }
        }
      }
    }
  } finally {
    _interceptorDepth--;
  }

  // Re-apply sensitive headers after interceptor chain
  if (hasRequestInterceptors) {
    Object.assign(opts.headers, sensitiveHeaders);
  }

  // Retry logic
  const maxRetries = retries !== undefined ? retries : (_config.retries || 0);
  let lastError;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const controller = new AbortController();
    let timeout = null;
    let onExternalAbort = null;
    try {
      timeout = setTimeout(
        () => controller.abort(),
        _config.timeout || 10000,
      );
      // Wire external abort signal (switchMap) to internal controller.
      // The listener is captured and removed in `finally` so a long-lived
      // external signal does not accumulate one dead listener per attempt
      // (Safety Rule 2).
      if (externalSignal) {
        if (externalSignal.aborted) {
          throw new DOMException("Aborted", "AbortError");
        }
        onExternalAbort = () => controller.abort();
        externalSignal.addEventListener("abort", onExternalAbort);
      }
      opts.signal = controller.signal;

      let response = await fetch(fullUrl, opts);

      // Response interceptors. Track the real Response behind any redacted
      // shell so the body can still be read if an interceptor returns a
      // custom object that drops the original reference.
      let realResponse = response;
      for (let i = 0; i < _interceptors.response.length; i++) {
        const entry = _interceptors.response[i];
        const fn = entry.fn ?? entry;
        const isTrusted = entry.pluginName && _plugins.get(entry.pluginName)?.options?.trusted === true;

        const interceptorResponse = isTrusted ? response : _redactResponse(response);
        const interceptorUrl = isTrusted ? fullUrl : _redactUrlParams(fullUrl);

        const result = await _withTimeout(
          Promise.resolve(fn(interceptorResponse, interceptorUrl)),
          _INTERCEPTOR_TIMEOUT,
          "Response interceptor timeout",
        ).catch(e => {
          _warn(`Response interceptor [${i}] error:`, e.message);
          return undefined;
        });

        if (result && result[_REPLACE] !== undefined) {
          _log("Response replaced by interceptor", i);
          if (meta) meta.headers = response.headers;
          return result[_REPLACE];
        }
        if (result) {
          response = result;
          // Keep realResponse pointing at the underlying Response: either the
          // unwrapped redacted shell or the result itself when it's a real one.
          if (_responseOriginals.has(result)) {
            realResponse = _responseOriginals.get(result);
          } else if (typeof result.text === "function") {
            realResponse = result;
          }
        }
      }

      // Unwrap redacted shell back to real Response for data extraction.
      // Fall back to the tracked real response when the interceptor swapped
      // in a custom object that lost the original body/headers.
      if (_responseOriginals.has(response)) {
        response = _responseOriginals.get(response);
      } else if (typeof response.text !== "function") {
        response = realResponse;
      }

      if (!response.ok) {
        const errBody = await response.json().catch(() => ({}));
        const err = new Error(errBody.message || `HTTP ${response.status}`);
        err.status = response.status;
        err.body = errBody;
        throw err;
      }

      // Populate optional meta object with response headers for callers
      // that need access (e.g. pagination end-of-data detection).
      if (meta) meta.headers = response.headers;

      const text = await response.text();
      try {
        return JSON.parse(text);
      } catch {
        return text;
      }
    } catch (e) {
      if (e.name === "AbortError") throw e; // Don't retry aborted requests
      lastError = e;
      if (attempt < maxRetries) {
        await new Promise((r) => setTimeout(r, retryDelay !== undefined ? retryDelay : (_config.retryDelay || 1000)));
      }
    } finally {
      // Always clear the per-attempt timeout (Safety Rule 4) and detach the
      // external-signal listener so neither leaks on the error/retry path.
      if (timeout !== null) clearTimeout(timeout);
      if (externalSignal && onExternalAbort) {
        externalSignal.removeEventListener("abort", onExternalAbort);
      }
    }
  }
  throw lastError;
}

export function _cacheGet(key, strategy) {
  if (strategy === "none") return null;
  if (strategy === "memory") {
    const entry = _cache.get(key);
    if (entry && Date.now() - entry.time < (_config.cache.ttl || 300000)) {
      // Move to end (most-recently-used) for LRU eviction
      _cache.delete(key);
      _cache.set(key, entry);
      return entry.data;
    }
    return null;
  }
  const store =
    strategy === "local"
      ? localStorage
      : strategy === "session"
        ? sessionStorage
        : null;
  if (!store) return null;
  try {
    const raw = store.getItem("nojs_cache_" + key);
    if (!raw) return null;
    const entry = JSON.parse(raw);
    if (Date.now() - entry.time < (_config.cache.ttl || 300000))
      return entry.data;
    store.removeItem("nojs_cache_" + key);
  } catch {
    /* ignore */
  }
  return null;
}

export function _cacheSet(key, data, strategy) {
  if (strategy === "none") return;
  const entry = { data, time: Date.now() };
  if (strategy === "memory") {
    if (_cache.has(key)) {
      _cache.delete(key); // refresh position before re-inserting
    } else if (_cache.size >= _MAX_CACHE) {
      _cache.delete(_cache.keys().next().value); // evict LRU (insertion-order first)
    }
    _cache.set(key, entry);
    return;
  }
  const store =
    strategy === "local"
      ? localStorage
      : strategy === "session"
        ? sessionStorage
        : null;
  if (store) {
    try {
      store.setItem("nojs_cache_" + key, JSON.stringify(entry));
    } catch {
      /* ignore */
    }
  }
}
