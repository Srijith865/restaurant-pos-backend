---
name: Culinary Precision System
colors:
  surface: '#f9f9ff'
  surface-dim: '#cfdaf2'
  surface-bright: '#f9f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f0f3ff'
  surface-container: '#e7eeff'
  surface-container-high: '#dee8ff'
  surface-container-highest: '#d8e3fb'
  on-surface: '#111c2d'
  on-surface-variant: '#414846'
  inverse-surface: '#263143'
  inverse-on-surface: '#ecf1ff'
  outline: '#727976'
  outline-variant: '#c1c8c5'
  surface-tint: '#47645d'
  primary: '#16332d'
  on-primary: '#ffffff'
  primary-container: '#2d4a43'
  on-primary-container: '#99b9b0'
  inverse-primary: '#adcdc4'
  secondary: '#505f76'
  on-secondary: '#ffffff'
  secondary-container: '#d0e1fb'
  on-secondary-container: '#54647a'
  tertiary: '#2b2f31'
  on-tertiary: '#ffffff'
  tertiary-container: '#424547'
  on-tertiary-container: '#b0b2b4'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#c9e9e0'
  primary-fixed-dim: '#adcdc4'
  on-primary-fixed: '#02201a'
  on-primary-fixed-variant: '#2f4c45'
  secondary-fixed: '#d3e4fe'
  secondary-fixed-dim: '#b7c8e1'
  on-secondary-fixed: '#0b1c30'
  on-secondary-fixed-variant: '#38485d'
  tertiary-fixed: '#e0e3e5'
  tertiary-fixed-dim: '#c4c7c9'
  on-tertiary-fixed: '#191c1e'
  on-tertiary-fixed-variant: '#444749'
  background: '#f9f9ff'
  on-background: '#111c2d'
  surface-variant: '#d8e3fb'
typography:
  headline-lg:
    fontFamily: Hanken Grotesk
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Hanken Grotesk
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Hanken Grotesk
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
  body-lg:
    fontFamily: Hanken Grotesk
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Hanken Grotesk
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-md:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.05em
  headline-lg-mobile:
    fontFamily: Hanken Grotesk
    fontSize: 26px
    fontWeight: '700'
    lineHeight: 32px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 40px
  gutter: 16px
  margin-mobile: 16px
  margin-desktop: 32px
---

## Brand & Style

The design system is a professional, minimalist framework tailored for high-stakes restaurant environments where clarity and speed are paramount. It draws inspiration from the structured utility of Notion and the refined precision of professional creative tools.

The visual style is **Corporate / Modern** with a lean toward **Minimalism**. It prioritizes high-quality functional aesthetics: generous whitespace to reduce cognitive load during busy shifts, subtle hair-line borders for structural definition, and a sophisticated color palette that feels premium yet remains unobtrusive. The goal is to evoke a sense of calm, organized efficiency, moving away from the "toy-like" vibrant colors of standard POS systems toward a "pro-tool" workspace.

## Colors

The palette is anchored in high-end neutrals to ensure content and data hierarchy take center stage.

- **Primary:** A muted Forest Green (`#2D4A43`), used for primary actions, active states, and brand identifiers.
- **Surface:** The background utilizes an off-white/slate tint (`#F8FAFC`) to reduce eye strain compared to pure white.
- **Text:** Deep Slate (`#1E293B`) provides high contrast for legibility, while a secondary Slate (`#64748B`) handles metadata and captions.
- **Borders:** Subtle gray borders (`#E2E8F0`) are used instead of heavy shadows to define structure, mimicking the clean UI of productivity software.
- **Accents:** High-fidelity status colors (Rose for errors/occupied, Emerald for success/available) are used sparingly but clearly.

## Typography

Typography centers on **Hanken Grotesk** for its sharp, contemporary geometry and exceptional legibility in dense lists. For technical data—such as table numbers, prices, and PIN inputs—**JetBrains Mono** is introduced to provide a "technical precision" feel.

Hierarchy is strictly enforced through weight and color rather than just size. Headlines use tighter letter spacing for a premium "editorial" look. Labels are set in uppercase monospaced type to clearly distinguish metadata from primary content.

## Layout & Spacing

This design system employs a **Fluid Grid** with a baseline 4px rhythm. 

- **Mobile:** A single or 2-column layout with 16px side margins. 
- **Tablet/Desktop:** A multi-pane layout (Side navigation, Category Scroll, Item Grid, and Order Summary).
- **Density:** Elements are given room to "breathe," but interactive targets (buttons, list items) maintain a minimum height of 48px to ensure ease of use in fast-paced environments.

Containers use consistent internal padding (usually `md` or 16px) to maintain a cohesive alignment across different screen modules.

## Elevation & Depth

Hierarchy is established primarily through **Tonal Layers** and **Subtle Outlines** rather than heavy shadows.

- **Level 0 (Base):** Background color (`#F8FAFC`).
- **Level 1 (Cards/Inputs):** White surface with a 1px border (`#E2E8F0`). No shadow.
- **Level 2 (Modals/Popovers):** White surface with a very soft, diffused shadow (0px 4px 20px rgba(0,0,0,0.05)) to suggest floating without feeling heavy.
- **Interactions:** Hover or pressed states use a subtle background shift (e.g., from White to `#F1F5F9`) rather than a depth change.

## Shapes

The shape language is **Rounded**, using an 8px base radius for standard components (buttons, input fields, cards). This provides a friendly, modern feel that contrasts with the strict grid, making the app feel accessible.

- **Standard (8px):** Primary buttons, cards, and text inputs.
- **Large (16px):** Main containers like the "Current Order" sheet or Modal dialogs.
- **Pill:** Used exclusively for status indicators (e.g., "Available" chips) to differentiate them from actionable buttons.

## Components

- **Buttons:** 
    - *Primary:* Solid Forest Green with white text. 8px radius.
    - *Secondary:* Ghost style; 1px gray border with Slate text.
- **Input Fields:** Minimalist style with a 1px border. On focus, the border transitions to Forest Green with a subtle 2px outer glow. Labels are placed above the field in `label-md` (Monospace).
- **Cards (Menu Items):** White background, 1px border. Price is highlighted in Forest Green. The "Add" icon is a simple, refined '+' within a circular treatment.
- **Table Grid:** Instead of solid blocks of color, tables use a 1px border and a small colored indicator (dot or corner accent) to show status, maintaining a clean whitespace look.
- **Modals:** Centered with a semi-transparent backdrop blur (10px). Large 16px corner radius.
- **Chips:** Used for categories. Active categories use the Forest Green background; inactive ones use a light gray border and slate text.
- **Order List:** High-contrast list items with subtle dividers. Quantities are highlighted in a light gray box for quick scanning.