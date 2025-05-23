# Digital Ocean Build Fix

This document explains the changes made to fix the Next.js build errors on Digital Ocean App Platform.

## The Problem

The build was failing with multiple errors related to dynamic API routes:

```
Failed to compile.
Dynamic server usage: Route /api/admin/discounts/[id] couldn't be rendered statically 
because it used `headers`. See more info here: https://nextjs.org/docs/messages/dynamic-server-error
```

This happens because Next.js tries to statically generate API routes during build, but these routes use dynamic features like `headers` that can't be determined at build time.

## The Solution

### 1. Special Next.js Config for Digital Ocean

Created a special `next.config.do.js` file that:

- Sets `output: 'export'` to avoid server-side generation issues
- Disables static generation for API routes
- Sets placeholder environment variables for build time
- Configures external packages properly

### 2. Modified Build Scripts

Updated the deployment scripts to:

- Use the special Next.js config during build
- Set environment variables to skip database connection
- Prevent attempting to statically generate API routes
- Restore the original config after build

### 3. Environment Variable Handling

- Set `NEXT_BUILD_SKIP_DB=true` to avoid database connection during build
- Added `NEXT_PRIVATE_STANDALONE=1` to enable standalone output
- Added `NEXT_PUBLIC_SKIP_API_ROUTES=1` to prevent API route static generation

## How to Deploy

Use the updated deployment command:

```bash
npm run do:deploy-full
```

This will:
1. Set up the proper environment for build
2. Replace the Next.js config with the Digital Ocean specific version
3. Build without trying to statically generate API routes
4. Restore the original configuration after build

## Technical Details

### Why API Routes Fail Static Generation

Next.js 14 attempts to statically generate as much as possible during build, but API routes that use dynamic server features like:

- `headers`
- `cookies`
- Database queries
- Session data

cannot be statically generated and must be served dynamically at runtime.

### Next.js App Router Configuration

The App Router architecture requires special handling for deployments where the build environment doesn't have access to the same resources (like databases) as the runtime environment.

Our solution uses configuration options specifically designed for this scenario to ensure a successful build while maintaining full functionality at runtime.