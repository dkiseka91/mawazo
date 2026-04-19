/**
 * MTN MoMo Collections API client.
 *
 * Implements OAuth2 token management + request-to-pay flow.
 *
 * To activate:
 * 1. Register at https://momodeveloper.mtn.com and subscribe to Collections
 * 2. Create API user/key via the provisioning API (sandbox) or get them from MTN (production)
 * 3. Set env vars: MOMO_SUBSCRIPTION_KEY, MOMO_API_USER, MOMO_API_KEY,
 *                  MOMO_BASE_URL (sandbox: https://sandbox.momodeveloper.mtn.com),
 *                  MOMO_TARGET_ENVIRONMENT (sandbox | mtnuganda)
 */

import axios from 'axios';
import crypto from 'crypto';
import { createLogger } from '@mawazo/shared';
import type {
  MoMoBalance,
  MoMoTransaction,
  InitiatePaymentInput,
  InitiatePaymentResult,
  MoMoClientConfig,
} from './types/momo';

const logger = createLogger('momo');

export class NotImplementedError extends Error {
  constructor(method: string) {
    super(`MoMo ${method} not yet implemented. See packages/momo/src/momoClient.ts.`);
    this.name = 'NotImplementedError';
  }
}

export class MoMoClient {
  private readonly config: MoMoClientConfig;
  private accessToken:  string | null = null;
  private tokenExpiry:  number = 0;

  constructor(config: MoMoClientConfig) {
    const required: (keyof MoMoClientConfig)[] = [
      'subscriptionKey', 'apiUser', 'apiKey', 'baseUrl', 'targetEnvironment',
    ];
    for (const key of required) {
      if (!config[key]) throw new Error(`MoMoClient: missing required config: ${key}`);
    }
    this.config = config;
    logger.info({ baseUrl: config.baseUrl, env: config.targetEnvironment }, 'MoMo client initialised');
  }

  // ── OAuth2 token ─────────────────────────────────────────────────────────────

  private async getAccessToken(): Promise<string> {
    // Reuse cached token if it won't expire in the next 60 s
    if (this.accessToken && Date.now() < this.tokenExpiry - 60_000) {
      return this.accessToken;
    }

    const credentials = Buffer.from(`${this.config.apiUser}:${this.config.apiKey}`).toString('base64');
    const { data } = await axios.post<{ access_token: string; expires_in: number }>(
      `${this.config.baseUrl}/collection/token/`,
      null,
      {
        headers: {
          Authorization: `Basic ${credentials}`,
          'Ocp-Apim-Subscription-Key': this.config.subscriptionKey,
        },
        timeout: 10_000,
      }
    );

    this.accessToken = data.access_token;
    this.tokenExpiry = Date.now() + data.expires_in * 1_000;
    return this.accessToken;
  }

  // ── Collections API ───────────────────────────────────────────────────────────

  /**
   * Initiate a request-to-pay (pull payment from customer's MoMo wallet).
   * Returns a referenceId — use getPaymentStatus() to poll for completion.
   *
   * POST /collection/v1_0/requesttopay
   */
  async initiatePayment(input: InitiatePaymentInput): Promise<InitiatePaymentResult> {
    const token       = await this.getAccessToken();
    const referenceId = crypto.randomUUID();

    await axios.post(
      `${this.config.baseUrl}/collection/v1_0/requesttopay`,
      {
        amount:     input.amount.toString(),
        currency:   input.currency,
        externalId: input.externalId,
        payer: {
          partyIdType: 'MSISDN',
          partyId:     input.payerPhoneNumber,
        },
        payerMessage: input.payerMessage,
        payeeNote:    input.payeeNote,
      },
      {
        headers: {
          Authorization:              `Bearer ${token}`,
          'X-Reference-Id':           referenceId,
          'X-Target-Environment':     this.config.targetEnvironment,
          'Ocp-Apim-Subscription-Key': this.config.subscriptionKey,
          'Content-Type':             'application/json',
          ...(this.config.callbackUrl
            ? { 'X-Callback-Url': this.config.callbackUrl }
            : {}),
        },
        timeout: 15_000,
      }
    );

    logger.info({ referenceId, amount: input.amount, payer: input.payerPhoneNumber }, 'MoMo payment initiated');
    return { referenceId, status: 'PENDING' };
  }

  /**
   * Poll payment status.
   * Returns: 'SUCCESSFUL' | 'FAILED' | 'PENDING'
   *
   * GET /collection/v1_0/requesttopay/{referenceId}
   */
  async getPaymentStatus(referenceId: string): Promise<string> {
    const token = await this.getAccessToken();
    const { data } = await axios.get<{ status: string }>(
      `${this.config.baseUrl}/collection/v1_0/requesttopay/${referenceId}`,
      {
        headers: {
          Authorization:              `Bearer ${token}`,
          'X-Target-Environment':     this.config.targetEnvironment,
          'Ocp-Apim-Subscription-Key': this.config.subscriptionKey,
        },
        timeout: 10_000,
      }
    );
    return data.status;
  }

  /**
   * Check wallet balance.
   * GET /collection/v1_0/account/balance
   */
  async checkBalance(_accountNumber: string): Promise<MoMoBalance> {
    const token = await this.getAccessToken();
    const { data } = await axios.get<{ availableBalance: string; currency: string }>(
      `${this.config.baseUrl}/collection/v1_0/account/balance`,
      {
        headers: {
          Authorization:              `Bearer ${token}`,
          'X-Target-Environment':     this.config.targetEnvironment,
          'Ocp-Apim-Subscription-Key': this.config.subscriptionKey,
        },
        timeout: 10_000,
      }
    );
    return {
      availableBalance: parseFloat(data.availableBalance),
      currency:         data.currency,
      provider:         'mtn_momo',
    };
  }

  // Transaction history is not available via standard MTN Open API —
  // requires a separate statement-access partnership agreement.
  async getTransactionHistory(
    _accountNumber: string,
    _from: Date,
    _to: Date
  ): Promise<MoMoTransaction[]> {
    logger.warn('getTransactionHistory not available via MTN Open API — returning []');
    return [];
  }
}

/**
 * Create a MoMoClient from environment variables.
 * Returns null if required env vars are absent (MoMo is optional at MVP).
 */
export function createMoMoClientFromEnv(): MoMoClient | null {
  const {
    MOMO_SUBSCRIPTION_KEY,
    MOMO_API_USER,
    MOMO_API_KEY,
    MOMO_BASE_URL,
    MOMO_TARGET_ENVIRONMENT,
    MOMO_CALLBACK_URL,
  } = process.env;

  if (!MOMO_SUBSCRIPTION_KEY || !MOMO_API_USER || !MOMO_API_KEY) {
    logger.info('MoMo env vars not set — MoMo integration disabled');
    return null;
  }

  return new MoMoClient({
    subscriptionKey:   MOMO_SUBSCRIPTION_KEY,
    apiUser:           MOMO_API_USER,
    apiKey:            MOMO_API_KEY,
    baseUrl:           MOMO_BASE_URL ?? 'https://sandbox.momodeveloper.mtn.com',
    targetEnvironment: (MOMO_TARGET_ENVIRONMENT as 'sandbox' | 'mtnuganda') ?? 'sandbox',
    callbackUrl:       MOMO_CALLBACK_URL,
  });
}
