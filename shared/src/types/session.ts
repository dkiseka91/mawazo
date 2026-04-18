export type OnboardingStep =
  | 'ask_name'
  | 'ask_business_type'
  | 'ask_industry'
  | 'complete';

export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;  // ISO string
}

export interface IntentLogEntry {
  intent: string;
  entities: Record<string, string | number | null>;
  timestamp: string;  // ISO string
}

export interface ConversationSession {
  businessId: string;
  messages: ConversationMessage[];
  intentLog: IntentLogEntry[];
  onboardingStep: OnboardingStep | null;
  lastActive: string;  // ISO string
}
