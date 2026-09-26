import type { CustomerIdentity } from '@/features/session/session-slice';

export interface CustomerResponse {
  customer: CustomerIdentity;
}

export interface CustomerLoginInput {
  email: string;
  password: string;
}

export interface CustomerRegisterInput extends CustomerLoginInput {
  name: string;
}

export interface ChangeCustomerPasswordInput {
  currentPassword: string;
  newPassword: string;
}

export interface CustomerAuthMessageResponse {
  message: string;
}

export interface ForgotCustomerPasswordInput {
  email: string;
}

export interface CustomerActionTokenInput {
  token: string;
}

export interface ResetCustomerPasswordInput extends CustomerActionTokenInput {
  newPassword: string;
}

export interface UpdateCustomerProfileInput {
  name: string;
  expectedVersion: number;
}

export interface UpdateCustomerPreferencesInput {
  marketingEmail: boolean;
  backInStockEmail: boolean;
  orderUpdatesSms: boolean;
  orderUpdatesWhatsapp: boolean;
  expectedVersion: number;
}

export interface RequestCustomerEmailChangeInput {
  newEmail: string;
  currentPassword: string;
}

export interface RequestCustomerMobileChangeInput {
  mobile: string;
  currentPassword: string;
}

export interface CustomerMobileChallengeResponse {
  challengeId: string;
  expiresAt: string;
  developmentOtp?: string;
}

export interface ConfirmCustomerMobileChangeInput {
  challengeId: string;
  otp: string;
  expectedVersion: number;
}

export interface DeactivateCustomerAccountInput {
  currentPassword: string;
  confirmation: 'DEACTIVATE';
  reason?: string;
}
