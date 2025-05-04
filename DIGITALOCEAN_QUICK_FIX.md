# DigitalOcean PostgreSQL Quick Fix Guide

This document provides a quick fix for the database connection issues you're experiencing with your QCard application on DigitalOcean.

## The Problem

Your application is encountering errors like:
```
Invalid `prisma.user.findUnique()` invocation:
The table `public.User` does not exist in the current database.
```

This is happening because:

1. Your Prisma schema is configured for PostgreSQL (`provider = "postgresql"` in schema.prisma)
2. But your .env file still has a SQLite connection string: `DATABASE_URL="file:./prisma/dev.db"`
3. The connection to the DigitalOcean PostgreSQL database works, but the tables don't exist

## Quick Fix Steps

Follow these steps to resolve the issue:

1. **Update your DATABASE_URL environment variable** in the DigitalOcean App Platform:
   - Go to your App > Settings > Environment Variables
   - Update DATABASE_URL to use the proper PostgreSQL format:
     ```
     DATABASE_URL=postgresql://username:password@db-qcarddevelopment.db.ondigitalocean.com:25060/defaultdb?sslmode=require
     ```
   - Replace `username` and `password` with your actual database credentials

2. **Run the database initialization script**:
   ```bash
   node scripts/fix-database-schema.js
   ```
   This will:
   - Validate your DATABASE_URL format
   - Initialize the database schema
   - Deploy all migrations
   - Generate the Prisma client

3. **Rebuild and deploy your application**:
   ```bash
   npm run do:deploy
   ```

## Alternative Solutions

If the above steps don't work, try these alternatives:

### Option 1: Connect with Trusted Sources

1. **Update Trusted Sources in Database Settings**:
   - Go to your database in DigitalOcean
   - Navigate to **Settings** > **Trusted Sources**
   - Add your App Platform app as a trusted source
   - OR add a temporary rule for `0.0.0.0/0` (allow all connections)

### Option 2: Use Database Console to Create Tables

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

## Preventing Future Issues

To prevent similar issues in the future:

1. **Use environment-specific .env files**:
   - `.env` for local development (SQLite)
   - `.env.production` for production (PostgreSQL)

2. **Add database migration to your deployment process**:
   - Update your package.json scripts to include:
     ```json
     "predeploy": "node scripts/fix-database-schema.js",
     ```

3. **Add a health check routine**:
   - Regularly visit the `/api/health` endpoint
   - It will report database connection status and table counts

## Debugging Tips

If you continue to have issues:

1. **Check Connection String**:
   - Make sure your DATABASE_URL starts with `postgresql://`
   - Ensure any special characters in the password are URL-encoded
   - Include `?sslmode=require` at the end for secure connections

2. **Database Migrations**:
   - Run migrations manually from your local environment:
     ```bash
     # Export the connection string
     export DATABASE_URL="postgresql://username:password@your-db-host:25060/defaultdb?sslmode=require"
     
     # Run migrations directly
     npx prisma migrate deploy
     ```

3. **Check Cloud Logs**:
   - Review deployment logs in the DigitalOcean console for detailed error messages
   - Look for connection timeout or access denied errors

## Additional Resources

- [Prisma PostgreSQL Deployment Guide](https://www.prisma.io/docs/orm/prisma-client/deployment/postgresql)
- [DigitalOcean Database Connection Guide](https://docs.digitalocean.com/products/databases/postgresql/how-to/connect/)