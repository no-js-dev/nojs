const esbuild = require("esbuild");
const { readFileSync } = require("fs");

const pkg = JSON.parse(readFileSync("./package.json", "utf8"));

const banner = `/**
 * No.JS v${pkg.version} — The HTML-First Reactive Framework
 * No more JavaScript. Just HTML attributes with superpowers.
 * @author ${pkg.author}
 * @homepage https://no-js.dev
 * @license MIT
 * @see https://github.com/no-js-dev/nojs
 */`;

const shared = {
  bundle: true,
  banner: { js: banner },
  target: ["es2020"],
};

async function build() {
  // ── CDN (IIFE) ────────────────────────────────────────────────────
  await esbuild.build({
    ...shared,
    entryPoints: ["src/cdn.js"],
    outfile: "dist/iife/no.js",
    format: "iife",
    minify: true,
    sourcemap: true,
  });

  // ── ESM ───────────────────────────────────────────────────────────
  await esbuild.build({
    ...shared,
    entryPoints: ["src/index.js"],
    outfile: "dist/esm/no.js",
    format: "esm",
    minify: true,
    sourcemap: true,
  });

  // ── CJS ───────────────────────────────────────────────────────────
  await esbuild.build({
    ...shared,
    entryPoints: ["src/index.js"],
    outfile: "dist/cjs/no.js",
    format: "cjs",
    minify: true,
    sourcemap: true,
  });

  console.log("✓ Build complete!");
  console.log("  dist/iife/no.js — CDN / <script> tag");
  console.log("  dist/esm/no.js  — ES module (import)");
  console.log("  dist/cjs/no.js  — CommonJS (require)");
}

build().catch((err) => {
  console.error("Build failed:", err);
  process.exit(1);
});
