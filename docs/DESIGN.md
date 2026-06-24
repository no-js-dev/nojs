---
version: alpha
name: NoJS Futuristic Dark
description: A high-performance, dark-themed, futuristic visual design system for the NoJS landing page, featuring absolute isometric grid cells, radial glows, and cascading nested subboxes.
colors:
  primary: "#ffffff"
  secondary: "#8b93a3"
  tertiary: "#2563eb"
  neutral: "#07080b"
  surface: "#0d0f14"
  accent-light: "#3b82f6"
  accent-hover: "#1d4ed8"
  border: "#202123"
  glass: "#0e0f12"
  glass-hover: "#18191c"
  muted: "#4b5263"
typography:
  headline:
    fontFamily: Geist
    fontSize: 3.5rem
    fontWeight: 800
    lineHeight: 1.05
    letterSpacing: -0.03em
  subtitle:
    fontFamily: Geist
    fontSize: 1.125rem
    fontWeight: 400
    lineHeight: 1.625
  body:
    fontFamily: Geist
    fontSize: 16px
    fontWeight: 400
    lineHeight: 1.5
  code:
    fontFamily: Geist Mono
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.75
  label:
    fontFamily: Geist Mono
    fontSize: 13px
    fontWeight: 400
    lineHeight: 1.45
    letterSpacing: 0.01em
rounded:
  sm: 6px
  md: 8px
  lg: 12px
  full: 9999px
spacing:
  xs: 4px
  sm: 8px
  md: 16px
  lg: 32px
  xl: 64px
components:
  page-layout:
    backgroundColor: "{colors.neutral}"
  hero-title:
    textColor: "{colors.accent-light}"
    typography: "{typography.headline}"
  hero-subtitle:
    textColor: "{colors.secondary}"
    typography: "{typography.subtitle}"
  header-logo:
    textColor: "{colors.primary}"
  btn-primary:
    backgroundColor: "{colors.tertiary}"
    textColor: "{colors.primary}"
    rounded: "{rounded.md}"
  btn-primary-hover:
    backgroundColor: "{colors.accent-hover}"
  btn-secondary:
    backgroundColor: "{colors.glass}"
    textColor: "{colors.primary}"
    rounded: "{rounded.md}"
  btn-secondary-hover:
    backgroundColor: "{colors.glass-hover}"
  editor-window:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.lg}"
  editor-window-border:
    backgroundColor: "{colors.border}"
  editor-line-numbers:
    textColor: "{colors.muted}"
    typography: "{typography.code}"
---

# NoJS Design System

## Overview

Futuristic Dark Minimalism meets Declarative Programming. The visual identity of the NoJS landing page is designed to feel highly technical, clean, and interactive. A deep charcoal base provides the foundation, accented with electric blue highlights and delicate, semi-transparent overlays. The background houses a dynamic isometric projection illustrating reactive nested HTML nodes to symbolize the framework's core philosophy: client-side logic expressed entirely through native markup.

## Colors

The color palette centers around a high-contrast dark theme to reduce eye strain and emphasize glowing accent indicators.

- **Primary (#ffffff):** High-contrast white for core text and window controls, ensuring maximum readability.
- **Secondary (#8b93a3):** A muted slate grey for secondary labels, subtitles, and border trims, creating typographic hierarchy.
- **Tertiary (#2563eb):** Electric blue serving as the primary accent color. It drives user attention to critical actions (e.g., CTA buttons) and indicates active/glowing states.
- **Neutral (#07080b):** A deep charcoal ink black acting as the foundational background. It is softer than pure black to create a premium, matte texture.
- **Surface (#0d0f14):** A slightly lighter obsidian black used to isolate blocks (such as the code editor mockup) from the background.
- **Accent Light (#3b82f6):** A vibrant sky blue gradient stop for the main headline and active glowing nodes.
- **Accent Hover (#1d4ed8):** A darker, saturated blue used to indicate hovered states on brand-primary actions.
- **Border (#202123):** The solid equivalent of the delicate `rgba(255, 255, 255, 0.1)` boundary line rendered over the neutral background.
- **Glass (#0e0f12):** The solid equivalent of the low-opacity `rgba(255, 255, 255, 0.03)` white glassmorphism layer blended over the neutral background.
- **Glass Hover (#18191c):** The solid equivalent of the `rgba(255, 255, 255, 0.07)` hovered glass layer blended over the neutral background.
- **Muted (#4b5263):** A deep grey reserved for code line numbers and low-priority decoration.

## Typography

The typography system relies on the **Geist** family to represent modern aesthetics and strict technical layout:

- **Narrative (Geist Sans):** Used for headlines, subtitles, and buttons. 
  - **Headlines:** Set to Geist Extra-Bold with tight letter-spacing (`-0.03em`) and a tight line height (`1.05`) to create an institutional, modern, and striking presence.
  - **Subtitles/Body:** Set to Geist Regular at `1.125rem` with a relaxed line height (`1.625`) to ensure premium readability.
- **Code & Labels (Geist Mono):** Used for code blocks, syntax rendering, and isometric node tags.
  - **Editor Code:** Set to `14px` with a taller line height (`1.75`) for clean structural reading.
  - **Isometric Tags:** Set to `13px` with letter-spacing (`0.01em`). These labels inherit the parent's isometric compression to lie perfectly flat on the virtual floor grid.

## Layout

The layout is split into two visual planes:

1. **Center Flow Layout:** A fixed-max-width center container (`768px`) that houses the logo, main typography elements, action buttons, and the code mockup window.
2. **Background Isometric Overlay:** A background overlay utilizing absolute coordinates. The grid is constructed from two crossing sets of repeating lines at $+30^\circ$ and $-30^\circ$ angles, creating a diamond matrix.

## Elevation & Depth

Visual layers are established through glowing light and transparency:

- **Center Radial Glow:** A large, soft radial gradient (`rgba(38, 52, 92, 0.4)`) sits behind the main content, centering the user's attention and adding three-dimensional depth to the page.
- **Active Node Glowing:** Diamonds on the grid cycle through a keyframe active pulse that transitions borders to bright blue (`#3b82f6`) and projects a blue shadow glow (`0 0 30px rgba(59, 130, 246, 0.22)`).
- **Cascading Ripple:** Diamonds with nested subsquares (DOM tree showcases) cascade their active highlight with a `0.6-second` delay, creating a ripple wave of light traveling down the hierarchy.

## Shapes

The design balances sharp architectural elements with soft interactive elements:

- **Borders and Divs:** Structural components (like the simulated code editor window and secondary containers) use a medium **8px or 12px corner radius** (`rounded.md` or `rounded.lg`) to feel modern and premium.
- **Grid Diamonds:** The isometric cells are sharp squares rotated by $\pm 45^\circ$, maintaining a geometric, grid-aligned digital structure.

## Components

The system describes four primary components:

- **Primary Button (btn-primary):** A solid electric blue button with white text and a soft blue shadow. On hover, it shifts to a deeper blue (`accent-hover`) and moves up slightly (`-1px`).
- **Secondary Button (btn-secondary):** A semi-transparent glass button with a fine white border. On hover, it brightens its background (`glass-hover`) and border.
- **Code Editor (editor-window):** An obsidian card with an absolute centered header containing red/yellow/green Mac-style window dots, a title, and a line-numbered preformatted code block.
- **Isometric Node (nojs-diamond):** Absolute-positioned squares on the grid.
  - `.nojs-diamond-r` rotates $+45^\circ$, sloping down-to-the-right.
  - `.nojs-diamond-l` rotates $-45^\circ$, sloping up-to-the-right.

## Do's and Don'ts

- **Do** use the electric blue accent color sparingly for active or primary interactive elements.
- **Do** align nested isometric subboxes with a consistent `30px` padding offset.
- **Do** ensure all text elements maintain high contrast against the dark background.
- **Don't** mix different sans-serif families on the same screen (keep to Geist).
- **Don't** add pure black solid components that clash with the warm neutral ink background.
