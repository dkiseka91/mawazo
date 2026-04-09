/**
 * TypeScript types for Meta WhatsApp Cloud API webhook payloads.
 * Reference: https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks/payload-examples
 */

export interface WhatsAppTextMessage {
  from: string;         // sender phone number (E.164, no +)
  id: string;           // message ID (wamid.xxx)
  timestamp: string;    // unix timestamp string
  type: 'text';
  text: { body: string };
}

export interface WhatsAppImageMessage {
  from: string;
  id: string;
  timestamp: string;
  type: 'image';
  image: {
    caption?: string;
    mime_type: string;
    sha256: string;
    id: string;         // media object ID — use to download via Media API
  };
}

export interface WhatsAppAudioMessage {
  from: string;
  id: string;
  timestamp: string;
  type: 'audio';
  audio: { id: string; mime_type: string };
}

export type WhatsAppMessage =
  | WhatsAppTextMessage
  | WhatsAppImageMessage
  | WhatsAppAudioMessage
  | { from: string; id: string; timestamp: string; type: string };

export interface WhatsAppContact {
  profile: { name: string };
  wa_id: string;
}

export interface WhatsAppValue {
  messaging_product: 'whatsapp';
  metadata: {
    display_phone_number: string;
    phone_number_id: string;
  };
  contacts?: WhatsAppContact[];
  messages?: WhatsAppMessage[];
  statuses?: Array<{
    id: string;
    status: 'sent' | 'delivered' | 'read' | 'failed';
    timestamp: string;
    recipient_id: string;
  }>;
}

export interface WebhookPayload {
  object: 'whatsapp_business_account';
  entry: Array<{
    id: string;
    changes: Array<{
      value: WhatsAppValue;
      field: 'messages';
    }>;
  }>;
}
