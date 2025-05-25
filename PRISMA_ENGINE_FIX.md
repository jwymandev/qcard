# Prisma Engine Fix for DigitalOcean App Platform

This document explains how we fixed the "Prisma Client could not locate the Query Engine" error when deploying to DigitalOcean App Platform with Next.js in standalone mode.

## Problem

When deploying a Next.js application with Prisma to DigitalOcean App Platform, you may encounter this error:

```
Prisma Client could not locate the Query Engine for runtime "debian-openssl-3.0.x".
```

This occurs because:

1. Next.js standalone mode bundles the application for deployment
2. Prisma requires access to native binary files (query engines)
3. These engine files are not properly included in the bundle
4. The container runtime environment (Debian with OpenSSL 3.0.x on DigitalOcean) needs a specific engine

## Solution

Our solution involves a comprehensive approach:

### 1. At Build Time

The `fix-prisma-runtime.js` script is run during the build process and:

- Detects the target platform and engine requirements
- Locates all available query engine binaries
- Creates directories in all locations where Prisma might look for engines
- Copies engines to all these locations
- Sets up environment variables to help Prisma find the engines

### 2. At Runtime

The same script is run again at application startup to:

- Ensure engines are available in the runtime environment
- Set environment variables to point to the correct engine
- Create/update .env files to persist the configuration
- Apply fallbacks if the primary approach fails

## How It Works

The fix operates in multiple layers:

1. **Platform Detection**: Automatically detects the runtime environment (Linux/Debian/OpenSSL version)
2. **Engine Discovery**: Finds all available engine binaries in the build environment
3. **Path Preparation**: Creates all directories where Prisma might look for engines
4. **Engine Distribution**: Copies engines to all required locations
5. **Environment Configuration**: Sets environment variables to point to the correct engine
6. **Fallback Mechanisms**: Provides multiple fallbacks if preferred methods fail

## Implementation Details

### Build Process Integration

Added to `package.json`:

```json
"build:do-app-platform": "NEXT_BUILD_SKIP_DB=true NEXT_PRIVATE_STANDALONE=1 npx prisma generate && NODE_ENV=production next build && node scripts/fix-prisma-runtime.js"
```

### Runtime Integration

Added to `production-start.js`:

```javascript
// Try to run the Prisma runtime fix at startup
try {
  console.log('Running Prisma runtime fix at startup...');
  const fixPrismaPath = path.join(__dirname, 'scripts', 'fix-prisma-runtime.js');
  
  if (fs.existsSync(fixPrismaPath)) {
    require(fixPrismaPath);
  } else {
    console.warn('Prisma runtime fix script not found at', fixPrismaPath);
  }
} catch (error) {
  console.error('Error running Prisma runtime fix:', error);
  // Continue with startup even if the fix fails
}
```

## Deployment Steps

1. Build your application using:
   ```
   npm run build:do-app-platform
   ```

2. Deploy to DigitalOcean App Platform using either:
   - The App Platform UI with the "Build Command" set to `npm run build:do-app-platform`
   - The `.do/app.yaml` configuration file

3. Set the "Run Command" to:
   ```
   node production-start.js
   ```

## Debugging and Verification

After deployment, verify the fix by:

1. Check the application logs for "[prisma-fix]" prefixed messages
2. Verify `/api/health` endpoint works (it uses Prisma)
3. Ensure user sign-in and registration work properly

If issues persist, check:
- DigitalOcean App Platform logs
- Ensure no errors in the "[prisma-fix]" sections of logs
- Verify the `PRISMA_QUERY_ENGINE_LIBRARY` environment variable is set
- Check if the engine files exist in `/tmp/prisma-engines` or other locations

## References

- [Prisma Documentation on Next.js Deployment](https://pris.ly/d/engine-not-found-nextjs)
- [Next.js Standalone Mode Documentation](https://nextjs.org/docs/app/api-reference/next-config-js/output#standalone)
- [DigitalOcean App Platform Documentation](https://docs.digitalocean.com/products/app-platform/)