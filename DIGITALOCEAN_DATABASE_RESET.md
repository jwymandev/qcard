# Digital Ocean Database Reset Guide

This guide provides step-by-step instructions for completely resetting your Digital Ocean PostgreSQL database when you don't need to preserve data.

## Prerequisites
- Access to Digital Ocean dashboard
- Database connection credentials
- SSH access to your app or a way to run database commands

## Option 1: Using Digital Ocean Console

1. Log in to your Digital Ocean dashboard
2. Navigate to your database cluster
3. Open the console tab for your database
4. Run the following SQL commands:

```sql
-- Drop all tables in the public schema
DROP SCHEMA public CASCADE;

-- Recreate the public schema
CREATE SCHEMA public;

-- Grant permissions back to users
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO public;
```

## Option 2: Using Database Connection String

If you prefer to connect directly using the connection string:

1. Get your database connection string from Digital Ocean dashboard
2. Connect using psql or a similar tool:

```bash
psql "your-connection-string-here"
```

3. Run the same SQL commands as above:

```sql
-- Drop all tables in the public schema
DROP SCHEMA public CASCADE;

-- Recreate the public schema
CREATE SCHEMA public;

-- Grant permissions back to users
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO public;
```

## Rebuilding the Schema

After resetting the database, you need to rebuild the schema to match your current codebase:

1. Ensure your local environment is set up with the correct DATABASE_URL pointing to your Digital Ocean database

2. Use prisma db push to create the schema:

```bash
npx prisma db push
```

Or, if you prefer to use migrations:

```bash
npx prisma migrate deploy
```

## Creating an Admin User

After resetting the database, you'll need to create an admin user:

1. Modify the following script with your Digital Ocean database connection string:

```javascript
// create-admin.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Create tenant first
  const tenant = await prisma.tenant.create({
    data: {
      name: 'Admin Tenant',
      slug: 'admin',
    },
  });

  console.log('Created tenant:', tenant);

  // Create admin user
  const user = await prisma.user.create({
    data: {
      email: 'admin@example.com',
      password: '$2b$10$rQEI.CDRlV41aM5i.I4BYObxzIaauUOp5pDDjUI6wUdsrVPgDjVs.', // password123
      name: 'Admin User',
      role: 'ADMIN',
      tenantId: tenant.id,
    },
  });

  console.log('Created admin user:', user);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
```

2. Run the script with your Digital Ocean database connection:

```bash
DATABASE_URL=your-digital-ocean-connection-string node create-admin.js
```

## Verify Database Reset

After completing these steps, you should have:
1. A clean database with the correct schema
2. An admin user (admin@example.com / password123)

You can now redeploy your application on Digital Ocean with the correctly reset database.