// ═══════════════════════════════════════════════════════════════════════
//  EXPRESSION PARSER — tokenizer, AST builder, pipe parser
// ═══════════════════════════════════════════════════════════════════════

import { _config } from "./globals.js";

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
export const _pipeCache = _makeCache();

// ── Tokenizer ──────────────────────────────────────────────────────────

const _KEYWORDS = new Set(["true", "false", "null", "undefined", "typeof", "in", "instanceof"]);
const _FORBIDDEN = new Set(["__proto__", "constructor", "prototype"]);

// Multi-char operators/punctuation, sorted longest-first for greedy matching
const _MULTI = ["===", "!==", "...", "??", "?.", "==", "!=", ">=", "<=", "&&", "||", "+=", "-=", "*=", "/=", "%=", "++", "--", "=>"];
const _SINGLE_OPS = new Set(["+", "-", "*", "/", "%", ">", "<", "!", "=", "|"]);
const _SINGLE_PUNC = new Set(["(", ")", "[", "]", "{", "}", ".", ",", ":", ";", "?"]);

export function _tokenize(expr) {
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

export function _parseExpr(tokens) {
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
// Statement parser
// ---------------------------------------------------------------------------

// Parse semicolon-separated statements into an array of AST nodes
export function _parseStatements(expr) {
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

// Parse pipe syntax: "expr | filter1 | filter2:arg"
export function _parsePipes(exprStr) {
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
      if (ch === strChar && exprStr[i - 1] !== "\\") inStr = false;
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

// Parse and cache an expression string into an AST node.
export function _parseAndCache(expr) {
  let ast = _exprCache.get(expr);
  if (!ast) {
    ast = _parseExpr(_tokenize(expr));
    _exprCache.set(expr, ast);
  }
  return ast;
}
