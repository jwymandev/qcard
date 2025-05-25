# Fixing Prisma Deployment Issues on DigitalOcean

This guide addresses the issue with Prisma Client not being able to find the query engine when deployed to DigitalOcean App Platform. This issue manifests with the following error:

```
Prisma Client could not locate the Query Engine for runtime "debian-openssl-3.0.x".
```

## Root Cause

The problem occurs because Next.js standalone mode doesn't properly copy the Prisma query engine binaries to the output directory. When deploying to DigitalOcean, the application runs in a containerized environment with limited access to the node_modules folder, causing Prisma to fail when attempting to find the engine binaries.

## Solution

We've created a set of scripts to fix this issue:

1. `scripts/prisma-deployment-fix.js` - Copies the Prisma query engine to the appropriate locations
2. `scripts/pre-deploy.sh` - A comprehensive script that builds the app and prepares it for deployment
3. New npm scripts in package.json:
   - `build:fixed-do` - Builds the app for DigitalOcean and runs the Prisma fix
   - `deploy:digital-ocean` - Runs the complete pre-deployment process

## Deployment Steps

Follow these steps to deploy the application to DigitalOcean with the Prisma fix:

### Local Preparation

1. Make sure your code is committed and up to date
2. Run the deployment script:
   ```bash
   npm run deploy:digital-ocean
   ```
3. This will:
   - Install dependencies
   - Build the application for DigitalOcean
   - Run the Prisma fix script to copy engine binaries
   - Create a Dockerfile for deployment
   - Generate the necessary startup scripts

### DigitalOcean Deployment

1. Log into your DigitalOcean account
2. Navigate to your App Platform dashboard
3. Choose "Create App" or select your existing app
4. Connect to your repository or upload the files manually (if not using GitHub integration)
5. In the App Platform settings, ensure:
   - The build command is: `npm run build:fixed-do`
   - The run command is: `node server.js`
   - Environment variables include DATABASE_URL, NEXTAUTH_SECRET, and NEXTAUTH_URL
   - Resources are allocated appropriately (1GB RAM minimum recommended)

### Verifying the Deployment

Once deployed, check the application logs for any Prisma-related errors. If the fix worked correctly, you should see:

```
✅ Auth database connection established
```

And your application should be able to connect to the database successfully.

## Troubleshooting

If you still encounter issues:

1. Check the deployment logs for any errors
2. Verify that the DATABASE_URL environment variable is correctly set
3. Ensure the Prisma schema is correctly copied to the standalone output
4. Check that the query engine binary is present in the deployed container

You can SSH into the DigitalOcean app container for debugging by enabling the Console in the App Platform settings.

## Checking for Engine Files

When logged into the container, you can check for the presence of the Prisma engine files:

```bash
find /workspace -name "libquery_engine-*"
```

This should show several copies of the engine in the directories where our fix script placed them.

## Additional Notes

- This fix is specific to DigitalOcean App Platform and may need adjustments for other hosting providers
- Always run migrations before deploying to ensure the database schema is up to date
- The fix only addresses the Prisma engine issue; other deployment issues may require separate attention