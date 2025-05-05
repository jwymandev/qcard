# QCard Database Migrations Guide

This guide explains how database migrations work in QCard and how they're automatically handled during deployment.

## Automatic Migrations During Deployment

As of the latest update, database migrations will automatically run during deployments. This ensures your database schema stays in sync with your codebase without manual intervention.

### How It Works

1. **During Build/Deploy**: 
   - When you run `npm run build` or `npm run deploy`, the `predeploy` script automatically runs Prisma migrations
   - This is configured in `package.json` with the `predeploy` script: `npx prisma migrate deploy`

2. **During Application Startup**:
   - The enhanced `production-start.js` script checks for pending migrations when the app starts
   - If migrations are needed, they're automatically applied
   - If migration fails, the system falls back to `prisma db push` to ensure database compatibility

3. **DigitalOcean App Platform**:
   - Make sure your build command is set to `npm run do:deploy` which includes migration steps
   - The `do:deploy` script: `npx prisma migrate deploy && npx prisma generate && next build`

## Manual Migration Options

You can also run migrations manually when needed:

### Development Environment

```bash
# Apply migrations in development (creates migration files)
npx prisma migrate dev

# Apply existing migrations without creating new ones
npx prisma migrate deploy

# Push schema changes directly without migration files (use with caution)
npx prisma db push
```

### Production Environment

```bash
# Apply all pending migrations
npm run db:migrate

# Run a full migration with enhanced error handling
node scripts/run-full-migration.js

# Reset database (CAUTION: This deletes all data)
npm run db:reset
```

## Recent Migrations

The most recent migration added the following features:

1. **Questionnaire System**:
   - Custom forms for studios to gather talent information
   - Includes questions, responses, and invitations

2. **Custom Profile Fields**:
   - Configurable fields for talent and studio profiles

To apply these specific migrations, you can run:

```bash
./update-schema-and-migrate-enhanced.sh
```

## Troubleshooting Migrations

### Common Issues

1. **"Studio not found" error**:
   - This usually means your Studio entity isn't initialized
   - Fix: Visit `/studio/signup` or `/studio/init-studio-auto` to initialize your studio

2. **Missing tables after deployment**:
   - Fix: Run `npm run db:migrate` manually
   - Check: Visit `/api/health` to verify database connectivity and tables

3. **Migration fails with foreign key constraints**:
   - Fix: You may need to reset the database with `npm run db:reset` (will delete data)

### Database Reset (if needed)

If you need to completely reset your database:

```bash
# Interactive reset script with safeguards
node scripts/enhanced-full-reset-db.js
```

## Best Practices

1. **Always back up production data** before major migrations
2. **Test migrations in development** before deploying to production
3. **Use the health endpoint** (`/api/health`) to verify database status
4. **Check logs after deployment** to confirm migrations were successful

## Deployment Checklist

- [ ] Database URL is correctly configured in environment variables
- [ ] Build command includes migration step (`npm run do:deploy`)
- [ ] Database has appropriate permissions for schema changes
- [ ] Health check passes after deployment

## Verifying Successful Migration

After deployment, visit `/api/health` to verify:
- Database connectivity
- All required tables exist
- Table counts show expected data

If the questionnaire feature is working correctly, you should be able to:
1. Visit `/studio/questionnaires` as a studio user
2. Create a new questionnaire
3. Send invitations to talent profiles