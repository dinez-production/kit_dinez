# PhonePe Payment Gateway - Complete Process Flow Documentation

## Overview

PhonePe Payment Gateway provides a secure, reliable payment processing solution for digital transactions. This document outlines the complete payment workflow, from initiation to completion, including all API interactions and security measures.

## Table of Contents

1. [Payment Flow Architecture](#payment-flow-architecture)
2. [Step-by-Step Process](#step-by-step-process)
3. [API Endpoints & Integration](#api-endpoints--integration)
4. [Security & Checksum Validation](#security--checksum-validation)
5. [Webhook Handling](#webhook-handling)
6. [Status Verification](#status-verification)
7. [Error Handling](#error-handling)
8. [Testing & Sandbox](#testing--sandbox)

---

## Payment Flow Architecture

```
Customer → Your Website → PhonePe API → PhonePe Payment Page → Bank/UPI → PhonePe → Webhook → Your Server
    ↓                                                                                        ↓
Success/Failure Page ← Your Website ← Status Verification ← Your Server ←─────────────────┘
```

### Key Components

- **Merchant Application**: Your website/app initiating payments
- **PhonePe Payment Gateway**: Processes payment requests and responses
- **Payment Page**: PhonePe's secure payment interface
- **Webhook System**: Real-time payment status notifications
- **Status API**: For verifying payment completion

---

## Step-by-Step Process

### Phase 1: Payment Initiation

**1. Customer Action**
- Customer fills payment form (amount, details)
- Clicks "Pay Now" button

**2. Merchant Processing**
- Generate unique `merchantTransactionId`
- Create payment payload with customer details
- Calculate SHA256 checksum for security
- Make API call to PhonePe `/pay` endpoint

**3. PhonePe Response**
- Returns payment URL if successful
- Provides `merchantTransactionId` for tracking
- Customer redirected to PhonePe payment page

### Phase 2: Payment Processing

**4. Payment Page Interaction**
- Customer selects payment method (UPI/Cards/Net Banking)
- Enters payment credentials
- Completes authentication (OTP/PIN)

**5. Bank/Payment Processor**
- Validates customer credentials
- Processes the transaction
- Returns success/failure to PhonePe

### Phase 3: Payment Completion

**6. PhonePe Processing**
- Receives bank response
- Updates transaction status
- Triggers webhook to merchant (if configured)
- Redirects customer to merchant's success/failure page

**7. Merchant Verification**
- Receives webhook notification (optional)
- Calls status verification API
- Updates local database
- Shows final status to customer

---

## API Endpoints & Integration

### 1. Payment Initiation API

**Endpoint**: `POST /apis/hermes/pg/v1/pay`

**Request Structure**:
```json
{
  "request": "base64_encoded_payment_data"
}
```

**Payment Data (before encoding)**:
```json
{
  "merchantId": "YOUR_MERCHANT_ID",
  "merchantTransactionId": "TXN_UNIQUE_ID",
  "merchantUserId": "USER_ID",
  "amount": 50000,
  "redirectUrl": "https://yoursite.com/payment-callback",
  "callbackUrl": "https://yoursite.com/webhook",
  "paymentInstrument": {
    "type": "PAY_PAGE"
  }
}
```

**Headers Required**:
```
Content-Type: application/json
X-VERIFY: checksum###salt_index
```

**Response Structure**:
```json
{
  "success": true,
  "code": "PAYMENT_INITIATED",
  "message": "Payment initiated",
  "data": {
    "merchantId": "YOUR_MERCHANT_ID",
    "merchantTransactionId": "TXN_UNIQUE_ID",
    "instrumentResponse": {
      "type": "PAY_PAGE",
      "redirectInfo": {
        "url": "https://mercury-t2.phonepe.com/transact/...",
        "method": "GET"
      }
    }
  }
}
```

### 2. Payment Status Check API

**Endpoint**: `GET /apis/hermes/pg/v1/status/{merchantId}/{merchantTransactionId}`

**Headers Required**:
```
Content-Type: application/json
X-VERIFY: checksum###salt_index
X-MERCHANT-ID: YOUR_MERCHANT_ID
```

**Response Structure**:
```json
{
  "success": true,
  "code": "PAYMENT_SUCCESS",
  "message": "Your payment is successful.",
  "data": {
    "merchantId": "YOUR_MERCHANT_ID",
    "merchantTransactionId": "TXN_UNIQUE_ID",
    "transactionId": "PhonePe_Transaction_ID",
    "amount": 50000,
    "state": "COMPLETED",
    "responseCode": "SUCCESS",
    "paymentInstrument": {
      "type": "UPI"
    }
  }
}
```

---

## Security & Checksum Validation

### Checksum Generation Process

**Purpose**: Ensures data integrity and authentication

**Formula**:
```
checksum = SHA256(base64_payload + endpoint_path + salt_key) + "###" + salt_index
```

**Example Implementation**:
```javascript
const crypto = require('crypto');

function generateChecksum(payload, endpoint, saltKey, saltIndex) {
  const base64Payload = Buffer.from(JSON.stringify(payload)).toString('base64');
  const string = base64Payload + endpoint + saltKey;
  const sha256 = crypto.createHash('sha256').update(string).digest('hex');
  return sha256 + '###' + saltIndex;
}
```

### Checksum Verification

**For Incoming Webhooks**:
```javascript
function verifyChecksum(receivedChecksum, payload, saltKey) {
  const payloadString = JSON.stringify(payload);
  const expectedChecksum = crypto.createHash('sha256')
    .update(payloadString + '/pg/v1/callback' + saltKey)
    .digest('hex') + '###1';
  
  return receivedChecksum === expectedChecksum;
}
```

---

## Webhook Handling

### Webhook Configuration

**Purpose**: Real-time payment status notifications

**Endpoint Setup**: Configure `callbackUrl` in payment initiation

**Webhook Payload Structure**:
```json
{
  "code": "PAYMENT_SUCCESS",
  "message": "Your payment is successful.",
  "data": {
    "merchantId": "YOUR_MERCHANT_ID",
    "merchantTransactionId": "TXN_UNIQUE_ID",
    "transactionId": "PhonePe_Transaction_ID",
    "amount": 50000,
    "state": "COMPLETED",
    "responseCode": "SUCCESS",
    "paymentInstrument": {
      "type": "UPI"
    }
  }
}
```

### Webhook Processing Steps

1. **Receive POST Request**
   - PhonePe sends POST to your callback URL
   - Includes `X-VERIFY` header with checksum

2. **Verify Checksum**
   - Extract checksum from `X-VERIFY` header
   - Calculate expected checksum
   - Compare for authenticity

3. **Process Payment Status**
   - Update local database
   - Trigger business logic (send emails, update orders)
   - Return HTTP 200 response

4. **Error Handling**
   - Log failed webhook attempts
   - Return appropriate HTTP status codes
   - PhonePe retries failed webhooks

### Sample Webhook Handler

```javascript
app.post('/webhook/phonepe', (req, res) => {
  try {
    const receivedChecksum = req.headers['x-verify'];
    const payload = req.body;
    
    // Verify checksum
    if (!verifyChecksum(receivedChecksum, payload, SALT_KEY)) {
      return res.status(401).json({ success: false, message: 'Invalid checksum' });
    }
    
    // Process payment
    const { merchantTransactionId, state, responseCode } = payload.data;
    
    if (state === 'COMPLETED' && responseCode === 'SUCCESS') {
      // Payment successful - update database
      updatePaymentStatus(merchantTransactionId, 'SUCCESS');
      // Trigger success actions (send confirmation email, etc.)
    } else {
      // Payment failed - update database
      updatePaymentStatus(merchantTransactionId, 'FAILED');
    }
    
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Webhook processing error:', error);
    res.status(500).json({ success: false, message: 'Processing failed' });
  }
});
```

---

## Status Verification

### When to Verify Status

1. **After Redirect**: When customer returns from payment page
2. **Webhook Backup**: If webhook fails or is delayed
3. **Periodic Checks**: For pending transactions
4. **Manual Verification**: Admin/support queries

### Status Check Implementation

```javascript
async function verifyPaymentStatus(merchantTransactionId) {
  const endpoint = `/pg/v1/status/${MERCHANT_ID}/${merchantTransactionId}`;
  const checksum = generateStatusChecksum(merchantTransactionId, endpoint, SALT_KEY, SALT_INDEX);
  
  const response = await axios.get(`${PHONEPE_BASE_URL}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      'X-VERIFY': checksum,
      'X-MERCHANT-ID': MERCHANT_ID
    }
  });
  
  return response.data;
}

function generateStatusChecksum(merchantTransactionId, endpoint, saltKey, saltIndex) {
  const string = endpoint + saltKey;
  const sha256 = crypto.createHash('sha256').update(string).digest('hex');
  return sha256 + '###' + saltIndex;
}
```

---

## Error Handling

### Common Error Scenarios

#### 1. Payment Initiation Errors

**Invalid Checksum**:
- **Code**: `BAD_REQUEST`
- **Action**: Regenerate checksum, verify salt key
- **Fix**: Check payload formatting and salt key

**Invalid Amount**:
- **Code**: `BAD_REQUEST`
- **Action**: Validate amount (minimum ₹1, maximum limits)
- **Fix**: Amount in paise (₹100 = 10000 paise)

**Merchant Configuration Issues**:
- **Code**: `AUTHORIZATION_FAILED`
- **Action**: Contact PhonePe support
- **Fix**: Verify merchant ID and configuration

#### 2. Payment Processing Errors

**Insufficient Balance**:
- **Code**: `PAYMENT_DECLINED`
- **Customer Action**: Try different payment method
- **Merchant Action**: Display appropriate error message

**Bank Server Down**:
- **Code**: `INTERNAL_SERVER_ERROR`
- **Customer Action**: Retry after some time
- **Merchant Action**: Implement retry logic

**Transaction Timeout**:
- **Code**: `TRANSACTION_TIMEOUT`
- **Customer Action**: Check status before retrying
- **Merchant Action**: Status verification API call

#### 3. Webhook Processing Errors

**Checksum Mismatch**:
- **Action**: Log incident, don't process payment
- **Investigation**: Check salt key, payload format

**Network Failures**:
- **PhonePe Action**: Automatic retry (up to 5 attempts)
- **Merchant Action**: Handle duplicate webhooks

### Error Response Format

```json
{
  "success": false,
  "code": "ERROR_CODE",
  "message": "Human readable error message",
  "data": {
    "merchantId": "YOUR_MERCHANT_ID",
    "merchantTransactionId": "TXN_UNIQUE_ID",
    "errorDetails": "Additional error information"
  }
}
```

### Best Practices for Error Handling

1. **Graceful Degradation**
   - Always show user-friendly error messages
   - Provide alternative payment methods
   - Keep technical details in logs

2. **Retry Logic**
   - Implement exponential backoff
   - Maximum retry attempts (3-5 times)
   - Different strategies for different error types

3. **Monitoring & Alerting**
   - Track error rates and patterns
   - Set up alerts for high failure rates
   - Monitor response times

4. **Customer Communication**
   - Clear error messages in user's language
   - Suggest next steps
   - Provide support contact information

---

## Testing & Sandbox

### Sandbox Environment

**Base URL**: `https://api-preprod.phonepe.com/apis/pg-sandbox`

**Test Credentials**:
```
Merchant ID: PGTESTPAYUAT86
Salt Key: 96434309-7796-489d-8924-ab56988a6076
Salt Index: 1
```

### Test Scenarios

#### 1. Successful Payment Testing

**Method 1: Simulation (Recommended for Development)**
- Initiate payment normally
- Use simulation endpoint to mark as successful
- Verify webhook and status API responses

**Method 2: PhonePe Test App**
- Download PhonePe Simulator app
- Configure success templates
- Complete payment flow on test app

#### 2. Failed Payment Testing

**Method 1: Default Sandbox Behavior**
- Most sandbox payments fail by default
- Test error handling and user experience

**Method 2: Specific Error Simulation**
- Test different failure scenarios
- Insufficient balance, network errors, etc.

### Test Cases Checklist

**Payment Initiation**:
- [ ] Valid payment request succeeds
- [ ] Invalid amount rejected
- [ ] Invalid checksum rejected
- [ ] Malformed payload rejected

**Payment Processing**:
- [ ] Successful payment flow
- [ ] Failed payment handling
- [ ] Timeout scenarios
- [ ] Network failure recovery

**Webhook Handling**:
- [ ] Success webhook processed correctly
- [ ] Failure webhook processed correctly
- [ ] Invalid checksum rejected
- [ ] Duplicate webhook handling

**Status Verification**:
- [ ] Completed payment status retrieved
- [ ] Failed payment status retrieved
- [ ] Pending payment status handling
- [ ] Non-existent transaction handling

### Sample Test Implementation

```javascript
// Test Suite Example
describe('PhonePe Payment Flow', () => {
  test('should initiate payment successfully', async () => {
    const paymentData = {
      merchantId: 'PGTESTPAYUAT86',
      merchantTransactionId: 'TEST_' + Date.now(),
      amount: 10000,
      // ... other required fields
    };
    
    const response = await initiatePayment(paymentData);
    expect(response.success).toBe(true);
    expect(response.data.instrumentResponse.redirectInfo.url).toBeDefined();
  });
  
  test('should handle webhook correctly', async () => {
    const webhookPayload = {
      code: 'PAYMENT_SUCCESS',
      data: {
        merchantTransactionId: 'TEST_123',
        state: 'COMPLETED',
        responseCode: 'SUCCESS'
      }
    };
    
    const response = await processWebhook(webhookPayload);
    expect(response.success).toBe(true);
  });
  
  test('should verify payment status', async () => {
    const status = await verifyPaymentStatus('TEST_123');
    expect(status.data.state).toBe('COMPLETED');
  });
});
```

---

## Production Deployment Considerations

### 1. Environment Configuration

**Production URLs**:
```
Base URL: https://api.phonepe.com/apis/hermes
```

**Security Requirements**:
- Use HTTPS for all endpoints
- Implement rate limiting
- Add IP whitelisting if required
- Store salt keys securely (environment variables)

### 2. Monitoring & Logging

**Key Metrics to Track**:
- Payment success rates
- Average payment processing time
- Webhook delivery success rates
- API response times
- Error rates by type

**Logging Best Practices**:
- Log all API requests/responses (exclude sensitive data)
- Track payment lifecycle events
- Monitor webhook processing
- Set up alerting for failures

### 3. Performance Optimization

**Caching Strategies**:
- Cache payment status for short periods
- Implement database connection pooling
- Use CDN for static assets

**Scalability Considerations**:
- Implement queue systems for webhook processing
- Use load balancers for high traffic
- Consider microservices architecture for large volumes

### 4. Compliance & Security

**Data Protection**:
- Never log sensitive payment data
- Implement PCI DSS compliance if handling card data
- Use encryption for data at rest
- Regular security audits

**Regulatory Compliance**:
- Follow RBI guidelines for digital payments
- Implement proper audit trails
- Maintain transaction records as required
- Regular compliance reviews

---

## Conclusion

This document provides a comprehensive overview of the PhonePe payment gateway integration process. The workflow involves secure API communication, proper checksum validation, webhook handling, and robust error management. 

Key success factors:
- Proper checksum implementation for security
- Reliable webhook processing
- Comprehensive error handling
- Thorough testing in sandbox environment
- Monitoring and alerting in production

For additional support and advanced features, refer to the official PhonePe Developer Documentation or contact their integration support team.

---

## Appendices

### A. Response Code Reference

| Code | Description | Action Required |
|------|-------------|----------------|
| PAYMENT_SUCCESS | Payment completed successfully | Update order status, send confirmation |
| PAYMENT_FAILED | Payment failed | Show error message, offer retry |
| PAYMENT_PENDING | Payment processing | Continue monitoring status |
| PAYMENT_INITIATED | Payment started | Redirect user to payment page |
| BAD_REQUEST | Invalid request format | Fix request parameters |
| AUTHORIZATION_FAILED | Invalid credentials | Check merchant configuration |

### B. Webhook Event Types

| Event | When Triggered | Recommended Action |
|-------|---------------|-------------------|
| PAYMENT_SUCCESS | Successful payment | Complete order processing |
| PAYMENT_FAILED | Failed payment | Update order, notify customer |
| PAYMENT_PENDING | Status unclear | Continue monitoring |
| REFUND_SUCCESS | Refund processed | Update records, notify customer |
| REFUND_FAILED | Refund failed | Manual investigation required |

### C. Testing Checklist

- [ ] Payment initiation with valid data
- [ ] Payment initiation with invalid data
- [ ] Successful payment flow end-to-end
- [ ] Failed payment handling
- [ ] Webhook processing (success/failure)
- [ ] Status verification API
- [ ] Checksum validation
- [ ] Error message display
- [ ] Retry mechanism
- [ ] Timeout handling

---

*Document Version: 1.0*  
*Last Updated: January 2025*  
*Author: PhonePe Integration Team*