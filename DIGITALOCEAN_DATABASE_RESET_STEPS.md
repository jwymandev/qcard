# Digital Ocean Database Reset: Step-by-Step Guide

This guide provides detailed steps for resetting your Digital Ocean database and setting up an admin user to resolve the authentication loading issue caused by database schema mismatches.

## Prerequisites

1. Make sure you have your Digital Ocean database connection string ready
2. Ensure you have Node.js and npm installed
3. Understand that **this process will delete all data** in your database

## Step 1: Prepare Your Environment

1. Clone or update your repository to the desired version
2. Create a `.env` file in your project root (if it doesn't exist)
3. Add your Digital Ocean database connection string to the `.env` file:

```
DATABASE_URL=postgresql://doadmin:your-password@your-db-host:25060/defaultdb?sslmode=require
```

## Step 2: Reset the Database

There are two ways to reset the database:

### Option A: Using the Reset Script (Recommended)

1. Make the script executable:
   ```bash
   chmod +x scripts/do-reset-db.js
   ```

2. Run the reset script:
   ```bash
   node scripts/do-reset-db.js
   ```

3. When prompted, type `RESET` to confirm the action

### Option B: Manual Reset

If the script doesn't work for any reason, you can manually reset the database:

1. Connect to your Digital Ocean database using `psql` or another PostgreSQL client:
   ```bash
   psql "postgresql://doadmin:your-password@your-db-host:25060/defaultdb?sslmode=require"
   ```

2. Run the following SQL commands:
   ```sql
   DO $$ DECLARE
     r RECORD;
   BEGIN
     FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
       EXECUTE 'DROP TABLE IF EXISTS "' || r.tablename || '" CASCADE';
     END LOOP;
   END $$;
   ```

3. Exit the PostgreSQL client
   ```
   \q
   ```

4. Use Prisma to recreate the database schema:
   ```bash
   npx prisma db push
   ```

## Step 3: Create an Admin User

1. Make the admin creation script executable:
   ```bash
   chmod +x scripts/make-do-admin.js
   ```

2. Run the admin creation script:
   ```bash
   node scripts/make-do-admin.js
   ```

3. Follow the prompts to create an admin user, or use the defaults:
   - Email: admin@example.com
   - Password: password123
   - Name: Admin User
   - Tenant name: Admin Tenant

## Step 4: Test Your Application

1. Build and deploy your application:
   ```bash
   npm run build
   ```

2. Visit your application and sign in with the admin credentials you created

## Troubleshooting

If you encounter issues during the reset process:

### Connection Issues

- Verify your DATABASE_URL is correct
- Ensure your IP is allowed in the Digital Ocean firewall settings
- Check that SSL is enabled in your connection string (`?sslmode=require`)

### Prisma Issues

- Try forcing a Prisma reset:
  ```bash
  npx prisma db push --force-reset
  ```

- Check the Prisma schema for errors:
  ```bash
  npx prisma validate
  ```

### Authentication Still Not Working

If you're still seeing "Loading Authentication..." with no progress:

1. Check the browser console for errors
2. Temporarily enable auth debug mode by adding `?debug=true` to your URL
3. Check that the admin user was created successfully:
   ```bash
   node scripts/check-admin-user.js
   ```

## Need More Help?

If you continue to experience issues, check the server logs to identify specific errors that might be occurring during authentication.