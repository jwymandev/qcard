# Database Migration Guide

This guide explains how to run migrations for the QCard application, particularly for the new questionnaire feature.

## Migration Scripts

We provide two migration scripts:

1. `update-schema-and-migrate.sh` - Basic migration script
2. `update-schema-and-migrate-enhanced.sh` - Enhanced script with better environment detection

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

For production deployments:

1. Ensure your database connection details are in `.env.production` or in environment variables
2. Run the enhanced migration script:

```bash
./update-schema-and-migrate-enhanced.sh
```

## Database URL Detection

The enhanced script will look for DATABASE_URL in the following order:

1. Environment variables (if already set)
2. `.env.production` file
3. `.env.do` file (for DigitalOcean deployments)
4. `.env` file (for local development)

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