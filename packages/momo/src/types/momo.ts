export type MoMoProvider = 'mtn_momo' | 'airtel_money';

export interface MoMoBalance {
  availableBalance: number;  // whole UGX
  currency: string;          // 'UGX'
  provider: MoMoProvider;
}

export interface MoMoTransaction {
  transactionId: string;
  type: 'credit' | 'debit';
  amount: number;            // whole UGX
  currency: string;
  payer?: {
    partyIdType: 'MSISDN';
    partyId: string;         // phone number
  };
  payee?: {
    partyIdType: 'MSISDN';
    partyId: string;
  };
  reason: string;
  status: 'SUCCESSFUL' | 'FAILED' | 'PENDING';
  financialTransactionId?: string;
  createdTime: string;       // ISO datetime
  completedTime?: string;
}

export interface InitiatePaymentInput {
  amount: number;            // whole UGX
  currency: string;
  externalId: string;        // idempotency key — use our transaction UUID
  payerPhoneNumber: string;
  payerMessage: string;
  payeeNote: string;
}

export interface InitiatePaymentResult {
  referenceId: string;       // MoMo reference UUID
  status: 'PENDING';
}

export interface MoMoClientConfig {
  subscriptionKey: string;
  apiUser: string;
  apiKey: string;
  baseUrl: string;
  targetEnvironment: 'sandbox' | 'production';
}
