/**
 * Mawazo AI Engine — public interface.
 *
 * processMessage() is the single entry point called by the webhook handler.
 * It orchestrates: load session → get business → classify intent → handle → save session.
 */

import 'dotenv/config';
import { createLogger } from '@mawazo/shared';
import { classifyIntent } from './classifyIntent';
import { appendMessage, appendIntentLog, getSession } from './conversationManager';
import { handleOnboarding }    from './handlers/onboarding';
import { handleLogExpense }    from './handlers/logExpense';
import { handleLogIncome }     from './handlers/logIncome';
import { handleRequestReport } from './handlers/requestReport';
import { handleUnknown }       from './handlers/unknown';
import { getPool }             from './db';
import type { ProcessMessageResult } from './types/intents';

const logger = createLogger('ai-engine');

export async function processMessage(
  phoneNumber: string,
  messageText: string
): Promise<ProcessMessageResult> {
  logger.info({ phoneNumber, messageText }, 'Processing message');

  // Load session for context
  const session = await getSession(phoneNumber);

  // Get business name for context (if exists)
  const pool = getPool();
  const { rows } = await pool.query<{ id: string; name: string | null; onboarding_complete: boolean }>(
    'SELECT id, name, onboarding_complete FROM businesses WHERE phone_number = $1',
    [phoneNumber]
  );
  const business = rows[0] ?? null;

  // Record the user's message in session
  await appendMessage(phoneNumber, 'user', messageText);

  // Classify intent using Claude
  const classified = await classifyIntent(messageText, session, business?.name ?? null);

  logger.info(
    { phoneNumber, intent: classified.intent, confidence: classified.confidence },
    'Intent classified'
  );

  // Route to appropriate handler
  let reply: string;

  // If business hasn't completed onboarding, force onboarding flow
  if (!business || !business.onboarding_complete) {
    if (classified.intent !== 'onboarding') {
      // Still route through onboarding to complete setup
      reply = await handleOnboarding(phoneNumber, messageText, classified);
    } else {
      reply = await handleOnboarding(phoneNumber, messageText, classified);
    }
  } else {
    switch (classified.intent) {
      case 'log_expense':
        reply = await handleLogExpense(phoneNumber, messageText, classified);
        break;
      case 'log_income':
        reply = await handleLogIncome(phoneNumber, messageText, classified);
        break;
      case 'request_report':
        reply = await handleRequestReport(phoneNumber, messageText, classified);
        break;
      case 'onboarding':
        reply = await handleOnboarding(phoneNumber, messageText, classified);
        break;
      default:
        reply = handleUnknown(phoneNumber, messageText, classified);
    }
  }

  // Save assistant reply and intent log
  await appendMessage(phoneNumber, 'assistant', reply);
  await appendIntentLog(phoneNumber, {
    intent: classified.intent,
    entities: classified.entities,
  });

  return {
    reply,
    intent: classified.intent,
    businessId: business?.id ?? phoneNumber,
  };
}

export { getPool, closePool } from './db';
export type { ProcessMessageResult } from './types/intents';
