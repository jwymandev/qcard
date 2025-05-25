# DigitalOcean App Platform Git Deployment Guide

This guide covers how to deploy QCard to DigitalOcean App Platform using Git-based deployment with the Prisma query engine fix.

## The Problem

When deploying a Next.js app with Prisma to DigitalOcean App Platform, you might encounter this error:

```
Prisma Client could not locate the Query Engine for runtime "debian-openssl-3.0.x"
```

This happens because Next.js standalone mode doesn't properly copy the Prisma query engine binaries to the output directory, causing database operations to fail.

## The Solution

We've created a specialized build process and fix script that ensures the Prisma query engines are properly copied to all necessary locations in the Next.js standalone output.

## Deployment Steps

### 1. Set Up Your DigitalOcean App

1. Log in to your DigitalOcean account and navigate to the App Platform
2. Click "Create App" and select "GitHub" as the source
3. Connect your GitHub account if not already connected
4. Select the QCard repository and the branch you want to deploy
5. Click "Next"

### 2. Configure Build Settings

In the "Configure your App" step:

1. **Environment**: Select "Node.js" environment
2. **Build Command**: Enter this command:
   ```
   npm run build:do-app-platform
   ```
3. **Run Command**: Enter this command:
   ```
   node .next/standalone/server.js
   ```
4. **Source Directory**: Set to `/` (root)
5. **Output Directory**: Set to `.next/standalone`

### 3. Configure Environment Variables

Add the following environment variables:

- `DATABASE_URL`: Your PostgreSQL database connection string
- `NEXTAUTH_SECRET`: A secure random string for NextAuth
- `NEXTAUTH_URL`: The URL of your deployed app (e.g., `https://your-app.ondigitalocean.app`)
- `NODE_ENV`: Set to `production`

### 4. Configure Resources

1. Choose the appropriate plan for your needs (at least Basic plan recommended)
2. Set memory to at least 1GB to avoid out-of-memory errors
3. Consider enabling auto-scaling for production deployments

### 5. Database Configuration

1. If you're using DigitalOcean Managed Database:
   - Connect your database by selecting it from the dropdown
   - Make sure to use the SSL connection string
   - Set appropriate permissions for the database user

2. If you're using an external database:
   - Ensure your DATABASE_URL contains the correct credentials
   - Make sure the database is accessible from DigitalOcean's network

### 6. Deploy Your App

1. Review your settings and click "Create Resources"
2. Wait for the build and deployment to complete
3. Check the logs for any errors

### 7. Verify Deployment

1. Once deployed, visit your app URL
2. Check that you can sign in and access database-related features
3. Monitor the app logs for any Prisma-related errors

## Troubleshooting

### Prisma Engine Not Found

If you still see the "Query Engine not found" error:

1. Check the build logs to see if the fix script ran successfully
2. Verify that the Prisma schema was generated during the build
3. Make sure your DATABASE_URL is correctly formatted
4. Try redeploying the app

### Database Connection Issues

If you see database connection errors:

1. Verify your DATABASE_URL is correct
2. Check that the database is accessible from DigitalOcean
3. Ensure your database user has the necessary permissions
4. Check if SSL is required (it usually is for DigitalOcean Managed Databases)

### Memory Issues During Build

If your build fails due to memory issues:

1. Increase the resources allocated to your app
2. Optimize your build process to use less memory
3. Consider using a larger plan for the build phase

## How It Works

Our solution addresses the Prisma engine issue by:

1. Building the app with standalone output enabled
2. Using a custom script (`scripts/fix-prisma-engines.js`) to:
   - Find all Prisma engine binaries
   - Copy them to the required locations in the standalone output
   - Copy the Prisma schema file to the right locations
   - Create an environment file to ensure variables are passed correctly

This ensures that when your app runs on DigitalOcean, Prisma can find the necessary query engine binary regardless of which path it searches.

## Making Changes

When you make changes to your app:

1. Commit and push to your GitHub repository
2. DigitalOcean will automatically detect changes and rebuild your app
3. The fix script will run as part of the build process
4. Your app will be updated with the changes

No manual intervention is needed for subsequent deployments!