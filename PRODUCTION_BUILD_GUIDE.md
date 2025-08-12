# Production Build Guide

This guide explains how to properly build and run the canteen application in production mode.

## The Problem

When running `npm run build` followed by `npm run start`, the browser shows Firebase environment variable errors and a blank white screen. This happens because:

1. **Build Process**: Vite needs Firebase environment variables available during build time to embed them in the JavaScript bundle
2. **Environment Variables**: The variables are stored in Replit Secrets but need to be accessible to the build process
3. **Default Build Script**: The standard `npm run build` doesn't explicitly provide environment variables to Vite

## The Solution

Use the custom build script that ensures Firebase environment variables are available during build:

### ✅ Correct Production Build Process

```bash
# Step 1: Use the custom build script (recommended)
node scripts/build.js

# Step 2: Start the production server  
npm run start
```

### ❌ Standard Build (Not Recommended)

```bash
# This will cause Firebase errors in production
npm run build  # Missing Firebase env vars during build
npm run start  # Results in blank page with Firebase errors
```

## Build Script Features

The custom build script (`scripts/build.js`) provides:

- **Environment Variable Validation**: Checks that required Firebase variables are available
- **Build Process**: Runs Vite build with proper environment context
- **Error Handling**: Provides clear error messages if variables are missing
- **Comprehensive Output**: Shows detailed build progress and results

## Required Environment Variables

The following environment variables must be set in Replit Secrets:

- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_PROJECT_ID` 
- `VITE_FIREBASE_APP_ID`

## Verification

After building, you can verify the build worked correctly:

```bash
# Check if Firebase values are embedded in the build
grep -q "kit-canteeen" dist/public/assets/index-*.js && echo "✅ Build successful"
```

## Alternative: Standard Build with Environment Variables

If you prefer to use the standard build process, ensure environment variables are explicitly passed:

```bash
VITE_FIREBASE_API_KEY="$VITE_FIREBASE_API_KEY" VITE_FIREBASE_PROJECT_ID="$VITE_FIREBASE_PROJECT_ID" VITE_FIREBASE_APP_ID="$VITE_FIREBASE_APP_ID" npm run build
```

## Deployment

For production deployment on Replit:

1. Use the custom build script: `node scripts/build.js`
2. The built application will be in the `dist/` directory
3. Static files are in `dist/public/`  
4. Server bundle is `dist/index.js`

## Troubleshooting

If you still see Firebase errors:

1. **Check Secrets**: Verify all Firebase variables are set in Replit Secrets
2. **Rebuild**: Run `node scripts/build.js` again
3. **Clear Cache**: Delete `dist/` folder and rebuild
4. **Verify Build**: Check that Firebase values are embedded using the verification command above

## Files

- `scripts/build.js` - Custom production build script
- `scripts/debug-env.js` - Environment variable debugging
- `scripts/test-production.js` - Production testing server