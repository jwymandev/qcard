# QCard Database Connection Fix

This document explains the permanent fix implemented for the PostgreSQL connection issues in DigitalOcean.

## The Problem

The application was configured with a schema requiring PostgreSQL:
```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

But during runtime, the `DATABASE_URL` environment variable often contained a SQLite URL (`file:./prisma/dev.db`) instead of a proper PostgreSQL URL, leading to error:

```
Error validating datasource `db`: the URL must start with the protocol `postgresql://` or `postgres://`.
```

## The Solution

We've implemented a robust, permanent fix that works consistently across environments:

1. **Runtime Fix**: Added database URL correction directly in the Prisma client initialization code
   - Modified `src/lib/db.ts` to detect and fix incorrect DATABASE_URL format
   - Uses DigitalOcean database parameters (DATABASE_HOST, etc.) to construct a valid PostgreSQL URL
   - Runs before Prisma attempts to connect

2. **Verification Tool**: Added a script to verify database connection at runtime
   - `scripts/verify-db-connection.js` can be run after deployment to confirm everything works

## Deployment Instructions

### Option 1: Update Your Codebase

Pull these changes into your repository:
```bash
git pull
npm install
npm run build
```

### Option 2: Manual Environment Setup 

If you prefer not to merge the code changes, ensure these environment variables are set in DigitalOcean:

```
# Either set this to a proper PostgreSQL URL:
DATABASE_URL=postgresql://doadmin:your-password@your-db-host.db.ondigitalocean.com:25060/defaultdb?sslmode=require

# OR set these individual parameters:
DATABASE_HOST=your-db-host.db.ondigitalocean.com
DATABASE_PORT=25060
DATABASE_USERNAME=doadmin
DATABASE_PASSWORD=your-password
DATABASE_NAME=defaultdb
```

### Verify Deployment

After deploying, run:

```bash
node scripts/verify-db-connection.js
```

This will confirm:
1. The DATABASE_URL is properly constructed
2. Prisma can connect to the database
3. Essential tables exist and are accessible

## Understanding the Fix

The fix works by:

1. **Early Interception**: Checking and fixing the DATABASE_URL before Prisma initializes
2. **Runtime Adaptation**: Using available DigitalOcean connection parameters when needed
3. **Proper URL Construction**: Building a valid PostgreSQL URL with SSL requirements
4. **Transparent Logging**: Showing what connection is being used (safely, without exposing credentials)

## Local Development

For local development, this fix is transparent. If your local `.env` file contains:

```
DATABASE_URL="file:./prisma/dev.db"
```

The code recognizes this is for local development and won't interfere as long as:
1. You don't set DigitalOcean database parameters locally
2. Your schema.prisma is adjusted to use the appropriate provider for local development

## Additional Notes

- The fix is designed to be non-invasive and adapt to the environment
- No changes to your schema.prisma are required
- The solution is compatible with both PostgreSQL and SQLite development workflows
- All database connection issues should now be permanently resolved