/**
 * unknown intent handler — returns Claude's clarification reply.
 */

import type { ClassifiedIntent } from '../types/intents';

export function handleUnknown(_phoneNumber: string, _userMessage: string, classified: ClassifiedIntent): string {
  // Use Claude's reply (which will ask for clarification) or a generic fallback
  return classified.reply || "I'm not sure what you'd like to do. You can:\n• Record an expense: 'Paid 50,000 for rent'\n• Record income: 'Sold goods for 200,000'\n• Get a report: 'Show me this month's profit'\n\nWhat would you like to do?";
}
