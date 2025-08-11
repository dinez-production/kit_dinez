import crypto from 'crypto';

// PhonePe Configuration - loaded from environment variables
export const PHONEPE_CONFIG = {
  MERCHANT_ID: process.env.PHONEPE_MERCHANT_ID || 'PGTESTPAYUAT86',
  SALT_KEY: process.env.PHONEPE_SALT_KEY || '96434309-7796-489d-8924-ab56988a6076',
  SALT_INDEX: process.env.PHONEPE_SALT_INDEX || '1',
  BASE_URL: process.env.PHONEPE_BASE_URL || 'https://api-preprod.phonepe.com/apis/pg-sandbox',
  CALLBACK_VERSION: '/pg/v1/callback'
};

// Generate checksum for payment initiation
export function generatePaymentChecksum(payload: any, endpoint: string): string {
  const base64Payload = Buffer.from(JSON.stringify(payload)).toString('base64');
  const string = base64Payload + endpoint + PHONEPE_CONFIG.SALT_KEY;
  const sha256 = crypto.createHash('sha256').update(string).digest('hex');
  return sha256 + '###' + PHONEPE_CONFIG.SALT_INDEX;
}

// Generate checksum for status verification
export function generateStatusChecksum(merchantTransactionId: string): string {
  const endpoint = `/pg/v1/status/${PHONEPE_CONFIG.MERCHANT_ID}/${merchantTransactionId}`;
  const string = endpoint + PHONEPE_CONFIG.SALT_KEY;
  const sha256 = crypto.createHash('sha256').update(string).digest('hex');
  return sha256 + '###' + PHONEPE_CONFIG.SALT_INDEX;
}

// Verify webhook checksum
export function verifyWebhookChecksum(payload: any, receivedChecksum: string): boolean {
  const payloadString = JSON.stringify(payload);
  const string = payloadString + PHONEPE_CONFIG.CALLBACK_VERSION + PHONEPE_CONFIG.SALT_KEY;
  const expectedChecksum = crypto.createHash('sha256').update(string).digest('hex') + '###' + PHONEPE_CONFIG.SALT_INDEX;
  return receivedChecksum === expectedChecksum;
}

// Create payment payload
export function createPaymentPayload(
  merchantTransactionId: string,
  amount: number,
  customerName: string,
  redirectUrl: string,
  callbackUrl: string
) {
  return {
    merchantId: PHONEPE_CONFIG.MERCHANT_ID,
    merchantTransactionId,
    merchantUserId: `USER_${Date.now()}`,
    amount: amount * 100, // Convert to paise
    redirectUrl,
    callbackUrl,
    paymentInstrument: {
      type: 'PAY_PAGE'
    }
  };
}

// Payment status codes
export const PAYMENT_STATUS = {
  PENDING: 'pending',
  SUCCESS: 'success', 
  FAILED: 'failed',
  TIMEOUT: 'timeout'
} as const;

// Response codes from PhonePe
export const PHONEPE_RESPONSE_CODES = {
  PAYMENT_SUCCESS: 'PAYMENT_SUCCESS',
  PAYMENT_FAILED: 'PAYMENT_FAILED', 
  PAYMENT_PENDING: 'PAYMENT_PENDING',
  PAYMENT_INITIATED: 'PAYMENT_INITIATED',
  BAD_REQUEST: 'BAD_REQUEST',
  AUTHORIZATION_FAILED: 'AUTHORIZATION_FAILED',
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
  TRANSACTION_TIMEOUT: 'TRANSACTION_TIMEOUT'
} as const;