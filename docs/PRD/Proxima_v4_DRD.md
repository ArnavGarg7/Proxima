# PROXIMA v4.0
## Design Requirements Document
**For Google Stitch AI · Pages 2–10**
**Engineered by Arnav Garg · 2026**

---

## 1. Design Philosophy — Editorial Precision

Proxima v4 abandons Technical Brutalism entirely. The new design language is **Editorial Precision** — the visual identity of a premium professional tool that belongs on the same screen as Bloomberg Terminal, Linear, and Stripe Dashboard.

The guiding principle: **every pixel earns its place through utility**. Nothing decorative. Nothing gratuitous. Beauty emerges from perfect proportion, restrained color, and purposeful motion.

**Reference points:**
- Stripe Dashboard: clean data density without coldness
- Linear: dark mode done with genuine sophistication
- Rabobank / Goldman Sachs internal tools: trusted by professionals
- The Economist editorial layout: type-first hierarchy

**What this means in practice:**
- Color is nearly absent from the base UI — black, white, grey
- Gold appears *only* at moments of meaning: active states, key data, brand accents
- Typography does all the heavy lifting — size, weight, and spacing create hierarchy
- Spacing is generous — content breathes
- Motion is subtle and purposeful — never decorative

---

## 2. Color System

### 2.1 Primary Palette

| Token | Value | Usage |
|-------|-------|-------|
| `--color-void` | `#0A0A0A` | Primary background (dark surfaces) |
| `--color-surface` | `#111111` | Secondary dark surface (cards, panels) |
| `--color-elevated` | `#1A1A1A` | Elevated surface (modals, dropdowns) |
| `--color-border` | `#2A2A2A` | Subtle borders on dark |
| `--color-border-strong` | `#3A3A3A` | Stronger borders, dividers |
| `--color-text-primary` | `#F0EFE9` | Primary text on dark |
| `--color-text-secondary` | `#888880` | Secondary text, labels, captions |
| `--color-text-muted` | `#555550` | Muted text, placeholders |

### 2.2 Gold Accent System

| Token | Value | Usage |
|-------|-------|-------|
| `--gold-primary` | `#C9A84C` | Primary gold — active states, brand moments |
| `--gold-bright` | `#E5C76B` | Bright gold — hover states, highlights |
| `--gold-dim` | `#8A6F32` | Dim gold — subtle accents |
| `--gold-mist` | `rgba(201,168,76,0.08)` | Gold mist — active backgrounds |
| `--gold-glow` | `rgba(201,168,76,0.15)` | Gold glow — focus rings, hovers |

### 2.3 Light Mode (Document Editor)

| Token | Value | Usage |
|-------|-------|-------|
| `--light-bg` | `#FAFAF8` | Document editor background |
| `--light-surface` | `#FFFFFF` | Cards on light |
| `--light-border` | `#E8E8E4` | Borders on light |
| `--light-text` | `#0A0A0A` | Text on light |
| `--light-text-secondary` | `#666660` | Secondary text on light |

### 2.4 Semantic Colors (Confidence Heatmap Only)

| Token | Value | Usage |
|-------|-------|-------|
| `--conf-high` | `#16A34A` | Confidence 80–100% — trusted |
| `--conf-amber` | `#D97706` | Confidence 60–79% — review |
| `--conf-low` | `#DC2626` | Confidence 40–59% — questionable |
| `--conf-critical` | `#991B1B` | Confidence 0–39% — regenerate |

### 2.5 Domain Colors (Radar + Chips Only)

| Token | Value | Usage |
|-------|-------|-------|
| `--domain-code` | `#4ADE80` | Code domain (muted green) |
| `--domain-medical` | `#60A5FA` | Medical domain (muted blue) |
| `--domain-legal` | `#C9A84C` | Legal domain (gold — matches brand) |

### 2.6 Color Rules (Non-Negotiable)

1. Gold appears on: active nav links, active tab underlines, CTAs, domain detection chips (legal), focus rings, key metric values, brand wordmark
2. All other UI: black/white/grey only
3. Confidence colors appear ONLY on completed text segments in the editor
4. Domain colors appear ONLY on the radar chart and domain chips
5. No gradients on UI elements — flat colors only
6. Background: always `--color-void` for dark sections, `--light-bg` for document areas

---

## 3. Typography System

### 3.1 Typefaces

| Role | Typeface | Fallback |
|------|---------|---------|
| Display / Wordmark | `Playfair Display` | Georgia, serif |
| Headings (large) | `Inter` 700 | system-ui, sans-serif |
| Body / UI | `Inter` 400/500 | system-ui, sans-serif |
| Labels / Nav | `Inter` 500 | system-ui, sans-serif |
| Monospace / Code | `JetBrains Mono` | Fira Code, monospace |
| Data / Metrics | `Inter` 700 | system-ui, sans-serif |

**Google Fonts import:**
```
Playfair Display: 400, 600, 700
Inter: 300, 400, 500, 600, 700
JetBrains Mono: 400, 500
```

### 3.2 Type Scale

| Name | Size | Weight | Line Height | Usage |
|------|------|--------|-------------|-------|
| `display-xl` | 72px | 700 | 1.1 | Landing hero (PROXIMA wordmark) |
| `display-lg` | 48px | 700 | 1.15 | Page heroes |
| `heading-xl` | 32px | 700 | 1.25 | Section titles |
| `heading-lg` | 24px | 600 | 1.3 | Card titles, panel headers |
| `heading-md` | 20px | 600 | 1.35 | Sub-section titles |
| `body-lg` | 17px | 400 | 1.65 | Document editor text |
| `body-md` | 15px | 400 | 1.6 | Standard body copy |
| `body-sm` | 13px | 400 | 1.5 | Captions, helpers |
| `label-lg` | 13px | 500 | 1.4 | Form labels, nav links |
| `label-sm` | 11px | 500 | 1.4 | Metadata, timestamps |
| `mono` | 14px | 400 | 1.6 | Code, system prompts |

### 3.3 Typography Rules

- Playfair Display ONLY for the PROXIMA wordmark and landing page display headline
- All other text: Inter
- Code, system prompts, JSON: JetBrains Mono
- Letter spacing: -0.02em on display sizes, 0 on body, 0.04em on labels
- No uppercase labels — sentence case throughout
- Maximum line length: 680px (optimal reading measure)

---

## 4. Component Design System

### 4.1 Buttons

```
PRIMARY:
  Background: --gold-primary (#C9A84C)
  Text: #0A0A0A (black)
  Border: none
  Border-radius: 6px
  Padding: 10px 20px
  Font: Inter 500, 14px
  Hover: background --gold-bright (#E5C76B), subtle lift: translateY(-1px)
  Active: translateY(0), brightness(0.95)
  Focus: outline 2px --gold-primary, offset 2px

SECONDARY:
  Background: transparent
  Text: --color-text-primary
  Border: 1px solid --color-border-strong
  Border-radius: 6px
  Hover: background --color-elevated, border --color-text-secondary

GHOST:
  Background: transparent
  Text: --color-text-secondary
  Border: none
  Hover: text --color-text-primary, background rgba(255,255,255,0.04)

DANGER:
  Background: #7F1D1D (dark red)
  Text: #FCA5A5
  Border: 1px solid #991B1B

NOTE: Buttons have 6px border-radius — NOT zero.
This is not neobrutalism. This is refined professional UI.
```

### 4.2 Input Fields

```
Standard Input:
  Background: --color-surface (#111111)
  Border: 1px solid --color-border (#2A2A2A)
  Border-radius: 6px
  Padding: 10px 14px
  Font: Inter 15px, --color-text-primary
  Placeholder: --color-text-muted
  Focus: border-color --gold-primary, box-shadow 0 0 0 3px --gold-glow
  Hover: border-color --color-border-strong

Textarea:
  Same as input but min-height: 200px, resize: vertical
  Line-height: 1.65

Document Editor Textarea:
  Background: --light-bg (#FAFAF8)
  Border: none
  Font: Inter 17px, --light-text
  Focus: no border change, no shadow — invisible editor feel
```

### 4.3 Cards

```
Standard Card:
  Background: --color-surface (#111111)
  Border: 1px solid --color-border (#2A2A2A)
  Border-radius: 12px
  Padding: 24px
  Hover: border-color --color-border-strong, background --color-elevated

Metric Card:
  Background: --color-surface
  Border: 1px solid --color-border
  Border-radius: 12px
  Top accent: 2px solid --gold-primary (at top of card only)
  Value: Inter 700, 36px, --color-text-primary
  Label: Inter 500, 12px, --color-text-secondary, uppercase, tracked

Feature Card (landing):
  Background: --color-surface
  Border: 1px solid --color-border
  Border-radius: 16px
  Hover: border-color --gold-dim
  Icon background: --gold-mist, 40px circle, icon in --gold-primary
```

### 4.4 Navigation Bar

```
Background: rgba(10,10,10,0.85) — slightly transparent, backdrop-blur: 12px
Border-bottom: 1px solid --color-border
Height: 60px
Padding: 0 32px

Left: PROXIMA wordmark — Playfair Display 600, 20px, --color-text-primary
  Gold accent: the 'X' in PROXIMA rendered in --gold-primary

Center: Nav links — Inter 500, 14px, --color-text-secondary
  Spacing between links: 32px
  Hover: --color-text-primary
  Active: --color-text-primary with 2px --gold-primary underline

Right: 
  Unauthenticated: "Sign In" ghost button
  Authenticated: avatar circle (24px, from Google) + "Dashboard" secondary button

Mobile (<768px): hamburger → full-screen overlay nav
```

### 4.5 Sidebar Panels

```
Width: 280px (left) / 300px (right)
Background: --color-void
Border-right/left: 1px solid --color-border
No box-shadow on panels

Panel section headers:
  Font: Inter 500, 11px, --color-text-muted
  Text-transform: uppercase
  Letter-spacing: 0.08em
  Padding: 16px 20px 8px

Panel section content:
  Padding: 0 20px 16px
  Border-bottom: 1px solid --color-border (between sections)
```

### 4.6 Tables

```
Table container:
  Background: --color-surface
  Border: 1px solid --color-border
  Border-radius: 12px
  Overflow: hidden

Header row:
  Background: --color-elevated
  Font: Inter 500, 12px, --color-text-secondary, uppercase, tracked
  Padding: 12px 20px
  Border-bottom: 1px solid --color-border

Data rows:
  Font: Inter 400, 14px, --color-text-primary
  Padding: 14px 20px
  Border-bottom: 1px solid --color-border (last row: none)
  Hover: background rgba(255,255,255,0.02)

Sortable column:
  Hover: text --gold-primary, sort icon appears
  Active sort: --gold-primary with sort direction indicator
```

### 4.7 Badges / Chips

```
Domain chip:
  Background: domain-specific at 10% opacity
  Border: 1px solid domain-specific at 40% opacity
  Text: domain-specific color
  Font: Inter 500, 12px
  Border-radius: 4px
  Padding: 3px 8px

Severity badges:
  HIGH: bg #7F1D1D (10% opacity), text #FCA5A5, border #991B1B (30%)
  MEDIUM: bg #78350F (10%), text #FCD34D, border #92400E (30%)
  LOW: bg #14532D (10%), text #86EFAC, border #166534 (30%)
  INFO: bg #1E3A5F (10%), text #93C5FD, border #1D4ED8 (30%)

Status badge:
  Font: Inter 500, 11px
  Border-radius: 4px
  Padding: 2px 8px
```

---

## 5. Motion System

### 5.1 Motion Principles

Every animation in Proxima v4 follows three rules:
1. **Communicates** — motion tells the user what just happened or is happening
2. **Fast** — transitions under 300ms. Nothing lingers.
3. **Subtle** — the user shouldn't notice individual animations, only feel fluidity

### 5.2 Easing Functions

```css
--ease-out: cubic-bezier(0.0, 0.0, 0.2, 1.0)  /* Snappy exits */
--ease-in-out: cubic-bezier(0.4, 0.0, 0.2, 1.0) /* Standard transitions */
--ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1.0) /* Subtle spring for reveals */
```

### 5.3 Page Transitions

```
Route change: fade + 16px upward slide
  initial: { opacity: 0, y: 16 }
  animate: { opacity: 1, y: 0 }
  transition: { duration: 0.2, ease: --ease-out }

Tab switch (within page):
  Content fades: opacity 0 → 1 over 150ms
  No slide — just fade. Clean.
```

### 5.4 Workspace Animations

```
Domain Radar scan:
  Sweep arm: SVG line rotating 360° over 2s (linear)
  Axis values: count up as arm passes each axis
  Polygon: stroke-dashoffset draw-in over 800ms after scan
  Lock pulse: scale 0.97 → 1.02 → 1.0 over 400ms

Document scan sweep:
  1px gold horizontal line sweeps document top→bottom
  Duration: 2.5s linear
  As it passes paragraphs: brief bg flash rgba(201,168,76,0.06)
  Trailing fade: 20px gradient below the line

Completion streaming:
  Tokens: each fades in over 40ms
  Color: gold (#C9A84C) → text-primary (#F0EFE9) over 300ms
  "Typing in gold" effect

Heatmap reveal:
  Segments snap in with staggered 60ms delay
  initial: { opacity: 0, scaleY: 0.98 }
  animate: { opacity: 1, scaleY: 1 }
  transition: { duration: 0.12, ease: --ease-out }
  Colored segments: additional 200ms glow bloom after snap

Confidence pulse (critical segments):
  Box-shadow oscillates: 0 0 0 → 0 0 6px rgba(153,27,27,0.4) → 0
  Duration: 2.5s, infinite, ease-in-out
```

### 5.5 Micro-interactions

```
Button hover: translateY(-1px), 150ms ease-out
Button active: translateY(0), brightness 0.95
Card hover: border-color transition, 150ms
Input focus: gold border + glow ring, 150ms
Stat counter: count-up from 0 on viewport entry, 1.2s easeOut
Accordion open: height animate, 200ms ease-out
Toast notification: slide in from right, auto-dismiss after 3s
```

### 5.6 Floating Background Symbols

```
On dark sections (landing, sidebar backgrounds):
  15 symbols total:
    Code: { } < > ; =>
    Medical: ✚ ⚕ Rx
    Legal: ⚖ § ¶

  Each symbol:
    Position: fixed, random x/y %
    Color: rgba(240,239,233,0.03) — barely visible
    Font-size: random 20–60px
    Animation: slow drift x±25px, y±35px, rotate±10deg
    Duration: random 20–45s, infinite mirror
    Pointer-events: none
    User-select: none
```

---

## 6. Layout System

### 6.1 Grid

```
Max content width: 1280px, centered
Columns: 12, gutter 24px
Page horizontal padding: 32px desktop, 20px tablet, 16px mobile

Section vertical spacing:
  Hero: 100vh
  Sections: 96px vertical padding (desktop), 64px (tablet), 48px (mobile)
```

### 6.2 Workspace Layout

```
Three-panel layout (full height below navbar):
  Left: 280px, fixed
  Center: flex-1, scrollable
  Right: 300px, fixed

Panel min-height: calc(100vh - 60px)
Center max-content-width: 720px (centered in panel)

Document editor layout:
  Left margin: 44px (paragraph numbers + chips)
  Content: Inter 17px, max-width 720px
  Right padding: 48px
```

### 6.3 Spacing Scale

```
4px base unit
Scale: 4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96, 128px

Component padding standards:
  Cards: 24px
  Panels: 20px
  Inputs: 10px 14px
  Buttons: 10px 20px (md), 8px 16px (sm)
  Navbar: 0 32px
```

---

## 7. Page-Level Design Specifications (for Stitch)

### Page 2 — Workspace

**Three-panel dark layout:**
- Full height below 60px navbar
- Left panel (280px): dark #0A0A0A bg, 1px right border #2A2A2A
- Center (flex-1): light #FAFAF8 bg for document editor
- Right panel (300px): dark #0A0A0A bg, 1px left border #2A2A2A

**Left panel sections (top to bottom):**
1. Upload zone: dashed 1px border #2A2A2A, "Drop document here" in Inter 13px muted, accepts drag + click
2. Domain Radar (220×220px SVG): three axes CODE/MEDICAL/LEGAL, faint concentric rings, gold polygon border, axis tips in domain colors
3. Scan Document button (secondary style, full width)
4. Domain composition chips (after scan)
5. Settings section: Confidence threshold slider, Temperature slider, Max tokens input
6. Blend mode toggle: "Auto-detect" / "Manual weights"
7. Session stats (bottom): completions / avg confidence / tokens — small Inter 12px labels

**Center panel:**
- Document header bar: full-width, dark bg, domain chips + word count + confidence badge
- 44px left margin: slightly darker, paragraph numbers + domain chips post-scan
- Scrollable editor: Inter 17px, #0A0A0A text on #FAFAF8 bg
- Completed segments: inline confidence heatmap colors
- Gold blinking cursor (2px vertical bar)
- Action bar (pinned bottom): "Complete Here" gold primary | "Scan" secondary | "Accept All" ghost | "Clear" ghost

**Right panel:**
- Overall confidence gauge (semicircle radial, gold fill)
- Segment table: color-coded badges, scrollable
- Dimension score bars (for selected segment): gold fill on dark track
- Regeneration log

---

### Page 3 — Contract Analyzer

**Layout: Two-column split (40% input / 60% output) on desktop, stacked mobile**

**Left column (input):**
- Large upload drop zone: Inter 15px, dashed border, icon
- Contract type selector: dropdown, standard input style
- Jurisdiction selector: dropdown
- "Analyze Contract" CTA (gold primary, large, full width)
- Processing state: skeleton loader + "Analyzing your contract..." text

**Right column (output — appears after analysis):**
Four accordion sections:
1. Overview: risk gauge (0–100), completeness score, parties detected as chips
2. Risk Flags: list with severity badges (HIGH/MEDIUM/LOW in red/amber/green), each expandable
3. Missing Clauses: list with priority badges (CRITICAL/RECOMMENDED/OPTIONAL)
4. Redline Suggestions: side-by-side original vs suggested, Accept/Reject per item

Export button (gold primary): "Export Redlined DOCX"

---

### Page 4 — Clinical Notes

**Layout: Two-column (input left, output right) on desktop**

**Left column:**
- Note type selector: tabs — SOAP | Discharge | Referral | Prescription | Progress | Operative
- Patient context fields (optional): age range, gender, chief complaint
- Large bullet-point textarea: "Enter your observations, findings, vitals..."
- "Generate Note" gold primary button
- Character count / estimated note length indicator

**Right column (output):**
- Structured note rendered with clear section headers
- Each section: labeled badge + content area
- Inline confidence scores per section (small percentage badges)
- "Regenerate Section" ghost button per section
- Edit mode toggle: turns output into editable textarea
- Export buttons: DOCX | PDF | Plain Text

---

### Page 5 — Code Suite

**Layout: Full width, tab navigation at top**

**Tab navigation:**
Five tabs: Code Review | Docstring Gen | README Builder | Bug Explainer | Code Completion
Active tab: gold bottom border 2px, gold text

**Code Review tab:**
- Large code input with syntax highlighting (JetBrains Mono)
- Language auto-detection badge
- "Run Review" gold primary
- Output: overall score (gauge) + line-by-line annotation list
- Each annotation: line number, severity chip, description, suggested fix

**Docstring Generator tab:**
- Code input (monospace)
- Style selector: Google / NumPy / Sphinx / JSDoc
- "Generate" button
- Side-by-side: input (left) + output with docstring (right)

**README Builder tab:**
- Form fields: project name, tech stack tags input, feature bullets, install steps
- "Build README" button
- Full markdown preview panel (right)
- Copy markdown / Download .md buttons

**Bug Explainer tab:**
- Error message input
- Code context textarea
- "Explain" button
- Output: what went wrong / why / step-by-step fix (three labeled sections)
- Code block for fix example (JetBrains Mono, dark bg)

---

### Page 6 — Document Compare

**Layout: Three sections stacked (input → side-by-side view → report)**

**Input section:**
- Two upload zones side by side: Document A (left) | Document B (right)
- Mode selector below: Legal | Medical | Code | General (segmented control)
- "Compare Documents" gold primary CTA, full width

**Side-by-side view (after comparison):**
- Document A full text (left, 50%)
- Document B full text (right, 50%)
- Synchronized scrolling
- Changed sections highlighted:
  - Deletions: red background tint on left
  - Additions: green background tint on right
  - Semantic shifts: amber on both sides
- Similarity score badge at top: "82% Similar"

**Change Report (below side-by-side):**
- Filter tabs: All Changes | Critical | Semantic | Textual
- Scrollable change list: type chip + location + original + revised + significance score
- Export comparison report (PDF)

---

### Page 7 — Template Library

**Layout: Full-width grid with sidebar filters**

**Sidebar (240px, left):**
- Search input
- Domain filter: All | Legal | Medical | Code (radio buttons)
- Category filter: checkboxes list
- Sort by: Newest | Most Used | Top Rated

**Main grid:**
- 3-column card grid (desktop), 2-column (tablet), 1-column (mobile)
- Template card: domain chip + title (Inter 600, 16px) + description (2 lines, muted) + use count + rating stars
- Card footer: "Preview" ghost + "Use Template" gold primary
- Preview: opens modal with full template content

**Template modal:**
- Full template text in read-only editor
- Domain chip, category, last updated
- "Use This Template" gold primary → loads in Workspace
- Close button (top right)

---

### Page 8 — Confidence Audit

**Layout: Input section → full audit report**

**Input section (centered, max 600px wide):**
- Document upload zone (large, prominent)
- Domain selector: Auto-detect | Code | Medical | Legal
- Depth selector: Quick | Standard | Deep (segmented control with descriptions)
- "Run Audit" gold primary, large

**Audit Report:**
Top: overall score card (large, centered) — letter grade (A–F) in 96px Inter 700, overall score, domain detected

Four dimension scorecards (2x2 grid):
- Each: score gauge + pass/fail indicator + top issues list
- Terminology Accuracy | Structural Validity | Domain Consistency | Contextual Coherence

Full document heatmap view:
- Document rendered with segment-level confidence coloring
- Color legend bar at top
- Click any segment: detail drawer slides in from right

Recommendations panel:
- Priority-sorted list: each with location / issue / suggested fix
- "Fix in Workspace" button per recommendation

Export buttons: Full PDF Report | Segment CSV | Raw JSON

---

### Page 9 — Domain Radar

**Layout: Centered single-column, focused tool**

**Input section:**
- Large centered textarea: "Paste any text to detect its domain composition"
- "Detect Domains" gold primary, large, centered

**Radar visualization (large, after detection):**
- Central radar chart: 400×400px (prominent)
- Three axes with domain labels and percentages
- Animated scan sweep on trigger
- Domain composition breakdown cards (three cards in a row below radar)
- Signal strength indicators: terms detected per domain

**Completion section:**
- Prompt textarea appears after detection
- Blend mode control: auto (detected) / manual sliders
- "Complete with Blend" gold primary
- Comparison mode: three output panels side by side (CODE / MEDICAL / LEGAL)
- Each panel: domain chip, completion text, latency badge, confidence score

---

### Page 10 — Dashboard

**Layout: Standard dashboard grid**

**Top stats row (4 metric cards):**
Total Completions | Documents Processed | Avg Confidence | Tokens Used
Card style: dark surface, gold top accent, large Inter 700 value, small muted label

**Activity section (2/3 width):**
- Line chart: daily usage last 30 days (Recharts, gold line, dark bg, minimal axes)
- Donut chart: usage by tool (beside the line chart, 1/3 width)

**Recent documents panel:**
- Table: tool | domain chip | title | timestamp | confidence | actions
- Pagination: 10 per page
- Row actions: Open | Export | Delete

**Export queue panel:**
- Table: filename | format | status | created | download
- Status chips: pending (grey) | processing (amber) | ready (green) | failed (red)
- Bulk download ZIP button

**API usage panel:**
- Horizontal progress bar: tokens used / monthly limit, gold fill
- Rate limit status indicator
- "Upgrade Plan" CTA (gold primary — non-functional stub)

**Settings panel (bottom):**
- Profile section: avatar + name + email (from Google, read-only)
- Preferences: default domain, default temperature
- Danger zone: "Delete Account" danger button

---

## 8. Stitch AI Prompt — Pages 2–10

> Copy everything between the dividers and paste into Google Stitch AI.

---

```
━━━ STITCH PROMPT START ━━━

Design a multi-page professional web application called PROXIMA.

DESIGN LANGUAGE: Editorial Precision
The UI language is premium, restrained, and professional.
Reference points: Stripe Dashboard, Linear, Goldman Sachs internal tools.
NOT neobrutalism. NOT constructivism. NOT flashy.
Beautiful through proportion, restraint, and purposeful detail.

BORDER RADIUS: 6–12px on all elements (NOT zero — this is refined professional UI)
No thick black borders. No hard offset drop shadows.
Subtle, elegant borders: 1px solid at low opacity.

COLOR PALETTE:
Background: #0A0A0A (primary dark), #111111 (surface), #1A1A1A (elevated)
Borders: #2A2A2A (subtle), #3A3A3A (strong)
Text: #F0EFE9 (primary), #888880 (secondary), #555550 (muted)
GOLD ACCENT: #C9A84C (primary), #E5C76B (hover), #8A6F32 (dim)
Gold mist background: rgba(201,168,76,0.08)
Gold glow: rgba(201,168,76,0.15)
Document editor bg: #FAFAF8 (light, warm off-white)
Light text: #0A0A0A

CONFIDENCE HEATMAP COLORS (completed text segments only):
High (80-100%): #16A34A green — no background, just subtle underline
Amber (60-79%): #D97706 amber — light amber background tint
Low (40-59%): #DC2626 red — light red background tint
Critical (0-39%): #991B1B dark red — red bg + slow pulse animation

DOMAIN COLORS (radar + chips only):
Code: #4ADE80 (muted green)
Medical: #60A5FA (muted blue)
Legal: #C9A84C (gold — matches brand accent)

TYPOGRAPHY:
Wordmark only: Playfair Display 600
All other text: Inter (300, 400, 500, 600, 700)
Monospace: JetBrains Mono
Type scale: 72px display / 48px hero / 32px section / 24px card / 20px sub / 17px editor / 15px body / 13px label / 11px meta

NAVBAR (all pages):
Height: 60px
Background: rgba(10,10,10,0.85) with backdrop-blur: 12px
Border-bottom: 1px solid #2A2A2A
Left: PROXIMA wordmark — Playfair Display 600, 20px, white. The letter X in gold (#C9A84C).
Center: Nav links — Inter 500, 14px, #888880. Hover: #F0EFE9. Active: #F0EFE9 + 2px gold underline
Links: Workspace | Analyze | Clinical | Code | Compare | Templates | Audit | Radar | Dashboard
Right (authenticated): User avatar (24px circle) + "Dashboard" secondary button

BUTTONS:
Primary: bg #C9A84C, text #0A0A0A, border-radius 6px, Inter 500 14px, padding 10px 20px
  Hover: bg #E5C76B, translateY(-1px)
Secondary: bg transparent, text #F0EFE9, border 1px solid #3A3A3A, border-radius 6px
  Hover: bg #1A1A1A
Ghost: bg transparent, text #888880, no border. Hover: text #F0EFE9
Danger: bg #7F1D1D 10% opacity, text #FCA5A5, border 1px solid #991B1B

CARDS:
bg #111111, border 1px solid #2A2A2A, border-radius 12px, padding 24px
Hover: border-color #3A3A3A, bg #1A1A1A
Metric card: same + 2px solid #C9A84C top accent line

INPUTS:
bg #111111, border 1px solid #2A2A2A, border-radius 6px, padding 10px 14px
Focus: border #C9A84C, box-shadow 0 0 0 3px rgba(201,168,76,0.15)
Placeholder: #555550

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PAGE 2 — WORKSPACE (/workspace)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Three-panel layout, full height below 60px navbar:

LEFT PANEL (280px, bg #0A0A0A, 1px right border #2A2A2A):
Upload zone at top: 120px height, dashed 1px border #2A2A2A, rounded 12px, centered "Drop document or click to upload" in Inter 13px #555550, PDF/TXT/DOCX icons below
After upload: filename chip + word count badge

Domain Radar below upload:
220×220px SVG centered
Background: faint concentric rings (25/50/75/100%) at opacity 0.1 in #3A3A3A
Three axes at 120° intervals labeled CODE (green #4ADE80) / MEDICAL (blue #60A5FA) / LEGAL (gold #C9A84C)
Filled polygon: gold border 1.5px, fill rgba(201,168,76,0.1)
Default state: equilateral triangle (equal weights)
Scan button below: "Scan Document" secondary full-width
After scan: domain chips appear (domain color bg 10%, domain color border 40%, domain color text)

Settings section (below radar):
Section header: "Settings" Inter 500 11px #555550 uppercase 0.08em tracked, padding 16px 20px 8px
Confidence threshold slider: label "Confidence threshold" + current value (%), gold thumb on dark track
Temperature slider: label "Temperature" + value, same style
Max tokens: number input, standard style, label above
Blend mode toggle: "Auto-detect" | "Manual" — segmented control, gold active

Session stats (pinned bottom of left panel):
Three mini stats in a row: completions / avg conf / tokens
Inter 500 12px #888880 labels, Inter 700 16px #F0EFE9 values

CENTER PANEL (flex-1, bg #FAFAF8 for document area):
Document header bar: 48px, bg #111111, border-bottom 1px #2A2A2A
Contains: domain chips (small) + word count (small) + average confidence badge (right-aligned)

Document editor area:
Left margin (44px): bg rgba(0,0,0,0.04), right border 1px #E8E8E4
  Paragraph numbers: Inter 500 10px #888880
  After scan: domain microchips appear in margin beside paragraphs

Main editor: Inter 17px #0A0A0A, line-height 1.7, max-width 720px, padding 32px 48px
Completed segments: inline heatmap coloring per confidence level
Blinking cursor: 2px wide, 18px tall, bg #C9A84C, blink animation 1s

Action bar (pinned bottom of center, 56px, bg #FAFAF8, border-top 1px #E8E8E4):
"Complete Here" gold primary | "Scan Document" secondary | "Accept All" ghost | "Clear" ghost
Streaming indicator: "Generating..." with small animated dots, Inter 13px gold

RIGHT PANEL (300px, bg #0A0A0A, 1px left border #2A2A2A):
Overall confidence gauge (semicircle): centered, 160px wide, gold fill arc
Percentage value: Inter 700 32px centered below gauge

Segment breakdown table:
Header: Inter 500 11px uppercase tracked, muted
Each row: truncated segment text (Inter 13px) + confidence badge (colored per level)
Scroll: max-height 300px, overflow-y scroll

Selected segment details:
Section divider: 1px #2A2A2A
Four dimension bars:
  Label: Inter 500 12px muted. Bar: 100% wide track #1A1A1A, gold fill at score%
  "Terminology Accuracy" / "Structural Validity" / "Domain Consistency" / "Contextual Coherence"

Regeneration log:
Section header + list of "Segment X: 54% → 82%" entries in Inter 13px

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PAGE 3 — CONTRACT ANALYZER (/analyze)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Page background: #0A0A0A

Top page header: "Contract Analyzer" Inter 700 32px + subtitle Inter 15px #888880

Two-column layout (40/60 split, gap 32px):

LEFT COLUMN (input, bg #111111 card, rounded 12px, 1px border #2A2A2A):
Upload drop zone: 160px, dashed border, document icon in gold, "Upload your contract" label
Supported formats: PDF, DOCX, TXT — small chips below

Contract type: labeled dropdown (NDA / Employment / Service / Partnership / Lease / Custom)
Jurisdiction: labeled dropdown (US Federal / UK / EU / India / Custom)
"Analyze Contract" gold primary, large, full width
Below: "Typical analysis: 15–30 seconds" Inter 12px muted

Processing state (while analyzing):
Replace button with progress bar (gold fill animation) + "Analyzing clauses..." text

RIGHT COLUMN (output — initially empty state with illustration):
Empty state: centered icon + "Upload a contract to see analysis" Inter 15px muted

After analysis, four accordion sections:
1. Overview Panel (expanded by default):
   Flex row: risk gauge (semi-circle, 0–100, red/amber/green depending on score) + completeness gauge
   Parties detected: chips below gauges
   
2. Risk Flags (section header with count badge):
   List items: severity chip (HIGH/MEDIUM/LOW) + clause snippet + expand arrow
   Expanded: full clause text + risk description + suggested revision in diff view
   
3. Missing Clauses (section header with count badge):
   List items: priority chip + clause name + "Why it matters" tooltip
   Expanded: template text to add, with "Insert" button
   
4. Redline Suggestions:
   Side-by-side diff: original (red strikethrough left) vs suggested (green right)
   Accept / Reject buttons per suggestion

Export bar (bottom): "Export Redlined DOCX" gold primary + "Export Report PDF" secondary

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PAGE 4 — CLINICAL NOTES (/clinical)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Page background: #0A0A0A
Page header: "Clinical Notes Generator" + subtitle

Note type selector (full-width tabs at top):
SOAP Note | Discharge Summary | Referral Letter | Prescription | Progress Note | Operative Report
Active tab: gold bottom border 2px, gold text, bg rgba(201,168,76,0.06)
Inactive: Inter 500 14px #888880

Two-column layout (50/50):

LEFT (input card):
Patient context (optional section, collapsible):
  Three fields: Age range (text) / Gender (select) / Chief complaint (text)
  Muted disclaimer: "No personally identifiable information is stored"

Observations input:
  Label: "Clinical observations" Inter 500 14px
  Large textarea: min-height 240px, Inter 15px, placeholder "Enter symptoms, vitals, findings, medications..."
  Character count below

"Generate Note" gold primary, full width, large

RIGHT (output card):
Empty: centered stethoscope icon + instruction text

After generation:
Section headers per note type (e.g., S: / O: / A: / P: for SOAP)
Each section: Inter 600 13px label + content in Inter 16px
Confidence badge per section (small, right-aligned)
"Regenerate this section" ghost button per section

Edit mode toggle: switch top-right of output card
Export row: "DOCX" | "PDF" | "Plain Text" — secondary buttons

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PAGE 5 — CODE SUITE (/code)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Page background: #0A0A0A
Page header: "Code Suite" + subtitle

Tab navigation:
Code Review | Docstring Gen | README Builder | Bug Explainer | Code Completion
Horizontal tabs, gold active indicator

CODE REVIEW TAB:
Two-panel (input left, output right):
Left: code textarea in JetBrains Mono 14px, dark bg (#111111), language detection chip above, "Run Review" gold primary
Right: overall code quality gauge (0-100) + annotated list (line number chip + severity + description + fix)

DOCSTRING GENERATOR TAB:
Input: code textarea (mono) + style selector dropdown (Google/NumPy/Sphinx/JSDoc)
Output: side-by-side — original code (left) + code with injected docstring (right, gold-highlighted lines)

README BUILDER TAB:
Left: form fields — project name, tech stack (tag input), feature bullets (dynamic list), install command
Right: live markdown preview panel (Inter 15px, proper markdown rendering)
Bottom: "Copy Markdown" ghost + "Download .md" secondary

BUG EXPLAINER TAB:
Top: error message input (monospace, red border tint on bg)
Below: code context textarea
"Explain Bug" gold primary
Output: three-section card — "What happened" / "Why it happened" / "How to fix"
Fix code block: JetBrains Mono, dark panel, copy button

CODE COMPLETION TAB:
Full workspace-like editor focused on code
Domain radar shows Code dominant
Completions in JetBrains Mono

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PAGE 6 — DOCUMENT COMPARE (/compare)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Page background: #0A0A0A

Top section: Two upload zones side by side
Left zone: "Document A" header + upload drop zone (standard style)
Right zone: "Document B" header + upload drop zone (standard style)
Between: mode selector — Legal | Medical | Code | General (segmented, centered below both zones)
"Compare Documents" gold primary, large, full width

Similarity score banner (after comparison): full-width dark panel, centered "82% Similar" in Inter 700 48px + brief summary

Side-by-side diff panel:
Left 50%: Document A text, synchronised scroll
Right 50%: Document B text, synchronised scroll
Vertical divider: 1px #2A2A2A
Deletions: bg rgba(220,38,38,0.1) on left
Additions: bg rgba(22,163,74,0.1) on right
Semantic shifts: bg rgba(217,119,6,0.1) on both

Filter tabs below: All Changes | Critical | Semantic | Textual
  Active: gold text + underline

Change list:
Cards: type chip + location (small muted) + original vs revised (diff text) + significance score badge
Critical changes: left border 2px solid #DC2626

Export: "Export Comparison Report" gold primary

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PAGE 7 — TEMPLATE LIBRARY (/templates)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Page background: #0A0A0A
Page header: "Template Library" + "50+ professional templates" subtitle

Two-column layout (240px sidebar + flex-1 main):

SIDEBAR:
Search input (full width)
Domain filter: radio — All | Legal | Medical | Code (gold active state)
Category checkboxes list (scrollable)
Sort by: select dropdown

MAIN GRID (3-column cards):
Template card: domain chip (top-left) + title Inter 600 16px + description 2-line 13px muted + use count + star rating
Card footer: "Preview" ghost + "Use Template" gold primary
Grid gap: 20px

Preview modal (full-screen overlay, dark bg):
Template content in read-only editor (Inter 15px)
Header: title + domain chip + category + last updated
Footer: "Use This Template" gold primary (large) + close

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PAGE 8 — CONFIDENCE AUDIT (/audit)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Page background: #0A0A0A

Input section (centered, max-width 640px, stacked):
Upload zone: large (200px), prominent
Domain selector: segmented control (Auto | Code | Medical | Legal)
Depth: segmented — Quick | Standard | Deep (each with 1-line description below)
"Run Audit" gold primary, large, full width

AUDIT REPORT (appears below after processing):

Overall score card (centered, 400px wide):
Grade letter: Inter 700 96px, color based on grade (A=green, B=gold, C=amber, D=orange, F=red)
Score: Inter 400 24px "#888880" below
Domain detected: chip

Four dimension scorecards (2×2 grid):
Each card: bg #111111, 12px radius, gold top accent
Score gauge (circular, 0-100), dimension name, pass/fail chip
Top issues list (3 bullets, Inter 13px muted)

Document heatmap view:
Full document with segment confidence coloring
Color legend bar at top (green → amber → orange → red)
Segments clickable: opens right-side drawer with score breakdown

Recommendations panel:
Priority-sorted list
Each item: priority chip + location + issue + suggested fix + "Fix in Workspace" ghost button

Export row: "PDF Report" gold primary | "Segment CSV" secondary | "Raw JSON" ghost

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PAGE 9 — DOMAIN RADAR (/radar)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Page background: #0A0A0A
Centered single-column layout, max-width 800px

Input section:
Large centered textarea (min-height 160px): "Paste any text to detect its domain composition..."
"Detect Domains" gold primary, large, centered

RADAR VISUALIZATION (after detection):
Large radar chart: 400×400px, centered
Same styling as workspace but larger
Domain composition breakdown: three cards in a row below radar
Each card: domain color chip + domain name + percentage + term count detected

Completion section (appears after detection):
Section divider
"Complete with detected blend" label
Textarea (min-height 120px)
Blend mode control: "Auto (detected)" | "Manual weights" toggle
Manual mode: three sliders for CODE/MEDICAL/LEGAL weights
"Complete" gold primary

Three output panels side by side (comparison mode):
CODE (green header) | MEDICAL (blue header) | LEGAL (gold header)
Each panel: completion text + latency chip + confidence score badge

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PAGE 10 — DASHBOARD (/dashboard)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Page background: #0A0A0A
Page header: user avatar (32px) + "Good morning, [Name]" Inter 700 24px

STATS ROW (4 metric cards):
Total Completions | Documents Processed | Avg Confidence Score | Tokens Used
Each: bg #111111, 12px radius, 2px gold top accent
Value: Inter 700 36px #F0EFE9. Label: Inter 500 12px #888880 uppercase tracked.

CHARTS ROW (2/3 + 1/3 split):
Left (activity line chart):
  Title "Activity (last 30 days)" Inter 600 16px
  Recharts LineChart: dark bg, gold line stroke 2px, minimal axes in #3A3A3A
  Tooltip: dark panel with gold border

Right (tool usage donut):
  Title "Usage by Tool"
  Recharts PieChart: dark bg, gold/grey/muted segments
  Legend: tool names with color dots

RECENT DOCUMENTS TABLE:
Title "Recent Documents" + "View All" ghost right-aligned
Table: tool chip | domain chip | title | timestamp | confidence badge | Open/Export/Delete actions
10 rows, pagination

EXPORT QUEUE:
Title "Exports"
Table: filename | format chip | status chip | created | download button
Status: pending=grey, processing=amber pulse, ready=green, failed=red

API USAGE PANEL:
Progress bar: tokens used / limit, gold fill on dark track, percentage label right
Rate limit status: green "Active" chip
Plan display: "Free Plan" + "Upgrade" gold primary button (stub)

SETTINGS PANEL (bottom):
Two-column card:
Left: Profile — avatar (64px) + display name (Inter 600) + email (muted) + "Synced from Google" label
Right: Preferences — default domain select + default temperature slider
Danger zone section: "Delete Account" danger button

PROTOTYPE ANNOTATIONS:
- Page transitions: fade + 16px slide-up, 200ms ease-out
- Stat counters: count-up from 0 on page load, 1.2s easeOut
- Domain radar scan: sweep arm rotation + axis populate + polygon draw
- Completion stream: token fade-in, gold→white color transition
- Heatmap reveal: segment snap-in with 60ms stagger, circuit board effect
- Button hover: translateY(-1px), 150ms ease-out
- Card hover: border-color lighten, bg lighten, 150ms
- Input focus: gold border + glow ring, 150ms
- Toast notifications: slide in from right, 3s auto-dismiss

━━━ STITCH PROMPT END ━━━
```

---

*Proxima v4.0 DRD — Engineered by Arnav Garg · B.Tech CSE (AI/ML) · UPES Dehradun · 2026*
