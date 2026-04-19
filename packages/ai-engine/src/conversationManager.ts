/**
 * Redis-backed conversation session manager.
 * Sessions expire after 30 minutes of inactivity.
 * Only the last 10 messages are kept in the session to limit context size.
 */

import Redis from 'ioredis';
import { createLogger } from '@mawazo/shared';
import type { ConversationSession, ConversationMessage, IntentLogEntry } from '@mawazo/shared';

const logger = createLogger('ai-engine:sessions');
const SESSION_TTL_SECONDS = 30 * 60; // 30 minutes
const MAX_MESSAGES = 10;

let redis: Redis | null = null;

function getRedis(): Redis {
  if (!redis) {
    redis = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379', {
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    });
    redis.on('error', (err) => logger.error({ err }, 'Redis error'));
    redis.on('connect', () => logger.debug('Redis connected'));
  }
  return redis;
}

function sessionKey(businessId: string): string {
  return `session:${businessId}`;
}

export async function getSession(businessId: string): Promise<ConversationSession | null> {
  try {
    const raw = await getRedis().get(sessionKey(businessId));
    if (!raw) return null;
    return JSON.parse(raw) as ConversationSession;
  } catch (err) {
    logger.warn({ err, businessId }, 'Failed to get session from Redis');
    return null;
  }
}

export async function saveSession(session: ConversationSession): Promise<void> {
  try {
    await getRedis().set(
      sessionKey(session.businessId),
      JSON.stringify(session),
      'EX',
      SESSION_TTL_SECONDS
    );
  } catch (err) {
    logger.warn({ err, businessId: session.businessId }, 'Failed to save session to Redis');
  }
}

export async function appendMessage(
  businessId: string,
  role: 'user' | 'assistant',
  content: string
): Promise<ConversationSession> {
  let session = await getSession(businessId);

  const message: ConversationMessage = {
    role,
    content,
    timestamp: new Date().toISOString(),
  };

  if (!session) {
    session = {
      businessId,
      messages: [message],
      intentLog: [],
      onboardingStep: null,
      lastActive: new Date().toISOString(),
    };
  } else {
    session.messages = [...session.messages, message].slice(-MAX_MESSAGES);
    session.lastActive = new Date().toISOString();
  }

  await saveSession(session);
  return session;
}

export async function appendIntentLog(
  businessId: string,
  entry: Omit<IntentLogEntry, 'timestamp'>
): Promise<void> {
  const session = await getSession(businessId);
  if (!session) return;

  session.intentLog = [
    ...session.intentLog,
    { ...entry, timestamp: new Date().toISOString() },
  ].slice(-50); // keep last 50 intent log entries

  await saveSession(session);
}

export async function updateOnboardingStep(
  businessId: string,
  step: ConversationSession['onboardingStep']
): Promise<void> {
  let session = await getSession(businessId);
  if (!session) {
    // Session may not exist yet (e.g. Redis was briefly unavailable during appendMessage).
    // Create a minimal session so the step is always persisted.
    session = {
      businessId,
      messages: [],
      intentLog: [],
      onboardingStep: step,
      lastActive: new Date().toISOString(),
    };
  } else {
    session.onboardingStep = step;
  }
  await saveSession(session);
}

export async function deleteSession(businessId: string): Promise<void> {
  await getRedis().del(sessionKey(businessId));
}

export async function pingRedis(): Promise<boolean> {
  const result = await getRedis().ping();
  return result === 'PONG';
}

export async function storeWebappToken(token: string, userId: string): Promise<void> {
  await getRedis().set(`webapp:${token}`, userId, 'EX', 86_400); // 24 h
}

export async function getWebappUserId(token: string): Promise<string | null> {
  return getRedis().get(`webapp:${token}`);
}
