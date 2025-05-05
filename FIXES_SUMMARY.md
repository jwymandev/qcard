# QCard DigitalOcean Deployment - Complete Fix Guide

This document summarizes all the issues we've encountered with DigitalOcean deployments and provides comprehensive fixes.

## Major Issues Fixed

1. **Next.js Route Conflicts**: Pages were inaccessible due to conflicting route parameter names
2. **Database Connection Issues**: Problems with PostgreSQL connection in DigitalOcean
3. **Missing Tables**: Only authentication tables existing, application tables missing
4. **404 Errors on Projects**: Users unable to access project pages due to path conflicts
5. **Build Failures**: Deployment failed due to TypeScript errors and route conflicts

## 1. Next.js Route Conflict Issue

### Problem

The app failed to build with error: `Error: You cannot use different slug names for the same dynamic path ('id' !== 'projectId')`.

Routes were inconsistently using both `[id]` and `[projectId]` for the same logical paths, causing Next.js to reject the build.

### Solution

- Standardized all project routes to use `[projectId]` parameter consistently
- Manually removed conflicting files and directories:
  - Deleted `/src/app/studio/projects/[id]` directory
  - Deleted `/src/app/api/studio/projects/[id]` directory
- Created script to check for route conflicts during build

## 2. Database Connection Issues

### Problem

DigitalOcean provides individual database connection parameters instead of a single `DATABASE_URL`:
- `DATABASE_HOST`
- `DATABASE_PORT`
- `DATABASE_USERNAME`
- `DATABASE_PASSWORD`
- `DATABASE_NAME`

This caused connection failures in production.

### Solution

- Modified database connection logic in `src/lib/db-connection.ts` to construct a URL from individual parameters
- Created environment configuration script `scripts/create-env-production.js`
- Set `SKIP_ENV_VALIDATION=true` for build time to avoid database dependency
- Added robust error handling for database connection failures

## 3. Missing Database Tables

### Problem

Only User, Session, and Tenant tables existed, but Profile, Studio, Location, Project, and other application tables were missing.

### Solution

1. **Enhanced Database Reset Script** (`scripts/enhanced-full-reset-db.js`)
   - Completely drops all existing tables
   - Recreates all tables from the Prisma schema
   - Verifies that all essential tables exist
   - Provides detailed logging and error handling

2. **Database URL Validator** (`scripts/fix-db-url.js`)
   - Checks if your DATABASE_URL is correctly formatted
   - Fixes common issues with the connection string
   - Adds required SSL mode for DigitalOcean

3. **Table Verification SQL** (`scripts/list-tables.sql`)
   - Lists all tables in your database
   - Shows which tables have data
   - Helps troubleshoot missing tables

4. **Updated npm Scripts**
   - `npm run db:check` - Verifies and fixes your database connection
   - `npm run db:reset` - Resets and rebuilds the database
   - `npm run db:list-tables` - Lists all tables in the database
   - `npm run do:full-reset` - Full reset optimized for DigitalOcean
   - `npm run do:deploy-reset` - Reset database and rebuild the app

## How to Fix Your Current Deployment

### Option 1: Quick Remote Fix (Recommended)

1. **SSH into your server** or run in DigitalOcean console:

```bash
# Clone repository if needed
git clone https://github.com/your-repo/qcard.git
cd qcard

# Pull latest changes
git pull

# Make scripts executable
chmod +x scripts/enhanced-full-reset-db.js scripts/fix-db-url.js

# Set database connection variables
export DATABASE_HOST=your-db-host.db.ondigitalocean.com
export DATABASE_PORT=25060
export DATABASE_USERNAME=doadmin
export DATABASE_PASSWORD=your-password
export DATABASE_NAME=defaultdb

# Run the full reset
npm run do:full-reset

# Rebuild and restart your application
npm run build
npm start
```

### Option 2: Local Fix, Then Deploy

1. **Test locally first**:

```bash
# Set up database connection to your remote DB
export DATABASE_URL=postgresql://doadmin:password@your-db-host.db.ondigitalocean.com:25060/defaultdb?sslmode=require

# Run the reset locally (this affects your remote database)
npm run db:reset

# Verify tables were created
npm run db:list-tables
```

2. **Deploy without migrations** (since tables are already created):

```bash
# Deploy just the app, skip migrations
npm run do:build
git push
```

## Verifying the Fix

After applying the fix:

1. Visit your app's health endpoint:
   `https://your-app-url/api/health`

2. You should see something like:
   ```json
   {
     "status": "healthy",
     "database": {
       "connected": true,
       "counts": {
         "users": 2,
         "studios": 1,
         "talents": 3
       }
     }
   }
   ```

3. Tables that should now exist:
   - User, Session, Tenant (authentication)
   - Profile, Studio, Location (user profiles)
   - Project, Scene, SceneTalent (project management)
   - Message, CastingCall, Application (communication)
   - All other tables defined in your schema.prisma

## Preventing Future Issues

To prevent similar issues in the future:

1. **Add database checks to your deployment process**:
   ```json
   "predeploy": "node scripts/fix-db-url.js && npx prisma db push"
   ```

2. **Separate development and production environments**:
   - Use `.env.local` for local SQLite development
   - Use `.env.production` for PostgreSQL production settings

3. **Regular health checks**:
   - Add monitoring for the `/api/health` endpoint
   - Set up alerts if table counts drop to zero

## Reference: All Available Database Commands

```
npm run db:check           # Check database URL format
npm run db:reset           # Complete database reset and rebuild
npm run db:list-tables     # List all tables in database
npm run db:health          # Check database health (local)
npm run do:full-reset      # DigitalOcean optimized reset
npm run do:deploy-reset    # Reset and deploy app
```

## Questions?

If you have any questions or need further assistance:

1. Check the comprehensive guide in `DATABASE_RESET_GUIDE.md`
2. Review the enhanced reset script for detailed implementation
3. Contact the development team for additional support