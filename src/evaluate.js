// ═══════════════════════════════════════════════════════════════════════
//  EXPRESSION EVALUATOR
// ═══════════════════════════════════════════════════════════════════════

import { _config, _stores, _routerInstance, _filters, _warn, _notifyStoreWatchers, _extractStoreName, _globals, _setExprRootKeysFn } from "./globals.js";
import { _i18nProxy } from "./i18n.js";
import { _collectKeys, _startBatch, _endBatch } from "./context.js";

function _makeCache() {
  const map = new Map();
  return {
    get(k) {
      if (!map.has(k)) return undefined;
      // Move to end so this entry is the most-recently-used
      const v = map.get(k);
      map.delete(k);
      map.set(k, v);
      return v;
    },
    has(k) { return map.has(k); },
    set(k, v) {
      const max = _config.exprCacheSize;
      if (map.has(k)) {
        map.delete(k); // refresh position before re-inserting
      } else if (map.size >= max) {
        map.delete(map.keys().next().value); // evict LRU (insertion-order first)
      }
      map.set(k, v);
    },
    get size() { return map.size; },
  };
}
export const _exprCache = _makeCache();
export const _stmtCache = _makeCache();

// ── Tokenizer ──────────────────────────────────────────────────────────

const _KEYWORDS = new Set(["true", "false", "null", "undefined", "typeof", "in", "instanceof"]);
const _FORBIDDEN = new Set(["__proto__", "constructor", "prototype"]);

// Multi-char operators/punctuation, sorted longest-first for greedy matching
const _MULTI = ["===", "!==", "...", "??", "?.", "==", "!=", ">=", "<=", "&&", "||", "+=", "-=", "*=", "/=", "%=", "++", "--", "=>"];
const _SINGLE_OPS = new Set(["+", "-", "*", "/", "%", ">", "<", "!", "=", "|"]);
const _SINGLE_PUNC = new Set(["(", ")", "[", "]", "{", "}", ".", ",", ":", ";", "?"]);

function _tokenize(expr) {
  if (typeof expr !== "string") return [];
  const tokens = [];
  const len = expr.length;
  let pos = 0;

  while (pos < len) {
    const ch = expr[pos];

    // Skip whitespace
    if (ch === " " || ch === "\t" || ch === "\n" || ch === "\r") { pos++; continue; }

    // String literals (single or double quoted)
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
            else if (esc === "t") value += "\t";
            else if (esc === "r") value += "\r";
            else value += esc;
            pos++;
          }
        } else {
          value += expr[pos++];
        }
      }
      if (pos < len) pos++; // skip closing quote
      tokens.push({ type: "String", value, pos: start });
      continue;
    }

    // Template literals
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
          else if (esc === "t") seg += "\t";
          else if (esc === "r") seg += "\r";
          else seg += esc;
          pos += 2;
        } else if (expr[pos] === "$" && pos + 1 < len && expr[pos + 1] === "{") {
          parts.push(seg);
          seg = "";
          pos += 2; // skip ${
          // Collect expression text respecting nested braces
          let depth = 1;
          let inner = "";
          while (pos < len && depth > 0) {
            if (expr[pos] === "{") depth++;
            else if (expr[pos] === "}") { depth--; if (depth === 0) break; }
            else if (expr[pos] === "'" || expr[pos] === '"' || expr[pos] === "`") {
              // skip string inside interpolation
              const q = expr[pos];
              inner += q; pos++;
              while (pos < len && expr[pos] !== q) {
                if (expr[pos] === "\\") { inner += expr[pos++]; if (pos < len) inner += expr[pos++]; }
                else inner += expr[pos++];
              }
              if (pos < len) { inner += expr[pos]; pos++; }
              continue;
            }
            inner += expr[pos++];
          }
          if (pos < len) pos++; // skip closing }
          exprs.push(_tokenize(inner));
        } else {
          seg += expr[pos++];
        }
      }
      if (pos < len) pos++; // skip closing `
      parts.push(seg);
      tokens.push({ type: "Template", parts, exprs, pos: start });
      continue;
    }

    // Numbers: starts with digit, or '.' followed by digit
    if ((ch >= "0" && ch <= "9") || (ch === "." && pos + 1 < len && expr[pos + 1] >= "0" && expr[pos + 1] <= "9")) {
      const start = pos;
      let num = "";
      while (pos < len && ((expr[pos] >= "0" && expr[pos] <= "9") || expr[pos] === ".")) {
        num += expr[pos++];
      }
      tokens.push({ type: "Number", value: num, pos: start });
      continue;
    }

    // Identifiers / Keywords
    if ((ch >= "a" && ch <= "z") || (ch >= "A" && ch <= "Z") || ch === "_" || ch === "$") {
      const start = pos;
      let id = "";
      while (pos < len) {
        const c = expr[pos];
        if ((c >= "a" && c <= "z") || (c >= "A" && c <= "Z") || (c >= "0" && c <= "9") || c === "_" || c === "$") {
          id += c; pos++;
        } else break;
      }
      if (_FORBIDDEN.has(id)) tokens.push({ type: "Forbidden", value: id, pos: start });
      else if (_KEYWORDS.has(id)) tokens.push({ type: "Keyword", value: id, pos: start });
      else tokens.push({ type: "Ident", value: id, pos: start });
      continue;
    }

    // Multi-char operators / punctuation (longest first)
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

    // Single-char operators
    if (_SINGLE_OPS.has(ch)) {
      tokens.push({ type: "Op", value: ch, pos });
      pos++;
      continue;
    }

    // Single-char punctuation
    if (_SINGLE_PUNC.has(ch)) {
      tokens.push({ type: "Punc", value: ch, pos });
      pos++;
      continue;
    }

    // Unrecognized character — skip
    pos++;
  }

  return tokens;
}

// ── Recursive-descent expression parser ────────────────────────────────

function _parseExpr(tokens) {
  if (!tokens || tokens.length === 0) return { type: "Literal", value: undefined };

  let pos = 0;

  function peek() { return tokens[pos]; }
  function next() { return tokens[pos++]; }

  function match(type, value) {
    const t = tokens[pos];
    if (!t) return false;
    if (value !== undefined) return t.type === type && t.value === value;
    return t.type === type;
  }

  function expect(type, value) {
    const t = tokens[pos];
    if (t && t.type === type && (value === undefined || t.value === value)) {
      pos++;
      return t;
    }
    return null;
  }

  // ─── Grammar rules (lowest → highest precedence) ───

  function parseExpression() {
    return parseTernary();
  }

  function parseTernary() {
    let node = parseNullishOr();
    if (match("Punc", "?")) {
      next(); // consume ?
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
    if ((t.type === "Op" && compOps.indexOf(t.value) !== -1) ||
        (t.type === "Keyword" && (t.value === "in" || t.value === "instanceof"))) {
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
    if (!t) return { type: "Literal", value: undefined };
    // typeof
    if (t.type === "Keyword" && t.value === "typeof") {
      next();
      return { type: "UnaryExpr", op: "typeof", argument: parseUnary() };
    }
    // ! or unary - or unary +
    if (t.type === "Op" && (t.value === "!" || t.value === "-" || t.value === "+")) {
      next();
      return { type: "UnaryExpr", op: t.value, argument: parseUnary() };
    }
    // Prefix ++ / --
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

      // Dot access: obj.prop
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

      // Optional chaining: obj?.prop or obj?.(args)
      if (t.type === "Punc" && t.value === "?.") {
        next();
        const nt = peek();
        // Optional call: obj?.(args)
        if (nt && nt.type === "Punc" && nt.value === "(") {
          next(); // consume (
          const args = parseArgsList();
          expect("Punc", ")");
          node = { type: "OptionalCallExpr", callee: node, args };
        }
        // Optional member: obj?.prop
        else if (nt && (nt.type === "Ident" || nt.type === "Keyword")) {
          next();
          node = { type: "OptionalMemberExpr", object: node, property: { type: "Identifier", name: nt.value }, computed: false };
        }
        // Optional bracket: obj?.[expr]
        else if (nt && nt.type === "Punc" && nt.value === "[") {
          next(); // consume [
          const prop = parseExpression();
          expect("Punc", "]");
          node = { type: "OptionalMemberExpr", object: node, property: prop, computed: true };
        } else {
          break;
        }
        continue;
      }

      // Bracket access: obj[expr]
      if (t.type === "Punc" && t.value === "[") {
        next();
        const prop = parseExpression();
        expect("Punc", "]");
        node = { type: "MemberExpr", object: node, property: prop, computed: true };
        continue;
      }

      // Function call: fn(args)
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
      if (match("Punc", ")")) break; // trailing comma
      args.push(parseSpreadOrExpr());
    }
    return args;
  }

  function parseSpreadOrExpr() {
    if (match("Punc", "...")) {
      next();
      return { type: "SpreadElement", argument: parseExpression() };
    }
    return parseExpression();
  }

  // ─── Arrow function detection helpers ───

  function isArrowParams() {
    // Lookahead from current pos (after consuming "(") to see if this is (id, id, ...) =>
    const saved = pos;
    // Empty params: () =>
    if (match("Punc", ")")) {
      const after = tokens[pos + 1];
      if (after && after.type === "Op" && after.value === "=>") {
        pos = saved;
        return true;
      }
      pos = saved;
      return false;
    }
    // Check for ident list followed by ) =>
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
      // Spread param: (...rest) =>
      if (t.type === "Punc" && t.value === "...") {
        next();
        if (match("Ident")) { next(); }
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
    // Parse comma-separated identifiers until ")"
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

  // ─── Primary ───

  function parsePrimary() {
    const t = peek();
    if (!t) return { type: "Literal", value: undefined };

    // Forbidden token
    if (t.type === "Forbidden") {
      next();
      return { type: "Forbidden" };
    }

    // Number literal
    if (t.type === "Number") {
      next();
      return { type: "Literal", value: Number(t.value) };
    }

    // String literal
    if (t.type === "String") {
      next();
      return { type: "Literal", value: t.value };
    }

    // Template literal
    if (t.type === "Template") {
      next();
      return {
        type: "TemplateLiteral",
        parts: t.parts,
        expressions: t.exprs.map(function(exprTokens) { return _parseExpr(exprTokens); })
      };
    }

    // Keywords: true, false, null, undefined
    if (t.type === "Keyword") {
      if (t.value === "true") { next(); return { type: "Literal", value: true }; }
      if (t.value === "false") { next(); return { type: "Literal", value: false }; }
      if (t.value === "null") { next(); return { type: "Literal", value: null }; }
      if (t.value === "undefined") { next(); return { type: "Literal", value: undefined }; }
    }

    // Array literal: [...]
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

    // Object literal: { ... }
    if (t.type === "Punc" && t.value === "{") {
      return parseObjectLiteral();
    }

    // Parenthesized expression or arrow function with parens
    if (t.type === "Punc" && t.value === "(") {
      next(); // consume (

      // Check for arrow function: (params) =>
      if (isArrowParams()) {
        const params = parseArrowParams();
        expect("Punc", ")");
        expect("Op", "=>");
        const body = parseExpression();
        return { type: "ArrowFunction", params, body };
      }

      // Regular grouping
      const expr = parseExpression();
      expect("Punc", ")");
      return expr;
    }

    // Identifier (possibly arrow: x => ...)
    if (t.type === "Ident") {
      next();
      // Single-param arrow function: x => expr
      if (match("Op", "=>")) {
        next(); // consume =>
        const body = parseExpression();
        return { type: "ArrowFunction", params: [t.value], body };
      }
      return { type: "Identifier", name: t.value };
    }

    // Assignment operators
    if (t.type === "Op" && (t.value === "=" || t.value === "+=" || t.value === "-=" || t.value === "*=" || t.value === "/=" || t.value === "%=")) {
      // Should not appear as primary; skip
      next();
      return { type: "Literal", value: undefined };
    }

    // Spread in unexpected position (e.g. top level)
    if (t.type === "Punc" && t.value === "...") {
      next();
      return { type: "SpreadElement", argument: parseExpression() };
    }

    // Fallback: skip unrecognized token
    next();
    return { type: "Literal", value: undefined };
  }

  function parseObjectLiteral() {
    next(); // consume {
    const properties = [];
    while (!match("Punc", "}") && pos < tokens.length) {
      // Spread property: ...expr
      if (match("Punc", "...")) {
        next();
        properties.push({ key: null, value: parseExpression(), computed: false, spread: true });
        if (match("Punc", ",")) next();
        continue;
      }

      // Computed property: [expr]: value
      if (match("Punc", "[")) {
        next();
        const keyExpr = parseExpression();
        expect("Punc", "]");
        expect("Punc", ":");
        const val = parseExpression();
        properties.push({ key: keyExpr, value: val, computed: true, spread: false });
        if (match("Punc", ",")) next();
        continue;
      }

      // String key: 'key': value
      if (match("String")) {
        const keyToken = next();
        if (match("Punc", ":")) {
          next();
          const val = parseExpression();
          properties.push({ key: keyToken.value, value: val, computed: false, spread: false });
        }
        if (match("Punc", ",")) next();
        continue;
      }

      // Identifier key (shorthand or key: value)
      if (match("Ident") || match("Keyword")) {
        const keyToken = next();
        if (match("Punc", ":")) {
          next();
          const val = parseExpression();
          properties.push({ key: keyToken.value, value: val, computed: false, spread: false });
        } else {
          // Shorthand: { key } → { key: key }
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

      // Number key
      if (match("Number")) {
        const keyToken = next();
        if (match("Punc", ":")) {
          next();
          const val = parseExpression();
          properties.push({ key: keyToken.value, value: val, computed: false, spread: false });
        }
        if (match("Punc", ",")) next();
        continue;
      }

      // Unrecognized — skip
      next();
    }
    expect("Punc", "}");
    return { type: "ObjectExpr", properties };
  }

  // ─── Handle top-level assignment ───

  function parseTopLevel() {
    const expr = parseExpression();
    // Check for assignment at top level: ident = expr, ident += expr, etc.
    const t = peek();
    if (t && t.type === "Op" && (t.value === "=" || t.value === "+=" || t.value === "-=" || t.value === "*=" || t.value === "/=" || t.value === "%=")) {
      const op = next().value;
      const right = parseExpression();
      return { type: "AssignExpr", op, left: expr, right };
    }
    return expr;
  }

  const ast = parseTopLevel();
  return ast;
}

// ---------------------------------------------------------------------------
// AST tree-walking evaluator
// ---------------------------------------------------------------------------
export const _FORBIDDEN_PROPS = { __proto__: 1, constructor: 1, prototype: 1, alert: 1, confirm: 1, prompt: 1 };

// Foreign-realm accessor names (VULNERABILITY F4 / NOJS-239). Reading any of
// these off a raw DOM element (e.g. an <iframe> resolved via `$refs`) hands back
// an object from ANOTHER realm: an iframe's `contentDocument` / `contentWindow` /
// `frames`, or a Window's `parent` / `top` / `self`. Cross-realm, those objects
// are instances of the CHILD realm's constructors, so the parent-realm
// `instanceof` checks in `_rewrapResult` are FALSE and the raw object would
// escape — exposing un-proxied `.cookie` / `.location` / `.write` / `fetch`. We
// refuse these names outright on element member reads, as defense-in-depth
// alongside the `_rewrapResult` duck-types, so an element ref can never surface a
// foreign-realm object at all. The safe window / document proxies are exempt (see
// `_SAFE_PROXIES`) so legitimate `window.parent`-style reads still resolve and are
// re-wrapped by `_rewrapResult`.
const _FORBIDDEN_REALM_ACCESSORS = new Set([
  'contentDocument', 'contentWindow', 'frames', 'parent', 'top', 'self',
]);

/* Curated `Object` shim exposed to template expressions.
 *
 * The raw `Object` global exposes reflection / prototype-manipulation statics
 * (getOwnPropertyDescriptor, getOwnPropertyDescriptors, getPrototypeOf,
 * setPrototypeOf, defineProperty, defineProperties, create, getOwnPropertyNames,
 * getOwnPropertySymbols). Those let a template expression walk out of the sandbox
 * to the real `Function` constructor and execute arbitrary JS in the real global
 * scope, e.g.:
 *   Object.getOwnPropertyDescriptor(Object.getPrototypeOf(parseInt),'constructor').value('return document.cookie')()
 * The `_FORBIDDEN_PROPS` guard only blocks `constructor` on member reads, not the
 * descriptor `.value`, so this bypassed it. We therefore expose ONLY the safe
 * enumerable / data statics NoJS legitimately relies on (keys, values, entries,
 * assign, freeze, fromEntries, plus is/hasOwn) and OMIT every reflection and
 * prototype method. See VULNERABILITY F3. */
const _safeObject = Object.freeze({
  keys: Object.keys,
  values: Object.values,
  entries: Object.entries,
  fromEntries: Object.fromEntries,
  assign: Object.assign,
  freeze: Object.freeze,
  is: Object.is,
  hasOwn: typeof Object.hasOwn === 'function'
    ? Object.hasOwn
    : (o, k) => Object.prototype.hasOwnProperty.call(o, k),
});

/* Safe subset of JS globals available in expressions (no eval/Function/process) */
const _SAFE_GLOBALS = {
  Array, Object: _safeObject, String, Number, Boolean, Math, Date, RegExp, Map, Set,
  JSON, parseInt, parseFloat, isNaN, isFinite, Infinity, NaN, undefined,
  Error, Symbol, console,
};

const _hasOwn = Object.prototype.hasOwnProperty;

// Safety Rule 7: identifier resolution must be allow-list only. The plain `in`
// operator walks the prototype chain up to Object.prototype, so inherited
// members (toString, valueOf, hasOwnProperty, constructor, __proto__, …) would
// resolve to native functions and bypass the allow-list. Legitimate scope
// variables are always OWN properties of some object in the scope's prototype
// chain (vals from _collectKeys, injected $-globals, arrow-function params) —
// never inherited from Object.prototype. So we walk the chain checking
// hasOwnProperty at each level and stop before Object.prototype.
function _inScope(scope, name) {
  let o = scope;
  while (o && o !== Object.prototype) {
    if (_hasOwn.call(o, name)) return true;
    o = Object.getPrototypeOf(o);
  }
  return false;
}

// _SAFE_GLOBALS is a plain object literal, so it also inherits Object.prototype.
// Only own keys are real allow-list entries.
function _inSafeGlobals(name) {
  return _hasOwn.call(_SAFE_GLOBALS, name);
}

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
      set() {
        // Never write to the real window from a template expression — doing so
        // lets an expression create or overwrite arbitrary globals (e.g.
        // `window.foo = 1` or clobbering an existing global). All writes are
        // silently swallowed (no-op) so expressions don't throw, while the real
        // window object stays untouched.
        return true;
      },
    })
  : undefined;

const _safeDocument = typeof globalThis !== 'undefined' && typeof globalThis.document !== 'undefined'
  ? new Proxy(globalThis.document, {
      get(target, prop, receiver) {
        if (typeof prop === 'string' && _BLOCKED_DOCUMENT_PROPS.has(prop)) return undefined;
        if (prop === 'defaultView') return _safeWindow;
        if (prop === 'location') return _safeLocation;
        return Reflect.get(target, prop, receiver);
      },
      set(target, prop, value) {
        if (typeof prop === 'string' && _BLOCKED_DOCUMENT_PROPS.has(prop)) return true;
        if (prop === 'location') return true;
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

// Safe wrapper proxies that are EXEMPT from the `_FORBIDDEN_REALM_ACCESSORS`
// block. Reads like `window.parent` off these still resolve (and are re-wrapped
// by `_rewrapResult`), so we don't over-block legitimate window/document member
// reads. Only raw DOM elements (e.g. an <iframe> ref) are refused those names.
const _SAFE_PROXIES = new Set(
  [_safeWindow, _safeDocument, _safeLocation, _safeNavigator, _safeHistory].filter(Boolean)
);

const _BROWSER_GLOBALS = new Set([
  'window', 'document', 'console', 'location', 'history',
  'navigator', 'screen', 'performance', 'crypto',
  'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval',
  'requestAnimationFrame', 'cancelAnimationFrame',
  'alert', 'confirm', 'prompt',
  'CustomEvent', 'Event', 'URL', 'URLSearchParams',
  'FormData', 'FileReader', 'Blob', 'Promise',
]);

// Wrapped timer functions that only accept string-coerced delays, not function
// callbacks created by the expression evaluator. This prevents deferred code
// execution with scope access from template expressions.
const _TIMER_WRAPPERS = new Set(['setTimeout', 'setInterval', 'requestAnimationFrame']);
function _wrapTimer(name) {
  const original = typeof globalThis !== 'undefined' ? globalThis[name] : undefined;
  if (!original) return undefined;
  if (name === 'requestAnimationFrame') {
    return function safeRAF(cb) {
      if (typeof cb !== 'function') return undefined;
      return original.call(globalThis, cb);
    };
  }
  return function safeTimer(cb, delay, ...args) {
    if (typeof cb !== 'function') return undefined;
    return original.call(globalThis, cb, delay, ...args);
  };
}
const _safeTimers = {};
for (const t of _TIMER_WRAPPERS) _safeTimers[t] = _wrapTimer(t);

// Re-wrap sensitive values returned from member reads and call results before
// they re-enter template scope. Centralizes three sandbox-escape defenses:
//   • F3 (defense-in-depth): the real `Function` constructor or `eval` — reached
//     by any path — is neutralized to `undefined`, so a template can never obtain
//     a code-execution primitive even if a future reflection hole reappears.
//   • Any Document → `_safeDocument` (blocks cookie/write/etc.). Same-realm is
//     caught by identity / `instanceof`; an iframe's cross-realm `contentDocument`
//     is caught by the `nodeType === 9` duck-type (VULNERABILITY F4 / NOJS-239),
//     since parent-realm `instanceof Document` is FALSE for a child-realm Document.
//   • Any-realm Window → `_safeWindow`. Same-realm is caught by identity; an
//     iframe's cross-realm `contentWindow` is caught by the `val.window === val`
//     duck-type (VULNERABILITY F4), so its un-proxied eval/fetch/localStorage are
//     never exposed.
function _rewrapResult(val) {
  if (val === Function || val === eval) return undefined;
  if (val instanceof Document || val === globalThis.document) return _safeDocument;
  if (val === globalThis.window || val === globalThis) return _safeWindow;
  if (val && typeof val === 'object') {
    // Cross-realm Document duck-type: Document.nodeType === 9 is stable across
    // realms, so this catches an iframe's `contentDocument` (a CHILD-realm
    // Document instance that the parent-realm `instanceof Document` above misses)
    // before its raw `.cookie` / `.write` / `.location` can escape. The top-realm
    // document is already handled above; matching it here is harmless. Element
    // nodes are nodeType 1, and `_safeDocument`'s own members (querySelector →
    // Element, defaultView → _safeWindow) are not nodeType 9, so this does not
    // interfere with normal `_safeDocument` reads.
    let nodeType;
    try { nodeType = val.nodeType; } catch { nodeType = undefined; }
    if (nodeType === 9) return _safeDocument;
    let self;
    try { self = val.window; } catch { self = undefined; }
    if (self === val) return _safeWindow;
  }
  return val;
}

// Evaluate call arguments at module level to avoid per-call closure allocation.
// Handles SpreadElement by iterating the spread result.
function _evalArgs(args, scope) {
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
}

function _evalNode(node, scope) {
  try {
    if (!node) return undefined;

    switch (node.type) {

      case 'Literal':
        return node.value;

      case 'Identifier':
        if (_inScope(scope, node.name)) return scope[node.name];
        if (_inSafeGlobals(node.name)) return _SAFE_GLOBALS[node.name];
        if (_BROWSER_GLOBALS.has(node.name) && typeof globalThis !== 'undefined') {
          if (node.name === 'window') return _safeWindow;
          if (node.name === 'document') return _safeDocument;
          if (node.name === 'location') return _safeLocation;
          if (node.name === 'history') return _safeHistory;
          if (node.name === 'navigator') return _safeNavigator;
          if (_TIMER_WRAPPERS.has(node.name)) return _safeTimers[node.name];
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
          // Special: if identifier not in scope, return "undefined" string.
          // Use own-property scope check (Safety Rule 7) so prototype-chain
          // names like `toString` are treated as undefined, not native fns.
          if (node.argument && node.argument.type === 'Identifier'
              && !_inScope(scope, node.argument.name)
              && !_inSafeGlobals(node.argument.name)
              && !_BROWSER_GLOBALS.has(node.argument.name)) {
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
        // F4 / NOJS-239: refuse foreign-realm accessors (contentDocument,
        // contentWindow, frames, parent, top, self) on raw DOM elements so an
        // <iframe> ref can never hand back a cross-realm object. Safe window /
        // document proxies are exempt (their reads re-wrap via _rewrapResult).
        if (_FORBIDDEN_REALM_ACCESSORS.has(prop) && !_SAFE_PROXIES.has(obj)) return undefined;
        const val = obj[prop];
        return _rewrapResult(val);
      }

      case 'CallExpr':
      case 'OptionalCallExpr': {
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
          // F4 / NOJS-239: same foreign-realm accessor block as MemberExpr, so a
          // call like `$refs.frame.contentDocument.querySelector(...)` cannot
          // reach a cross-realm object via the callee's object chain.
          if (_FORBIDDEN_REALM_ACCESSORS.has(prop) && !_SAFE_PROXIES.has(thisObj)) return undefined;
          const fn = thisObj[prop];
          if (typeof fn !== 'function') return undefined;
          const callResult = fn.apply(thisObj, _evalArgs(node.args, scope));
          return _rewrapResult(callResult);
        }

        const fn = _evalNode(node.callee, scope);
        if (fn == null && node.type === 'OptionalCallExpr') return undefined;
        if (typeof fn !== 'function') return undefined;
        const standaloneResult = fn.apply(undefined, _evalArgs(node.args, scope));
        return _rewrapResult(standaloneResult);
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
  } catch (e) {
    _warn("_evalNode error:", node?.type, e?.message || e);
    return undefined;
  }
}

// ---------------------------------------------------------------------------
// AST → closure compiler (CSP-safe: closure composition, no eval/Function)
// ---------------------------------------------------------------------------
// Compiles each AST node ONCE into a plain closure `(ctx, locals) => value`.
// Semantics must stay identical to the tree-walking interpreter above — the
// interpreter remains the reference engine (statements still execute through
// it, and the differential suite in __tests__/evaluate-compiled.test.js runs
// every corpus expression through both). Two structural wins over
// interpretation:
//   • no per-eval scope object: identifiers resolve by walking the context
//     chain's raw objects directly (one hasOwnProperty hit per level), with
//     $-specials / plugin globals / allow-listed globals resolved lazily in
//     the exact precedence the interpreter's scope build produced;
//   • no per-node dispatch: the type switch runs at compile time, so a hot
//     expression like `row.label` costs two closure calls per eval.

const _MISS = Symbol("nojs.miss");

// Walk arrow-function local scopes (a prototype chain of null-rooted plain
// objects), then the context chain's raw objects. First own key wins — the
// same precedence _collectKeys' first-occurrence collection produced for the
// interpreter's scope prototype.
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

// Safety Rule 7: identifier resolution is allow-list only. Resolution order
// mirrors the interpreter's scope build exactly: context chain (shadows
// everything) → core $-specials → plugin globals (cannot shadow core) →
// _SAFE_GLOBALS → _BROWSER_GLOBALS (with safe wrappers) → undefined.
function _resolveIdentifier(name, ctx, locals) {
  const v = _lookupScopeChain(ctx, locals, name);
  if (v !== _MISS) return v;
  if (name.charCodeAt(0) === 36 /* $ */) {
    switch (name) {
      case "$store":  return _stores;
      case "$route":  return _routerInstance?.current;
      case "$router": return _routerInstance;
      case "$i18n":   return _i18nProxy;
      case "$refs":   return ctx.$refs;
      case "$form":   return ctx.$form || null;
    }
    const gk = name.slice(1);
    if (gk in _globals) return _globals[gk];
    return undefined;
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
  return undefined;
}

const _fnUndefined = () => undefined;

// Per-node error isolation, matching the interpreter's per-node try/catch:
// a throwing subexpression (getter, user function, coercion) yields undefined
// with the same warning, and the rest of the expression keeps evaluating.
function _guard(type, fn) {
  return function (ctx, locals) {
    try {
      return fn(ctx, locals);
    } catch (e) {
      _warn("_evalNode error:", type, e?.message || e);
      return undefined;
    }
  };
}

const _EMPTY_ARGS = [];

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
      // Short-circuit operators evaluate lazily; the branch logic itself
      // cannot throw (children guard themselves), so no _guard.
      if (op === "&&") {
        const right = _compileNode(node.right);
        return (c, l) => { const lv = left(c, l); return lv ? right(c, l) : lv; };
      }
      if (op === "||") {
        const right = _compileNode(node.right);
        return (c, l) => { const lv = left(c, l); return lv ? lv : right(c, l); };
      }
      if (op === "??") {
        const right = _compileNode(node.right);
        return (c, l) => { const lv = left(c, l); return (lv === null || lv === undefined) ? right(c, l) : lv; };
      }
      const right = _compileNode(node.right);
      // Guarded: coercion can throw (Symbol/BigInt operands, instanceof with
      // a non-callable RHS) and must degrade to undefined like the interpreter.
      switch (op) {
        case "+": return _guard(node.type, (c, l) => left(c, l) + right(c, l));
        case "-": return _guard(node.type, (c, l) => left(c, l) - right(c, l));
        case "*": return _guard(node.type, (c, l) => left(c, l) * right(c, l));
        case "/": return _guard(node.type, (c, l) => left(c, l) / right(c, l));
        case "%": return _guard(node.type, (c, l) => left(c, l) % right(c, l));
        case "**": return _guard(node.type, (c, l) => left(c, l) ** right(c, l));
        case "===": return (c, l) => left(c, l) === right(c, l);
        case "!==": return (c, l) => left(c, l) !== right(c, l);
        case "==": return _guard(node.type, (c, l) => left(c, l) == right(c, l));
        case "!=": return _guard(node.type, (c, l) => left(c, l) != right(c, l));
        case ">": return _guard(node.type, (c, l) => left(c, l) > right(c, l));
        case "<": return _guard(node.type, (c, l) => left(c, l) < right(c, l));
        case ">=": return _guard(node.type, (c, l) => left(c, l) >= right(c, l));
        case "<=": return _guard(node.type, (c, l) => left(c, l) <= right(c, l));
        case "in": return _guard(node.type, (c, l) => {
          const lv = left(c, l);
          const r = right(c, l);
          return (r && typeof r === "object") ? (lv in r) : undefined;
        });
        case "instanceof": return _guard(node.type, (c, l) => left(c, l) instanceof right(c, l));
        case "&": return _guard(node.type, (c, l) => left(c, l) & right(c, l));
        case "|": return _guard(node.type, (c, l) => left(c, l) | right(c, l));
        case "^": return _guard(node.type, (c, l) => left(c, l) ^ right(c, l));
        case "<<": return _guard(node.type, (c, l) => left(c, l) << right(c, l));
        case ">>": return _guard(node.type, (c, l) => left(c, l) >> right(c, l));
        case ">>>": return _guard(node.type, (c, l) => left(c, l) >>> right(c, l));
        default: return _fnUndefined;
      }
    }

    case "UnaryExpr": {
      const op = node.op;
      if (op === "typeof") {
        // Unknown identifiers resolve to undefined (allow-list), so a plain
        // typeof over the compiled argument matches the interpreter's
        // special-cased "undefined" for out-of-scope names.
        const arg = _compileNode(node.argument);
        return (c, l) => typeof arg(c, l);
      }
      if (op === "++" || op === "--") {
        const arg = _compileNode(node.argument);
        const inc = op === "++";
        const prefix = !!node.prefix;
        return _guard(node.type, (c, l) => {
          const oldVal = arg(c, l);
          const newVal = inc ? oldVal + 1 : oldVal - 1;
          return prefix ? newVal : oldVal;
        });
      }
      const arg = _compileNode(node.argument);
      switch (op) {
        case "!": return (c, l) => !arg(c, l);
        case "-": return _guard(node.type, (c, l) => -arg(c, l));
        case "+": return _guard(node.type, (c, l) => +arg(c, l));
        case "~": return _guard(node.type, (c, l) => ~arg(c, l));
        case "void": return (c, l) => { arg(c, l); return undefined; };
        default: return (c, l) => { arg(c, l); return undefined; };
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
        // F4 / NOJS-239: foreign-realm accessors are only readable off the
        // safe window/document proxies, never off raw DOM elements.
        const realmBlocked = _FORBIDDEN_REALM_ACCESSORS.has(prop);
        return _guard(node.type, (c, l) => {
          const obj = objFn(c, l);
          if (obj == null) return undefined;
          if (realmBlocked && !_SAFE_PROXIES.has(obj)) return undefined;
          return _rewrapResult(obj[prop]);
        });
      }
      const propFn = _compileNode(node.property);
      return _guard(node.type, (c, l) => {
        const obj = objFn(c, l);
        if (obj == null) return undefined;
        const prop = propFn(c, l);
        if (_FORBIDDEN_PROPS[prop]) return undefined;
        if (_FORBIDDEN_REALM_ACCESSORS.has(prop) && !_SAFE_PROXIES.has(obj)) return undefined;
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
            if (thisObj == null) return undefined;
            if (realmBlocked && !_SAFE_PROXIES.has(thisObj)) return undefined;
            const fn = thisObj[prop];
            if (typeof fn !== "function") return undefined;
            return _rewrapResult(fn.apply(thisObj, argsFn(c, l)));
          });
        }
        const propFn = _compileNode(callee.property);
        return _guard(node.type, (c, l) => {
          const thisObj = thisFn(c, l);
          if (thisObj == null) return undefined;
          const prop = propFn(c, l);
          if (_FORBIDDEN_PROPS[prop]) return undefined;
          if (_FORBIDDEN_REALM_ACCESSORS.has(prop) && !_SAFE_PROXIES.has(thisObj)) return undefined;
          const fn = thisObj[prop];
          if (typeof fn !== "function") return undefined;
          return _rewrapResult(fn.apply(thisObj, argsFn(c, l)));
        });
      }
      const calleeFn = _compileNode(callee);
      const optional = node.type === "OptionalCallExpr";
      return _guard(node.type, (c, l) => {
        const fn = calleeFn(c, l);
        if (fn == null && optional) return undefined;
        if (typeof fn !== "function") return undefined;
        return _rewrapResult(fn.apply(undefined, argsFn(c, l)));
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
      return (ctx, locals) => function (...callArgs) {
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
      // In expression context, return the current value (no mutation)
      return _compileNode(node.argument);

    case "AssignExpr":
      // In expression context, evaluate and return the RHS
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
  // Filter fn looked up per apply (late binding — NoJS.filter() may register
  // after the expression is first compiled), args parsed once here.
  return { name, args: argStr ? _parseFilterArgs(argStr) : _EMPTY_ARGS };
}

function _compileProgram(expr) {
  const pipes = _parsePipes(expr);
  const ast = _parseExpr(_tokenize(pipes[0]));
  const filters = [];
  for (let i = 1; i < pipes.length; i++) filters.push(_compileFilterSpec(pipes[i]));
  return { fn: _compileNode(ast), filters };
}

// ---------------------------------------------------------------------------
// Statement parser & executor (for on:*, watch, etc.)
// ---------------------------------------------------------------------------

// Parse semicolon-separated statements into an array of AST nodes
function _parseStatements(expr) {
  if (_stmtCache.has(expr)) return _stmtCache.get(expr);
  const tokens = _tokenize(expr);
  const stmts = [];
  let start = 0;
  for (let i = 0; i <= tokens.length; i++) {
    if (i === tokens.length || (tokens[i].type === "Punc" && tokens[i].value === ";")) {
      const chunk = tokens.slice(start, i);
      if (chunk.length > 0) stmts.push(_parseExpr(chunk));
      start = i + 1;
    }
  }
  _stmtCache.set(expr, stmts);
  return stmts;
}

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
        if (!_inScope(scope, name) && !_inSafeGlobals(name) && !_BROWSER_GLOBALS.has(name)) {
          throw new ReferenceError(name + " is not defined");
        }
      }
      return _evalNode(node, scope);
    }
  }
}

// Parse pipe syntax: "expr | filter1 | filter2:arg"
function _parsePipes(exprStr) {
  // Fast-path: ~90%+ expressions have zero pipes
  if (!exprStr.includes('|')) return [exprStr.trim()];
  // Don't split on || (logical OR)
  const parts = [];
  let current = "";
  let depth = 0;
  let inStr = false;
  let strChar = "";
  for (let i = 0; i < exprStr.length; i++) {
    const ch = exprStr[i];
    if (inStr) {
      current += ch;
      // A quote closes the string only when it is NOT escaped. Count the run of
      // backslashes immediately before it: an even count (incl. zero) means the
      // quote is unescaped (e.g. `\\` is an escaped backslash, the quote after
      // it is real); an odd count means the quote itself is escaped.
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
    if (
      ch === "|" &&
      depth === 0 &&
      exprStr[i + 1] !== "|" &&
      exprStr[i - 1] !== "|"
    ) {
      parts.push(current.trim());
      current = "";
      continue;
    }
    current += ch;
  }
  parts.push(current.trim());
  return parts;
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

// Static root-key extraction for key-scoped watchers (_watchExpr).
// Token-level scan, deliberately over-approximate: every identifier that is
// not a member-access property counts as a root (object-literal keys included
// — extra keys mean extra fires, never missed ones). Returns null (= unkeyed,
// fire on every notification) whenever precision is impossible:
//  - piped expressions (filter args may read arbitrary scope keys)
//  - any "(" (a called context function may read any key; grouping/arrows
//    are sacrificed for simplicity)
//  - assignments / increments / template literals
//  - $-prefixed roots other than the registry-handled $store/$route/$i18n
//    ($refs, $router, plugin globals historically refreshed by piggy-backing
//    on unrelated notifications — keep that behavior)
// Memoized per expression string: loop clones register the same handful of
// expressions thousands of times, and tokenizing each registration dominates
// watcher setup. Callers must treat the returned Set as immutable (see
// _watchExpr, which copies before unioning).
const _rootKeysCache = new Map();
const _ROOT_KEYS_CACHE_MAX = 500;

export function _exprRootKeys(expr) {
  const hit = _rootKeysCache.get(expr);
  if (hit !== undefined) return hit;
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
  const roots = new Set();
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (t.type === "Template") return null;
    if (t.type === "Op" && (t.value === "=" || t.value === "+=" || t.value === "-=" ||
        t.value === "*=" || t.value === "/=" || t.value === "%=" ||
        t.value === "++" || t.value === "--" || t.value === "=>")) return null;
    if (t.type === "Punc" && t.value === "(") return null;
    if (t.type === "Ident") {
      const prev = tokens[i - 1];
      if (prev && prev.type === "Punc" && (prev.value === "." || prev.value === "?.")) continue;
      if (t.value.charCodeAt(0) === 36 /* $ */ &&
          t.value !== "$store" && t.value !== "$route" && t.value !== "$i18n") return null;
      roots.add(t.value);
    }
  }
  return roots.size > 0 ? roots : null;
}
_setExprRootKeysFn(_exprRootKeys);

// Statement variant of _exprRootKeys for _execStatement's write-back:
// assignments/increments are expected (that's what statements do), so only
// calls (a called function may mutate any context object) and template
// literals force the conservative null. Used to skip the in-place-mutation
// safety notify for object keys the statement never mentions.
function _stmtRootKeys(expr) {
  if (typeof expr !== "string") return null;
  let tokens;
  try {
    tokens = _tokenize(expr);
  } catch {
    return null;
  }
  if (!tokens || tokens.length === 0) return null;
  const roots = new Set();
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (t.type === "Template") return null;
    if (t.type === "Punc" && t.value === "(") return null;
    if (t.type === "Ident") {
      const prev = tokens[i - 1];
      if (prev && prev.type === "Punc" && (prev.value === "." || prev.value === "?.")) continue;
      // A statement writing through a non-registry $-root (plugin globals,
      // $refs) has always relied on the keyless safety-net notify to wake
      // unkeyed watchers like bind="$demo.count" — same bail as
      // _exprRootKeys (NOJS plugin-system e2e 2).
      if (t.value.charCodeAt(0) === 36 /* $ */ &&
          t.value !== "$store" && t.value !== "$route" && t.value !== "$i18n") return null;
      roots.add(t.value);
    }
  }
  return roots;
}

// True when a statement mentions a $-root that no registry notify covers:
// plugin globals ($demo…), $refs, $router. $store/$route/$i18n have their
// own watcher registries; $event/$el are per-invocation locals. Writes
// through these roots mutate proxies that live OUTSIDE the context chain,
// so _execStatement's per-key write-back can never see them — they need an
// explicit keyless wake. Memoized per statement string.
const _stmtGlobalRootCache = new Map();
function _stmtHasGlobalRoot(expr) {
  let hit = _stmtGlobalRootCache.get(expr);
  if (hit !== undefined) return hit;
  hit = false;
  try {
    const tokens = _tokenize(expr);
    for (let i = 0; i < tokens.length; i++) {
      const t = tokens[i];
      if (t.type !== "Ident" || t.value.charCodeAt(0) !== 36 /* $ */) continue;
      const prev = tokens[i - 1];
      if (prev && prev.type === "Punc" && (prev.value === "." || prev.value === "?.")) continue;
      if (t.value !== "$store" && t.value !== "$route" && t.value !== "$i18n" &&
          t.value !== "$event" && t.value !== "$el") {
        hit = true;
        break;
      }
    }
  } catch {
    // Unparseable statements throw again in _parseStatements before any
    // write happens — no wake needed.
  }
  if (_stmtGlobalRootCache.size >= _ROOT_KEYS_CACHE_MAX) _stmtGlobalRootCache.clear();
  _stmtGlobalRootCache.set(expr, hit);
  return hit;
}

export function evaluate(expr, ctx) {
  if (expr == null || expr === "") return undefined;
  try {
    let prog = _exprCache.get(expr);
    if (prog === undefined) {
      prog = _compileProgram(expr);
      _exprCache.set(expr, prog);
    }
    if (!ctx || !ctx.__isProxy) {
      // The interpreter's scope build threw on non-context objects (caught →
      // warn + undefined); keep that contract without the throw.
      _warn("Expression error:", expr, "requires a reactive context");
      return undefined;
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
    return undefined;
  }
}

// Reference implementation: the pre-compiler tree-walking evaluate. Kept for
// the differential suite (__tests__/evaluate-compiled.test.js), which runs
// every corpus expression through both engines and asserts identical results.
// Not used on any hot path.
export function _evaluateInterpreted(expr, ctx) {
  if (expr == null || expr === "") return undefined;
  try {
    const pipes = _parsePipes(expr);
    const mainExpr = pipes[0];
    const { vals } = _collectKeys(ctx);

    // Build scope using prototype chain: vals (cached) becomes the prototype,
    // special variables are own properties. This eliminates the O(n) per-key
    // copy — prototype chain lookup is native-optimized.
    const scope = Object.create(vals);
    // Add special variables as own properties only when not already in the
    // prototype (i.e. not shadowed by a same-named local context var).
    if (!("$store"  in scope)) scope.$store  = _stores;
    if (!("$route"  in scope)) scope.$route  = _routerInstance?.current;
    if (!("$router" in scope)) scope.$router = _routerInstance;
    if (!("$i18n"   in scope)) scope.$i18n   = _i18nProxy;
    if (!("$refs"   in scope)) scope.$refs   = ctx.$refs;
    if (!("$form"   in scope)) scope.$form   = ctx.$form || null;
    // Inject plugin globals (cannot shadow local or core $ variables)
    for (const gk in _globals) {
      const key = "$" + gk;
      if (!(key in scope)) scope[key] = _globals[gk];
    }

    // Parse expression into AST. Deliberately NOT cached: _exprCache now
    // holds compiled programs keyed by full expression string — mixing raw
    // ASTs keyed by mainExpr into it would corrupt the compiled path.
    const ast = _parseExpr(_tokenize(mainExpr));

    // Evaluate AST against scope
    let result = _evalNode(ast, scope);

    // Apply filters
    for (let i = 1; i < pipes.length; i++) {
      result = _applyFilter(result, pipes[i]);
    }

    return result;
  } catch (e) {
    _warn("Expression error:", expr, e.message);
    return undefined;
  }
}

// Execute a statement (for on:* handlers)
export function _execStatement(expr, ctx, extraVars = {}) {
  // Batch every notification produced by this statement (writes, write-backs,
  // manual $notify) so each listener runs once per settled state. Without
  // this, a listener registered on several contexts in the ancestor chain
  // (see _watchExpr) runs once per notifying context.
  _startBatch();
  try {
    const { vals } = _collectKeys(ctx);

    // Build scope using prototype chain (same pattern as evaluate())
    const scope = Object.create(vals);
    if (!("$store"  in scope)) scope.$store  = _stores;
    if (!("$route"  in scope)) scope.$route  = _routerInstance?.current;
    if (!("$router" in scope)) scope.$router = _routerInstance;
    if (!("$i18n"   in scope)) scope.$i18n   = _i18nProxy;
    if (!("$refs"   in scope)) scope.$refs   = ctx.$refs;
    // Inject plugin globals (before extraVars so $event etc. take priority)
    for (const gk in _globals) {
      const key = "$" + gk;
      if (!(key in scope)) scope[key] = _globals[gk];
    }
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
    const stmtRoots = _stmtRootKeys(expr);
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
        // In-place mutation safety net: the statement may have mutated this
        // object's internals without reassigning it. Only keys the statement
        // actually references can have been touched (stmtRoots is null when
        // that can't be determined — e.g. function calls), and the notify is
        // keyed so unrelated key-scoped watchers stay quiet.
        if (stmtRoots && !stmtRoots.has(k)) continue;
        let c = ctx;
        while (c && c.__isProxy) {
          if (k in c.__raw) { c.$notify(k); break; }
          c = c.$parent;
        }
      }
    }

    // Write back new variables created during execution.
    // Only own properties on scope represent mutations or new assignments —
    // prototype (vals) keys are inherited from the context chain and already
    // handled by the chainKeys write-back above.
    for (const k in scope) {
      if (!Object.prototype.hasOwnProperty.call(scope, k)) continue;
      if (k.startsWith("$") || k.startsWith("_") || chainKeys.has(k) || k in extraVars) continue;
      if (_FORBIDDEN_PROPS[k]) continue;
      ctx.$set(k, scope[k]);
    }

    // Notify global store watchers when expression touches $store
    if (typeof expr === "string" && expr.includes("$store")) {
      _notifyStoreWatchers(_extractStoreName(expr));
    }

    // Statement wrote through a registry-less $-root (plugin global, $refs):
    // the mutated proxy lives outside the context chain, so the per-key
    // write-back above cannot observe it. Wake watchers with a keyless
    // notify up the chain — the batch queue is a Set, so a listener
    // registered on several ancestors still runs once. Historically this
    // wake happened by ACCIDENT: the interpreted evaluate() planted a
    // __collectKeysCache own key on the context, and the in-place-mutation
    // safety net above notified it on every statement. The compiled
    // evaluate() plants no such key, so the wake must be explicit
    // (plugin-system e2e 2).
    if (typeof expr === "string" && _stmtHasGlobalRoot(expr)) {
      let c = ctx;
      while (c && c.__isProxy) {
        c.$notify();
        c = c.$parent;
      }
    }
  } catch (e) {
    _warn("Expression error:", expr, e.message);
    // Dispatch a custom DOM event so error-boundary directives can catch it
    if (extraVars.$el) {
      extraVars.$el.dispatchEvent(
        new CustomEvent("nojs:error", { bubbles: true, detail: { message: e.message, error: e } })
      );
    }
  } finally {
    _endBatch();
  }
}

export function resolve(path, ctx) {
  return path.split(".").reduce((o, k) => {
    if (_FORBIDDEN_PROPS[k]) return undefined;
    return o?.[k];
  }, ctx);
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
