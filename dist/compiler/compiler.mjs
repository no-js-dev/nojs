/**
 * No.JS v1.21.1 — The HTML-First Reactive Framework
 * No more JavaScript. Just HTML attributes with superpowers.
 * @author exs.dev
 * @homepage https://no-js.dev
 * @license MIT
 * @see https://github.com/no-js-dev/nojs
 */

// src/globals.js
var _config = {
  baseApiUrl: "",
  headers: {},
  timeout: 1e4,
  retries: 0,
  retryDelay: 1e3,
  credentials: "same-origin",
  csrf: null,
  cache: { strategy: "none", ttl: 3e5 },
  templates: { cache: true },
  router: { useHash: false, base: "/", scrollBehavior: "top", templates: "pages", ext: ".tpl", suppressHashWarning: false, focusBehavior: "none", viewTransition: true },
  i18n: { defaultLocale: "en", fallbackLocale: "en", detectBrowser: false, loadPath: null, ns: [], supportedLocales: [], cache: true, persist: false },
  debug: false,
  devtools: false,
  sanitize: true,
  dangerouslyDisableSanitize: false,
  sanitizeHtml: null,
  exprCacheSize: 500,
  maxEventListeners: 100,
  appId: ""
};
var _stores = {};
var _i18nListeners = /* @__PURE__ */ new Set();
var _filters = {};
var _routerInstance = null;
var _globals = /* @__PURE__ */ Object.create(null);
function _warn(...args) {
  console.warn("[No.JS]", ...args);
}
var _exprRootKeysFn = null;
function _setExprRootKeysFn(f) {
  _exprRootKeysFn = f;
}

// src/i18n.js
function _notifyI18n() {
  _i18nTranslationCache.clear();
  for (const fn of _i18nListeners) {
    if (fn._el && !fn._el.isConnected) {
      _i18nListeners.delete(fn);
      continue;
    }
    fn();
  }
}
var _FORBIDDEN_MERGE_KEYS = /* @__PURE__ */ new Set(["__proto__", "constructor", "prototype"]);
function _deepMerge(target, source) {
  const out = { ...target };
  for (const key of Object.keys(source)) {
    if (_FORBIDDEN_MERGE_KEYS.has(key)) continue;
    if (source[key] && typeof source[key] === "object" && !Array.isArray(source[key]) && target[key] && typeof target[key] === "object" && !Array.isArray(target[key])) {
      out[key] = _deepMerge(target[key], source[key]);
    } else {
      out[key] = source[key];
    }
  }
  return out;
}
var _i18nTranslationCache = /* @__PURE__ */ new Map();
var _i18nCache = /* @__PURE__ */ new Map();
var _loadedNs = /* @__PURE__ */ new Set();
async function _loadLocale(locale, ns) {
  const cacheKey = ns ? `${locale}:${ns}` : locale;
  if (_config.i18n.cache && _i18nCache.has(cacheKey)) return;
  let url = _config.i18n.loadPath.replace("{locale}", encodeURIComponent(locale));
  if (ns) url = url.replace("{ns}", encodeURIComponent(ns));
  else if (url.includes("{ns}")) return;
  try {
    const res = await fetch(url);
    if (!res.ok) {
      _warn(`i18n: failed to load ${url} (${res.status})`);
      return;
    }
    const data = await res.json();
    _i18n.locales[locale] = _deepMerge(_i18n.locales[locale] || {}, data);
    _i18nTranslationCache.clear();
    if (_config.i18n.cache) _i18nCache.set(cacheKey, data);
  } catch (e) {
    _warn(`i18n: error loading ${url}`, e);
  }
}
var _i18n = {
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
    const supported = _config.i18n.supportedLocales;
    if (Array.isArray(supported) && supported.length && !supported.includes(v)) {
      _warn(`i18n: locale "${v}" is not in supportedLocales; ignoring`);
      return;
    }
    if (this._locale !== v) {
      this._locale = v;
      _i18nTranslationCache.clear();
      if (_config.i18n.persist && typeof localStorage !== "undefined") {
        try {
          localStorage.setItem("nojs-locale", v);
        } catch (_) {
        }
      }
      if (_config.i18n.loadPath) {
        const allNs = /* @__PURE__ */ new Set([..._config.i18n.ns, ..._loadedNs]);
        Promise.all([...allNs].map((n) => _loadLocale(v, n))).then(() => _notifyI18n());
      } else {
        _notifyI18n();
      }
    }
  },
  t(key, params = {}) {
    const cacheKey = `${_i18n.locale}:${key}`;
    let msg = _i18nTranslationCache.get(cacheKey);
    if (msg === void 0) {
      const resolve = (locale) => key.split(".").reduce((o, k) => o?.[k], _i18n.locales[locale] || {});
      msg = resolve(_i18n.locale);
      if (msg == null && _config.i18n.fallbackLocale && _config.i18n.fallbackLocale !== _i18n.locale) {
        msg = resolve(_config.i18n.fallbackLocale);
      }
      _i18nTranslationCache.set(cacheKey, msg ?? null);
    }
    if (msg == null) return key;
    if (typeof msg === "string" && msg.includes("|") && params.count != null) {
      const forms = msg.split("|").map((s) => s.trim());
      msg = Number(params.count) === 1 ? forms[0] : forms[1] || forms[0];
    }
    if (typeof msg === "string") {
      msg = msg.replace(
        /\{(\w+)\}/g,
        (_, k) => params[k] != null ? params[k] : ""
      );
    }
    return msg;
  }
};
function _createI18nNestedProxy(path) {
  return new Proxy(/* @__PURE__ */ Object.create(null), {
    get(_, key) {
      if (typeof key !== "string") return void 0;
      const fullPath = path ? path + "." + key : key;
      const locale = _i18n.locale;
      const data = _i18n.locales[locale];
      const val = fullPath.split(".").reduce((o, k) => o?.[k], data || {});
      if (val != null && typeof val === "object" && !Array.isArray(val)) {
        return _createI18nNestedProxy(fullPath);
      }
      if (val != null) return val;
      const fb = _config.i18n.fallbackLocale;
      if (fb && fb !== locale) {
        const fbData = _i18n.locales[fb];
        const fbVal = fullPath.split(".").reduce((o, k) => o?.[k], fbData || {});
        if (fbVal != null && typeof fbVal === "object" && !Array.isArray(fbVal)) {
          return _createI18nNestedProxy(fullPath);
        }
        if (fbVal != null) return fbVal;
      }
      return void 0;
    }
  });
}
var _i18nProxy = new Proxy(_i18n, {
  get(target, key) {
    if (typeof key !== "string") return target[key];
    if (key === "locale" || key === "locales" || key === "t") {
      return target[key];
    }
    if (key === "setLocale") {
      return (value) => {
        target.locale = value;
      };
    }
    const locale = target.locale;
    const data = target.locales[locale];
    const val = data?.[key];
    if (val != null && typeof val === "object" && !Array.isArray(val)) {
      return _createI18nNestedProxy(key);
    }
    if (val != null) return val;
    const fb = _config.i18n.fallbackLocale;
    if (fb && fb !== locale) {
      const fbData = target.locales[fb];
      const fbVal = fbData?.[key];
      if (fbVal != null && typeof fbVal === "object" && !Array.isArray(fbVal)) {
        return _createI18nNestedProxy(key);
      }
      if (fbVal != null) return fbVal;
    }
    return void 0;
  }
});

// src/evaluate.js
function _makeCache() {
  const map = /* @__PURE__ */ new Map();
  return {
    get(k) {
      if (!map.has(k)) return void 0;
      const v = map.get(k);
      map.delete(k);
      map.set(k, v);
      return v;
    },
    has(k) {
      return map.has(k);
    },
    set(k, v) {
      const max = _config.exprCacheSize;
      if (map.has(k)) {
        map.delete(k);
      } else if (map.size >= max) {
        map.delete(map.keys().next().value);
      }
      map.set(k, v);
    },
    get size() {
      return map.size;
    }
  };
}
var _exprCache = _makeCache();
var _stmtCache = _makeCache();
var _KEYWORDS = /* @__PURE__ */ new Set(["true", "false", "null", "undefined", "typeof", "in", "instanceof"]);
var _FORBIDDEN = /* @__PURE__ */ new Set(["__proto__", "constructor", "prototype"]);
var _MULTI = ["===", "!==", "...", "??", "?.", "==", "!=", ">=", "<=", "&&", "||", "+=", "-=", "*=", "/=", "%=", "++", "--", "=>"];
var _SINGLE_OPS = /* @__PURE__ */ new Set(["+", "-", "*", "/", "%", ">", "<", "!", "=", "|"]);
var _SINGLE_PUNC = /* @__PURE__ */ new Set(["(", ")", "[", "]", "{", "}", ".", ",", ":", ";", "?"]);
function _tokenize(expr) {
  if (typeof expr !== "string") return [];
  const tokens = [];
  const len = expr.length;
  let pos = 0;
  while (pos < len) {
    const ch = expr[pos];
    if (ch === " " || ch === "	" || ch === "\n" || ch === "\r") {
      pos++;
      continue;
    }
    if (ch === "'" || ch === '"') {
      const start = pos;
      const quote = ch;
      pos++;
      let value = "";
      while (pos < len && expr[pos] !== quote) {
        if (expr[pos] === "\\") {
          pos++;
          if (pos < len) {
            const esc = expr[pos];
            if (esc === "n") value += "\n";
            else if (esc === "t") value += "	";
            else if (esc === "r") value += "\r";
            else value += esc;
            pos++;
          }
        } else {
          value += expr[pos++];
        }
      }
      if (pos < len) pos++;
      tokens.push({ type: "String", value, pos: start });
      continue;
    }
    if (ch === "`") {
      const start = pos;
      pos++;
      const parts = [];
      const exprs = [];
      let seg = "";
      while (pos < len && expr[pos] !== "`") {
        if (expr[pos] === "\\" && pos + 1 < len) {
          const esc = expr[pos + 1];
          if (esc === "n") seg += "\n";
          else if (esc === "t") seg += "	";
          else if (esc === "r") seg += "\r";
          else seg += esc;
          pos += 2;
        } else if (expr[pos] === "$" && pos + 1 < len && expr[pos + 1] === "{") {
          parts.push(seg);
          seg = "";
          pos += 2;
          let depth = 1;
          let inner = "";
          while (pos < len && depth > 0) {
            if (expr[pos] === "{") depth++;
            else if (expr[pos] === "}") {
              depth--;
              if (depth === 0) break;
            } else if (expr[pos] === "'" || expr[pos] === '"' || expr[pos] === "`") {
              const q = expr[pos];
              inner += q;
              pos++;
              while (pos < len && expr[pos] !== q) {
                if (expr[pos] === "\\") {
                  inner += expr[pos++];
                  if (pos < len) inner += expr[pos++];
                } else inner += expr[pos++];
              }
              if (pos < len) {
                inner += expr[pos];
                pos++;
              }
              continue;
            }
            inner += expr[pos++];
          }
          if (pos < len) pos++;
          exprs.push(_tokenize(inner));
        } else {
          seg += expr[pos++];
        }
      }
      if (pos < len) pos++;
      parts.push(seg);
      tokens.push({ type: "Template", parts, exprs, pos: start });
      continue;
    }
    if (ch >= "0" && ch <= "9" || ch === "." && pos + 1 < len && expr[pos + 1] >= "0" && expr[pos + 1] <= "9") {
      const start = pos;
      let num = "";
      while (pos < len && (expr[pos] >= "0" && expr[pos] <= "9" || expr[pos] === ".")) {
        num += expr[pos++];
      }
      tokens.push({ type: "Number", value: num, pos: start });
      continue;
    }
    if (ch >= "a" && ch <= "z" || ch >= "A" && ch <= "Z" || ch === "_" || ch === "$") {
      const start = pos;
      let id = "";
      while (pos < len) {
        const c = expr[pos];
        if (c >= "a" && c <= "z" || c >= "A" && c <= "Z" || c >= "0" && c <= "9" || c === "_" || c === "$") {
          id += c;
          pos++;
        } else break;
      }
      if (_FORBIDDEN.has(id)) tokens.push({ type: "Forbidden", value: id, pos: start });
      else if (_KEYWORDS.has(id)) tokens.push({ type: "Keyword", value: id, pos: start });
      else tokens.push({ type: "Ident", value: id, pos: start });
      continue;
    }
    let matched = false;
    for (let m = 0; m < _MULTI.length; m++) {
      const op = _MULTI[m];
      if (expr.startsWith(op, pos)) {
        const isPunc = op === "..." || op === "?.";
        tokens.push({ type: isPunc ? "Punc" : "Op", value: op, pos });
        pos += op.length;
        matched = true;
        break;
      }
    }
    if (matched) continue;
    if (_SINGLE_OPS.has(ch)) {
      tokens.push({ type: "Op", value: ch, pos });
      pos++;
      continue;
    }
    if (_SINGLE_PUNC.has(ch)) {
      tokens.push({ type: "Punc", value: ch, pos });
      pos++;
      continue;
    }
    pos++;
  }
  return tokens;
}
function _parseExpr(tokens) {
  if (!tokens || tokens.length === 0) return { type: "Literal", value: void 0 };
  let pos = 0;
  function peek() {
    return tokens[pos];
  }
  function next() {
    return tokens[pos++];
  }
  function match(type, value) {
    const t = tokens[pos];
    if (!t) return false;
    if (value !== void 0) return t.type === type && t.value === value;
    return t.type === type;
  }
  function expect(type, value) {
    const t = tokens[pos];
    if (t && t.type === type && (value === void 0 || t.value === value)) {
      pos++;
      return t;
    }
    return null;
  }
  function parseExpression2() {
    return parseTernary();
  }
  function parseTernary() {
    let node = parseNullishOr();
    if (match("Punc", "?")) {
      next();
      const consequent = parseTernary();
      expect("Punc", ":");
      const alternate = parseTernary();
      node = { type: "ConditionalExpr", test: node, consequent, alternate };
    }
    return node;
  }
  function parseNullishOr() {
    let node = parseLogicalOr();
    if (match("Op", "??")) {
      next();
      const right = parseNullishOr();
      node = { type: "BinaryExpr", op: "??", left: node, right };
    }
    return node;
  }
  function parseLogicalOr() {
    let node = parseLogicalAnd();
    while (match("Op", "||")) {
      next();
      const right = parseLogicalAnd();
      node = { type: "BinaryExpr", op: "||", left: node, right };
    }
    return node;
  }
  function parseLogicalAnd() {
    let node = parseBitwiseOr();
    while (match("Op", "&&")) {
      next();
      const right = parseBitwiseOr();
      node = { type: "BinaryExpr", op: "&&", left: node, right };
    }
    return node;
  }
  function parseBitwiseOr() {
    let node = parseComparison();
    while (peek() && peek().type === "Op" && peek().value === "|" && (!tokens[pos + 1] || tokens[pos + 1].value !== "|")) {
      next();
      const right = parseComparison();
      node = { type: "BinaryExpr", op: "|", left: node, right };
    }
    return node;
  }
  function parseComparison() {
    let node = parseAddition();
    const t = peek();
    if (!t) return node;
    const compOps = ["===", "!==", "==", "!=", ">=", "<=", ">", "<"];
    if (t.type === "Op" && compOps.indexOf(t.value) !== -1 || t.type === "Keyword" && (t.value === "in" || t.value === "instanceof")) {
      const op = next().value;
      const right = parseAddition();
      node = { type: "BinaryExpr", op, left: node, right };
    }
    return node;
  }
  function parseAddition() {
    let node = parseMultiplication();
    while (peek() && peek().type === "Op" && (peek().value === "+" || peek().value === "-")) {
      const op = next().value;
      const right = parseMultiplication();
      node = { type: "BinaryExpr", op, left: node, right };
    }
    return node;
  }
  function parseMultiplication() {
    let node = parseUnary();
    while (peek() && peek().type === "Op" && (peek().value === "*" || peek().value === "/" || peek().value === "%")) {
      const op = next().value;
      const right = parseUnary();
      node = { type: "BinaryExpr", op, left: node, right };
    }
    return node;
  }
  function parseUnary() {
    const t = peek();
    if (!t) return { type: "Literal", value: void 0 };
    if (t.type === "Keyword" && t.value === "typeof") {
      next();
      return { type: "UnaryExpr", op: "typeof", argument: parseUnary() };
    }
    if (t.type === "Op" && (t.value === "!" || t.value === "-" || t.value === "+")) {
      next();
      return { type: "UnaryExpr", op: t.value, argument: parseUnary() };
    }
    if (t.type === "Op" && (t.value === "++" || t.value === "--")) {
      next();
      return { type: "UnaryExpr", op: t.value, argument: parseUnary(), prefix: true };
    }
    return parsePostfix();
  }
  function parsePostfix() {
    let node = parseCallMember();
    const t = peek();
    if (t && t.type === "Op" && (t.value === "++" || t.value === "--")) {
      next();
      node = { type: "PostfixExpr", op: t.value, argument: node };
    }
    return node;
  }
  function parseCallMember() {
    let node = parsePrimary();
    while (true) {
      const t = peek();
      if (!t) break;
      if (t.type === "Punc" && t.value === ".") {
        next();
        const prop = peek();
        if (prop && (prop.type === "Ident" || prop.type === "Keyword")) {
          next();
          node = { type: "MemberExpr", object: node, property: { type: "Identifier", name: prop.value }, computed: false };
        } else if (prop && prop.type === "Forbidden") {
          next();
          node = { type: "Forbidden" };
        } else {
          break;
        }
        continue;
      }
      if (t.type === "Punc" && t.value === "?.") {
        next();
        const nt = peek();
        if (nt && nt.type === "Punc" && nt.value === "(") {
          next();
          const args = parseArgsList();
          expect("Punc", ")");
          node = { type: "OptionalCallExpr", callee: node, args };
        } else if (nt && (nt.type === "Ident" || nt.type === "Keyword")) {
          next();
          node = { type: "OptionalMemberExpr", object: node, property: { type: "Identifier", name: nt.value }, computed: false };
        } else if (nt && nt.type === "Punc" && nt.value === "[") {
          next();
          const prop = parseExpression2();
          expect("Punc", "]");
          node = { type: "OptionalMemberExpr", object: node, property: prop, computed: true };
        } else {
          break;
        }
        continue;
      }
      if (t.type === "Punc" && t.value === "[") {
        next();
        const prop = parseExpression2();
        expect("Punc", "]");
        node = { type: "MemberExpr", object: node, property: prop, computed: true };
        continue;
      }
      if (t.type === "Punc" && t.value === "(") {
        next();
        const args = parseArgsList();
        expect("Punc", ")");
        node = { type: "CallExpr", callee: node, args };
        continue;
      }
      break;
    }
    return node;
  }
  function parseArgsList() {
    const args = [];
    if (match("Punc", ")")) return args;
    args.push(parseSpreadOrExpr());
    while (match("Punc", ",")) {
      next();
      if (match("Punc", ")")) break;
      args.push(parseSpreadOrExpr());
    }
    return args;
  }
  function parseSpreadOrExpr() {
    if (match("Punc", "...")) {
      next();
      return { type: "SpreadElement", argument: parseExpression2() };
    }
    return parseExpression2();
  }
  function isArrowParams() {
    const saved = pos;
    if (match("Punc", ")")) {
      const after = tokens[pos + 1];
      if (after && after.type === "Op" && after.value === "=>") {
        pos = saved;
        return true;
      }
      pos = saved;
      return false;
    }
    while (pos < tokens.length) {
      const t = peek();
      if (!t) break;
      if (t.type === "Ident") {
        next();
        if (match("Punc", ",")) {
          next();
          continue;
        }
        if (match("Punc", ")")) {
          const after = tokens[pos + 1];
          if (after && after.type === "Op" && after.value === "=>") {
            pos = saved;
            return true;
          }
          pos = saved;
          return false;
        }
        pos = saved;
        return false;
      }
      if (t.type === "Punc" && t.value === "...") {
        next();
        if (match("Ident")) {
          next();
        }
        if (match("Punc", ")")) {
          const after = tokens[pos + 1];
          if (after && after.type === "Op" && after.value === "=>") {
            pos = saved;
            return true;
          }
        }
        pos = saved;
        return false;
      }
      pos = saved;
      return false;
    }
    pos = saved;
    return false;
  }
  function parseArrowParams() {
    const params = [];
    if (match("Punc", ")")) return params;
    if (match("Punc", "...")) {
      next();
      if (match("Ident")) params.push("..." + next().value);
    } else if (match("Ident")) {
      params.push(next().value);
    }
    while (match("Punc", ",")) {
      next();
      if (match("Punc", ")")) break;
      if (match("Punc", "...")) {
        next();
        if (match("Ident")) params.push("..." + next().value);
      } else if (match("Ident")) {
        params.push(next().value);
      }
    }
    return params;
  }
  function parsePrimary() {
    const t = peek();
    if (!t) return { type: "Literal", value: void 0 };
    if (t.type === "Forbidden") {
      next();
      return { type: "Forbidden" };
    }
    if (t.type === "Number") {
      next();
      return { type: "Literal", value: Number(t.value) };
    }
    if (t.type === "String") {
      next();
      return { type: "Literal", value: t.value };
    }
    if (t.type === "Template") {
      next();
      return {
        type: "TemplateLiteral",
        parts: t.parts,
        expressions: t.exprs.map(function(exprTokens) {
          return _parseExpr(exprTokens);
        })
      };
    }
    if (t.type === "Keyword") {
      if (t.value === "true") {
        next();
        return { type: "Literal", value: true };
      }
      if (t.value === "false") {
        next();
        return { type: "Literal", value: false };
      }
      if (t.value === "null") {
        next();
        return { type: "Literal", value: null };
      }
      if (t.value === "undefined") {
        next();
        return { type: "Literal", value: void 0 };
      }
    }
    if (t.type === "Punc" && t.value === "[") {
      next();
      const elements = [];
      while (!match("Punc", "]") && pos < tokens.length) {
        elements.push(parseSpreadOrExpr());
        if (match("Punc", ",")) next();
      }
      expect("Punc", "]");
      return { type: "ArrayExpr", elements };
    }
    if (t.type === "Punc" && t.value === "{") {
      return parseObjectLiteral();
    }
    if (t.type === "Punc" && t.value === "(") {
      next();
      if (isArrowParams()) {
        const params = parseArrowParams();
        expect("Punc", ")");
        expect("Op", "=>");
        const body = parseExpression2();
        return { type: "ArrowFunction", params, body };
      }
      const expr = parseExpression2();
      expect("Punc", ")");
      return expr;
    }
    if (t.type === "Ident") {
      next();
      if (match("Op", "=>")) {
        next();
        const body = parseExpression2();
        return { type: "ArrowFunction", params: [t.value], body };
      }
      return { type: "Identifier", name: t.value };
    }
    if (t.type === "Op" && (t.value === "=" || t.value === "+=" || t.value === "-=" || t.value === "*=" || t.value === "/=" || t.value === "%=")) {
      next();
      return { type: "Literal", value: void 0 };
    }
    if (t.type === "Punc" && t.value === "...") {
      next();
      return { type: "SpreadElement", argument: parseExpression2() };
    }
    next();
    return { type: "Literal", value: void 0 };
  }
  function parseObjectLiteral() {
    next();
    const properties = [];
    while (!match("Punc", "}") && pos < tokens.length) {
      if (match("Punc", "...")) {
        next();
        properties.push({ key: null, value: parseExpression2(), computed: false, spread: true });
        if (match("Punc", ",")) next();
        continue;
      }
      if (match("Punc", "[")) {
        next();
        const keyExpr = parseExpression2();
        expect("Punc", "]");
        expect("Punc", ":");
        const val = parseExpression2();
        properties.push({ key: keyExpr, value: val, computed: true, spread: false });
        if (match("Punc", ",")) next();
        continue;
      }
      if (match("String")) {
        const keyToken = next();
        if (match("Punc", ":")) {
          next();
          const val = parseExpression2();
          properties.push({ key: keyToken.value, value: val, computed: false, spread: false });
        }
        if (match("Punc", ",")) next();
        continue;
      }
      if (match("Ident") || match("Keyword")) {
        const keyToken = next();
        if (match("Punc", ":")) {
          next();
          const val = parseExpression2();
          properties.push({ key: keyToken.value, value: val, computed: false, spread: false });
        } else {
          properties.push({
            key: keyToken.value,
            value: { type: "Identifier", name: keyToken.value },
            computed: false,
            spread: false
          });
        }
        if (match("Punc", ",")) next();
        continue;
      }
      if (match("Number")) {
        const keyToken = next();
        if (match("Punc", ":")) {
          next();
          const val = parseExpression2();
          properties.push({ key: keyToken.value, value: val, computed: false, spread: false });
        }
        if (match("Punc", ",")) next();
        continue;
      }
      next();
    }
    expect("Punc", "}");
    return { type: "ObjectExpr", properties };
  }
  function parseTopLevel() {
    const expr = parseExpression2();
    const t = peek();
    if (t && t.type === "Op" && (t.value === "=" || t.value === "+=" || t.value === "-=" || t.value === "*=" || t.value === "/=" || t.value === "%=")) {
      const op = next().value;
      const right = parseExpression2();
      return { type: "AssignExpr", op, left: expr, right };
    }
    return expr;
  }
  const ast = parseTopLevel();
  return ast;
}
var _FORBIDDEN_PROPS = { __proto__: 1, constructor: 1, prototype: 1, alert: 1, confirm: 1, prompt: 1 };
var _FORBIDDEN_REALM_ACCESSORS = /* @__PURE__ */ new Set([
  "contentDocument",
  "contentWindow",
  "frames",
  "parent",
  "top",
  "self"
]);
var _safeObject = Object.freeze({
  keys: Object.keys,
  values: Object.values,
  entries: Object.entries,
  fromEntries: Object.fromEntries,
  assign: Object.assign,
  freeze: Object.freeze,
  is: Object.is,
  hasOwn: typeof Object.hasOwn === "function" ? Object.hasOwn : (o, k) => Object.prototype.hasOwnProperty.call(o, k)
});
var _SAFE_GLOBALS = {
  Array,
  Object: _safeObject,
  String,
  Number,
  Boolean,
  Math,
  Date,
  RegExp,
  Map,
  Set,
  JSON,
  parseInt,
  parseFloat,
  isNaN,
  isFinite,
  Infinity: Infinity,
  NaN: NaN,
  undefined: void 0,
  Error,
  Symbol,
  console
};
var _hasOwn = Object.prototype.hasOwnProperty;
function _inSafeGlobals(name) {
  return _hasOwn.call(_SAFE_GLOBALS, name);
}
var _BLOCKED_WINDOW_PROPS = /* @__PURE__ */ new Set([
  "fetch",
  "XMLHttpRequest",
  "localStorage",
  "sessionStorage",
  "WebSocket",
  "indexedDB",
  "eval",
  "Function",
  "importScripts",
  "open",
  "postMessage"
]);
var _WINDOW_PROXY_OVERRIDES = {};
var _BLOCKED_DOCUMENT_PROPS = /* @__PURE__ */ new Set([
  "cookie",
  "domain",
  "write",
  "writeln",
  "execCommand"
]);
var _safeWindow = typeof globalThis !== "undefined" && typeof globalThis.window !== "undefined" ? new Proxy(globalThis.window, {
  get(target, prop, receiver) {
    if (typeof prop === "string" && _BLOCKED_WINDOW_PROPS.has(prop)) return void 0;
    if (typeof prop === "string" && prop in _WINDOW_PROXY_OVERRIDES) return _WINDOW_PROXY_OVERRIDES[prop];
    return Reflect.get(target, prop, receiver);
  },
  set() {
    return true;
  }
}) : void 0;
var _safeDocument = typeof globalThis !== "undefined" && typeof globalThis.document !== "undefined" ? new Proxy(globalThis.document, {
  get(target, prop, receiver) {
    if (typeof prop === "string" && _BLOCKED_DOCUMENT_PROPS.has(prop)) return void 0;
    if (prop === "defaultView") return _safeWindow;
    if (prop === "location") return _safeLocation;
    return Reflect.get(target, prop, receiver);
  },
  set(target, prop, value) {
    if (typeof prop === "string" && _BLOCKED_DOCUMENT_PROPS.has(prop)) return true;
    if (prop === "location") return true;
    target[prop] = value;
    return true;
  }
}) : void 0;
var _LOCATION_READ_PROPS = [
  "href",
  "pathname",
  "search",
  "hash",
  "origin",
  "hostname",
  "port",
  "protocol",
  "host"
];
var _locationNoop = () => {
};
var _safeLocation = typeof globalThis !== "undefined" && typeof globalThis.location !== "undefined" ? (() => {
  const loc = {};
  for (const prop of _LOCATION_READ_PROPS) {
    Object.defineProperty(loc, prop, {
      get() {
        return globalThis.location[prop];
      },
      set() {
      },
      enumerable: true,
      configurable: false
    });
  }
  loc.assign = _locationNoop;
  loc.replace = _locationNoop;
  loc.reload = _locationNoop;
  loc.toString = () => globalThis.location.href;
  return Object.freeze(loc);
})() : void 0;
var _HISTORY_READ_PROPS = ["length", "state", "scrollRestoration"];
var _safeHistory = typeof globalThis !== "undefined" && typeof globalThis.history !== "undefined" ? (() => {
  const h = {};
  for (const prop of _HISTORY_READ_PROPS) {
    Object.defineProperty(h, prop, {
      get() {
        return globalThis.history[prop];
      },
      enumerable: true,
      configurable: false
    });
  }
  h.pushState = _locationNoop;
  h.replaceState = _locationNoop;
  h.back = _locationNoop;
  h.forward = _locationNoop;
  h.go = _locationNoop;
  return Object.freeze(h);
})() : void 0;
var _BLOCKED_NAVIGATOR_PROPS = /* @__PURE__ */ new Set(["sendBeacon", "credentials"]);
var _safeNavigator = typeof globalThis !== "undefined" && typeof globalThis.navigator !== "undefined" ? new Proxy(globalThis.navigator, {
  get(target, prop, receiver) {
    if (typeof prop === "string" && _BLOCKED_NAVIGATOR_PROPS.has(prop)) return void 0;
    return Reflect.get(target, prop, receiver);
  },
  set() {
    return true;
  }
  // navigator props are browser-enforced read-only
}) : void 0;
if (_safeLocation) _WINDOW_PROXY_OVERRIDES.location = _safeLocation;
if (_safeDocument) _WINDOW_PROXY_OVERRIDES.document = _safeDocument;
if (_safeHistory) _WINDOW_PROXY_OVERRIDES.history = _safeHistory;
if (_safeNavigator) _WINDOW_PROXY_OVERRIDES.navigator = _safeNavigator;
var _SAFE_PROXIES = new Set(
  [_safeWindow, _safeDocument, _safeLocation, _safeNavigator, _safeHistory].filter(Boolean)
);
var _BROWSER_GLOBALS = /* @__PURE__ */ new Set([
  "window",
  "document",
  "console",
  "location",
  "history",
  "navigator",
  "screen",
  "performance",
  "crypto",
  "setTimeout",
  "clearTimeout",
  "setInterval",
  "clearInterval",
  "requestAnimationFrame",
  "cancelAnimationFrame",
  "alert",
  "confirm",
  "prompt",
  "CustomEvent",
  "Event",
  "URL",
  "URLSearchParams",
  "FormData",
  "FileReader",
  "Blob",
  "Promise"
]);
var _TIMER_WRAPPERS = /* @__PURE__ */ new Set(["setTimeout", "setInterval", "requestAnimationFrame"]);
function _wrapTimer(name) {
  const original = typeof globalThis !== "undefined" ? globalThis[name] : void 0;
  if (!original) return void 0;
  if (name === "requestAnimationFrame") {
    return function safeRAF(cb) {
      if (typeof cb !== "function") return void 0;
      return original.call(globalThis, cb);
    };
  }
  return function safeTimer(cb, delay, ...args) {
    if (typeof cb !== "function") return void 0;
    return original.call(globalThis, cb, delay, ...args);
  };
}
var _safeTimers = {};
for (const t of _TIMER_WRAPPERS) _safeTimers[t] = _wrapTimer(t);
function _rewrapResult(val) {
  if (val === Function || val === eval) return void 0;
  if (val instanceof Document || val === globalThis.document) return _safeDocument;
  if (val === globalThis.window || val === globalThis) return _safeWindow;
  if (val && typeof val === "object") {
    let nodeType;
    try {
      nodeType = val.nodeType;
    } catch {
      nodeType = void 0;
    }
    if (nodeType === 9) return _safeDocument;
    let self;
    try {
      self = val.window;
    } catch {
      self = void 0;
    }
    if (self === val) return _safeWindow;
  }
  return val;
}
var _MISS = /* @__PURE__ */ Symbol("nojs.miss");
function _lookupScopeChain(ctx, locals, name) {
  let o = locals;
  while (o) {
    if (_hasOwn.call(o, name)) return o[name];
    o = Object.getPrototypeOf(o);
  }
  let c = ctx;
  while (c && c.__isProxy) {
    const raw = c.__raw;
    if (_hasOwn.call(raw, name)) return raw[name];
    c = c.$parent;
  }
  return _MISS;
}
function _resolveIdentifier(name, ctx, locals) {
  const v = _lookupScopeChain(ctx, locals, name);
  if (v !== _MISS) return v;
  if (name.charCodeAt(0) === 36) {
    switch (name) {
      case "$store":
        return _stores;
      case "$route":
        return _routerInstance?.current;
      case "$router":
        return _routerInstance;
      case "$i18n":
        return _i18nProxy;
      case "$refs":
        return ctx.$refs;
      case "$form":
        return ctx.$form || null;
    }
    const gk = name.slice(1);
    if (gk in _globals) return _globals[gk];
    return void 0;
  }
  if (_inSafeGlobals(name)) return _SAFE_GLOBALS[name];
  if (_BROWSER_GLOBALS.has(name) && typeof globalThis !== "undefined") {
    if (name === "window") return _safeWindow;
    if (name === "document") return _safeDocument;
    if (name === "location") return _safeLocation;
    if (name === "history") return _safeHistory;
    if (name === "navigator") return _safeNavigator;
    if (_TIMER_WRAPPERS.has(name)) return _safeTimers[name];
    return globalThis[name];
  }
  return void 0;
}
var _fnUndefined = () => void 0;
function _guard(type, fn) {
  return function(ctx, locals) {
    try {
      return fn(ctx, locals);
    } catch (e) {
      _warn("_evalNode error:", type, e?.message || e);
      return void 0;
    }
  };
}
var _EMPTY_ARGS = [];
function _compileArgs(args) {
  const n = args.length;
  if (n === 0) return () => _EMPTY_ARGS;
  let hasSpread = false;
  const fns = new Array(n);
  const spread = new Array(n);
  for (let i = 0; i < n; i++) {
    if (args[i].type === "SpreadElement") {
      hasSpread = true;
      spread[i] = true;
      fns[i] = _compileNode(args[i].argument);
    } else {
      fns[i] = _compileNode(args[i]);
    }
  }
  if (!hasSpread) {
    return (c, l) => {
      const out = new Array(n);
      for (let i = 0; i < n; i++) out[i] = fns[i](c, l);
      return out;
    };
  }
  return (c, l) => {
    const out = [];
    for (let i = 0; i < n; i++) {
      if (spread[i]) {
        const s = fns[i](c, l);
        if (s && typeof s[Symbol.iterator] === "function") out.push(...s);
      } else {
        out.push(fns[i](c, l));
      }
    }
    return out;
  };
}
function _compileNode(node) {
  if (!node) return _fnUndefined;
  switch (node.type) {
    case "Literal": {
      const v = node.value;
      return () => v;
    }
    case "Identifier": {
      const name = node.name;
      return (c, l) => _resolveIdentifier(name, c, l);
    }
    case "Forbidden":
      return _fnUndefined;
    case "BinaryExpr": {
      const op = node.op;
      const left = _compileNode(node.left);
      if (op === "&&") {
        const right2 = _compileNode(node.right);
        return (c, l) => {
          const lv = left(c, l);
          return lv ? right2(c, l) : lv;
        };
      }
      if (op === "||") {
        const right2 = _compileNode(node.right);
        return (c, l) => {
          const lv = left(c, l);
          return lv ? lv : right2(c, l);
        };
      }
      if (op === "??") {
        const right2 = _compileNode(node.right);
        return (c, l) => {
          const lv = left(c, l);
          return lv === null || lv === void 0 ? right2(c, l) : lv;
        };
      }
      const right = _compileNode(node.right);
      switch (op) {
        case "+":
          return _guard(node.type, (c, l) => left(c, l) + right(c, l));
        case "-":
          return _guard(node.type, (c, l) => left(c, l) - right(c, l));
        case "*":
          return _guard(node.type, (c, l) => left(c, l) * right(c, l));
        case "/":
          return _guard(node.type, (c, l) => left(c, l) / right(c, l));
        case "%":
          return _guard(node.type, (c, l) => left(c, l) % right(c, l));
        case "**":
          return _guard(node.type, (c, l) => left(c, l) ** right(c, l));
        case "===":
          return (c, l) => left(c, l) === right(c, l);
        case "!==":
          return (c, l) => left(c, l) !== right(c, l);
        case "==":
          return _guard(node.type, (c, l) => left(c, l) == right(c, l));
        case "!=":
          return _guard(node.type, (c, l) => left(c, l) != right(c, l));
        case ">":
          return _guard(node.type, (c, l) => left(c, l) > right(c, l));
        case "<":
          return _guard(node.type, (c, l) => left(c, l) < right(c, l));
        case ">=":
          return _guard(node.type, (c, l) => left(c, l) >= right(c, l));
        case "<=":
          return _guard(node.type, (c, l) => left(c, l) <= right(c, l));
        case "in":
          return _guard(node.type, (c, l) => {
            const lv = left(c, l);
            const r = right(c, l);
            return r && typeof r === "object" ? lv in r : void 0;
          });
        case "instanceof":
          return _guard(node.type, (c, l) => left(c, l) instanceof right(c, l));
        case "&":
          return _guard(node.type, (c, l) => left(c, l) & right(c, l));
        case "|":
          return _guard(node.type, (c, l) => left(c, l) | right(c, l));
        case "^":
          return _guard(node.type, (c, l) => left(c, l) ^ right(c, l));
        case "<<":
          return _guard(node.type, (c, l) => left(c, l) << right(c, l));
        case ">>":
          return _guard(node.type, (c, l) => left(c, l) >> right(c, l));
        case ">>>":
          return _guard(node.type, (c, l) => left(c, l) >>> right(c, l));
        default:
          return _fnUndefined;
      }
    }
    case "UnaryExpr": {
      const op = node.op;
      if (op === "typeof") {
        const arg2 = _compileNode(node.argument);
        return (c, l) => typeof arg2(c, l);
      }
      if (op === "++" || op === "--") {
        const arg2 = _compileNode(node.argument);
        const inc = op === "++";
        const prefix = !!node.prefix;
        return _guard(node.type, (c, l) => {
          const oldVal = arg2(c, l);
          const newVal = inc ? oldVal + 1 : oldVal - 1;
          return prefix ? newVal : oldVal;
        });
      }
      const arg = _compileNode(node.argument);
      switch (op) {
        case "!":
          return (c, l) => !arg(c, l);
        case "-":
          return _guard(node.type, (c, l) => -arg(c, l));
        case "+":
          return _guard(node.type, (c, l) => +arg(c, l));
        case "~":
          return _guard(node.type, (c, l) => ~arg(c, l));
        case "void":
          return (c, l) => {
            arg(c, l);
            return void 0;
          };
        default:
          return (c, l) => {
            arg(c, l);
            return void 0;
          };
      }
    }
    case "ConditionalExpr": {
      const test = _compileNode(node.test);
      const cons = _compileNode(node.consequent);
      const alt = _compileNode(node.alternate);
      return (c, l) => test(c, l) ? cons(c, l) : alt(c, l);
    }
    case "MemberExpr":
    case "OptionalMemberExpr": {
      const objFn = _compileNode(node.object);
      if (!node.computed) {
        const prop = node.property.name || node.property.value;
        if (_FORBIDDEN_PROPS[prop]) return _fnUndefined;
        const realmBlocked = _FORBIDDEN_REALM_ACCESSORS.has(prop);
        return _guard(node.type, (c, l) => {
          const obj = objFn(c, l);
          if (obj == null) return void 0;
          if (realmBlocked && !_SAFE_PROXIES.has(obj)) return void 0;
          return _rewrapResult(obj[prop]);
        });
      }
      const propFn = _compileNode(node.property);
      return _guard(node.type, (c, l) => {
        const obj = objFn(c, l);
        if (obj == null) return void 0;
        const prop = propFn(c, l);
        if (_FORBIDDEN_PROPS[prop]) return void 0;
        if (_FORBIDDEN_REALM_ACCESSORS.has(prop) && !_SAFE_PROXIES.has(obj)) return void 0;
        return _rewrapResult(obj[prop]);
      });
    }
    case "CallExpr":
    case "OptionalCallExpr": {
      const argsFn = _compileArgs(node.args);
      const callee = node.callee;
      if (callee.type === "MemberExpr" || callee.type === "OptionalMemberExpr") {
        const thisFn = _compileNode(callee.object);
        if (!callee.computed) {
          const prop = callee.property.name;
          if (_FORBIDDEN_PROPS[prop]) return _fnUndefined;
          const realmBlocked = _FORBIDDEN_REALM_ACCESSORS.has(prop);
          return _guard(node.type, (c, l) => {
            const thisObj = thisFn(c, l);
            if (thisObj == null) return void 0;
            if (realmBlocked && !_SAFE_PROXIES.has(thisObj)) return void 0;
            const fn = thisObj[prop];
            if (typeof fn !== "function") return void 0;
            return _rewrapResult(fn.apply(thisObj, argsFn(c, l)));
          });
        }
        const propFn = _compileNode(callee.property);
        return _guard(node.type, (c, l) => {
          const thisObj = thisFn(c, l);
          if (thisObj == null) return void 0;
          const prop = propFn(c, l);
          if (_FORBIDDEN_PROPS[prop]) return void 0;
          if (_FORBIDDEN_REALM_ACCESSORS.has(prop) && !_SAFE_PROXIES.has(thisObj)) return void 0;
          const fn = thisObj[prop];
          if (typeof fn !== "function") return void 0;
          return _rewrapResult(fn.apply(thisObj, argsFn(c, l)));
        });
      }
      const calleeFn = _compileNode(callee);
      const optional = node.type === "OptionalCallExpr";
      return _guard(node.type, (c, l) => {
        const fn = calleeFn(c, l);
        if (fn == null && optional) return void 0;
        if (typeof fn !== "function") return void 0;
        return _rewrapResult(fn.apply(void 0, argsFn(c, l)));
      });
    }
    case "ArrayExpr": {
      const n = node.elements.length;
      const fns = new Array(n);
      const spread = new Array(n);
      for (let i = 0; i < n; i++) {
        const el = node.elements[i];
        if (el.type === "SpreadElement") {
          spread[i] = true;
          fns[i] = _compileNode(el.argument);
        } else {
          fns[i] = _compileNode(el);
        }
      }
      return _guard(node.type, (c, l) => {
        const arr = [];
        for (let i = 0; i < n; i++) {
          if (spread[i]) {
            const s = fns[i](c, l);
            if (s && typeof s[Symbol.iterator] === "function") arr.push(...s);
          } else {
            arr.push(fns[i](c, l));
          }
        }
        return arr;
      });
    }
    case "ObjectExpr": {
      const props = node.properties.map((prop) => {
        if (prop.spread) return { spread: true, valueFn: _compileNode(prop.value) };
        if (prop.computed) return { computed: true, keyFn: _compileNode(prop.key), valueFn: _compileNode(prop.value) };
        return { key: prop.key, valueFn: _compileNode(prop.value), forbidden: !!_FORBIDDEN_PROPS[prop.key] };
      });
      return _guard(node.type, (c, l) => {
        const obj = {};
        for (let i = 0; i < props.length; i++) {
          const p = props[i];
          if (p.spread) {
            const src = p.valueFn(c, l);
            if (src && typeof src === "object") {
              for (const k of Object.keys(src)) {
                if (!_FORBIDDEN_PROPS[k]) obj[k] = src[k];
              }
            }
          } else if (p.computed) {
            const key = p.keyFn(c, l);
            if (_FORBIDDEN_PROPS[key]) continue;
            obj[key] = p.valueFn(c, l);
          } else {
            if (p.forbidden) continue;
            obj[p.key] = p.valueFn(c, l);
          }
        }
        return obj;
      });
    }
    case "SpreadElement":
      return _compileNode(node.argument);
    case "ArrowFunction": {
      const bodyFn = _compileNode(node.body);
      const params = node.params;
      return (ctx, locals) => function(...callArgs) {
        const child = Object.create(locals || null);
        for (let i = 0; i < params.length; i++) {
          const p = params[i];
          if (typeof p === "string" && p.startsWith("...")) {
            child[p.slice(3)] = callArgs.slice(i);
            break;
          }
          child[p] = callArgs[i];
        }
        return bodyFn(ctx, child);
      };
    }
    case "TemplateLiteral": {
      const parts = node.parts;
      const exprs = node.expressions.map(_compileNode);
      return _guard(node.type, (c, l) => {
        let result = parts[0];
        for (let i = 0; i < exprs.length; i++) {
          result += String(exprs[i](c, l));
          result += parts[i + 1];
        }
        return result;
      });
    }
    case "PostfixExpr":
      return _compileNode(node.argument);
    case "AssignExpr":
      return _compileNode(node.right);
    default:
      return _fnUndefined;
  }
}
function _compileFilterSpec(filterStr) {
  const colonIdx = filterStr.indexOf(":");
  let name, argStr;
  if (colonIdx === -1) {
    name = filterStr.trim();
    argStr = null;
  } else {
    name = filterStr.substring(0, colonIdx).trim();
    argStr = filterStr.substring(colonIdx + 1).trim();
  }
  return { name, args: argStr ? _parseFilterArgs(argStr) : _EMPTY_ARGS };
}
function _compileProgram(expr) {
  const pipes = _parsePipes(expr);
  const ast = _parseExpr(_tokenize(pipes[0]));
  const filters = [];
  for (let i = 1; i < pipes.length; i++) filters.push(_compileFilterSpec(pipes[i]));
  return { fn: _compileNode(ast), filters };
}
function _parsePipes(exprStr) {
  if (!exprStr.includes("|")) return [exprStr.trim()];
  const parts = [];
  let current = "";
  let depth = 0;
  let inStr = false;
  let strChar = "";
  for (let i = 0; i < exprStr.length; i++) {
    const ch = exprStr[i];
    if (inStr) {
      current += ch;
      if (ch === strChar) {
        let bs = 0;
        for (let j = i - 1; j >= 0 && exprStr[j] === "\\"; j--) bs++;
        if (bs % 2 === 0) inStr = false;
      }
      continue;
    }
    if (ch === "'" || ch === '"' || ch === "`") {
      inStr = true;
      strChar = ch;
      current += ch;
      continue;
    }
    if (ch === "(" || ch === "[" || ch === "{") {
      depth++;
      current += ch;
      continue;
    }
    if (ch === ")" || ch === "]" || ch === "}") {
      depth--;
      current += ch;
      continue;
    }
    if (ch === "|" && depth === 0 && exprStr[i + 1] !== "|" && exprStr[i - 1] !== "|") {
      parts.push(current.trim());
      current = "";
      continue;
    }
    current += ch;
  }
  parts.push(current.trim());
  return parts;
}
function _parseFilterArgs(str) {
  const args = [];
  const quotedArgs = [];
  let current = "";
  let quoted = false;
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
      if (!quoted && !current.trim()) current = "";
      inStr = true;
      quoted = true;
      strChar = ch;
      continue;
    }
    if (ch === ",") {
      args.push(quoted ? current : current.trim());
      quotedArgs.push(quoted);
      current = "";
      quoted = false;
      continue;
    }
    if (quoted && (ch === " " || ch === "	" || ch === "\n" || ch === "\r")) continue;
    current += ch;
  }
  if (quoted) {
    args.push(current);
    quotedArgs.push(true);
  } else if (current.trim()) {
    args.push(current.trim());
    quotedArgs.push(false);
  }
  return args.map((a, i) => {
    if (quotedArgs[i] && !a.trim()) return a;
    const n = Number(a);
    return isNaN(n) ? a : n;
  });
}
var _rootKeysCache = /* @__PURE__ */ new Map();
var _ROOT_KEYS_CACHE_MAX = 500;
function _exprRootKeys(expr) {
  const hit = _rootKeysCache.get(expr);
  if (hit !== void 0) return hit;
  const roots = _computeExprRootKeys(expr);
  if (_rootKeysCache.size >= _ROOT_KEYS_CACHE_MAX) _rootKeysCache.clear();
  _rootKeysCache.set(expr, roots);
  return roots;
}
function _computeExprRootKeys(expr) {
  if (typeof expr !== "string" || expr.trim() === "") return null;
  let tokens;
  try {
    const pipes = _parsePipes(expr);
    if (pipes.length > 1) return null;
    tokens = _tokenize(pipes[0]);
  } catch {
    return null;
  }
  if (!tokens || tokens.length === 0) return null;
  const roots = /* @__PURE__ */ new Set();
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (t.type === "Template") return null;
    if (t.type === "Op" && (t.value === "=" || t.value === "+=" || t.value === "-=" || t.value === "*=" || t.value === "/=" || t.value === "%=" || t.value === "++" || t.value === "--" || t.value === "=>")) return null;
    if (t.type === "Punc" && t.value === "(") return null;
    if (t.type === "Ident") {
      const prev = tokens[i - 1];
      if (prev && prev.type === "Punc" && (prev.value === "." || prev.value === "?.")) continue;
      if (t.value.charCodeAt(0) === 36 && t.value !== "$store" && t.value !== "$route" && t.value !== "$i18n") return null;
      roots.add(t.value);
    }
  }
  return roots.size > 0 ? roots : null;
}
_setExprRootKeysFn(_exprRootKeys);
function evaluate(expr, ctx) {
  if (expr == null || expr === "") return void 0;
  try {
    let prog = _exprCache.get(expr);
    if (prog === void 0) {
      prog = _compileProgram(expr);
      _exprCache.set(expr, prog);
    }
    if (!ctx || !ctx.__isProxy) {
      _warn("Expression error:", expr, "requires a reactive context");
      return void 0;
    }
    let result = prog.fn(ctx, null);
    const filters = prog.filters;
    for (let i = 0; i < filters.length; i++) {
      const f = filters[i];
      const fn = _filters[f.name];
      if (!fn) {
        _warn(`Unknown filter: ${f.name}`);
        continue;
      }
      result = fn(result, ...f.args);
    }
    return result;
  } catch (e) {
    _warn("Expression error:", expr, e.message);
    return void 0;
  }
}
function parseExpression(str) {
  if (typeof str !== "string" || str.trim() === "") {
    return { type: "Literal", value: void 0 };
  }
  return _parseExpr(_tokenize(str));
}
function parseStatements(str) {
  if (typeof str !== "string" || str.trim() === "") return [];
  const tokens = _tokenize(str);
  const stmts = [];
  let start = 0;
  for (let i = 0; i <= tokens.length; i++) {
    if (i === tokens.length || tokens[i].type === "Punc" && tokens[i].value === ";") {
      const chunk = tokens.slice(start, i);
      if (chunk.length > 0) stmts.push(_parseExpr(chunk));
      start = i + 1;
    }
  }
  return stmts;
}
function segmentPipes(str) {
  if (typeof str !== "string") return [];
  return _parsePipes(str);
}
export {
  evaluate,
  parseExpression,
  parseStatements,
  segmentPipes
};
