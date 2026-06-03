---
name: Government Intelligence Framework
colors:
  surface: '#f7fafd'
  surface-dim: '#d7dadd'
  surface-bright: '#f7fafd'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f1f4f7'
  surface-container: '#ebeef1'
  surface-container-high: '#e5e8eb'
  surface-container-highest: '#e0e3e6'
  on-surface: '#181c1e'
  on-surface-variant: '#424751'
  inverse-surface: '#2d3133'
  inverse-on-surface: '#eef1f4'
  outline: '#737782'
  outline-variant: '#c2c6d3'
  surface-tint: '#295ea8'
  primary: '#003e80'
  on-primary: '#ffffff'
  primary-container: '#1e56a0'
  on-primary-container: '#b4cdff'
  inverse-primary: '#aac7ff'
  secondary: '#53606a'
  on-secondary: '#ffffff'
  secondary-container: '#d6e4f0'
  on-secondary-container: '#596670'
  tertiary: '#715d00'
  on-tertiary: '#ffffff'
  tertiary-container: '#cba800'
  on-tertiary-container: '#4d3e00'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#d6e3ff'
  primary-fixed-dim: '#aac7ff'
  on-primary-fixed: '#001b3e'
  on-primary-fixed-variant: '#00458d'
  secondary-fixed: '#d6e4f0'
  secondary-fixed-dim: '#bac8d4'
  on-secondary-fixed: '#101d26'
  on-secondary-fixed-variant: '#3b4852'
  tertiary-fixed: '#ffe177'
  tertiary-fixed-dim: '#ebc300'
  on-tertiary-fixed: '#231b00'
  on-tertiary-fixed-variant: '#554500'
  background: '#f7fafd'
  on-background: '#181c1e'
  surface-variant: '#e0e3e6'
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
  headline-sm:
    fontFamily: Hanken Grotesk
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
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
    fontSize: 13px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.02em
  headline-lg-mobile:
    fontFamily: Hanken Grotesk
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 30px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base-unit: 4px
  container-padding: 24px
  gutter: 16px
  margin-sm: 8px
  margin-md: 16px
  margin-lg: 32px
---

## Brand & Style

The design system is engineered for the Rwanda Revenue Authority’s Strategic Intelligence & Investigation Division. The visual identity reflects **authority, high security, and meticulous efficiency**. It serves a professional audience of investigators and analysts who require a high-density, low-friction interface for complex data processing.

The chosen style is **Modern Corporate**. It prioritizes clarity and functional hierarchy over decorative elements. By utilizing a restrained color palette and structured information density, the UI establishes a sense of institutional permanence and technical sophistication.

**Key Principles:**
- **Incorruptibility:** Sharp, clear typography and high-contrast labels ensure data is never misinterpreted.
- **Efficiency:** A compact spacing model allows for large volumes of investigative data to be visible without excessive scrolling.
- **Trust:** Subtle shadows and soft-lit backgrounds create a stable, non-fatiguing environment for long-duration analytical work.

## Colors

The palette is anchored by **RRA Blue (#1E56A0)**, representing stability and official authority. This is complemented by a range of technical greys and whites to maintain a clean, high-legibility workspace.

- **Primary (RRA Blue):** Reserved for primary actions, active navigation states, and key branding moments.
- **Secondary (Sky Tint):** Used for subtle backgrounds, row highlighting, and soft container fills to reduce visual noise.
- **Tertiary (Alert Gold):** A functional accent used sparingly for caution states or highlighting high-priority investigative flags.
- **Neutral Surface:** A light grey-blue base (`#F4F7FA`) replaces pure white to reduce eye strain during extended system use.
- **Status Colors:** Standardized Success (Emerald), Error (Crimson), and Warning (Amber) are used for data validation and system alerts.

## Typography

This design system utilizes **Hanken Grotesk** as its primary typeface. It offers a contemporary, sharp geometric structure that remains highly legible in dense data tables. For technical identifiers, case numbers, and system logs, **JetBrains Mono** is employed to provide a distinct visual "code" for sensitive data strings.

- **Headlines:** Bold and concise. Used for module titles and case headings.
- **Body:** Sized at 14px for standard reports to balance density and readability.
- **Labels:** Monospaced and slightly tracked out for form labels and status badges, emphasizing the technical nature of the investigation system.

## Layout & Spacing

The system follows a **Fixed-Fluid Hybrid** model. While the sidebar and utility panels remain fixed to provide constant access to investigation tools, the main content area utilizes a 12-column fluid grid.

- **Desktop (1440px+):** 12 columns, 24px margins, 16px gutters.
- **Tablet (768px - 1439px):** 8 columns, 16px margins, 16px gutters.
- **Mobile (<767px):** 4 columns, 16px margins, 12px gutters.

The spacing rhythm is built on a 4px baseline grid. Components use `16px` (4 units) as the standard internal padding to maintain a professional, compact appearance suitable for data-heavy dashboards.

## Elevation & Depth

Hierarchy is established through **Tonal Layering** and **Soft Ambient Shadows**.

1. **Level 0 (Base):** Neutral surface color (`#F4F7FA`).
2. **Level 1 (Cards/Panels):** Pure white background with a very soft, diffused shadow (0px 2px 8px rgba(0,0,0,0.05)).
3. **Level 2 (Modals/Overlays):** White background with a more pronounced shadow and a 1px border in a light grey-blue to define the boundary against the backdrop.

**Outlines:** Inputs and secondary buttons use a subtle 1px border (`#D1D9E0`) rather than shadows to maintain a flat, structured look.

## Shapes

The shape language is **Rounded**, strike a balance between modern software aesthetics and institutional formality.

- **Primary Components:** Buttons, inputs, and cards use a `0.5rem` (8px) radius.
- **Nested Elements:** Internal elements like status chips or small tags use a `0.25rem` (4px) radius to maintain visual harmony.
- **Icons:** Should follow a 2px stroke weight with slightly rounded caps and joins to match the component radius.

## Components

### Buttons
- **Primary:** Solid RRA Blue with white text. High contrast, 8px radius.
- **Secondary:** Transparent with RRA Blue border and text. Used for non-destructive actions.
- **Ghost:** No background or border. Used for utility actions in toolbars.

### Input Fields
- **Default State:** Light grey border with a 4px left-hand color accent (RRA Blue) on focus to indicate active entry.
- **Icons:** Leading icons are used for data types (e.g., User ID, Case Number).

### Data Tables (Key Component)
- **Header:** Darker grey background with uppercase monospaced labels.
- **Rows:** Alternating zebra striping using the Secondary color (`#D6E4F0`) at 20% opacity.
- **Hover:** Active row highlighting with a subtle 2px primary blue left border.

### Status Chips
- High-contrast text on a desaturated background (e.g., Dark Green text on Light Green background) to indicate case status: *Open, Pending, Under Review, Closed*.

### Investigation Cards
- Summary cards for case files should feature a clear header, a monospaced ID tag in the top right, and a "last modified" timestamp in the footer.