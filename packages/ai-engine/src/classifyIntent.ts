/**
 * Intent classification using Claude API.
 *
 * Sends the user's message (with conversation context) to Claude and
 * parses the structured JSON response. Falls back to 'unknown' intent
 * if the response cannot be parsed.
 */

import Anthropic from '@anthropic-ai/sdk';
import { createLogger } from '@mawazo/shared';
import { SYSTEM_PROMPT } from './prompts/systemPrompt';
import type { ClassifiedIntent } from './types/intents';
import type { ConversationSession } from '@mawazo/shared';

const logger = createLogger('ai-engine:classify');

let anthropic: Anthropic | null = null;

function getAnthropic(): Anthropic {
  if (!anthropic) {
    anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return anthropic;
}

const FALLBACK_INTENT: ClassifiedIntent = {
  intent: 'unknown',
  entities: {
    amount_ugx: null,
    description: null,
    category: null,
    period: null,
    date: null,
  },
  reply: "I didn't quite understand that. You can tell me about income (e.g. 'Sold goods for 50,000') or expenses (e.g. 'Paid rent 200,000'). Type 'Help' for more options.",
  confidence: 'low',
};

function buildContextBlock(session: ConversationSession | null, businessName: string | null): string {
  const parts: string[] = [];

  if (businessName) {
    parts.push(`Business: ${businessName}`);
  }

  if (session && session.messages.length > 0) {
    const history = session.messages
      .slice(-6) // last 3 turns (user + assistant each)
      .map((m) => `${m.role === 'user' ? 'User' : 'Mawazo'}: ${m.content}`)
      .join('\n');
    parts.push(`Recent conversation:\n${history}`);
  }

  return parts.length > 0 ? `[Context]\n${parts.join('\n')}\n\n` : '';
}

function parseClaudeResponse(raw: string): ClassifiedIntent | null {
  try {
    // Strip any accidental markdown code fences
    const cleaned = raw.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();
    const parsed = JSON.parse(cleaned) as Record<string, unknown>;

    const validIntents = ['log_expense', 'log_income', 'request_report', 'onboarding', 'unknown'];
    if (!parsed.intent || !validIntents.includes(parsed.intent as string)) return null;
    if (typeof parsed.reply !== 'string') return null;

    const entities = (parsed.entities ?? {}) as Record<string, unknown>;

    return {
      intent: parsed.intent as ClassifiedIntent['intent'],
      entities: {
        amount_ugx:  typeof entities.amount_ugx  === 'number' ? entities.amount_ugx  : null,
        description: typeof entities.description === 'string' ? entities.description : null,
        category:    typeof entities.category    === 'string' ? entities.category    : null,
        period:      typeof entities.period      === 'string' ? entities.period      : null,
        date:        typeof entities.date        === 'string' ? entities.date        : null,
      },
      reply:      parsed.reply as string,
      confidence: (['high', 'medium', 'low'].includes(parsed.confidence as string)
        ? parsed.confidence
        : 'medium') as ClassifiedIntent['confidence'],
    };
  } catch {
    return null;
  }
}

export async function classifyIntent(
  userMessage: string,
  session: ConversationSession | null = null,
  businessName: string | null = null
): Promise<ClassifiedIntent> {
  const context = buildContextBlock(session, businessName);
  const userContent = `${context}User message: ${userMessage}`;

  const attemptClassification = async (retrying = false): Promise<ClassifiedIntent> => {
    try {
      const response = await getAnthropic().messages.create({
        model: 'claude-sonnet-4-5',
        max_tokens: 512,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userContent }],
      });

      const rawText = response.content
        .filter((b) => b.type === 'text')
        .map((b) => b.text)
        .join('');

      const classified = parseClaudeResponse(rawText);

      if (!classified) {
        if (!retrying) {
          logger.warn({ rawText }, 'Claude response was not valid JSON — retrying once');
          // Retry with explicit correction prompt
          const retryResponse = await getAnthropic().messages.create({
            model: 'claude-sonnet-4-5',
            max_tokens: 512,
            system: SYSTEM_PROMPT,
            messages: [
              { role: 'user', content: userContent },
              { role: 'assistant', content: rawText },
              { role: 'user', content: 'Your previous response was not valid JSON. Please respond ONLY with the JSON object, no other text.' },
            ],
          });

          const retryText = retryResponse.content
            .filter((b) => b.type === 'text')
            .map((b) => b.text)
            .join('');

          const retryClassified = parseClaudeResponse(retryText);
          if (retryClassified) return retryClassified;
        }

        logger.error({ userMessage }, 'Could not parse Claude response after retry — using fallback');
        return FALLBACK_INTENT;
      }

      return classified;
    } catch (err) {
      logger.error({ err, userMessage }, 'Claude API call failed');
      return { ...FALLBACK_INTENT, reply: "I'm having trouble right now. Please try again in a moment." };
    }
  };

  return attemptClassification();
}
