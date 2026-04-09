/**
 * MTN MoMo API client — STUB IMPLEMENTATION
 *
 * This module provides the interface for MTN Mobile Money integration.
 * All methods return stub data at MVP stage. Full implementation
 * requires an approved MTN MoMo API subscription from:
 * https://momodeveloper.mtn.com
 *
 * To activate:
 * 1. Apply for MTN MoMo Collections API access
 * 2. Set MOMO_SUBSCRIPTION_KEY, MOMO_API_USER, MOMO_API_KEY in .env
 * 3. Replace stub methods with real HTTP calls to the MoMo API
 *    (see MTN MoMo API reference: https://momodeveloper.mtn.com/api-documentation)
 * 4. Implement OAuth2 token refresh (tokens expire every hour)
 * 5. Store encrypted tokens in momo_connections table
 */

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
    super(`MoMo ${method} is not yet implemented. See packages/momo/src/momoClient.ts for activation steps.`);
    this.name = 'NotImplementedError';
  }
}

export class MoMoClient {
  private readonly config: MoMoClientConfig;

  constructor(config: MoMoClientConfig) {
    // Validate required config at construction time — fail fast
    const required: (keyof MoMoClientConfig)[] = [
      'subscriptionKey', 'apiUser', 'apiKey', 'baseUrl', 'targetEnvironment',
    ];
    for (const key of required) {
      if (!config[key]) {
        throw new Error(`MoMoClient: missing required config: ${key}`);
      }
    }
    this.config = config;
    logger.info({ baseUrl: config.baseUrl, env: config.targetEnvironment }, 'MoMo client initialised (stub)');
  }

  /**
   * Check the balance of a linked MoMo account.
   *
   * TODO: Replace stub with GET /collection/v1_0/account/balance
   * Requires Bearer token from OAuth2 token endpoint.
   */
  async checkBalance(_accountNumber: string): Promise<MoMoBalance> {
    logger.warn('checkBalance called — returning stub data (not implemented)');
    // TODO: Implement MTN MoMo Collections API balance check
    return {
      availableBalance: 0,
      currency: 'UGX',
      provider: 'mtn_momo',
    };
  }

  /**
   * Fetch transaction history for a MoMo account within a date range.
   *
   * TODO: Replace stub with GET /collection/v1_0/accountholder/MSISDN/{accountNumber}/basicuserinfo
   * Note: MTN MoMo API does not provide full transaction history via API —
   * this typically requires a partnership agreement for statement access.
   * Alternative: prompt user to forward MoMo SMS notifications for parsing.
   */
  async getTransactionHistory(
    _accountNumber: string,
    _from: Date,
    _to: Date
  ): Promise<MoMoTransaction[]> {
    logger.warn('getTransactionHistory called — returning stub [] (not implemented)');
    // TODO: Implement transaction history retrieval
    return [];
  }

  /**
   * Initiate a payment request (Collections API — pull payment from customer).
   *
   * TODO: Replace stub with POST /collection/v1_0/requesttopay
   * Headers required: X-Reference-Id (UUID), X-Target-Environment, Ocp-Apim-Subscription-Key
   *
   * @throws NotImplementedError — do not call in production until implemented
   */
  async initiatePayment(_input: InitiatePaymentInput): Promise<InitiatePaymentResult> {
    logger.warn('initiatePayment called — stub, throwing NotImplementedError');
    // TODO: Implement MTN MoMo Collections payment initiation
    throw new NotImplementedError('initiatePayment');
  }

  /**
   * Get the status of a previously initiated payment.
   *
   * TODO: Implement GET /collection/v1_0/requesttopay/{referenceId}
   */
  async getPaymentStatus(_referenceId: string): Promise<string> {
    logger.warn('getPaymentStatus called — stub, throwing NotImplementedError');
    // TODO: Implement payment status check
    throw new NotImplementedError('getPaymentStatus');
  }
}

/**
 * Create a MoMoClient from environment variables.
 * Returns null if any required env vars are missing (MoMo is optional at MVP).
 */
export function createMoMoClientFromEnv(): MoMoClient | null {
  const { MOMO_SUBSCRIPTION_KEY, MOMO_API_USER, MOMO_API_KEY, MOMO_BASE_URL, MOMO_TARGET_ENVIRONMENT } = process.env;

  if (!MOMO_SUBSCRIPTION_KEY || !MOMO_API_USER || !MOMO_API_KEY) {
    logger.info('MoMo env vars not set — MoMo integration disabled');
    return null;
  }

  return new MoMoClient({
    subscriptionKey:   MOMO_SUBSCRIPTION_KEY,
    apiUser:           MOMO_API_USER,
    apiKey:            MOMO_API_KEY,
    baseUrl:           MOMO_BASE_URL ?? 'https://sandbox.momodeveloper.mtn.com',
    targetEnvironment: (MOMO_TARGET_ENVIRONMENT as 'sandbox' | 'production') ?? 'sandbox',
  });
}
