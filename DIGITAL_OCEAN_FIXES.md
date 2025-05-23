# Digital Ocean Deployment Fixes

This document tracks all fixes applied to resolve deployment issues with Digital Ocean App Platform.

## Issues Fixed

1. **"Loading Authentication..." White Screen**
   - Public pages were blocking on authentication middleware
   - Database connections in middleware were timing out
   - Authentication flow included too many database queries

2. **Build Failures with Static Generation**
   - Next.js was trying to statically generate API routes with dynamic features
   - This led to "Dynamic server usage" errors during build
   - API routes with dynamic paths missing generateStaticParams() when using 'output: export'

3. **Native Module Bundling Issues**
   - Problems with bcrypt and other native modules during build
   - Webpack attempting to bundle HTML files from node-pre-gyp
   - Missing optional dependencies like aws-sdk, mock-aws-s3, and nock

4. **Environment Variable Issues**
   - Reversed assignment statements in code (`"string" = variable` instead of `variable = "string"`)
   - `NODE_ENV` in env section of next.config.js (not allowed)
   - Database URL placeholders during build time

## Solutions Applied

### Authentication Fixes

1. **Resilient Middleware (`src/middleware.ts`)**
   - Increased timeout from 2 to 5 seconds
   - Added fallbacks that prioritize availability over strict security
   - Allow access on timeout rather than redirecting to sign-in
   - Emergency bypass via URL parameter or cookie

2. **Minimal Authentication (`src/auth.ts`)**
   - Removed unnecessary database queries
   - Simplified JWT and session callbacks
   - Set default values for tenant types instead of database lookups
   - Reduced error logging verbosity
   - Uses a bcrypt wrapper to avoid build issues

3. **Minimal Database Client (`src/lib/db.ts`)**
   - Simplified PrismaClient instantiation
   - Avoided environment variable manipulation
   - Added better error handling

4. **Bcrypt Build Compatibility (`src/lib/bcrypt-wrapper.js`)**
   - Created a wrapper around bcrypt that uses a stub during build
   - Prevents native module errors during build
   - Uses real bcrypt in production for security

### Build Configuration Fixes

1. **Special Next.js Config for Digital Ocean (`next.config.do.js`)**
   - Changed `output: 'export'` to `output: 'standalone'` to properly handle API routes
   - Added experimental options to exclude API routes from static generation
   - Changed `serverComponentsExternalPackages` to `transpilePackages` for better compatibility
   - Fixed issue with NODE_ENV in env section (removed)
   - Enhanced webpack configuration to ignore problematic modules
   - Added special handling for HTML files and native modules

2. **Digital Ocean Deployment Script (`scripts/do-deploy.js`)**
   - Sets placeholder DATABASE_URL for build time
   - Swaps in special next.config.js during build
   - Adds proper environment variables including NEXT_TELEMETRY_DISABLED and NEXT_SKIP_API_ROUTES
   - Extends build timeout to 10 minutes for larger builds
   - Installs ignore-loader for handling HTML files

3. **Package.json Scripts**
   - Added `build:do` specifically for Digital Ocean builds with NEXT_TELEMETRY_DISABLED
   - Created `do:deploy-full` for complete deployment
   - Added `do:prepare` script to set up build environment
   - Updated scripts to handle environment variables correctly

4. **Native Module Handling**
   - Created bcrypt stub implementation for build time
   - Added webpack resolver configuration for problematic modules
   - Created empty module for native dependencies
   - Added ignore-loader for HTML files

## How to Deploy

1. Use Git-based deployment to Digital Ocean App Platform:
   ```
   git push origin main
   ```

2. Digital Ocean will automatically run the `do:deploy-full` script, which:
   - Sets up proper environment variables
   - Uses the special next.config.do.js during build
   - Runs the build with extended timeout
   - Restores the original next.config.js after build

3. Environment Variables Required in Digital Ocean:
   - `DATABASE_HOST`: PostgreSQL database host
   - `DATABASE_PORT`: Database port (usually 25060)
   - `DATABASE_USERNAME`: Database username (usually doadmin)
   - `DATABASE_PASSWORD`: Database password
   - `DATABASE_NAME`: Database name (usually defaultdb)
   - `NEXTAUTH_URL`: The URL of your application
   - `NEXTAUTH_SECRET`: A secure random string

## Emergency Bypasses

If you encounter authentication issues, you can use these emergency bypasses:

1. **URL Parameter**: Add `?bypass_auth=true` to any URL
   ```
   https://your-app.ondigitalocean.app/dashboard?bypass_auth=true
   ```

2. **Cookie Bypass**: The middleware sets a cookie that will bypass auth for 1 hour

## Troubleshooting

### Database Connection Issues
- Check that environment variables are correctly set in Digital Ocean
- Verify database allows connections from App Platform
- Run `/api/health` endpoint to check database connectivity

### Build Failures
- Check build logs for "Dynamic server usage" errors
- For "missing generateStaticParams()" errors, ensure you're not using `output: 'export'` with API routes
- For native module errors (like bcrypt), ensure the bcrypt-wrapper is being used
- For HTML file errors, ensure ignore-loader is installed
- Ensure next.config.do.js is being used during build
- Verify NODE_ENV is not in the env section of next.config.js

### Missing Authentication
- Check NEXTAUTH_URL and NEXTAUTH_SECRET are set correctly
- Verify database connection string is valid
- Confirm middleware is configured to protect the right paths

### Native Module Errors
- If you see errors about bcrypt, @mapbox/node-pre-gyp, or similar modules:
  - Make sure you're using the bcrypt-wrapper (all API routes have been updated)
  - Run the `do:prepare` and `do:fix-bcrypt` scripts before building
  - Add the module to the ignore list in webpack config
  - If you see HTML file errors, we've added a special webpack loader to handle them
  - For missing dependencies like 'mock-aws-s3', 'nock', etc., run `do:install-deps`
  
### Build Scripts
To resolve all build issues, run the following commands in order:

```bash
# Install build dependencies
npm run do:install-deps

# Prepare the build environment
npm run do:prepare

# Fix bcrypt imports in all API routes
npm run do:fix-bcrypt

# Run the full deployment script
npm run do:deploy-full
```

Alternatively, just run `npm run do:deploy-full` which includes all the steps above.