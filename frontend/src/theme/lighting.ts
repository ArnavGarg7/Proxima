/**
 * lighting.ts — cinematic lighting tokens for the BackgroundFX subsystem (Stage 5A).
 *
 * Single source of truth for every lighting value used by the cinematic
 * rendering engine. Components in `components/background/` must read from here —
 * no hardcoded colors, opacities, blurs, positions, radii, z-indices, or
 * animation timings live in those components.
 *
 * Stage 5A.1 shipped the static foundation (base + ambient glow + vignette).
 * Stage 5A.2 adds the first living layers: a drifting mesh gradient and a very
 * slow ambient "breathing". Tokens for the remaining animated layers (beams /
 * particles / cursor / grain) are still reserved so 5A.3–5A.4 plug in without
 * touching call sites.
 *
 * All colors are drawn from the existing Proxima palette (see theme/tokens.ts);
 * no new colors are introduced.
 */

/* RGB triplets from the Proxima palette, kept as bare "r, g, b" strings so
   callers can compose rgba() at any alpha. */
const rgb = {
  void:     '10, 10, 10',     // #0A0A0A  void
  charcoal: '26, 26, 26',     // #1A1A1A  elevated   (mesh tonal blob)
  gold:     '201, 168, 76',   // #C9A84C  gold.primary  (warm gold)
  goldWarm: '138, 111, 50',   // #8A6F32  gold.dim      (bronze)
  cool:     '96, 165, 250',   // #60A5FA  status.info / domain.medical
  black:    '0, 0, 0',
} as const;

export const lighting = {
  rgb,

  /* ── Background base — charcoal fill + soft top-down gold illumination ──── */
  base: {
    /** Flat charcoal fill (matches <body> and --color-void) */
    fill: '#0A0A0A',
    /** Soft radial gold illumination from the top-center "light source" */
    illumination:
      `radial-gradient(ellipse 80% 55% at 50% -8%, rgba(${rgb.gold}, 0.10) 0%, ` +
      `rgba(${rgb.gold}, 0.03) 40%, transparent 72%)`,
    /** Subtle texture grid, masked to fade toward the edges (decorative) */
    grid: {
      backgroundImage:
        'linear-gradient(to right, var(--color-border-strong) 1px, transparent 1px),' +
        'linear-gradient(to bottom, var(--color-border-strong) 1px, transparent 1px)',
      backgroundSize: '64px 64px',
      opacity: 0.05,
      maskImage: 'radial-gradient(ellipse 80% 50% at 50% 0%, #000 0%, transparent 75%)',
      WebkitMaskImage: 'radial-gradient(ellipse 80% 50% at 50% 0%, #000 0%, transparent 75%)',
    },
  },

  /* ── Glow colors — reference the rgb triplets above ────────────────────── */
  glowColor: {
    gold: rgb.gold,
    warm: rgb.goldWarm,
    cool: rgb.cool,
  },

  /* ── Glow opacity scale — core alpha applied to a glow's color ─────────── */
  glowOpacity: {
    ambient: 0.12,   // primary top-center light source
    hotspot: 0.08,   // tighter, brighter center
    warm:    0.09,   // left depth glow
    cool:    0.05,   // right depth glow
  },

  /** Hard cap on any single glow's intensity — AmbientGlow clamps to this. */
  maxGlowIntensity: 0.18,

  /* ── Global lighting intensity multiplier ──────────────────────────────────
     Applied to every glow / mesh opacity. BackgroundFX selects a level via its
     `intensity` prop; later stages can restyle the whole engine by changing a
     single multiplier. */
  intensity: {
    low:    0.75,
    medium: 1.0,
    high:   1.2,
  },

  /* ── Glow blur radii (px) — applied as CSS filter: blur() ──────────────── */
  glowBlur: {
    sm: 24,
    md: 40,
    lg: 64,
    xl: 96,
  },

  /* ── Glow element sizes (px). number → circle; {w,h} → ellipse ─────────── */
  glowRadius: {
    hero:    { w: 1100, h: 700 },
    hotspot: { w: 480,  h: 360 },
    warm:    560,
    cool:    480,
  },

  /* ── Glow anchor positions within the canvas ──────────────────────────── */
  glowPosition: {
    topCenter: { top: '-224px', left: '50%', centerX: true },
    hotspot:   { top: '-128px', left: '50%', centerX: true },
    left:      { top: '18%',    left: '-160px' },
    right:     { top: '32%',    right: '-160px' },
  },

  /* ── Ambient breathing (Stage 5A.2) ────────────────────────────────────────
     Tiny, imperceptible motion. `breath` is the shared oscillation range;
     `ambientMotion` gives each glow its own duration / delay / drift vector so
     no two glows move in sync. Only transform + opacity animate. */
  breath: {
    /** Element-opacity keyframes (relative to the glow's resting alpha). */
    opacity: [1, 0.86, 1],
    /** Scale keyframes — barely-there expansion. */
    scale:   [1, 1.03, 1],
  },
  ambientMotion: {
    hero:    { duration: 22, delay: 0,   drift: { x: 0,   y: 10 } },
    hotspot: { duration: 26, delay: 3,   drift: { x: 0,   y: 8  } },
    warm:    { duration: 24, delay: 1.5, drift: { x: 12,  y: -8 } },
    cool:    { duration: 28, delay: 4,   drift: { x: -12, y: 10 } },
  },

  /* ── Frame vignette — darkens the corners for focus and depth ──────────── */
  vignette:
    `radial-gradient(ellipse 90% 75% at 50% 35%, transparent 50%, rgba(${rgb.black}, 0.65) 100%)`,

  /* ── Mesh gradient (Stage 5A.2) ────────────────────────────────────────────
     Oversized, softly-blurred gradient blobs that drift / scale / rotate behind
     the page. Palette is charcoal · void · warm gold · bronze (all existing
     Proxima colors). Only transform + opacity animate; `blur` is a static
     filter (set once, never animated). Long, mismatched durations + mirrored
     repeat keep the loop invisible. Each blob carries every position key
     (top/bottom/left/right) — 'auto' where it does not anchor — so the array
     stays a single uniform shape. */
  mesh: {
    /** Static blur applied once per blob (cached on the GPU layer). */
    blur: 64,
    blobs: [
      // warm gold — upper left
      { color: rgb.gold,     opacity: 0.05, size: 920,  top: '-12%', bottom: 'auto',  left: '-10%', right: 'auto',
        motion: { x: 60,  y: 40,  scale: 1.08, rotate: 6,  duration: 26, delay: 0   } },
      // bronze — right
      { color: rgb.goldWarm, opacity: 0.06, size: 840,  top: '10%',  bottom: 'auto',  left: 'auto', right: '-14%',
        motion: { x: -50, y: 50,  scale: 1.10, rotate: -8, duration: 30, delay: 2   } },
      // charcoal — lower left (subtle tonal lift)
      { color: rgb.charcoal, opacity: 0.45, size: 1000, top: 'auto', bottom: '-18%', left: '4%',   right: 'auto',
        motion: { x: 40,  y: -30, scale: 1.06, rotate: 5,  duration: 28, delay: 1.5 } },
      // warm gold — lower right accent
      { color: rgb.gold,     opacity: 0.04, size: 760,  top: 'auto', bottom: '-14%', left: 'auto', right: '2%',
        motion: { x: -45, y: -38, scale: 1.09, rotate: -6, duration: 24, delay: 3   } },
    ],
  },

  /* ── Light beams (Stage 5A.3) ──────────────────────────────────────────────
     2–3 oversized, softly-blurred directional shafts (gold only). Each beam
     differs in angle / width / opacity / duration / delay. Only translate +
     rotate + opacity animate; blur and width are static. Long 34–40s loops with
     matching first/last keyframes → no visible seam. Each carries top/left/right
     ('auto' where unused) so the array stays one uniform shape. */
  beams: {
    blur: 64,
    color: rgb.gold,
    count: 3,
    /** Element-opacity fade keyframes for the gentle pulse. */
    fade: [0.7, 1, 0.7],
    list: [
      { width: 340, height: 1300, opacity: 0.040, rotate: 18,  rotateBy: 4,
        drift: { x: 40,  y: -30 }, duration: 34, delay: 0,
        top: '-20%', left: '12%',  right: 'auto' },
      { width: 280, height: 1200, opacity: 0.030, rotate: -24, rotateBy: -5,
        drift: { x: -50, y: 40 },  duration: 38, delay: 4,
        top: '-15%', left: 'auto', right: '16%' },
      { width: 360, height: 1180, opacity: 0.025, rotate: 8,   rotateBy: 3,
        drift: { x: 30,  y: 48 },  duration: 40, delay: 8,
        top: '-12%', left: '44%',  right: 'auto' },
    ],
  },

  /* ── Particle field (Stage 5A.3) ───────────────────────────────────────────
     Sparse, soft gold circles for atmosphere. Per-breakpoint counts live in the
     component; these are the random RANGES [min, max] sampled once per particle.
     Movement (slow upward drift + slight sideways + fade) is almost
     imperceptible. transform + opacity only; no filters. */
  particles: {
    color:    rgb.gold,
    size:     [2, 6],      // px
    opacity:  [0.04, 0.12],
    driftUp:  [60, 160],   // px upward over the loop
    driftX:   [6, 20],     // px sideways
    duration: [14, 26],    // s
    maxDelay: 12,          // s
  },

  /* ── Cursor spotlight (Stage 5A.4) ─────────────────────────────────────────
     A soft, warm-gold radial that interpolates toward the pointer with spring
     smoothing (delayed follow, never snaps). Opacity stays below 8%; the heavy
     blur means there is no visible circle or hard edge. Desktop fine-pointer
     only — disabled on touch and under reduced motion. */
  cursor: {
    color: rgb.gold,
    radius: 420,          // px — element size
    blur: 320,            // px — within 280–360, so no visible edge
    opacity: 0.06,        // active center alpha (< 8%)
    idleOpacity: 0.02,    // resting alpha before / when the pointer is away
    intensity: 1,         // local multiplier (on top of the global intensity)
    smoothing: { stiffness: 60, damping: 22, mass: 1 },  // spring → soft delay
  },

  /* ── Film grain (Stage 5A.4) ───────────────────────────────────────────────
     A static, desaturated fractal-noise texture (~2%) that removes digital
     perfection. Generated procedurally as an inline SVG data URI — no PNG
     assets, never animated. Only noticeable if you look for it. */
  grain: {
    opacity: 0.02,
    size: '180px 180px',
    texture:
      "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' " +
      "width='180' height='180'%3E%3Cfilter id='g'%3E%3CfeTurbulence type='fractalNoise' " +
      "baseFrequency='0.8' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix " +
      "type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' " +
      "filter='url(%23g)'/%3E%3C/svg%3E\")",
  },

  /* ── Z-index layers ───────────────────────────────────────────────────────
     `canvas` is the fixed backdrop's level in the page's root stacking context
     (negative → behind content). The remaining values order the effect layers
     *within* the canvas; `content` documents where page content sits (normal
     flow, above the negative canvas). Numeric values are encapsulated here —
     components reference layers by name via FXLayerName. */
  layers: {
    canvas:   -10,
    base:       0,
    ambient:   10,
    mesh:      20,
    beams:     30,
    particles: 40,
    cursor:    50,
    grain:     60,
    vignette:  70,
    content:    0,
  },
} as const;

/* ── Semantic rendering-layer names ──────────────────────────────────────────
   Components consume these instead of raw z-indices; FXLayer resolves the
   numeric value from lighting.layers internally. */
export const FXLayerName = {
  Base:      'base',
  Ambient:   'ambient',
  Mesh:      'mesh',
  Beams:     'beams',
  Particles: 'particles',
  Cursor:    'cursor',
  Grain:     'grain',
  Vignette:  'vignette',
  Content:   'content',
} as const;

export type FXLayerNameValue = (typeof FXLayerName)[keyof typeof FXLayerName];

/** Named z-index layer configuration (numeric values stay encapsulated here). */
export type LightingLayers = typeof lighting.layers;

/** Global lighting intensity level. */
export type IntensityLevel = keyof typeof lighting.intensity;

/** Anchor for a glow within the canvas. */
export type GlowAnchor = {
  top?: string;
  bottom?: string;
  left?: string;
  right?: string;
  /** Horizontally center via margin (pair with left: '50%'). */
  centerX?: boolean;
};

/** Glow size in px — a number renders a circle, {w,h} renders an ellipse. */
export type GlowRadius = number | { w: number; h: number };

/** Per-glow ambient breathing config (see lighting.ambientMotion). */
export type AmbientAnim = {
  duration: number;
  delay: number;
  drift: { x: number; y: number };
};
