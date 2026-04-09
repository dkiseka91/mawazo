export type Intent =
  | 'log_expense'
  | 'log_income'
  | 'request_report'
  | 'onboarding'
  | 'unknown';

export interface ExtractedEntities {
  amount_ugx: number | null;
  description: string | null;
  category: string | null;    // free-text category label from Claude
  period: string | null;      // e.g. "this month", "last week", "January"
  date: string | null;        // ISO date string or relative expression
}

export interface ClassifiedIntent {
  intent: Intent;
  entities: ExtractedEntities;
  reply: string;              // user-facing message in their language
  confidence: 'high' | 'medium' | 'low';
}

export interface ProcessMessageResult {
  reply: string;
  intent: Intent;
  businessId: string;
}
