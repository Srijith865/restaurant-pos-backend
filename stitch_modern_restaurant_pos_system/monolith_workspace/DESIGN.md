---
name: Monolith Workspace
colors:
  surface: '#faf9f6'
  surface-dim: '#dbdad7'
  surface-bright: '#faf9f6'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f4f3f0'
  surface-container: '#efeeeb'
  surface-container-high: '#e9e8e5'
  surface-container-highest: '#e3e2df'
  on-surface: '#1b1c1a'
  on-surface-variant: '#444748'
  inverse-surface: '#2f312f'
  inverse-on-surface: '#f2f1ee'
  outline: '#747878'
  outline-variant: '#c4c7c7'
  surface-tint: '#5f5e5e'
  primary: '#000000'
  on-primary: '#ffffff'
  primary-container: '#1c1b1b'
  on-primary-container: '#858383'
  inverse-primary: '#c8c6c5'
  secondary: '#0056c6'
  on-secondary: '#ffffff'
  secondary-container: '#226eed'
  on-secondary-container: '#fefcff'
  tertiary: '#000000'
  on-tertiary: '#ffffff'
  tertiary-container: '#1c1b1a'
  on-tertiary-container: '#868382'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#e5e2e1'
  primary-fixed-dim: '#c8c6c5'
  on-primary-fixed: '#1c1b1b'
  on-primary-fixed-variant: '#474746'
  secondary-fixed: '#d9e2ff'
  secondary-fixed-dim: '#b0c6ff'
  on-secondary-fixed: '#001945'
  on-secondary-fixed-variant: '#00429b'
  tertiary-fixed: '#e6e2df'
  tertiary-fixed-dim: '#cac6c4'
  on-tertiary-fixed: '#1c1b1a'
  on-tertiary-fixed-variant: '#484645'
  background: '#faf9f6'
  on-background: '#1b1c1a'
  surface-variant: '#e3e2df'
typography:
  h1:
    fontFamily: Inter
    fontSize: 42px
    fontWeight: '700'
    lineHeight: '1.2'
    letterSpacing: -0.02em
  h2:
    fontFamily: Inter
    fontSize: 30px
    fontWeight: '600'
    lineHeight: '1.3'
    letterSpacing: -0.01em
  h3:
    fontFamily: Inter
    fontSize: 22px
    fontWeight: '600'
    lineHeight: '1.4'
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Inter
    fontSize: 17px
    fontWeight: '400'
    lineHeight: '1.6'
    letterSpacing: '0'
  body-md:
    fontFamily: Inter
    fontSize: 15px
    fontWeight: '400'
    lineHeight: '1.6'
    letterSpacing: '0'
  label-md:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '500'
    lineHeight: '1.2'
    letterSpacing: 0.01em
  label-sm:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '600'
    lineHeight: '1'
    letterSpacing: 0.03em
  h1-mobile:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '700'
    lineHeight: '1.2'
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  base: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 48px
  container-margin: 32px
  gutter: 16px
---

## Brand & Style

This design system is built for deep work and high-level productivity. It draws heavily from the "Notion" aesthetic—utilizing a strictly functional, minimalist approach that prioritizes content over interface decoration. The brand personality is intellectual, reliable, and unobtrusive, acting as a quiet canvas for the user’s thoughts and data.

The visual style is a blend of **Minimalism** and **Modern Corporate**, focusing on structural integrity. It avoids the "digital-ness" of gradients and heavy shadows in favor of a tactile, paper-like experience. The interface should feel like a high-end physical notebook: intentional, premium, and calm.

Key tenets:
- **Clarity over Visuals:** If an element doesn't serve a functional purpose, it is removed.
- **Editorial Influence:** Heavy reliance on classic typographic scales to create hierarchy.
- **Information Density:** High, but managed through generous whitespace and strict alignment.

## Colors

The palette is predominantly monochromatic to minimize cognitive load. The "off-white" neutral is used for sidebars and secondary containers to provide a subtle distinction from the main workspace.

- **Primary:** Deep carbon black, used for typography and high-emphasis icons.
- **Secondary (Accent):** A muted, professional blue. Used sparingly for primary actions, active states, and links.
- **Neutral/Background:** Pure white for the primary canvas; a warm light gray (#F7F6F3) for structural elements.
- **Borders:** A consistent, low-contrast gray (#E9E9E7) used for all structural divisions.

## Typography

This design system uses a singular font stack, **Inter**, to maintain a systematic and utilitarian feel. Hierarchy is achieved through significant variations in size and weight rather than font switching.

- **Headlines:** Set with tight tracking and heavy weights. They should feel grounded and "authoritative."
- **Body Text:** Optimized for long-form reading with a generous line height (1.6x). 
- **Labels:** Used for metadata and UI controls. Small caps or increased letter spacing are used for the smallest labels to maintain legibility.

## Layout & Spacing

The layout follows a **Fixed-Fluid Hybrid** model. Navigation and sidebars are fixed-width, while the main content area is fluid with a maximum readable width of 900px to ensure line lengths remain optimal.

- **Grid:** A 12-column grid is used for complex dashboards, but most "page" views rely on a single-column stack with dynamic padding.
- **Rhythm:** A strict 4px baseline grid ensures vertical harmony.
- **Whitespace:** Emphasize "macro-whitespace" (between sections) to allow the UI to breathe. Content groups should be clearly separated by at least 48px on desktop.
- **Mobile:** Margins scale down to 16px. Sidebars transform into bottom sheets or full-screen overlays.

## Elevation & Depth

This design system rejects traditional shadows in favor of **Tonal Layers** and **Low-contrast Outlines**.

1.  **Level 0 (Base):** The main canvas, pure white.
2.  **Level 1 (Sub-surface):** Light gray (#F7F6F3) used for sidebars or "sunken" areas like code blocks or empty states.
3.  **Level 2 (Overlay):** Floating menus and tooltips use a 1px border (#E9E9E7). If a shadow is absolutely required for focus (e.g., a modal), use a very soft, 10% opacity black shadow with a 20px blur and no offset.

Depth is communicated via layering and borders rather than light sources. Components should feel like they are cut from the same sheet of paper.

## Shapes

The shape language is disciplined and geometric. 

- **Radius:** A standard **4px** (`soft`) corner radius is applied to buttons, input fields, and small cards. 
- **Large Elements:** Larger containers (like modals) may use **8px**, but never exceed this.
- **Interactive States:** Hover states should be indicated by a subtle background color shift (e.g., White to #F2F2F2) rather than a shape change.
- **Icons:** Use simple, 2px stroke weight line icons. Avoid filled icons unless indicating an active toggle state.

## Components

### Buttons
- **Primary:** Solid black background, white text. 4px radius. No gradient.
- **Secondary:** Transparent background, 1px border (#E9E9E7), black text.
- **Tertiary/Ghost:** No border or background. Becomes light gray on hover.

### Input Fields
- Flat white background with a 1px gray border. On focus, the border changes to the accent blue or a thicker black. Labels should be placed above the field in `label-sm` style.

### Cards
- Avoid shadows. Use a 1px border to define the card boundary. Use `spacing.md` for internal padding.

### Lists & Navigation
- Sidebars use `body-md` for items. Active states are indicated by a subtle background fill (#E9E9E7) and a 2px vertical "pill" indicator in the accent color on the left edge.

### Chips/Tags
- Small, rectangular with 2px radius. Light gray background with dark gray text. Minimal padding (2px 8px).

### Checkboxes
- Square, 16px x 16px. When checked, the background is the accent blue with a white checkmark.