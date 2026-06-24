# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

Static HTML/CSS documentation site for the NoJS framework. No build step, no bundler, no package manager — just plain `.html` files and one shared `style.css`. Designed to be opened directly in a browser or served from any static host.

## Development

```bash
# Serve locally (any static server works)
npx serve .              # or python3 -m http.server 8000
open index.html          # or just open files directly in a browser
```

There are no tests, no linting, and no CI. Changes are verified visually in a browser. After editing, open the affected page and check both desktop and mobile (≤600px) viewports.

## Architecture

### Architecture

Single-page application (SPA) powered by NoJS's `route-view` directive with file-based routing. Two entry points (`index.html` and `404.html`) share the same layout shell and load page content from `templates/*.tpl` files.

| Route | Template | Purpose |
|-------|----------|---------|
| `/` (home) | `templates/home.tpl` | Landing page with hero, feature cards, directive showcases, and getting-started |
| `/features` | `templates/features.tpl` | Feature overview grid |
| `/docs` | `templates/docs.tpl` | Reference documentation with sidebar navigation and TOC |
| `/examples` | `templates/examples.tpl` | Interactive code examples organized by directive category |
| `/faq` | `templates/faq.tpl` | Accordion-style Q&A |
| `/playground` | `templates/playground.tpl` | Split-pane code editor with live preview |

### Shared Layout Pattern

Both `index.html` and `404.html` follow the same DOM skeleton:

```
<div class="layout-container">
  <div class="nojs-glow" />        ← radial glow background
  <div class="nojs-grid" />        ← dotted grid background
  <nav class="sticky-nav" />       ← shared sticky header (logo + links + GitHub)
  <div class="page-transition-wrapper">
    <div route-view />              ← SPA route outlet (loads templates/*.tpl)
    <footer class="site-footer" />  ← 3-column footer
  </div>
</div>
```

The `route-view` element uses `src="templates/"` and `route-index="home"` for file-based routing. Page templates are `.tpl` files with i18n namespace auto-derivation via the `i18n-ns` attribute.

### Inline JavaScript

Minimal — only vanilla `<script>` blocks at the end of `<body>` in the entry HTML files:

- **index.html / 404.html**: Playground engine lazy-loader, hero editor init, diamond animation delay shuffler, TOC builder + scrollspy, sticky nav scroll handler, custom `highlight` directive registration
- **playground/engine.js**: Full playground engine (syntax highlighting, file management, preview iframe)
- **playground/editor.js**: Reusable lightweight code editor component

NoJS framework and NoJS Elements are loaded from CDN (`cdn.no-js.dev`, `cdn-elements.no-js.dev`).

### CSS Design System (`style.css`)

Single 3000+ line file. Key tokens in `:root`:

- Fonts: `--font-sans` (Geist), `--font-mono` (Geist Mono) — loaded from Google Fonts
- Colors: `--bg-color` (#07080b), `--accent-blue` (#2563eb), `--text-primary/secondary/muted`, `--glass-bg`, `--border-color`
- Semantic: `--error` (#ef4444), `--success` (#22c55e)
- Layout: `--max-width-section` (72rem / 1152px), `--max-width-content` (48rem / 768px)

Major CSS features:
- **View Transitions API**: `@view-transition { navigation: auto }` with named transitions on `.sticky-nav`, `.page-transition-wrapper`, and `.hero-header` for cross-page fades
- **Isometric background**: `.nojs-diamond` elements use `scaleY(0.57735) rotate(±45°)` to create a projected grid; `moving-highlight` keyframe animation cycles border glow across 8 staggered delay classes
- **Responsive breakpoints**: 768px (stack showcases, fade diamonds) and 600px (single-column, hide GitHub button, hide isometric overlay)

### Design Reference

`DESIGN.md` contains the formal design system spec (YAML frontmatter + markdown) defining exact color values, typography scales, spacing tokens, component definitions, and isometric grid rules. Treat it as the source of truth for visual decisions.

### Other Files

- `index.bkp.html` — backup of an earlier index.html version
- `isometric-grid.glsl` — GLSL fragment shader reference for the isometric grid visual (not used at runtime)
- `design.pen` — Penpot design file export
- `design-md-repo/` — cloned reference repo for the DESIGN.md spec format

## Conventions

- Dark theme only — all colors assume `--bg-color: #07080b` background
- Syntax highlighting in code blocks uses manual `<span>` classes: `.tok-tag`, `.tok-attr`, `.tok-str`, `.tok-punc`, `.tok-comment`, `.tok-mustache`
- SVG icons are inlined, not loaded from an icon library
- No `<div>` soup — semantic elements (`<nav>`, `<main>`, `<header>`, `<footer>`, `<article>`, `<section>`, `<details>`) are used throughout
- When adding a new page: create a new `templates/<name>.tpl` file — file-based routing resolves it automatically. Add a nav link with `route="/<name>"` and i18n keys to the shell locale files
