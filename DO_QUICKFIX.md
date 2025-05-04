# Digital Ocean Quick Fix

## The Problem

The database connection is working but tables are missing. You see errors like:

```
The table `public.Studio` does not exist in the current database.
```

## Quick Fix (SSH into server)

```bash
# Connect to your DigitalOcean app
doctl apps ssh your-app-id

# Navigate to app directory
cd /workspace

# Run the first deployment script to create all tables
npm run do:first-deploy
```

## Permanent Fix (Update Build/Run commands)

Update your DigitalOcean App Platform settings:

1. Go to your app's settings in DigitalOcean
2. Under the Build Command, use:
   ```
   npm run do:deploy-with-schema
   ```
3. Under the Run Command, keep:
   ```
   npm run start
   ```

This will ensure all database tables are created during deployment.

## Manual Database Push

If needed, you can manually push the schema:

```bash
# Set environment variables
export DATABASE_HOST=your-db-host.db.ondigitalocean.com
export DATABASE_PORT=25060
export DATABASE_USERNAME=doadmin
export DATABASE_PASSWORD=your-password
export DATABASE_NAME=defaultdb

# Push schema
npx prisma db push
```

## Verifying Fix

After applying the fix, check:

1. Visit `/api/health` endpoint
2. You should see all tables listed as "healthy"