# Digital Ocean Deployment Fix

This readme outlines the solutions implemented to fix the deployment issues with Digital Ocean App Platform. The main issue was a Next.js route conflict between different parameter names (`[id]` vs `[projectId]`) for the same paths.

## What Was Fixed

1. **Route Parameter Consistency**:
   - Created a script (`fix-route-conflicts.js`) that:
     - Removes any conflicting `[id]` directories
     - Ensures all project routes use `[projectId]` consistently
     - Updates parameter references in code from `id` to `projectId`

2. **Build Process Optimization**:
   - Streamlined the build process for Digital Ocean:
     - Fixed route conflicts during build
     - Generated Prisma client without database validation
     - Set NODE_ENV to production for Next.js build

3. **Runtime Database Handling**:
   - Enhanced `production-start.js` to:
     - Handle database variable values at runtime
     - Apply migrations and schema updates
     - Initialize missing studio records

## How to Deploy to Digital Ocean

1. Push these changes to your repository.

2. In Digital Ocean App Platform, ensure these environment variables are set:
   - `DATABASE_HOST`, `DATABASE_PORT`, `DATABASE_USERNAME`, `DATABASE_PASSWORD`, `DATABASE_NAME`
   - `NEXTAUTH_URL` (your app URL)
   - `NEXTAUTH_SECRET` (a secure random string)
   - Any other environment variables needed by your app

3. Set the build command to:
   ```
   npm run do:deploy-full
   ```

4. Set the run command to:
   ```
   npm run start
   ```

5. Create/Update your app in Digital Ocean App Platform.

## What Happens During Deployment

1. **Build Phase**:
   - The `fix-route-conflicts.js` script ensures route consistency
   - Prisma client is generated without database validation
   - Next.js builds the application

2. **Runtime Phase**:
   - `production-start.js` handles database environment variables
   - Database migrations are applied if needed
   - Studio initialization is performed if needed
   - The application starts

## Troubleshooting

If deployment still fails:

1. Check the Digital Ocean build logs for errors
2. Ensure all environment variables are correctly set
3. Verify that the database is accessible from App Platform
4. Check that the route conflicts have been resolved correctly

## Manual Fixes (if needed)

If automatic fixes don't work, you can manually fix route conflicts:

1. Remove any `[id]` directories under `src/app/studio/projects/` and `src/app/api/studio/projects/`
2. Ensure all parameter references use `projectId` instead of `id`
3. Push changes and deploy again

## For Consistency

In future development, always use `projectId` as the parameter name for project routes.

## Support

For further assistance with Digital Ocean deployments, refer to:
- DigitalOcean App Platform documentation
- The full deployment guide in `DIGITAL_OCEAN_APP_PLATFORM.md`