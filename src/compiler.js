// ═══════════════════════════════════════════════════════════════════════
//  COMPILER ENTRY — `@no-js-dev/nojs/compiler` (ADR-024)
//
//  Source of the Node-safe ESM entry for offline tooling (compilers,
//  linters, bundler plugins). build.js bundles it to
//  dist/compiler/compiler.mjs. Exposes the parser surface without the
//  framework runtime (no DOM walk, no directive registration). `evaluate`
//  is the reference interpreter, exported for differential/parity testing.
//  Not part of the CDN bundle (entry: src/cdn.js).
// ═══════════════════════════════════════════════════════════════════════

export { parseExpression, parseStatements, segmentPipes, evaluate } from "./evaluate.js";
