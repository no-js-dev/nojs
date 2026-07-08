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

  console.log("✓ Build complete!");
  console.log("  dist/iife/no.js — CDN / <script> tag");
}

build().catch((err) => {
  console.error("Build failed:", err);
  process.exit(1);
});
