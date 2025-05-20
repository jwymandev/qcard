# Digital Ocean Emergency Reset

This guide provides direct steps to fix your authentication loading issue in Digital Ocean.

## Option 1: Deploy with Authentication Disabled

1. Replace your middleware with no-auth version:
   ```bash
   cp src/middleware-no-auth.ts src/middleware.ts
   ```

2. Deploy to Digital Ocean

3. Once deployed, access `/emergency` to use the emergency tools

## Option 2: Direct Database Reset via SSH

1. SSH into your Digital Ocean app:
   ```bash
   ssh apps@your-app-name
   ```

2. Reset the database using the emergency script:
   ```bash
   # Disable SSL verification
   export NODE_TLS_REJECT_UNAUTHORIZED=0
   
   # Run the reset script
   node scripts/do-emergency-reset.js
   ```

3. Create an admin user:
   ```bash
   NODE_TLS_REJECT_UNAUTHORIZED=0 node scripts/make-do-admin.js
   ```

## Option 3: Direct SQL Reset

If the Node.js scripts aren't working, use direct SQL:

1. SSH into your Digital Ocean app:
   ```bash
   ssh apps@your-app-name
   ```

2. Connect to the database directly:
   ```bash
   psql "$DATABASE_URL"
   ```

3. Run the following SQL commands:
   ```sql
   DROP SCHEMA public CASCADE;
   CREATE SCHEMA public;
   GRANT ALL ON SCHEMA public TO postgres;
   GRANT ALL ON SCHEMA public TO public;
   ```

4. Exit psql and run Prisma with SSL verification disabled:
   ```bash
   NODE_TLS_REJECT_UNAUTHORIZED=0 npx prisma db push
   ```

5. Create an admin user:
   ```bash
   NODE_TLS_REJECT_UNAUTHORIZED=0 node scripts/make-do-admin.js
   ```

## Option 4: Modify an Existing User in the Database

If you need to directly modify a user to become admin:

1. Connect to the database:
   ```bash
   psql "$DATABASE_URL"
   ```

2. List users to find an existing one:
   ```sql
   SELECT id, email, role FROM "User";
   ```

3. Update a user to be admin:
   ```sql
   UPDATE "User" SET role = 'ADMIN' WHERE email = 'your-email@example.com';
   ```

## Troubleshooting

If you're still experiencing issues:

1. Check your Digital Ocean environment variables:
   ```bash
   env | grep DATABASE
   ```

2. Try accessing the database directly:
   ```bash
   psql "$DATABASE_URL" -c "SELECT 1 as connection_test;"
   ```

3. Try the emergency page if you can deploy new code:
   ```
   https://your-app.ondigitalocean.app/emergency
   ```