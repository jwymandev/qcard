# Database Migration Guide

This guide explains how to run migrations for the QCard application, particularly for the new questionnaire feature.

## Migration Scripts

We provide three migration scripts:

1. `update-schema-and-migrate.sh` - Basic migration script
2. `update-schema-and-migrate-enhanced.sh` - Enhanced script with better environment detection
3. `update-schema-and-migrate-do.sh` - DigitalOcean-specific script that uses individual connection parameters

## How to Run Migration

### Standard Environment

For standard environments (development, etc.):

```bash
./update-schema-and-migrate-enhanced.sh
```

This script will:
1. Back up your current schema
2. Update the schema with new models
3. Detect the correct DATABASE_URL from your environment or .env files
4. Apply the migration to your database
5. Generate the updated Prisma client
6. Restore any temporarily disabled components
7. Verify the build passes

### Production Environment

For standard production deployments:

1. Ensure your database connection details are in `.env.production` or in environment variables
2. Run the enhanced migration script:

```bash
./update-schema-and-migrate-enhanced.sh
```

### DigitalOcean Environment

For DigitalOcean deployments that use individual database parameters:

1. Ensure your database connection parameters are available:
   - In environment variables: `DATABASE_HOST`, `DATABASE_PORT`, `DATABASE_NAME`, `DATABASE_USERNAME`, `DATABASE_PASSWORD`
   - Or in the `.env.do` file

2. Run the DigitalOcean-specific migration script:

```bash
./update-schema-and-migrate-do.sh
```

This script will:
- Use individual connection parameters to build a valid DATABASE_URL
- Apply migrations using that constructed URL
- Properly handle DigitalOcean's database configuration

## Database URL Detection

### Enhanced Script

The enhanced script (`update-schema-and-migrate-enhanced.sh`) will look for DATABASE_URL in the following order:

1. Environment variables (if already set)
2. `.env.production` file
3. `.env.do` file (for DigitalOcean deployments)
4. `.env` file (for local development)

### DigitalOcean Script

The DigitalOcean script (`update-schema-and-migrate-do.sh`) will:

1. Look for individual database parameters in this order:
   - Environment variables
   - `.env.do` file
   - `.env.production` file
   - `.env` file
   
2. Construct a valid DATABASE_URL from these parameters:
   - `DATABASE_HOST`: The hostname of your database server
   - `DATABASE_PORT`: The port number (defaults to 25060 if not specified)
   - `DATABASE_NAME`: The name of your database (defaults to "defaultdb" if not specified)
   - `DATABASE_USERNAME`: The database username
   - `DATABASE_PASSWORD`: The database password
   
3. Fall back to using an existing DATABASE_URL if individual parameters aren't found

This ensures the script will work correctly in any environment, including DigitalOcean production servers.

## Troubleshooting

If you encounter issues:

1. **Connection errors**: Check that your DATABASE_URL is correct and accessible from your current environment
2. **Permission errors**: Ensure your database user has permissions to create tables and types
3. **Migration conflicts**: If you get conflicts, you may need to run `npx prisma migrate resolve` or reset the migration history

## Schema Changes

The migration adds the following models:

- `Questionnaire` - Stores questionnaire definitions
- `QuestionnaireQuestion` - Stores individual questions
- `QuestionnaireInvitation` - Manages invitations to talents
- `QuestionnaireResponse` - Stores submitted responses
- `QuestionAnswer` - Stores individual answers to questions
- `ProfileField` - Defines custom profile fields
- `FieldOption` - Defines options for dropdown fields
- `ProfileFieldValue` - Stores values for talent profiles
- `StudioFieldValue` - Stores values for studio profiles

These models are added with appropriate relationships to existing models in the schema.

## Note on PostgreSQL

The migration SQL is designed to work with PostgreSQL's specific syntax, using:

- DO blocks with conditional checks for enums
- IF NOT EXISTS clauses for tables and constraints
- Proper dependency ordering for foreign keys

This ensures the migration is idempotent and can be safely applied multiple times if needed.