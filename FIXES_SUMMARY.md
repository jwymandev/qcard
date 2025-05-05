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

3. **Migration Provider Fix**
   - Ensured `prisma/migrations/migration_lock.toml` specifies `provider = "postgresql"`
   - Created migration scripts optimized for DigitalOcean

## 4. TypeScript Type Errors

### Problem

TypeScript errors occurred when handling dates and complex objects in project API routes, preventing successful builds.

### Solution

- Added proper type annotations in route handlers:
  ```typescript
  export async function PUT(
    req: NextRequest, 
    { params }: { params: { projectId: string } }
  ) {
    // ...handling code
  }
  ```
- Fixed handling of date objects for Prisma:
  ```typescript
  const updateData: Record<string, any> = {
    ...validatedData,
    updatedAt: new Date()
  };
  
  // Convert string dates to Date objects
  if (validatedData.startDate) {
    updateData.startDate = new Date(validatedData.startDate);
  }
  ```

## 5. Deployment Process Streamlining

### Problem

Deployment was manual and error-prone, with multiple steps that needed to be performed in the correct order.

### Solution

- Created comprehensive deployment script: `do-full-deployment.js`
- Added npm scripts for easy execution:
  ```json
  "do:prepare-deploy": "node scripts/do-full-deployment.js",
  "do:deploy-full": "npx prisma generate && NODE_ENV=production next build"
  ```
- Created detailed deployment guide: `DO_DEPLOY_GUIDE.md`
- Added verification and healthcheck functionality

## Complete Deployment Guide

We've created a comprehensive deployment guide in `DO_DEPLOY_GUIDE.md` that includes:

1. Pre-deployment preparation
   - Resolving route conflicts
   - Setting up environment configuration
   - Testing the build process

2. DigitalOcean Configuration
   - Required environment variables
   - Build and run commands
   - Database setup

3. Deployment Steps
   - Running the deployment script
   - Pushing code to repository
   - Verifying the deployment

4. Troubleshooting Common Issues
   - Route conflict resolution
   - Database connection problems
   - 404 errors with project routes

## Available Scripts

```
npm run do:prepare-deploy      # Complete deployment preparation
npm run do:deploy-full         # Build for DigitalOcean deployment
npm run db:reset               # Reset and rebuild the database
npm run db:check-tables        # Verify database tables
npm run healthcheck:remote     # Check remote deployment health
```

## Verification Steps

After deploying:

1. Access the health endpoint:
   ```
   https://your-app-url/api/health
   ```

2. Check key application routes:
   - `/studio/projects` - Project listing
   - `/studio/projects/new` - Create new project
   - `/studio/projects/[projectId]` - View existing project

3. Verify database tables:
   ```bash
   npm run db:check-tables
   ```

## Reference Documentation

For detailed information, refer to:

1. `DO_DEPLOY_GUIDE.md` - Complete deployment guide
2. `NEXT_ROUTE_MANUAL_FIX.md` - Route conflict resolution
3. `DATABASE_CONNECTION_FIX.md` - Database connection details
4. `DIGITALOCEAN_PROJECT_ACCESS_FIX.md` - Project access issues