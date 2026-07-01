/**
 * heroData.ts — the fake product data that powers the Hero demo.
 *
 * Panels never hardcode values; they read everything from here. The data drives
 * the full synchronized workflow (Stage 5B.2–5B.5): status labels, six timeline
 * nodes, routing candidates, upload copy, confidence, metrics, extracted
 * entities, and the generated summary.
 */

export interface HeroDomainTag {
  label: string;
  /** Matches Badge's variant union (kept loose to avoid a UI import here). */
  variant: 'domain-medical' | 'domain-legal' | 'info';
}

export const heroData = {
  session: {
    url: 'proxima.ai / analysis',
  },

  /** High-level status label per phase (StatusPanel). */
  status: {
    idle:       'Waiting',
    upload:     'Uploading',
    routing:    'Routing',
    analysis:   'Analyzing',
    confidence: 'Calculating Confidence',
    extraction: 'Extracting Entities',
    summary:    'Generating Summary',
    complete:   'Complete',
  },

  document: {
    label: 'Document Analysis',
    filename: 'Clinical_Trial_Report.pdf',
    analyzer: 'Medical',
    icon: 'description',
    badge: { label: 'Medical', variant: 'domain-medical' },
  },

  confidence: {
    score: 97,
    label: 'High',
  },

  metrics: {
    entities: 128,
    sections: 14,
    riskFlags: 2,
  },

  routing: {
    /** The analyzer the scan resolves to. */
    primary: 'Medical',
    domains: [
      { label: 'Medical',  variant: 'domain-medical' },
      { label: 'Legal',    variant: 'domain-legal' },
      { label: 'Clinical', variant: 'info' },
    ],
  },

  /** Entities revealed during the extraction phase (deterministic order). */
  entities: ['Patient cohort', 'Primary diagnosis', 'Medication', 'Follow-up plan'],

  /** Summary sentences revealed one at a time during the summary phase. */
  summary: [
    'Randomized controlled trial evaluating a novel therapeutic across 248 patients.',
    'Primary efficacy endpoints were met with statistically significant results.',
    'No critical safety signals were detected during the review period.',
  ],

  /** Workflow nodes shown in the timeline (all six phases). */
  timeline: [
    { phase: 'upload',     label: 'Upload'     },
    { phase: 'routing',    label: 'Routing'    },
    { phase: 'analysis',   label: 'Analysis'   },
    { phase: 'confidence', label: 'Confidence' },
    { phase: 'extraction', label: 'Extraction' },
    { phase: 'summary',    label: 'Summary'    },
  ],

  upload: {
    filename: 'Contract_v2.docx',
    idleLabel: 'Waiting for document',
    uploadingLabel: 'Uploading',
    completeLabel: 'Upload complete',
  },
} as const;

export type HeroData = typeof heroData;
