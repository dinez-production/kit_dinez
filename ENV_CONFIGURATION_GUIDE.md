# Environment Configuration Guide

This guide explains all environment variables needed for the KIT-Canteen application.

## Database Configuration

### PostgreSQL
```env
DATABASE_URL=postgresql://username:password@host:port/database
POSTGRES_DB=kit_canteen
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your-password
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
```

### MongoDB
```env
MONGODB_URL=mongodb://username:password@host:port/database?authSource=admin
MONGO_DB=kit_canteen
MONGO_ROOT_USER=admin
MONGO_ROOT_PASSWORD=your-password
MONGO_HOST=localhost
MONGO_PORT=27017
```

## Firebase Configuration

### Admin SDK (Server-side)
These credentials are for server-side Firebase operations:

```env
FIREBASE_PROJECT_ID=your-firebase-project-id
FIREBASE_PRIVATE_KEY_ID=your-private-key-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nyour-private-key-here\n-----END PRIVATE KEY-----"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
FIREBASE_CLIENT_ID=your-client-id
FIREBASE_AUTH_URI=https://accounts.google.com/o/oauth2/auth
FIREBASE_TOKEN_URI=https://oauth2.googleapis.com/token
FIREBASE_AUTH_PROVIDER_X509_CERT_URL=https://www.googleapis.com/oauth2/v1/certs
FIREBASE_CLIENT_X509_CERT_URL=https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-xxxxx%40your-project.iam.gserviceaccount.com
```

**How to get Firebase Admin credentials:**
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Go to Project Settings (gear icon) → Service Accounts
4. Click "Generate new private key"
5. Download the JSON file
6. Extract the values for your .env file

### Client SDK (Frontend)
These are for client-side Firebase operations (prefixed with VITE_ for Vite):

```env
VITE_FIREBASE_API_KEY=your-web-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-firebase-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789012
VITE_FIREBASE_APP_ID=1:123456789012:web:abcdef123456
```

**How to get Firebase Client credentials:**
1. In Firebase Console → Project Settings → General
2. Scroll down to "Your apps" section
3. If no web app exists, click "Add app" → Web
4. Copy the config object values to your .env file

## PhonePe Payment Gateway Configuration

### Development (Sandbox)
```env
PHONEPE_MERCHANT_ID=your-test-merchant-id
PHONEPE_SALT_KEY=your-test-salt-key
PHONEPE_SALT_INDEX=1
PHONEPE_ENV=SANDBOX
PHONEPE_HOST_URL=https://api-preprod.phonepe.com/apis/pg-sandbox
PHONEPE_CALLBACK_URL=http://localhost:5000/api/phonepe/callback
PHONEPE_REDIRECT_URL=http://localhost:5000/payment-success
```

### Production
```env
PHONEPE_MERCHANT_ID=your-production-merchant-id
PHONEPE_SALT_KEY=your-production-salt-key
PHONEPE_SALT_INDEX=1
PHONEPE_ENV=PRODUCTION
PHONEPE_HOST_URL=https://api.phonepe.com/apis/hermes
PHONEPE_CALLBACK_URL=https://your-domain.com/api/phonepe/callback
PHONEPE_REDIRECT_URL=https://your-domain.com/payment-success
```

**How to get PhonePe credentials:**
1. Register at [PhonePe Business Portal](https://business.phonepe.com/)
2. Complete merchant onboarding
3. Get Merchant ID and Salt Key from merchant dashboard
4. Use sandbox credentials for development
5. Switch to production credentials after approval

## Application Configuration

```env
NODE_ENV=development|production
PORT=5000
JWT_SECRET=your-jwt-secret-key-min-64-chars
SESSION_SECRET=your-session-secret-key-min-32-chars
```

## Backup Configuration

```env
BACKUP_RETENTION_DAYS=30
BACKUP_PATH=./backups
```

## Health Check Configuration

```env
HEALTH_CHECK_URL=https://your-domain.com
```

## Optional External Services

### Stripe (if using)
```env
STRIPE_SECRET_KEY=sk_test_... (for dev)
STRIPE_SECRET_KEY=sk_live_... (for prod)
STRIPE_WEBHOOK_SECRET=whsec_...
```

### Twilio (if using)
```env
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_PHONE_NUMBER=+1234567890
```

### Sentry (error tracking)
```env
SENTRY_DSN=https://...
```

## Environment File Structure

```
├── .env                    # Local development
├── .env.example           # Template with sample values
├── .env.production        # Production values (never commit)
├── .env.staging           # Staging environment (if applicable)
└── .env.test             # Testing environment
```

## Security Best Practices

### Development
- Use sample/test credentials for development
- Keep .env in .gitignore
- Use different Firebase projects for dev/prod
- Use PhonePe sandbox for development

### Production
- Use strong, unique passwords
- Rotate secrets regularly
- Use environment variable injection in deployment
- Never commit production secrets
- Use secrets management services (AWS Secrets Manager, etc.)

## Validation Checklist

Before deployment, verify:

- [ ] All required environment variables are set
- [ ] Database connections work
- [ ] Firebase authentication is working
- [ ] PhonePe payment flow is tested
- [ ] Backup configuration is correct
- [ ] Health checks pass
- [ ] No development credentials in production

## Common Issues

### Firebase Connection Errors
- Check that FIREBASE_PRIVATE_KEY has proper line breaks
- Ensure Firebase project ID matches exactly
- Verify service account has proper permissions

### PhonePe Payment Failures
- Confirm merchant ID is active
- Check salt key is correct
- Verify callback URLs are accessible
- Ensure proper environment (SANDBOX vs PRODUCTION)

### Database Connection Issues
- Check connection string format
- Verify network access to database hosts
- Confirm credentials are correct
- Test with database client tools first

## Environment Variable Loading Order

1. System environment variables
2. .env.local (ignored by git)
3. .env.production / .env.development (based on NODE_ENV)
4. .env

Later files override earlier ones.