---
name: Editorial Precision
colors:
  surface: '#111111'
  surface-dim: '#131313'
  surface-bright: '#3a3939'
  surface-container-lowest: '#0e0e0e'
  surface-container-low: '#1c1b1b'
  surface-container: '#201f1f'
  surface-container-high: '#2a2a2a'
  surface-container-highest: '#353534'
  on-surface: '#e5e2e1'
  on-surface-variant: '#d0c5b2'
  inverse-surface: '#e5e2e1'
  inverse-on-surface: '#313030'
  outline: '#99907e'
  outline-variant: '#4d4637'
  surface-tint: '#e6c364'
  primary: '#e6c364'
  on-primary: '#3d2e00'
  primary-container: '#c9a84c'
  on-primary-container: '#503d00'
  inverse-primary: '#755b00'
  secondary: '#e4c27d'
  on-secondary: '#3f2e00'
  secondary-container: '#5c460b'
  on-secondary-container: '#d5b470'
  tertiary: '#e2c469'
  on-tertiary: '#3c2f00'
  tertiary-container: '#c5a951'
  on-tertiary-container: '#4e3e00'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#ffe08f'
  primary-fixed-dim: '#e6c364'
  on-primary-fixed: '#241a00'
  on-primary-fixed-variant: '#584400'
  secondary-fixed: '#ffdf9d'
  secondary-fixed-dim: '#e4c27d'
  on-secondary-fixed: '#251a00'
  on-secondary-fixed-variant: '#5a4308'
  tertiary-fixed: '#ffe084'
  tertiary-fixed-dim: '#e2c468'
  on-tertiary-fixed: '#231b00'
  on-tertiary-fixed-variant: '#574500'
  background: '#131313'
  on-background: '#e5e2e1'
  surface-variant: '#353534'
  elevated: '#1A1A1A'
  border: '#2A2A2A'
  border-strong: '#3A3A3A'
  text-primary: '#F0EFE9'
  text-secondary: '#888880'
  text-muted: '#555550'
  gold-mist: rgba(201,168,76,0.08)
  status-high: '#16A34A'
  status-amber: '#D97706'
  status-low: '#DC2626'
  status-critical: '#991B1B'
  editor-bg: '#FAFAF8'
typography:
  display-xl:
    fontFamily: Playfair Display
    fontSize: 72px
    fontWeight: '700'
    lineHeight: '1.1'
    letterSpacing: -0.02em
  display-lg:
    fontFamily: Playfair Display
    fontSize: 48px
    fontWeight: '700'
    lineHeight: '1.15'
    letterSpacing: -0.02em
  headline-xl:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '700'
    lineHeight: '1.25'
  headline-xl-mobile:
    fontFamily: Inter
    fontSize: 28px
    fontWeight: '700'
    lineHeight: '1.25'
  headline-lg:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.3'
  body-lg:
    fontFamily: Inter
    fontSize: 17px
    fontWeight: '400'
    lineHeight: '1.65'
  body-md:
    fontFamily: Inter
    fontSize: 15px
    fontWeight: '400'
    lineHeight: '1.6'
  label-lg:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '500'
    lineHeight: '1.4'
    letterSpacing: 0.04em
  label-sm:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '500'
    lineHeight: '1.4'
    letterSpacing: 0.08em
  code-md:
    fontFamily: JetBrains Mono
    fontSize: 14px
    fontWeight: '400'
    lineHeight: '1.6'
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  base: 4px
  sidebar-left: 280px
  sidebar-right: 300px
  editor-max-width: 720px
  editor-gutter: 40px
  container-gap: 24px
  panel-padding: 20px
---

## Brand & Style

This design system embodies the concept of "Editorial Precision"—a bridge between high-stakes technical auditing and elite journalistic clarity. It is designed for professional environments where accuracy is paramount, such as legal, medical, and engineering AI analysis. The brand personality is authoritative, restrained, and sophisticated.

The visual style is **Minimalist with High-Contrast accents**. It utilizes a "Cinematic Dark" foundation to reduce visual noise, focusing the user's attention on document content and data-rich visualizations. It avoids the playfulness of neobrutalism or the softness of neomorphism, opting instead for sharp architectural lines, rigid grids, and purposeful "gold moments" that signify brand value and system intelligence.

## Colors

The palette is anchored by "The Void" (`#0A0A0A`), providing a deep, non-distracting canvas. Gold serves as the primary functional accent, used sparingly to highlight active states, brand presence, and critical intelligence.

- **Primary Gold**: Reserved for high-priority interactive elements and brand signifiers.
- **Surface Tiers**: Use `surface` for standard panels and `elevated` for floating elements like modals or dropdowns to create depth without shadows.
- **Editorial Mode**: When users enter the document editor, the system transitions to a surgical light mode (`editor-bg`) to ensure maximum legibility for long-form text analysis.
- **Semantic Heatmapping**: A specialized four-tier status system (Green, Amber, Red, Critical) is used exclusively for confidence scoring and risk assessment.

## Typography

The typographic hierarchy is built on contrast between editorial elegance and technical utility. 

- **Playfair Display**: Used exclusively for brand moments, wordmarks, and high-level page heroes. It injects a sense of prestige.
- **Inter**: The workhorse for all UI elements, labels, and standard document text. It is optimized for clarity and density.
- **JetBrains Mono**: Used for system logs, code snippets, and AI-generated prompts.
- **Case Usage**: Use sentence case for almost all UI labels to maintain a professional tone. Reserve uppercase only for `label-sm` (metadata and table headers) to provide structural anchoring.

## Layout & Spacing

The layout follows a **Fixed Three-Panel Grid** for the core application, ensuring a consistent environment for complex analysis.

- **Panel Structure**: A 280px navigation/intelligence sidebar on the left, a 300px analysis sidebar on the right, and a flexible central document area.
- **Editorial Constraint**: The document editor is strictly limited to a `720px` max-width to maintain optimal line length for reading. It includes a `40px` left gutter dedicated to paragraph numbers and metadata badges.
- **Rhythm**: All spacing is based on a 4px grid. Standard containers use a 24px gap, while internal panel components use 20px padding to create a dense but breathable information architecture.

## Elevation & Depth

This system avoids traditional drop shadows, which can feel muddy in dark interfaces. Depth is instead conveyed through **Tonal Layering** and **Atmospheric Effects**.

- **Surface Tiering**: Background depth is achieved by moving from `#0A0A0A` (lowest) to `#111111` (primary surface) to `#1A1A1A` (interaction/elevated layer).
- **Hard Borders**: Use `1px` borders (`#2A2A2A`) to define component boundaries. 
- **Focus States**: Instead of shadows, use a `2px` gold ring or a subtle `gold-glow` (`rgba(201,168,76,0.15)`) box-shadow for active inputs.
- **Glassmorphism**: A `12px` backdrop blur is applied strictly to the navigation bar and modals to maintain a sense of context within the application's layered environment.

## Shapes

Shapes are disciplined and functional. The system uses a **Soft** roundedness level to take the edge off the high-contrast palette without feeling "bubbly."

- **6px (Standard)**: Applied to buttons, inputs, and small interactive chips.
- **12px (Container)**: Applied to panels, cards, and the main editor container.
- **16px (Display)**: Used for landing page feature cards or large hero imagery.
- **Pill**: Reserved strictly for status badges (e.g., Confidence scores) and avatars.

## Components

### Buttons
- **Primary**: Solid Gold (`#C9A84C`) with Dark Text. 1px shift upward on hover.
- **Secondary**: Transparent background with a strong border (`#3A3A3A`) and text-primary.
- **Tertiary**: Ghost style with text-secondary, turning text-primary on hover.

### Inputs & Selects
- Background: `#111111`. Border: `#2A2A2A`.
- Active State: Border changes to Gold with a subtle `gold-glow` inner shadow.
- Metadata labels appear in `label-sm` above the field.

### Chips & Badges
- **Confidence Chips**: Pill-shaped with a background opacity of 15% of the semantic color (e.g., Status-High Green) and 100% opacity text.
- **Domain Chips**: Use specific domain colors (Legal, Medical, Code) as left-aligned 2px accents within the chip.

### Cards
- Border: 1px solid `#2A2A2A`.
- Metric Cards: Include a 2px top border in `gold-primary` to denote brand value.
- Feature Cards: Use a 16px radius and `elevated` background.

### Document Editor
- Background: `#FAFAF8`. Text: `#0A0A0A`.
- **The Heatmap**: Highlighted text spans within the editor use the semantic palette at 20% opacity for backgrounds, with corresponding solid 2px underlines for the "Scan" animation.

### Radar Visualization
- A 220px SVG radial chart using the `gold-primary` for the sweep arm and domain-specific colors for the data axes.