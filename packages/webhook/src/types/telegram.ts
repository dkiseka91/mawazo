/**
 * Telegram Bot API update payload types.
 * Reference: https://core.telegram.org/bots/api#update
 */

export interface TelegramUser {
  id: number;
  is_bot: boolean;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
}

export interface TelegramChat {
  id: number;
  type: 'private' | 'group' | 'supergroup' | 'channel';
  first_name?: string;
  username?: string;
}

export interface TelegramTextMessage {
  message_id: number;
  from: TelegramUser;
  chat: TelegramChat;
  date: number;
  text: string;
}

export interface TelegramPhotoMessage {
  message_id: number;
  from: TelegramUser;
  chat: TelegramChat;
  date: number;
  photo: Array<{ file_id: string; width: number; height: number }>;
  caption?: string;
}

export interface TelegramVoiceMessage {
  message_id: number;
  from: TelegramUser;
  chat: TelegramChat;
  date: number;
  voice: { file_id: string; duration: number; mime_type?: string };
}

export type TelegramMessage =
  | TelegramTextMessage
  | TelegramPhotoMessage
  | TelegramVoiceMessage
  | { message_id: number; from: TelegramUser; chat: TelegramChat; date: number };

export interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
  edited_message?: TelegramMessage;
}
