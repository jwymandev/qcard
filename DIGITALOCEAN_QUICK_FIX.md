# Quick Fix for QCard DigitalOcean Deployment

The error `Can't reach database server` means DigitalOcean App Platform can't connect to your database. Here's a quick, step-by-step solution:

## Option 1: Connect with Trusted Sources (Recommended)

1. **Update Trusted Sources in Database Settings**:
   - Go to your database in DigitalOcean
   - Navigate to **Settings** > **Trusted Sources**
   - Add your App Platform app as a trusted source
   - OR add a temporary rule for `0.0.0.0/0` (allow all connections)

2. **Update Build Command in App Platform**:
   - Go to your app in DigitalOcean App Platform
   - Navigate to **Settings** > **Build & Deploy**
   - Change the **Build Command** to:
   ```
   npm run do:deploy
   ```

3. **Rebuild & Deploy**:
   - Click **Force Rebuild and Deploy** button

## Option 2: Use Dev Database Mode

If Option 1 doesn't work, try a fallback solution:

1. **Update Build Command**:
   - Change Build Command to:
   ```
   npm i pg && npm run build
   ```

2. **Modify App Configuration**:
   - In the App Resources tab
   - Find HTTP Routes settings
   - Set your app to run in Development Mode temporarily (this skips strict database validation)

## Option 3: Create Database Tables Manually via SQL Console

As a last resort:

1. **Access Database Console**:
   - Go to your database in DigitalOcean
   - Click on **Console**
   - Connect to the database

2. **Create Essential Tables**:
   - Use the SQL Console to run the basic schema creation:
   
   ```sql
   CREATE TABLE "User" (
     "id" TEXT PRIMARY KEY,
     "email" TEXT UNIQUE NOT NULL,
     "password" TEXT,
     "firstName" TEXT,
     "lastName" TEXT,
     "role" TEXT DEFAULT 'USER',
     "tenantId" TEXT,
     "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
     "updatedAt" TIMESTAMP
   );
   
   CREATE TABLE "Tenant" (
     "id" TEXT PRIMARY KEY,
     "name" TEXT NOT NULL,
     "type" TEXT NOT NULL,
     "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
     "updatedAt" TIMESTAMP
   );
   
   CREATE TABLE "Session" (
     "id" TEXT PRIMARY KEY,
     "sessionToken" TEXT UNIQUE NOT NULL,
     "userId" TEXT NOT NULL,
     "expires" TIMESTAMP NOT NULL
   );
   ```

3. **Deploy with Prisma Skip Migrations**:
   - Set `PRISMA_SKIP_MIGRATIONS=true` in environment variables
   - Deploy again

## Debugging Tips

If none of the above solutions work, try these steps:

1. **Check Connection String**:
   - Make sure your DATABASE_URL starts with `postgresql://`
   - Ensure any special characters in the password are URL-encoded
   - Include `?sslmode=require` at the end

2. **Verify Database Status**:
   - Make sure your database is up and running
   - Check for any resource limits or maintenance windows

3. **Try Using Prisma Migrate**:
   Set up a local development environment with direct database access:
   
   ```bash
   # Export the connection string
   export DATABASE_URL="postgresql://username:password@your-db-host:25060/defaultdb?sslmode=require"
   
   # Run migrations directly
   npx prisma migrate deploy
   ```

4. **Check Cloud Logs**:
   - Review deployment logs in DigitalOcean for detailed error messages
   - Look for connection timeout or access denied errors