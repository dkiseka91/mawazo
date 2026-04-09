export type SubscriptionTier = 'free' | 'starter' | 'growth' | 'pro';

export interface Business {
  id: string;
  phone_number: string;
  name: string | null;
  type: string | null;
  industry: string | null;
  currency: string;
  tin_number: string | null;
  onboarding_complete: boolean;
  subscription_tier: SubscriptionTier;
  created_at: Date;
  updated_at: Date;
}

export interface CreateBusinessInput {
  phone_number: string;
  name?: string;
  type?: string;
  industry?: string;
}
