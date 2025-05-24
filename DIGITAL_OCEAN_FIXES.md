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
   - Pages failing to render during static generation due to API requests

3. **Native Module Bundling Issues**
   - Problems with bcrypt and other native modules during build
   - Webpack attempting to bundle HTML files from node-pre-gyp
   - Missing optional dependencies like aws-sdk, mock-aws-s3, and nock

4. **Environment Variable Issues**
   - Reversed assignment statements in code (`"string" = variable` instead of `variable = "string"`)
   - `NODE_ENV` in env section of next.config.js (not allowed)
   - Database URL placeholders during build time

5. **Missing Pages in Deployment**
   - Pages like /auth-error, /auth-debug, and /subscription missing in production
   - Pages that use useSearchParams() failing to prerender
   - Pages that depend on API routes failing due to static generation

6. **Next.js 14.2.4 Compatibility Issues**
   - `disableStaticGeneration` is no longer a recognized option in Next.js 14.2.4
   - Client components using `useSearchParams()` must be wrapped in Suspense boundaries
   - Database connections attempted during build time causing failures
   - Client-side JavaScript not loading properly in deployed application

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
   - Implemented a mock PrismaClient for build time
   - Added conditional logic to detect build vs. runtime environments
   - Created a proxy to handle all database operations during build
   - Used environment variables to control database connection behavior
   - Connected to real database only at runtime, not build time

4. **Bcrypt Build Compatibility (`src/lib/bcrypt-wrapper.js`)**
   - Created a wrapper around bcrypt that uses a stub during build
   - Prevents native module errors during build
   - Uses real bcrypt in production for security

### Next.js 14 Compatibility Fixes

1. **Client-Side Rendering Fixes**
   - Wrapped all components using `useSearchParams()` in Suspense boundaries:
     - /auth-error/page.tsx
     - /auth-debug/page.tsx
     - /subscription/page.tsx
   - Added loading fallbacks for Suspense components
   - Extracted client components with dynamic data into separate components
   - Ensured proper error handling for API routes

2. **Updated Next.js Config for Next.js 14.2.4 (`next.config.minimal.js`)**
   - Removed unsupported `disableStaticGeneration` option
   - Added proper Next.js 14 alternatives:
     - `skipMiddlewareUrlNormalize: true`
     - `skipTrailingSlashRedirect: true`
     - `serverActions: { allowedOrigins: ['*'] }`
   - Used `optimizePackageImports` for better Prisma client handling
   - Set extremely short `staticPageGenerationTimeout: 1` to skip static generation
   - Enhanced webpack configuration with proper module rules for HTML and native modules
   - Added client-side JavaScript handling:
     - Configured `assetPrefix` for correct URL paths
     - Enabled `productionBrowserSourceMaps` for debugging
     - Optimized chunk splitting with vendor and common bundles
     - Set proper `publicPath` for static assets

3. **Enhanced Build Process**
   - Updated package.json build scripts with additional flags:
     - `NEXT_SKIP_API_ROUTES=1`
     - `SKIP_API_ROUTES=1`
     - Added `--no-mangling` option for better debugging
   - Increased build timeout to 15 minutes for larger builds
   - Added fallback build configuration for emergency situations
   - Implemented output verification to confirm standalone build was created

### Build Configuration Fixes

1. **Minimal Next.js Config for Digital Ocean (`next.config.minimal.js`)**
   - Updated for Next.js 14.2.4 compatibility
   - Used proper options instead of deprecated `disableStaticGeneration`
   - Enhanced webpack configuration for better module handling
   - Used `serverComponentsExternalPackages` for proper Prisma client packaging
   - Excluded problematic modules like bcrypt, fs, and crypto from webpack

2. **Digital Ocean Deployment Script (`scripts/do-deploy.js`)**
   - Enhanced with better error handling and fallbacks
   - Added verification of build output
   - Implemented fallback build process as a last resort
   - Extended build timeout from 10 to 15 minutes for larger builds
   - Added more helpful error diagnostics and troubleshooting steps
   - Added asset fixing script to ensure client-side JavaScript works:
     - Creates fix-assets.js to properly copy static assets
     - Verifies JavaScript chunks are available in standalone output
     - Ensures proper asset paths for client-side JavaScript
     - Copies public assets to the correct location

3. **Package.json Scripts**
   - Updated `build:do` with all necessary flags for Next.js 14.2.4
   - Added additional environment variables for skipping API routes
   - Removed `--no-mangling` option to ensure proper minification for production
   - Made build scripts more resilient to failures
   - Added `do:fix-assets` script for client-side JavaScript fixes

4. **Database Handling**
   - Implemented mock database client for build time
   - Created proxy objects for PrismaClient operations
   - Ensured database connection only happens at runtime
   - Added better error handling for database operations

## How to Deploy

1. Use Git-based deployment to Digital Ocean App Platform:
   ```
   git push origin main
   ```

2. Digital Ocean will automatically run the `do:deploy-full` script, which:
   - Sets up proper environment variables
   - Uses the special next.config.minimal.js during build
   - Handles bcrypt and other native modules
   - Skips API routes during static generation
   - Wraps client components in Suspense boundaries
   - Runs the build with extended timeout
   - Verifies the build output
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
- Ensure the mock database client is working during build time

### Build Failures
- Check build logs for "Dynamic server usage" errors
- For "missing generateStaticParams()" errors, ensure you're not using `output: 'export'` with API routes
- For native module errors (like bcrypt), ensure the bcrypt-wrapper is being used
- For HTML file errors, ensure ignore-loader is installed
- Ensure next.config.minimal.js is being used during build
- Verify NODE_ENV is not in the env section of next.config.js
- Check for any `useSearchParams()` errors in client components
- Make sure all client components using `useSearchParams()` are wrapped in Suspense boundaries

### Missing Authentication
- Check NEXTAUTH_URL and NEXTAUTH_SECRET are set correctly
- Verify database connection string is valid
- Confirm middleware is configured to protect the right paths

### Native Module Errors
- If you see errors about bcrypt, @mapbox/node-pre-gyp, or similar modules:
  - Make sure you're using the bcrypt-wrapper (all API routes have been updated)
  - Run the `do:prepare` and `do:fix-bcrypt` scripts before building
  - Add the module to the ignore list in webpack config
  - For HTML file errors, we've included a custom ignore-loader directly in the repo
  - For missing dependencies like 'mock-aws-s3', 'nock', etc., run `do:install-deps`

### HTML File Loader Errors
- If you see errors about missing HTML loaders or webpack-html-handler.js:
  - We've created a custom ignore-loader at scripts/ignore-loader.js
  - The next.config.do.js now uses this loader directly
  - The prepare-do-build.js script creates fallback loaders if needed
  - Added a resolveLoader config to help webpack find our custom loaders

### useSearchParams Errors
- If you see errors about useSearchParams() needing to be wrapped in a Suspense boundary:
  - Check that all components using useSearchParams() are wrapped in Suspense
  - Split the component into a client component that uses useSearchParams() and a parent component that wraps it in Suspense
  - Ensure a proper loading fallback is provided for the Suspense boundary

### Client-Side JavaScript Not Loading
- If you see only the HTML version of pages without interactivity:
  - Run `npm run do:fix-assets` to ensure assets are properly copied
  - Check that `assetPrefix` is set correctly in next.config.js
  - Verify webpack configuration has proper `publicPath` setting
  - Ensure chunk splitting is optimized for proper loading
  - Check browser console for 404 errors on JavaScript files
  - Use browser dev tools to verify which JavaScript files are missing
  
### Build Scripts
To resolve all build issues, run the following commands in order:

```bash
# Install build dependencies
npm run do:install-deps

# Prepare the build environment (includes creating custom loaders)
npm run do:prepare

# Fix bcrypt imports in all API routes
npm run do:fix-bcrypt

# Run the full deployment script
npm run do:deploy-full

# Fix client-side assets if JavaScript isn't loading
npm run do:fix-assets
```

### Custom Loaders
To avoid dependency issues with loaders, we've created custom loaders directly in the repository:

- `scripts/ignore-loader.js`: A simple loader that returns an empty module for any content
- `scripts/webpack-html-handler.js`: Specifically handles HTML files in webpack

These loaders are used directly in the webpack configuration in next.config.do.js without requiring external dependencies.

Alternatively, just run `npm run do:deploy-full` which includes all the steps above.