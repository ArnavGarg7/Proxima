/**
 * productData.ts — fake demo datasets for the product showcases (Stage 5E).
 *
 * One source of truth for every showcase's content (Compare, Confidence,
 * Routing, Timeline, Domain detection, Entity extraction). 5E.2+ visualizations
 * read from here — no hardcoded demo values inside showcase components. All
 * values use the existing Proxima domain language; no new product claims.
 */

export type ShowcaseType =
  | 'compare'
  | 'confidence'
  | 'routing'
  | 'timeline'
  | 'domain'
  | 'entity';

export const productData = {
  /** Compare — clause-level diff between two document versions. */
  compare: {
    versions: [
      {
        tag: 'v1',
        label: 'Base',
        rows: ['Blood pressure within normal range.', 'Continue current medication.', 'Routine follow-up in 6 months.'],
      },
      {
        tag: 'v2',
        label: 'Revised',
        rows: ['Blood pressure elevated.', 'Adjust medication dosage.', 'Follow-up in 4 weeks.'],
      },
    ],
    /** Which rows changed between v1 and v2 (by index). */
    changed: [true, true, true],
    /** Confidence rises as the comparison resolves. */
    confidence: { start: 83, final: 96 },
    /** Total differences found. */
    differences: 18,
    /** Key changes revealed in the summary. */
    summary: ['Clause modified', 'Risk reduced', 'Terminology standardized'],
  },

  /** Confidence — per-field reliability scoring + the headline figure. */
  confidence: {
    rows: [
      { label: 'Governing law',    score: 98, level: 'high'   },
      { label: 'Payment terms',    score: 91, level: 'high'   },
      { label: 'Liability clause', score: 74, level: 'medium' },
      { label: 'Ambiguous intent', score: 42, level: 'low'    },
    ],
    average: 76,
    /** Headline confidence the dashboard ring settles on. */
    final: 97,
  },

  /** Routing — the AI decision engine choosing a specialist analyzer. */
  routing: {
    document: { name: 'report.pdf', type: 'Clinical record' },
    /** Signals the engine extracts from the document. */
    signals: [
      'Medical terminology',
      'Prescription',
      'Patient identifiers',
      'Laboratory values',
      'Clinical history',
    ],
    /** Specialist models scored against the document (highest wins). */
    models: [
      { label: 'Clinical', icon: 'medical_services', score: 97, variant: 'info',         selected: true  },
      { label: 'Legal',    icon: 'gavel',            score: 12, variant: 'domain-legal', selected: false },
      { label: 'Code',     icon: 'code',             score: 5,  variant: 'domain-code',  selected: false },
      { label: 'General',  icon: 'category',         score: 24, variant: 'default',      selected: false },
    ],
    /** The decision the engine surfaces once scoring resolves. */
    decision: { headline: 'Highest confidence', label: 'Clinical AI', reason: 'Specialized terminology detected' },
  },

  /** Timeline — the analysis workflow as discrete steps. */
  timeline: {
    steps: [
      { label: 'Upload',         state: 'done'    },
      { label: 'OCR',            state: 'done'    },
      { label: 'Classification', state: 'active'  },
      { label: 'Analysis',       state: 'pending' },
      { label: 'Summary',        state: 'pending' },
    ],
  },

  /** Domain detection — classifier confidence per domain (primary wins). */
  domain: {
    primary: 'Clinical',
    domains: [
      { label: 'Clinical', score: 0.94, variant: 'info'         },
      { label: 'Legal',    score: 0.41, variant: 'domain-legal' },
      { label: 'Code',     score: 0.12, variant: 'domain-code'  },
      { label: 'General',  score: 0.08, variant: 'default'      },
    ],
  },

  /** Entity extraction — entities pulled from the document. */
  entity: {
    items: [
      { label: 'Patient',    type: 'subject'   },
      { label: 'Medication', type: 'drug'      },
      { label: 'Diagnosis',  type: 'condition' },
      { label: 'Risk score', type: 'metric'    },
      { label: 'Treatment',  type: 'plan'      },
    ],
    total: 128,
  },

  /** Risk assessment — progresses while analyzing, then settles. */
  risk: {
    interim: { label: 'Medium', variant: 'warning' },
    final:   { label: 'Low',    variant: 'success' },
  },

  /** Insights surfaced once the analysis resolves. */
  insights: [
    { label: 'Missing allergy information',   icon: 'warning'      },
    { label: 'Blood-pressure trend detected', icon: 'trending_up'  },
    { label: 'Medication conflict resolved',  icon: 'check_circle' },
  ],
} as const;

export type ProductData = typeof productData;
