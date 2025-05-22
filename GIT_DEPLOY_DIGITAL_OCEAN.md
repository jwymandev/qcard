# Git-Based Deployment to Digital Ocean App Platform

This document explains how to deploy your application to Digital Ocean App Platform using Git-based deployment.

## Overview

Digital Ocean App Platform can automatically deploy your application whenever you push changes to a connected Git repository. This guide covers the necessary configuration to ensure successful deployments.

## Key Files

1. **src/lib/db.ts**: Fixed to properly handle database connections without assignment errors
2. **next.config.js**: Configured to skip database connection during build
3. **production-start.js**: Handles proper server startup in production
4. **Procfile**: Tells Digital Ocean how to run your application

## Deployment Process

### Step 1: Prepare Your Repository

Run the preparation script:

```bash
node scripts/prepare-git-deploy.js
```

This script:
- Creates or updates necessary configuration files
- Sets up proper build and start scripts
- Ensures your application can build without database connection

### Step 2: Commit and Push Changes

Commit all the changes to your repository:

```bash
git add .
git commit -m "Configure for Digital Ocean deployment"
git push
```

### Step 3: Digital Ocean Deployment

Digital Ocean will automatically:
1. Detect the push to your connected branch
2. Pull the latest code
3. Run the build process using the settings in your repository
4. Deploy the application

## Configuration Details

### Database Connection

The fixed `db.ts` file properly handles database connections by:
- Using a placeholder URL during build time
- Correctly constructing the database URL from individual environment variables
- Using the proper assignment direction (`process.env.DATABASE_URL = value`)

### Next.js Configuration

The `next.config.js` file includes:
- `NEXT_BUILD_SKIP_DB=true` to prevent database connection during build
- Proper webpack configuration for Node.js modules
- Output configuration optimized for Digital Ocean

### Production Start

The `production-start.js` script:
- Sets the proper environment
- Configures database connection before starting the server
- Starts the Next.js server on the correct port

## Troubleshooting

If deployment fails:

1. **Check build logs in Digital Ocean**:
   - Look for TypeScript errors
   - Check for database connection issues

2. **Verify environment variables**:
   - Ensure all required variables are set in Digital Ocean App Platform
   - Check for unresolved placeholders like `${...}`

3. **Manual fixes**:
   - If needed, you can SSH into the deployment environment
   - Run `npm run db:verify-deployment` to check database connectivity

## Environment Variables

Ensure these environment variables are set in Digital Ocean App Platform:

- `DATABASE_HOST`: Database hostname
- `DATABASE_PORT`: Database port (usually 5432)
- `DATABASE_USERNAME`: Database username
- `DATABASE_PASSWORD`: Database password
- `DATABASE_NAME`: Database name
- `NEXTAUTH_URL`: Full URL of your application
- `NEXTAUTH_SECRET`: Secret for NextAuth.js

## Additional Notes

- The `NEXT_BUILD_SKIP_DB=true` flag is crucial for successful builds
- The build process is configured to be lenient with TypeScript and ESLint errors
- The application will attempt to connect to the database at runtime, not during build