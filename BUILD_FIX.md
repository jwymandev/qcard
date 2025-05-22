# Digital Ocean Build and Deploy Fix

This document explains the changes made to fix build issues with Digital Ocean App Platform.

## Problem

The build process was failing with several issues:

1. **Database Connection Errors:**
   - `Invalid port number in database URL` errors during build
   - Multiple Prisma connection attempts that fail
   - Database URL format issues with environment variables

2. **Static Generation Issues:**
   - Dynamic API routes couldn't be statically generated
   - Routes using `headers` or `cookies` failed during static generation
   - Next.js trying to pre-render routes that require runtime data

## Solution

We implemented a comprehensive set of fixes to address these issues:

### 1. Skip Database Connection During Build

The primary issue was that Next.js was trying to connect to the database during build, but the Digital Ocean build environment doesn't have database access. We modified:

- **src/lib/db.ts**: Added a build mode detection flag to skip actual database connections
- **next.config.js**: Added environment variables to use placeholder database values during build
- **scripts/do-deploy.js**: Set proper environment variables for the build process

### 2. Prevent Static Generation of API Routes

Next.js was trying to statically generate API routes that require dynamic data:

- **next.config.js**: Updated configuration to properly handle dynamic routes
- Adjusted static page generation timeout settings
- Added unoptimized image settings for static export compatibility

### 3. Provide Placeholder Database URL

During build time, we now provide a placeholder database URL to prevent connection errors:

```javascript
// In do-deploy.js
if (!process.env.DATABASE_URL || process.env.DATABASE_URL.includes('${')) {
  console.log('Setting placeholder DATABASE_URL for build...');
  process.env.DATABASE_URL = 'postgresql://placeholder:placeholder@localhost:5432/placeholder';
}
```

## How the Fix Works

1. **Build Process:**
   - When Next.js builds, the `NEXT_BUILD_SKIP_DB` flag is set to 'true'
   - The Prisma client is initialized but doesn't attempt actual connections
   - A valid placeholder DATABASE_URL is used to prevent format errors

2. **Runtime Process:**
   - After deployment, the `production-start.js` script runs
   - This script properly configures the real database connection
   - The application connects to the actual database at runtime

## Deployment Instructions

To deploy with these fixes:

1. Build with database connection skipping:
   ```
   NEXT_BUILD_SKIP_DB=true npm run build
   ```

2. For Digital Ocean deployments, use:
   ```
   npm run do:deploy
   ```

3. At runtime, the application will automatically:
   - Configure the correct database connection
   - Run migrations if needed
   - Initialize studios and other required data

## Testing the Fix

To verify that the fix works:

1. Check that the build completes without database errors
2. Verify that the application starts correctly at runtime
3. Confirm that database operations work once deployed

## Additional Notes

- This approach separates build-time concerns from runtime database connections
- The application still performs proper database connectivity checks at runtime
- All authentication and database features continue to work as expected
- No code changes are needed in your application logic