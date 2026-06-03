// ═══════════════════════════════════════════════════════════════════════
//  DIRECTIVES: page-title, page-description, page-canonical, page-jsonld
// ═══════════════════════════════════════════════════════════════════════
//
//  These directives update <head> elements reactively using the same
//  _watchExpr + evaluate() infrastructure as all other directives.
//  They are meant for placement in the page body (not inside <head>).
//  Use <div hidden> as the host element — it is invisible, semantically
//  neutral, and avoids custom attributes on void elements like <meta>:
//
//    <div hidden page-title="product.name + ' | My Store'"></div>
//    <div hidden page-title="'About Us | My Store'"></div>
//    <div hidden page-description="product.description"></div>
//    <div hidden page-canonical="'/products/' + product.slug"></div>
//    <div hidden page-jsonld>
//      { "@type": "Product", "name": "{product.name}" }
//    </div>
//
//  Note: <script> elements are skipped by processTree; use <div hidden>
//  as the host element for page-jsonld.
//
//  Each directive watches its expression and re-applies the side effect
//  whenever the reactive context changes.
// ═══════════════════════════════════════════════════════════════════════

import { _watchExpr, _onDispose } from "../globals.js";
import { evaluate, resolve } from "../evaluate.js";
import { findContext } from "../dom.js";
import { registerDirective } from "../registry.js";

// Interpolate {key} placeholders in a string without URL-encoding.
// Used by page-jsonld where the template is a JSON string.
function _interpolateRaw(str, ctx) {
  // Match only {identifiers} — skip { starting with " or ' to avoid consuming JSON structure.
  return str.replace(/\{([^}"'{][^}]*)\}/g, (_, expr) => {
    try {
      const val = evaluate(expr.trim(), ctx);
      return val != null ? String(val) : "";
    } catch (_) {
      return "";
    }
  });
}

// ── page-title ────────────────────────────────────────────────────────────────
// Updates document.title reactively.
// Value is a No.JS expression: page-title="product.name + ' | Store'"
registerDirective("page-title", {
  priority: 1,
  init(el, name, expr) {
    const ctx = findContext(el);
    function update() {
      const val = evaluate(expr, ctx);
      if (val != null) document.title = String(val);
    }
    _watchExpr(expr, ctx, update);
    update();
  },
});

// ── page-description ──────────────────────────────────────────────────────────
// Creates or updates <meta name="description" content="..."> in <head>.
// Value is a No.JS expression: page-description="product.description"
registerDirective("page-description", {
  priority: 1,
  init(el, name, expr) {
    const ctx = findContext(el);
    // Track whether THIS directive created the meta element so disposal can
    // remove it (and avoid stale meta leaking across SPA route changes). A
    // hand-written meta the developer placed in <head> is left untouched.
    let created = false;
    let managed = null;
    function update() {
      const val = evaluate(expr, ctx);
      if (val == null) return;
      let meta = document.querySelector('meta[name="description"]');
      if (!meta) {
        meta = document.createElement("meta");
        meta.name = "description";
        document.head.appendChild(meta);
        created = true;
      }
      managed = meta;
      meta.content = String(val);
    }
    _watchExpr(expr, ctx, update);
    update();
    _onDispose(() => {
      if (created && managed && managed.isConnected) managed.remove();
    });
  },
});

// ── page-canonical ────────────────────────────────────────────────────────────
// Creates or updates <link rel="canonical" href="..."> in <head>.
// Value is a No.JS expression: page-canonical="'/products/' + product.slug"
registerDirective("page-canonical", {
  priority: 1,
  init(el, name, expr) {
    const ctx = findContext(el);
    let created = false;
    let managed = null;
    function update() {
      const val = evaluate(expr, ctx);
      if (val == null) return;
      let link = document.querySelector('link[rel="canonical"]');
      if (!link) {
        link = document.createElement("link");
        link.rel = "canonical";
        document.head.appendChild(link);
        created = true;
      }
      const href = String(val);
      if (/^\s*(javascript|vbscript|data):/i.test(href)) return;
      managed = link;
      link.href = href;
    }
    _watchExpr(expr, ctx, update);
    update();
    // Remove the canonical link this directive created on disposal so it
    // doesn't persist as a stale canonical across SPA route changes.
    _onDispose(() => {
      if (created && managed && managed.isConnected) managed.remove();
    });
  },
});

// ── page-jsonld ───────────────────────────────────────────────────────────────
// Creates or updates a <script type="application/ld+json" data-nojs> in <head>.
// Value is either:
//   - A No.JS expression that evaluates to an object → JSON.stringify is applied
//   - A JSON string with {interpolation} placeholders → _interpolate is applied
//
// The data-nojs marker distinguishes the managed tag from any hand-written
// JSON-LD the developer may have added, so they can coexist.
registerDirective("page-jsonld", {
  priority: 1,
  init(el, name, expr) {
    const ctx = findContext(el);
    // The JSON template lives in the element's text content (or innerHTML for
    // elements like <div hidden>). The attribute value (expr) is intentionally
    // empty — the developer writes the JSON template as the element body.
    const template = (el.textContent || el.innerHTML).trim();
    if (!template) return;
    let created = false;
    let managed = null;
    function update() {
      // Resolve {interpolation} placeholders in the JSON template.
      const json = _interpolateRaw(template, ctx);
      if (!json) return;
      let script = document.querySelector(
        'script[type="application/ld+json"][data-nojs]',
      );
      if (!script) {
        script = document.createElement("script");
        script.type = "application/ld+json";
        script.setAttribute("data-nojs", "");
        document.head.appendChild(script);
        created = true;
      }
      managed = script;
      script.textContent = json.replace(/<\//g, '<\\/');
    }
    _watchExpr(template, ctx, update);
    update();
    // The managed JSON-LD script is owned by No.JS (data-nojs marker); remove
    // it on disposal to prevent stale structured data across SPA routes.
    _onDispose(() => {
      if (created && managed && managed.isConnected) managed.remove();
    });
  },
});
