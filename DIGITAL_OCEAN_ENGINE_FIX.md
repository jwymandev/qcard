# DigitalOcean Prisma Engine Fix

This document explains the enhanced solution for fixing Prisma's "Query Engine not found" errors when deploying to DigitalOcean App Platform with Next.js in standalone mode.

## Problem

When deploying a Next.js application with Prisma to DigitalOcean App Platform, you may encounter this error:

```
Prisma Client could not locate the Query Engine for runtime "debian-openssl-3.0.x".

We detected that you are using Next.js, learn how to fix this: https://pris.ly/d/engine-not-found-nextjs.

This is likely caused by a bundler that has not copied "libquery_engine-debian-openssl-3.0.x.so.node" next to the resulting bundle.
```

This occurs because:

1. Next.js standalone mode bundles the application for deployment
2. Prisma requires access to native binary files (query engines)
3. These engine files are not properly included in the bundle
4. The DigitalOcean container environment has a specific Linux distribution (Debian with OpenSSL 3.0.x)

## Solution

Our solution takes a comprehensive approach with multiple layers of fixes:

### 1. Build-time Fix (enhanced-prisma-engines-fix.js)

This script runs during the build process and:

- Searches for all Prisma engine binaries in the build environment
- Creates all possible target directories where Prisma might look for engines
- Copies engine binaries to all target locations
- Creates special directories like `/tmp/prisma-engines`
- Sets up wrapper scripts and environment detection helpers

### 2. Runtime Fix (production-start.js)

Our enhanced production starter script:

- Searches for Prisma engines at runtime
- Creates necessary directories for engines
- Copies available engines to all required locations
- Sets the `PRISMA_QUERY_ENGINE_LIBRARY` environment variable
- Adds fallbacks for engine location failures

### 3. Deployment Configuration (.do/app.yaml)

The App Platform configuration:

- Uses our custom `build:do-app-platform` script
- Configures the correct runtime command (`node production-start.js`)
- Sets up required environment variables
- Configures health checks and database access

## How to Use

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

## How It Works

The solution uses a multi-layered approach:

1. **Comprehensive Search**: We search in all possible locations for Prisma engines
2. **Directory Creation**: We create all directories that Prisma might check
3. **Multiple Engine Locations**: We copy engines to every possible location
4. **Environment Variables**: We set `PRISMA_QUERY_ENGINE_LIBRARY` to explicitly point to the engine
5. **Runtime Adaptation**: Our startup script adapts to the runtime environment
6. **Fallback Mechanisms**: We implement multiple fallbacks if preferred methods fail

## Debugging

If you still encounter issues:

1. Check the DigitalOcean App Platform logs
2. Look for messages related to Prisma engine paths
3. Verify that the `/tmp/prisma-engines` directory exists and contains engine files
4. Check if the `PRISMA_QUERY_ENGINE_LIBRARY` environment variable is set correctly

## Files Involved

- `scripts/enhanced-prisma-engines-fix.js` - The enhanced build-time fix
- `production-start.js` - The runtime fix integrated into the production starter
- `.do/app.yaml` - DigitalOcean App Platform configuration

## References

- [Prisma Documentation on Next.js Deployment](https://pris.ly/d/engine-not-found-nextjs)
- [Next.js Standalone Mode Documentation](https://nextjs.org/docs/app/api-reference/next-config-js/output#standalone)
- [DigitalOcean App Platform Documentation](https://docs.digitalocean.com/products/app-platform/)