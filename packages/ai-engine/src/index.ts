/**
 * Mawazo AI Engine — public interface.
 *
 * processMessage() is the single entry point called by the webhook handler.
 * It orchestrates: load session → get business → classify intent → handle → save session.
 */

import 'dotenv/config';
import { createLogger } from '@mawazo/shared';
import { classifyIntent } from './classifyIntent';
import { appendMessage, appendIntentLog, getSession, pingRedis } from './conversationManager';
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
  logger.info({ phoneNumber, messagePreview: messageText.substring(0, 50) }, 'Processing message');

  try {
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
      reply = await handleOnboarding(phoneNumber, messageText, classified);

      // If onboarding just completed mid-transaction, re-route immediately
      if (reply === '__REROUTE__') {
        reply = await routeIntent(phoneNumber, messageText, classified);
      }
    } else {
      reply = await routeIntent(phoneNumber, messageText, classified);
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
  } catch (err) {
    logger.error({ err, phoneNumber }, 'processMessage error');
    return {
      reply: "I'm having trouble right now. Please try again in a moment.",
      intent: 'unknown',
      businessId: phoneNumber,
    };
  }
}

async function routeIntent(
  phoneNumber: string,
  messageText: string,
  classified: ReturnType<typeof classifyIntent> extends Promise<infer T> ? T : never
): Promise<string> {
  switch (classified.intent) {
    case 'log_expense':
      return handleLogExpense(phoneNumber, messageText, classified);
    case 'log_income':
      return handleLogIncome(phoneNumber, messageText, classified);
    case 'request_report':
      return handleRequestReport(phoneNumber, messageText, classified);
    case 'onboarding':
      return handleOnboarding(phoneNumber, messageText, classified);
    default:
      return handleUnknown(phoneNumber, messageText, classified);
  }
}

export async function checkHealth(): Promise<{ db: boolean; redis: boolean }> {
  let db = false;
  let redis = false;

  try {
    await getPool().query('SELECT 1');
    db = true;
  } catch {
    // db stays false
  }

  try {
    redis = await pingRedis();
  } catch {
    // redis stays false
  }

  return { db, redis };
}

export { getPool, closePool } from './db';
export type { ProcessMessageResult } from './types/intents';
