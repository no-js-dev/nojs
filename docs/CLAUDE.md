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

### Pages

Five standalone HTML pages sharing one CSS file and an identical layout shell:

| Page | File | Purpose |
|------|------|---------|
| Home | `index.html` | Landing page with hero, feature cards, directive showcases, and getting-started tabs |
| Docs | `docs.html` | Reference documentation with a scrollspy sidebar |
| Examples | `examples.html` | Interactive code examples organized by directive category |
| FAQ | `faq.html` | Accordion-style Q&A using native `<details>`/`<summary>` |
| Playground | `playground.html` | Split-pane code editor with a simulated browser preview |

### Shared Layout Pattern (every page)

Each page follows the same DOM skeleton:

```
<div class="layout-container">
  <div class="nojs-glow" />        ← radial glow background
  <div class="nojs-grid" />        ← dotted grid background
  <nav class="sticky-nav" />       ← shared sticky header (logo + links + GitHub)
  <div class="page-transition-wrapper">
    <header class="subpage-hero" /> ← page title + subtitle (index.html uses .hero-content instead)
    <main class="page-body" />      ← page-specific content
    <footer class="site-footer" />  ← 3-column footer (copyright / designer / links)
  </div>
</div>
```

The nav active state is set by adding `class="active"` to the current page's `<a>` inside `.nav-links`. There is no templating — the nav/footer HTML is duplicated in every file.

### Inline JavaScript

Minimal — only vanilla `<script>` blocks at the end of `<body>`:

- **All pages**: Sticky nav scroll handler (adds `.scrolled` class when `scrollY > 10`)
- **index.html**: Diamond animation delay shuffler + CDN/npm tab switcher (`window.switchTab`)
- **docs.html**: `IntersectionObserver`-based scrollspy that highlights the active sidebar link
- **playground.html**: Tab switching between editor/preview panes

No external JS dependencies are loaded.

### CSS Design System (`style.css`)

Single 900+ line file. Key tokens in `:root`:

- Fonts: `--font-sans` (Geist), `--font-mono` (Geist Mono) — loaded from Google Fonts
- Colors: `--bg-color` (#07080b), `--accent-blue` (#2563eb), `--text-primary/secondary/muted`, `--glass-bg`, `--border-color`
- Layout: `--max-width-section` (768px)

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
- When adding a new page: duplicate an existing page's shell, update the nav `active` class, and wrap content in `.page-transition-wrapper` for view transitions
