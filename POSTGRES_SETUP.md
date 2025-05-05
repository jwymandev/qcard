# PostgreSQL Setup Guide for QCard

This guide explains how to properly set up PostgreSQL for both local development and production environments with QCard.

## Why PostgreSQL for All Environments

Using PostgreSQL consistently across all environments (development, staging, production) provides several critical benefits:

1. **Identical Behavior**: No more surprises when code that works in development fails in production due to database differences
2. **Feature Parity**: Access to PostgreSQL-specific features like JSON operators, arrays, and full-text search in all environments
3. **Accurate Performance**: Query optimization and indexing strategies that match production behavior
4. **Migration Testing**: Test migrations in development exactly as they'll run in production

## Local Development Setup

The simplest way to set up PostgreSQL for local development is to use our setup script:

```bash
# Make the script executable
chmod +x scripts/setup-local-postgres.js

# Run the setup script
npm run db:setup-local
```

This script will:
1. Prompt you for PostgreSQL connection details (or use defaults)
2. Test the connection to your PostgreSQL server
3. Create a database for QCard if it doesn't exist
4. Update your `.env` file with the correct PostgreSQL connection string
5. Apply the Prisma schema to your database
6. Verify that all essential tables exist

### Manual Setup

If you prefer to set up manually:

1. Install PostgreSQL on your machine (if not already installed)
2. Create a database for QCard:
   ```sql
   CREATE DATABASE qcard;
   ```
3. Update your `.env` file with the connection string:
   ```
   DATABASE_URL="postgresql://postgres:password@localhost:5432/qcard"
   ```
4. Apply the Prisma schema:
   ```bash
   npx prisma db push
   ```

## Production Environment Setup

For production environments (like DigitalOcean):

1. Set the `DATABASE_URL` environment variable to your PostgreSQL connection string:
   ```
   DATABASE_URL="postgresql://username:password@hostname:port/database?sslmode=require"
   ```

2. When deploying for the first time, run:
   ```bash
   npm run do:first-deploy
   ```

3. For subsequent deployments:
   ```bash
   npm run do:deploy
   ```

## SSL Certificate Issues

If you encounter SSL certificate issues with PostgreSQL (especially in cloud environments), use our SSL fix script:

```bash
# Run the SSL certificate fix script
npm run db:ssl-fix
```

This script will:
1. Test your connection with different SSL settings
2. Create a fixed DATABASE_URL with proper SSL parameters
3. Generate a new `.env.ssl-fixed` file with the correct settings

## Troubleshooting

### Common Issues

1. **Connection Refused**: Make sure PostgreSQL is running and accessible
   ```bash
   # Check if PostgreSQL is running
   sudo service postgresql status
   ```

2. **Permission Denied**: Ensure your user has the necessary permissions
   ```sql
   -- In PostgreSQL
   GRANT ALL PRIVILEGES ON DATABASE qcard TO your_user;
   ```

3. **SSL Certificate Errors**: Use the SSL fix script or set NODE_TLS_REJECT_UNAUTHORIZED=0 for development
   ```bash
   npm run db:ssl-fix
   ```

4. **"Database qcard already exists"**: This is fine - the script is idempotent
   ```bash
   # You can still apply the schema
   npx prisma db push
   ```

### Database Management

Use these commands for common database tasks:

```bash
# Open Prisma Studio to view/edit data
npm run db:studio

# Check database tables
npm run db:check-tables

# Apply migrations
npm run db:migrate

# Reset database (CAUTION: deletes all data)
npm run db:reset
```

## Migrations

QCard manages database migrations using Prisma Migrate. To create and apply migrations:

```bash
# Create a new migration (development)
npx prisma migrate dev --name descriptive_name

# Apply existing migrations (production)
npx prisma migrate deploy
```

Remember that migrations are automatically applied during deployment via the `predeploy` script in package.json.

## Conclusion

Following these guidelines ensures a consistent database experience across all environments, eliminating the "it works on my machine" problem and making your development workflow more productive.