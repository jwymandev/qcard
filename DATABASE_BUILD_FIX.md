# Digital Ocean Database Connection Build Fix

This document describes a solution to fix the issue where the Next.js build process fails to connect to the database due to invalid port number in the database URL, while the runtime environment connects successfully.

## Problem

During the build process, the application fails to connect to the database with errors like:

```
Can't reach database server at `db-qcarddevelopment-do-user-15547991-0.k.db.ondigitalocean.com:25060`
invalid port number
```

However, the runtime environment successfully connects by constructing the DATABASE_URL from individual environment variables, as seen in the log message:

```
Constructing DATABASE_URL from Digital Ocean environment variables...
```

## Solution

We've implemented a pre-build script (`pre-build.sh`) that runs before the Next.js build process starts. This script:

1. Properly constructs the DATABASE_URL from individual Digital Ocean environment variables
2. Creates a temporary `.env.build` file with the correctly formatted DATABASE_URL
3. Copies this file to `prisma/.env` to ensure Prisma picks up the correct connection string
4. Only runs on Digital Ocean App Platform deployments

The script is configured to run automatically before the build process through the `prebuild` npm script in `package.json`.

## How It Works

The pre-build script:

1. Checks if it's running on Digital Ocean App Platform
2. Extracts database connection parameters from environment variables
3. Properly formats the DATABASE_URL with correct port number and encoding
4. Creates environment files that will be used during the build process
5. Can be skipped by setting the SKIP_PRE_BUILD environment variable

## Implementation Details

1. **pre-build.sh**: Contains the logic to configure the DATABASE_URL
2. **package.json**: Updated with a `prebuild` script that runs before `build`

The implementation mirrors the successful approach used in `production-start.js` that works during runtime.

## Troubleshooting

If you encounter issues:

1. Check the build logs for any error messages from the pre-build script
2. Verify that all required environment variables are correctly set in Digital Ocean App Platform
3. Try setting SKIP_PRE_BUILD=true temporarily if you need to bypass this fix

## Manual Testing

To manually verify the fix:

1. Deploy to Digital Ocean App Platform
2. Check the build logs to ensure the pre-build script runs successfully
3. Verify that the application builds without database connection errors
4. Confirm that the application starts up and connects to the database correctly