// ═══════════════════════════════════════════════════════════════════════
//  FETCH HELPER, URL RESOLUTION & CACHE
// ═══════════════════════════════════════════════════════════════════════

import { _config, _interceptors, _cache, _plugins, _SENSITIVE_HEADERS, _SENSITIVE_RESPONSE_HEADERS, _isSensitiveName, _log, _warn, _CANCEL, _RESPOND, _REPLACE } from "./globals.js";

const _MAX_CACHE = 200;
const _INTERCEPTOR_TIMEOUT = 5000;
let _interceptorDepth = 0;
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

// Request-interceptor re-entrancy guard: _interceptorDepth is raised only while
// the interceptor runs synchronously, so a fetch it issues from there skips the
// chain. It is never held across an await, so it cannot leak into concurrent,
// unrelated requests.
function _guardReentry(fn) {
  return (...args) => {
    _interceptorDepth++;
    try {
      return fn(...args);
    } finally {
      _interceptorDepth--;
    }
  };
}

// The configured csrf.header name is treated as sensitive only with
// strictRedaction; by default untrusted interceptors can read and set it.
function _isSensitiveHeader(name) {
  return (
    _SENSITIVE_HEADERS.has(name.toLowerCase()) ||
    /^x-(auth|api)-/i.test(name) ||
    (_config.strictRedaction &&
      typeof _config.csrf?.header === "string" &&
      name.toLowerCase() === _config.csrf.header.toLowerCase())
  );
}

// String-level URL redaction (strictRedaction / strictDevtools consumers).
// The #fragment is dropped: it may carry tokens (e.g. OAuth implicit flow)
// and never reaches the server. In the query, only the values of parameters
// whose name is sensitive (_isSensitiveName, matched by word, not substring)
// are replaced; everything else is preserved byte-for-byte.
export function _redactUrlParams(url) {
  if (typeof url !== "string") return url;
  const h = url.indexOf("#");
  if (h !== -1) url = url.slice(0, h);
  const q = url.indexOf("?");
  if (q === -1) return url;
  const query = url.slice(q + 1).split("&").map((pair) => {
    const eq = pair.indexOf("=");
    if (eq === -1) return pair;
    return _isSensitiveName(_decodeKey(pair.slice(0, eq)))
      ? pair.slice(0, eq + 1) + "[REDACTED]"
      : pair;
  }).join("&");
  return url.slice(0, q + 1) + query;
}

// Decode a query key for matching. A malformed escape (e.g. "%ZZ") must not
// hide the rest of the key, so fall back to decoding each valid %XX alone.
function _decodeKey(raw) {
  const key = raw.replace(/\+/g, " ");
  try {
    return decodeURIComponent(key);
  } catch {
    return key.replace(/%[0-9a-f]{2}/gi, (m) => {
      try { return decodeURIComponent(m); } catch { return m; }
    });
  }
}

// v1.21.1 URL redaction (URL-object based, substring match). Default for the
// URL handed to untrusted response interceptors and the redacted response.
function _redactUrlParamsLegacy(url) {
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

function _redactInterceptorUrl(url) {
  return _config.strictRedaction ? _redactUrlParams(url) : _redactUrlParamsLegacy(url);
}

// URL for fetch:success / fetch:error / error event payloads and the
// directive failure warnings.
export function _eventUrl(url) {
  return _config.strictRedaction ? _redactUrlParams(url) : url;
}

// Response redaction helper for untrusted interceptors
function _redactResponse(response) {
  const redactedHeaders = new Headers(response.headers);
  for (const h of _SENSITIVE_RESPONSE_HEADERS) {
    redactedHeaders.delete(h);
  }
  if (_config.strictRedaction) {
    for (const h of [...redactedHeaders.keys()]) {
      if (_isSensitiveHeader(h)) redactedHeaders.delete(h);
    }
  }
  const redactedUrl = _redactInterceptorUrl(response.url);
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

function _originOf(u) {
  try {
    return new URL(u.replace(/\\/g, "/"), window.location.href).origin;
  } catch {
    return null;
  }
}

// Trusted origins are the page, the configured baseApiUrl, and the nearest
// base=. A parse failure is treated as NOT trusted.
function _isTrustedOrigin(fullUrl, el) {
  if (typeof window === "undefined") return true;
  const target = _originOf(fullUrl);
  if (!target) return false;
  if (target === window.location.origin) return true;
  if (_config.baseApiUrl && target === _originOf(_config.baseApiUrl)) return true;
  for (let node = el; node; node = node.parentElement) {
    const base = node.getAttribute?.("base");
    if (base) return target === _originOf(base);
  }
  return false;
}

// Global config headers go to every request by default. With scopeHeaders
// they are attached only to trusted origins (see _isTrustedOrigin).
function _globalHeadersFor(fullUrl, el) {
  const headers = _config.headers || {};
  if (_config.scopeHeaders && !_isTrustedOrigin(fullUrl, el)) return {};
  return headers;
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
    _warn("Credentials sent over insecure HTTP:", _eventUrl(fullUrl));
  }
  const upperMethod = method.toUpperCase();
  let opts = {
    method: upperMethod,
    headers: { ..._globalHeadersFor(fullUrl, el), ...extraHeaders },
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

  // CSRF — only inject for same-origin requests to prevent token leakage.
  // GET and QUERY are safe/idempotent read methods (QUERY carries a body but
  // is semantically a read, RFC 10008), so no CSRF token is injected for them.
  // Always resolve and compare origins (normalizing backslashes to forward
  // slashes first) so protocol-relative (//evil.com), backslash (\\evil.com),
  // and uppercase-scheme (HTTP://evil.com) URLs cannot be misclassified as
  // same-origin. A parse failure is treated as NOT same-origin.
  if (_config.csrf && upperMethod !== "GET" && upperMethod !== "QUERY") {
    const isSameOrigin =
      typeof window !== "undefined" && _originOf(fullUrl) === window.location.origin;
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

  // With strictRedaction, untrusted interceptors see a redacted URL; the
  // request always uses `fullUrl`.
  const requestInterceptorUrl = _config.strictRedaction ? _redactUrlParams(fullUrl) : fullUrl;

  if (hasRequestInterceptors) {
    // Skip the chain for a fetch issued from inside a request interceptor
    // (see _guardReentry). Nothing above is awaited, so a nested _doFetch
    // reaches this check while the interceptor that issued it is running.
    if (_interceptorDepth === 0) {
      for (let i = 0; i < _interceptors.request.length; i++) {
        const entry = _interceptors.request[i];
        const fn = _guardReentry(entry.fn ?? entry);
        const isTrusted = entry.pluginName && _plugins.get(entry.pluginName)?.options?.trusted === true;

        const interceptorOpts = isTrusted
          ? { ...opts, headers: { ...opts.headers, ...sensitiveHeaders } }
          : { ...opts, headers: { ...opts.headers } };

        const result = await _withTimeout(
          Promise.resolve(fn(isTrusted ? fullUrl : requestInterceptorUrl, interceptorOpts)),
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
        const interceptorUrl = isTrusted ? fullUrl : _redactInterceptorUrl(fullUrl);

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
