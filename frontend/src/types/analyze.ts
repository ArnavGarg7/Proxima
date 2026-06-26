export interface Evidence {
  quote: string;
  context?: string;
}

export interface Takeaway {
  point: string;
  evidence: Evidence[];
}

export interface Topic {
  name: string;
  description: string;
  evidence: Evidence[];
}

export interface NamedEntity {
  name: string;
  entity_type: string;
  context: string;
}

export interface ImportantDate {
  date: string;
  significance: string;
  evidence: Evidence[];
}

export interface NumericalInsight {
  value: string;
  metric: string;
  context: string;
  evidence: Evidence[];
}

export interface Risk {
  level: 'High' | 'Medium' | 'Low';
  description: string;
  evidence: Evidence[];
}

export interface ActionItem {
  action: string;
  assignee?: string;
  evidence: Evidence[];
}

export interface AnalysisMetadata {
  reading_time_minutes: number;
  word_count: number;
  language: string;
}

export interface GeneralAnalysisResult {
  executive_summary: string;
  takeaways: Takeaway[];
  topics: Topic[];
  entities: NamedEntity[];
  dates: ImportantDate[];
  numbers: NumericalInsight[];
  risks: Risk[];
  actions: ActionItem[];
  metadata: AnalysisMetadata;
  confidence: number;
  signals: string[];
}
