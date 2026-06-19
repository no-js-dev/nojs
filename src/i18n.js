// ═══════════════════════════════════════════════════════════════════════
//  i18n SYSTEM
// ═══════════════════════════════════════════════════════════════════════

import { _config, _warn, _i18nListeners } from "./globals.js";

// ─── Notify all i18n listeners (shared by setter + directive) ────────
export function _notifyI18n() {
  _i18nTranslationCache.clear();
  for (const fn of _i18nListeners) {
    if (fn._el && !fn._el.isConnected) { _i18nListeners.delete(fn); continue; }
    fn();
  }
}

// ─── Deep merge (recursive, returns new object) ─────────────────────
const _FORBIDDEN_MERGE_KEYS = new Set(["__proto__", "constructor", "prototype"]);
function _deepMerge(target, source) {
  const out = { ...target };
  for (const key of Object.keys(source)) {
    if (_FORBIDDEN_MERGE_KEYS.has(key)) continue;
    if (
      source[key] && typeof source[key] === "object" && !Array.isArray(source[key]) &&
      target[key] && typeof target[key] === "object" && !Array.isArray(target[key])
    ) {
      out[key] = _deepMerge(target[key], source[key]);
    } else {
      out[key] = source[key];
    }
  }
  return out;
}

// ─── Translation lookup cache: Map<string, string>  key = "en:namespace.key.path"
// Stores the raw resolved message (before interpolation/pluralization).
// Cleared on locale change and namespace reload to avoid stale entries.
export const _i18nTranslationCache = new Map();

// ─── Locale file cache: Map<string, object>  key = "en" or "en:dashboard"
const _i18nCache = new Map();
const _loadedNs = new Set();

// ─── Fetch a single JSON file and merge into _i18n.locales[locale] ──
async function _loadLocale(locale, ns) {
  const cacheKey = ns ? `${locale}:${ns}` : locale;
  if (_config.i18n.cache && _i18nCache.has(cacheKey)) return;

  let url = _config.i18n.loadPath.replace("{locale}", locale);
  if (ns) url = url.replace("{ns}", ns);
  else if (url.includes("{ns}")) return; // no namespace to substitute


  try {
    const res = await fetch(url);
    if (!res.ok) { _warn(`i18n: failed to load ${url} (${res.status})`); return; }
    const data = await res.json();
    _i18n.locales[locale] = _deepMerge(_i18n.locales[locale] || {}, data);
    _i18nTranslationCache.clear();
    if (_config.i18n.cache) _i18nCache.set(cacheKey, data);
  } catch (e) {
    _warn(`i18n: error loading ${url}`, e);
  }
}

// ─── Load all configured data for a locale (flat or all namespaces) ──
export async function _loadI18nForLocale(locale) {
  if (!_config.i18n.loadPath) return;
  const ns = _config.i18n.ns;
  if (!ns.length || !_config.i18n.loadPath.includes("{ns}")) {
    await _loadLocale(locale, null);
  } else {
    await Promise.all(ns.map((n) => _loadLocale(locale, n)));
  }
}

// ─── Load a single namespace for current + fallback locales ──────────
export async function _loadI18nNamespace(ns) {
  if (!_config.i18n.loadPath) return;
  _loadedNs.add(ns);
  const locales = new Set([_i18n.locale, _config.i18n.fallbackLocale]);
  await Promise.all([...locales].map((l) => _loadLocale(l, ns)));
}

export const _i18n = {
  _locale: "en",
  _locales: {},
  get locales() {
    return this._locales;
  },
  set locales(v) {
    this._locales = v;
    _i18nTranslationCache.clear();
  },
  get locale() {
    return this._locale;
  },
  set locale(v) {
    if (this._locale !== v) {
      this._locale = v;
      _i18nTranslationCache.clear();
      if (_config.i18n.persist && typeof localStorage !== "undefined") {
        try { localStorage.setItem("nojs-locale", v); } catch (_) {}
      }
      if (_config.i18n.loadPath) {
        // Load configured ns + any route-loaded ns for the new locale
        const allNs = new Set([..._config.i18n.ns, ..._loadedNs]);
        Promise.all([...allNs].map((n) => _loadLocale(v, n))).then(() => _notifyI18n());
      } else {
        _notifyI18n();
      }
    }
  },
  t(key, params = {}) {
    // ─── Flat translation cache: avoid repeated split+reduce on same key ──
    const cacheKey = `${_i18n.locale}:${key}`;
    let msg = _i18nTranslationCache.get(cacheKey);
    if (msg === undefined) {
      const resolve = (locale) =>
        key.split(".").reduce((o, k) => o?.[k], _i18n.locales[locale] || {});
      msg = resolve(_i18n.locale);
      // Per-key fallback: a present bundle missing this key still falls back
      // to the fallbackLocale bundle (not just when the whole bundle is absent).
      if (
        msg == null &&
        _config.i18n.fallbackLocale &&
        _config.i18n.fallbackLocale !== _i18n.locale
      ) {
        msg = resolve(_config.i18n.fallbackLocale);
      }
      // Cache resolved value (including null for missing keys)
      _i18nTranslationCache.set(cacheKey, msg ?? null);
    }
    if (msg == null) return key;

    // Pluralization: "one item | {count} items"
    if (
      typeof msg === "string" &&
      msg.includes("|") &&
      params.count != null
    ) {
      const forms = msg.split("|").map((s) => s.trim());
      msg = Number(params.count) === 1 ? forms[0] : forms[1] || forms[0];
    }

    // Interpolation: {name}
    if (typeof msg === "string") {
      msg = msg.replace(/\{(\w+)\}/g, (_, k) =>
        params[k] != null ? params[k] : "",
      );
    }
    return msg;
  },
};

// ═══════════════════════════════════════════════════════════════════════
//  $i18n REACTIVE PROXY
//  Exposes translation data as dot-notation properties so i18n keys can
//  be used in any expression context (state, bind, computed, watch, etc.)
//  Usage: $i18n.shell.sidebar.introduction  →  resolved translation
// ═══════════════════════════════════════════════════════════════════════

const _I18N_RESERVED = new Set(["locale", "locales", "t", "setLocale"]);

function _createI18nNestedProxy(path) {
  return new Proxy(Object.create(null), {
    get(_, key) {
      // Symbol properties — delegate normally (for JSON.stringify, console.log, etc.)
      if (typeof key !== "string") return undefined;

      const fullPath = path ? path + "." + key : key;
      const locale = _i18n.locale;
      const data = _i18n.locales[locale];
      const val = fullPath.split(".").reduce((o, k) => o?.[k], data || {});

      // If resolved value is an object → return a nested proxy (recursive)
      if (val != null && typeof val === "object" && !Array.isArray(val)) {
        return _createI18nNestedProxy(fullPath);
      }

      // If it's a string/number → return the leaf value
      if (val != null) return val;

      // Fallback locale: try fallbackLocale before returning undefined
      const fb = _config.i18n.fallbackLocale;
      if (fb && fb !== locale) {
        const fbData = _i18n.locales[fb];
        const fbVal = fullPath.split(".").reduce((o, k) => o?.[k], fbData || {});
        if (fbVal != null && typeof fbVal === "object" && !Array.isArray(fbVal)) {
          return _createI18nNestedProxy(fullPath);
        }
        if (fbVal != null) return fbVal;
      }

      return undefined;
    },
  });
}

export const _i18nProxy = new Proxy(_i18n, {
  get(target, key) {
    // Symbol properties — delegate to _i18n for JSON.stringify, console.log, etc.
    if (typeof key !== "string") return target[key];

    // Reserved properties — delegate to _i18n directly
    if (key === "locale" || key === "locales" || key === "t") {
      return target[key];
    }

    // setLocale — a convenience method that sets _i18n.locale
    if (key === "setLocale") {
      return (value) => { target.locale = value; };
    }

    // Unknown string properties → resolve into translation data
    const locale = target.locale;
    const data = target.locales[locale];
    const val = data?.[key];

    // If the resolved value is an object → return a nested proxy
    if (val != null && typeof val === "object" && !Array.isArray(val)) {
      return _createI18nNestedProxy(key);
    }

    // If it's a string/number → return the leaf value
    if (val != null) return val;

    // Fallback locale
    const fb = _config.i18n.fallbackLocale;
    if (fb && fb !== locale) {
      const fbData = target.locales[fb];
      const fbVal = fbData?.[key];
      if (fbVal != null && typeof fbVal === "object" && !Array.isArray(fbVal)) {
        return _createI18nNestedProxy(key);
      }
      if (fbVal != null) return fbVal;
    }

    return undefined;
  },
});
