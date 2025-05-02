# Schema Mismatch Fix Guide

This guide helps resolve the schema mismatch issues in your application. The main issue is that some fields defined in the Prisma schema are missing from the actual database.

## Quick Fix

Run the provided script to automatically fix the schema:

```bash
node fix-schema.mjs
```

This script will:
1. Create a backup of your current database
2. Add missing columns to the database tables
3. Regenerate the Prisma client

After running this script, restart your application for the changes to take effect.

## Manual Fix

If the automatic script doesn't work, you can fix the issues manually:

1. **Backup your database**:
   ```bash
   cp prisma/dev.db prisma/dev.db.backup
   ```

2. **Add missing columns using SQLite**:
   ```bash
   sqlite3 prisma/dev.db
   ```

   Then in the SQLite prompt:
   ```sql
   -- Add gender column if it doesn't exist
   ALTER TABLE Profile ADD COLUMN gender TEXT;
   
   -- Add ethnicity column if it doesn't exist
   ALTER TABLE Profile ADD COLUMN ethnicity TEXT;
   
   -- Exit SQLite
   .exit
   ```

3. **Regenerate the Prisma client**:
   ```bash
   npx prisma generate
   ```

4. **Restart your application**:
   ```bash
   npm run dev
   ```

## Troubleshooting

If you encounter issues after applying these changes:

1. Restore the database from backup:
   ```bash
   cp prisma/dev.db.backup prisma/dev.db
   ```

2. Try using Prisma Migrate to properly update your schema:
   ```bash
   npx prisma migrate dev --name fix_profile_schema
   ```

3. If all else fails, contact support or file an issue on the repository.