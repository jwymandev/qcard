# QCard DigitalOcean Deployment Guide

This guide provides comprehensive instructions for deploying QCard to DigitalOcean App Platform, addressing common route conflicts and database connection issues.

## Prerequisites

- DigitalOcean account
- PostgreSQL database on DigitalOcean
- Database connection credentials
- Git repository access

## Pre-Deployment Preparation

### 1. Resolve Route Conflicts

The application must use consistent parameter naming in dynamic routes. All project routes should use `[projectId]` instead of `[id]`.

To verify and fix route conflicts:

```bash
# Run the deployment preparation script
npm run do:prepare-deploy
```

This script will:
1. Check for conflicting route paths
2. Create the necessary `.env.production` file
3. Build the application for Digital Ocean
4. Provide deployment guidance

### 2. Create Environment Configuration

The script automatically creates a `.env.production` file with the following key settings:

```
DATABASE_PROVIDER=postgresql
SKIP_ENV_VALIDATION=true
NODE_ENV=production
```

## Deployment Steps

### 1. Prepare Your Repository

Make sure your repository is accessible to DigitalOcean:
- Push all changes to your main branch
- Ensure all route conflicts are resolved
- Verify the build completes successfully

### 2. Create a New App in DigitalOcean

1. Go to DigitalOcean App Platform
2. Click "Create App"
3. Select your repository
4. Select the "main" branch

### 3. Configure Your App

#### Resources:

- Select "Web Service"
- Set HTTP Port to 8080
- Choose "Basic" plan (or higher based on needs)

#### Environment Variables:

Set these environment variables exactly as shown:

```
NODE_ENV=production
PORT=8080

# Database Connection Parameters
DATABASE_HOST=your-db-host.db.ondigitalocean.com
DATABASE_PORT=25060
DATABASE_USERNAME=doadmin
DATABASE_PASSWORD=your-secure-password
DATABASE_NAME=defaultdb
DATABASE_PROVIDER=postgresql

# Authentication
NEXTAUTH_URL=https://your-app-url.ondigitalocean.app
NEXTAUTH_SECRET=your-secure-secret-key

# Build Configuration
SKIP_ENV_VALIDATION=true
```

> **IMPORTANT**: Do not set DATABASE_URL directly. The application will construct this URL at runtime from the individual parameters.

#### Build and Run Commands:

- **Build Command**: `npm run do:deploy-full`
- **Run Command**: `npm start`

### 4. Deploy Your App

Click "Create Resources" to deploy your app.

### 5. Post-Deployment Steps

After deployment completes:

1. Verify database migration:
   ```bash
   # From your local machine with access to the production database
   npm run db:migrate
   ```
   
   or connect to the app and run:
   ```bash
   npx prisma migrate deploy
   ```

2. Verify deployment with health check:
   ```bash
   npm run healthcheck:remote -- --remote https://your-app-url.ondigitalocean.app
   ```

## Troubleshooting

### Route Conflict Errors

If you see build errors like `You cannot use different slug names for the same dynamic path`:

1. Identify all conflicting routes (usually `/[id]/` vs `/[projectId]/`)
2. Use consistent parameter naming throughout your codebase
3. Refer to `NEXT_ROUTE_MANUAL_FIX.md` for detailed guidance

### Database Connection Errors

If the application can't connect to the database:

1. Verify all database environment variables (check for typos)
2. Check that your IP is allowed in the database firewall settings
3. Run verification script:
   ```bash
   NODE_ENV=production node scripts/verify-db-connection.js
   ```

### 404 Errors with Project Routes

If you get 404 errors when accessing project pages:

1. Verify all routes use the consistent parameter name `[projectId]`
2. Check the Database connection is working
3. Ensure all DB migrations have been applied

## Database Setup and Migration

For first-time setup or resetting the database:

```bash
# Apply migrations to production DB
npm run db:migrate

# Or for a complete reset (CAUTION: Deletes all data)
npm run db:reset
```

## Deployment Health Check

To verify your deployment is healthy:

```bash
# Check health of remote deployment
npm run healthcheck:remote -- --remote https://your-app-url.ondigitalocean.app
```

## Additional Resources

For more detailed information, refer to:
- `PRODUCTION_DEPLOYMENT.md` - Comprehensive production guide
- `DATABASE_CONNECTION_FIX.md` - Database connection troubleshooting
- `NEXT_ROUTE_MANUAL_FIX.md` - Route conflict resolution guide
- `DIGITALOCEAN_DEPLOYMENT.md` - Additional DigitalOcean specific guidance