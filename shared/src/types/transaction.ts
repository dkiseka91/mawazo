export type TransactionType = 'debit' | 'credit';
export type TransactionSource = 'whatsapp' | 'momo' | 'manual' | 'ocr';

export interface Transaction {
  id: string;
  business_id: string;
  amount_ugx: number;
  type: TransactionType;
  category_id: string | null;
  description: string | null;
  source: TransactionSource;
  receipt_url: string | null;
  transaction_date: Date;
  created_at: Date;
  updated_at: Date;
}

export interface CreateTransactionInput {
  business_id: string;
  amount_ugx: number;
  type: TransactionType;
  category_id?: string;
  description?: string;
  source?: TransactionSource;
  transaction_date?: Date;
}

export interface TransactionSummary {
  total_income_ugx: number;
  total_expenses_ugx: number;
  net_ugx: number;
  period_start: Date;
  period_end: Date;
}
