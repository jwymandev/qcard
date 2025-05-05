# Database Provider Switch Guide

This guide explains how to handle the migration from SQLite to PostgreSQL for the QCard application.

## The Problem

When trying to run migrations for the questionnaire feature, you encountered this error:

```
Error: P3019

The datasource provider `postgresql` specified in your schema does not match the one specified in the migration_lock.toml, `sqlite`. Please remove your current migration directory and start a new migration history with prisma migrate dev. Read more: https://pris.ly/d/migrate-provider-switch
```

This error occurs because:
1. Your current Prisma migration history is for SQLite
2. You're now trying to use PostgreSQL for your database
3. Prisma doesn't allow automatic provider switching in migrations

## The Solution

We've created a special script that handles this provider switch properly:

```bash
./update-schema-with-provider-switch.sh
```

This script:

1. Removes the existing migration history
2. Creates a fresh initial migration for PostgreSQL
3. Includes the full schema with all tables and relationships
4. Updates the migration_lock.toml file to use PostgreSQL
5. Registers the migration as already applied
6. Generates a new Prisma client for PostgreSQL

## Usage in DigitalOcean

To run this in your DigitalOcean environment:

1. Transfer the script to your DigitalOcean environment
2. Ensure your database parameters are available (DATABASE_HOST, etc.)
3. Make the script executable: `chmod +x update-schema-with-provider-switch.sh`
4. Run the script: `./update-schema-with-provider-switch.sh`

## What Happens During the Switch

During the provider switch:

1. **Migration History Reset**: All previous migration history is cleared
2. **Full Schema Creation**: A single migration that contains the entire schema is created
3. **Provider Update**: The migration_lock.toml file is updated to PostgreSQL
4. **Client Regeneration**: The Prisma client is regenerated for PostgreSQL

## After the Switch

After running the provider switch script:

1. Your database should have all the necessary tables
2. Your Prisma client will work correctly with PostgreSQL
3. Future migrations can be created normally with `prisma migrate dev`
4. The questionnaire feature should work as expected

## Troubleshooting

If you encounter issues:

### Tables Already Exist

If you get errors about tables already existing, it means some tables were already created in your PostgreSQL database. You have two options:

1. Drop all existing tables and run the script again
2. Edit the migration SQL to add `IF NOT EXISTS` to all CREATE TABLE statements

### Missing Data

This migration doesn't transfer any data from SQLite to PostgreSQL. If you had important data in your SQLite database, you'll need to migrate it separately.

### Connection Issues

If you get connection errors:
1. Double check your DATABASE_HOST, DATABASE_USERNAME, and DATABASE_PASSWORD
2. Ensure the PostgreSQL server allows connections from your DigitalOcean app
3. Verify the database exists and you have permission to access it