/**
 * Telegram message router.
 * Receives a parsed Telegram Update, calls the AI engine, and
 * sends the reply back via the Telegram Bot API sendMessage endpoint.
 *
 * The Telegram chat ID is used as the user identifier (prefixed with
 * "tg_" so it doesn't collide with WhatsApp phone numbers in the DB).
 */

import axios from 'axios';
import { createLogger } from '@mawazo/shared';
import { processMessage } from '@mawazo/ai-engine';
import { handleCommand } from './telegramCommands';
import type { TelegramUpdate, TelegramTextMessage, TelegramMessage } from '../types/telegram';

const logger = createLogger('webhook:telegram');

function getApiBase(): string {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error('TELEGRAM_BOT_TOKEN is not set');
  return `https://api.telegram.org/bot${token}`;
}

async function sendMessage(chatId: number, text: string): Promise<void> {
  try {
    await axios.post(
      `${getApiBase()}/sendMessage`,
      { chat_id: chatId, text, parse_mode: 'Markdown' },
      { timeout: 10_000 }
    );
    logger.info({ chatId, textLength: text.length }, 'Telegram reply sent');
  } catch (err) {
    if (axios.isAxiosError(err)) {
      logger.error({ status: err.response?.status, data: err.response?.data, chatId }, 'Failed to send Telegram reply');
    } else {
      logger.error({ err, chatId }, 'Unknown error sending Telegram reply');
    }
  }
}

function isTextMessage(msg: TelegramMessage): msg is TelegramTextMessage {
  return 'text' in msg;
}

function getNonTextReply(msg: TelegramMessage): string {
  if ('photo' in msg) {
    return "Thanks for the photo! Receipt scanning is coming soon. For now, please *type* the amount — e.g. _Paid 45,000 for supplies_.";
  }
  if ('voice' in msg) {
    return "Voice messages aren't supported yet. Please *type* your transaction — e.g. _Sold goods for 80,000_.";
  }
  return "Please *type* your transaction — e.g. _Paid rent 300,000_ or _Sold tomatoes for 85,000_.";
}

export async function handleTelegramUpdate(update: TelegramUpdate): Promise<void> {
  const msg = update.message ?? update.edited_message;
  if (!msg) return;

  const chatId = msg.chat.id;
  // Prefix with "tg_" to namespace Telegram users separately from WhatsApp numbers
  const userId = `tg_${chatId}`;

  if (!isTextMessage(msg)) {
    await sendMessage(chatId, getNonTextReply(msg));
    return;
  }

  const text = msg.text.trim();
  if (!text) return;

  logger.info({ chatId, message: text.substring(0, 100) }, 'Incoming Telegram message');

  // Handle bot commands before the AI engine
  if (text.startsWith('/')) {
    const parts   = text.split(/\s+/);
    const command = parts[0].toLowerCase().split('@')[0]; // strip @botname suffix
    const args    = parts.slice(1);
    const handled = await handleCommand(chatId, userId, command, args);
    if (handled) return;
  }

  const result = await processMessage(userId, text);
  await sendMessage(chatId, result.reply);
}
