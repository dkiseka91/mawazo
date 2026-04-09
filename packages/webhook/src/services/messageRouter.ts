/**
 * Message router — bridges the WhatsApp webhook to the AI engine
 * and sends the reply back to the user via the Meta Send API.
 */

import axios from 'axios';
import { createLogger } from '@mawazo/shared';
import { processMessage } from '@mawazo/ai-engine';
import type { WhatsAppValue, WhatsAppTextMessage } from '../types/whatsapp';

const logger = createLogger('webhook:router');

const WHATSAPP_API_VERSION = 'v19.0';

function getApiBase(): string {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!phoneNumberId) throw new Error('WHATSAPP_PHONE_NUMBER_ID is not set');
  return `https://graph.facebook.com/${WHATSAPP_API_VERSION}/${phoneNumberId}`;
}

async function sendTextMessage(to: string, text: string): Promise<void> {
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  if (!accessToken) {
    logger.error('WHATSAPP_ACCESS_TOKEN not set — cannot send reply');
    return;
  }

  try {
    await axios.post(
      `${getApiBase()}/messages`,
      {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to,
        type: 'text',
        text: { preview_url: false, body: text },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        timeout: 10_000,
      }
    );
    logger.info({ to, textLength: text.length }, 'Reply sent');
  } catch (err) {
    if (axios.isAxiosError(err)) {
      logger.error(
        { status: err.response?.status, data: err.response?.data, to },
        'Failed to send WhatsApp reply'
      );
    } else {
      logger.error({ err, to }, 'Unknown error sending WhatsApp reply');
    }
  }
}

function getNonTextReply(messageType: string): string {
  switch (messageType) {
    case 'image':
      return "Thanks for the photo! Receipt scanning is coming soon. For now, please type the amount — e.g. 'Paid 45,000 for supplies'.";
    case 'audio':
      return "Voice notes aren't supported yet. Please type your transaction — e.g. 'Sold goods for 80,000'.";
    default:
      return "I can only handle text messages right now. Please type your income or expense — e.g. 'Paid rent 300,000'.";
  }
}

export async function handleIncomingValue(value: WhatsAppValue): Promise<void> {
  const messages = value.messages;
  if (!messages || messages.length === 0) {
    // Could be a status update (delivered/read) — ignore
    return;
  }

  for (const message of messages) {
    const phoneNumber = message.from;

    if (message.type !== 'text') {
      const reply = getNonTextReply(message.type);
      await sendTextMessage(phoneNumber, reply);
      continue;
    }

    const textMessage = message as WhatsAppTextMessage;
    const userText = textMessage.text.body.trim();

    if (!userText) continue;

    logger.info({ phoneNumber, message: userText.substring(0, 100) }, 'Incoming message');

    const result = await processMessage(phoneNumber, userText);
    await sendTextMessage(phoneNumber, result.reply);
  }
}
