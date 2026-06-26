export interface ReviewPriority {
  title: string;
  severity: string;
  description: string;
}

export interface IntelligenceCard {
  title: string;
  severity: string;
  line: number;
  reason: string;
  recommendation: string;
  evidence_old: string;
}

export interface RadarScores {
  security: number;
  maintainability: number;
  documentation: number;
  performance: number;
}

export interface CodeMetrics {
  lines: number;
  functions: number;
  classes: number;
  methods: number;
  imports: number;
  comment_ratio: number;
  longest_function: number;
  average_function: number;
  estimated_cyclomatic_complexity: number;
}

export interface CodeReviewResult {
  language: string;
  deterministic_signals: string[];
  metrics: CodeMetrics;
  executive_summary: string;
  overall_score: number;
  radar_scores: RadarScores;
  review_priorities: ReviewPriority[];
  security_findings: IntelligenceCard[];
  maintainability_findings: IntelligenceCard[];
  performance_findings: IntelligenceCard[];
  documentation_findings: IntelligenceCard[];
}
