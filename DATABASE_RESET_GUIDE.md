# QCard Database Reset Guide

This guide provides comprehensive instructions for resetting and rebuilding your QCard database on DigitalOcean. Use this when your application shows errors about missing database tables.

## The Problem

Your application is encountering errors like:

```
Invalid `prisma.user.findUnique()` invocation:
The table `public.User` does not exist in the current database.
```

Or when certain features don't work because tables like `Profile`, `Studio`, or `Location` are missing.

## Solution Overview

We've created an enhanced database reset script that:

1. Completely drops all existing tables
2. Recreates all tables using your Prisma schema
3. Verifies that all essential tables exist
4. Provides clear error messages and troubleshooting tips

## Prerequisites

Before continuing, make sure you have:

1. PostgreSQL connection details:
   - Host
   - Port
   - Username
   - Password
   - Database name

2. Node.js and npm installed

3. Access to your application's codebase

## Option 1: Reset Database on DigitalOcean (Remote)

### Step 1: Configure Environment Variables

Set up your database connection environment variables:

```bash
export DATABASE_HOST=your-database-host.db.ondigitalocean.com
export DATABASE_PORT=25060
export DATABASE_USERNAME=doadmin
export DATABASE_PASSWORD=your-password
export DATABASE_NAME=defaultdb
```

Or add these to your `.env` file in the project root.

### Step 2: Run the Enhanced Reset Script

Run the enhanced database reset script:

```bash
node scripts/enhanced-full-reset-db.js
```

The script will:
- Prompt for confirmation
- Connect to your database
- Drop all existing tables
- Recreate all tables using Prisma
- Verify all essential tables exist

### Step 3: Redeploy Your Application

After resetting the database, redeploy your application:

```bash
npm run build
npm start
```

## Option 2: Connect Locally Then Push Changes (Alternative)

### Step 1: Connect to Remote Database Locally

1. Create a `.env.reset` file with:
   ```
   DATABASE_URL=postgresql://doadmin:your-password@your-database-host.db.ondigitalocean.com:25060/defaultdb?sslmode=require
   ```

2. Source this environment:
   ```bash
   source .env.reset
   ```

### Step 2: Reset and Push Schema

```bash
# Drop all tables (BE CAREFUL - THIS DELETES ALL DATA)
npx prisma migrate reset --force

# Push your schema
npx prisma db push
```

### Step 3: Verify Tables

Check if all tables were created:

```bash
npx prisma db execute --file=./scripts/list-tables.sql
```

## Troubleshooting

### Connection Issues

If you can't connect to the database:

1. Verify your database credentials
2. Check if your IP is whitelisted in DigitalOcean's firewall
3. Ensure the database service is running
4. Verify the connection string format is correct

### Schema Issues

If tables are still missing after reset:

1. Check your `schema.prisma` file for errors
2. Look for syntax issues in your models
3. Try running `npx prisma validate` to verify schema
4. Check if there are any circular dependencies

### Script Execution Issues

If the script fails:

1. Check Node.js version (recommend v14 or higher)
2. Ensure you have the required permissions
3. Try running with sudo if needed
4. Check if the pg library is installed: `npm install pg`

## Database Health Check

After resetting and redeploying, visit:

```
https://your-app-url.ondigitalocean.app/api/health
```

This endpoint will show:
- Connection status
- Table counts (users, studios, profiles)
- Environment information

## Preventing Future Issues

To prevent schema issues in the future:

1. Use a database migration workflow with Prisma
2. Run migrations manually during deployment
3. Add schema verification to your CI/CD pipeline
4. Use the health check endpoint regularly

## Need More Help?

If you're still experiencing issues:

1. Check the application logs in DigitalOcean
2. Look for specific error messages
3. Verify that your PostgreSQL version is compatible
4. Ensure your connection string is properly formatted

## Recommendations for Production

For production environments:

1. Take a database backup before resetting
2. Schedule the reset during low-traffic periods
3. Test the process in staging first
4. Have a rollback plan ready