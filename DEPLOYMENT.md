# Deployment Guide for QCard

This guide outlines the steps to successfully deploy the QCard application to DigitalOcean App Platform.

## Prerequisites

1. A DigitalOcean account
2. Git repository with the QCard codebase

## Configuration

### Environment Variables

Ensure the following environment variables are set in your DigitalOcean App settings:

```
# App
NEXT_PUBLIC_APP_URL=https://<your-app-url>

# Database - use your DigitalOcean database connection string
DATABASE_URL=<connection-string>

# NextAuth.js - IMPORTANT: Include https:// prefix!
NEXTAUTH_URL=https://<your-app-url>
NEXTAUTH_SECRET=<your-secret-key>

# Stripe
STRIPE_SECRET_KEY=<your-stripe-secret-key>
STRIPE_WEBHOOK_SECRET=<your-stripe-webhook-secret>
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=<your-stripe-publishable-key>
```

### Build Command

In your DigitalOcean App Platform settings, set the build command to:

```
npm install --force && npm run deploy
```

This will:
1. Install dependencies
2. Run database migrations
3. Generate Prisma client
4. Build the application

### Run Command

Set the run command to:

```
npm start
```

## Troubleshooting

### Database Issues

If you're experiencing database-related errors on deployment:

1. Check that your DATABASE_URL is correct and accessible from DigitalOcean
2. Verify that the database schema has been properly migrated with:
   ```
   npx prisma migrate deploy
   ```

### Dynamic Route Errors

If you see errors related to dynamic routes:

1. Ensure the routes have `export const dynamic = 'force-dynamic';` at the top of the file
2. For routes using `useSearchParams()`, make sure they're wrapped in a Suspense boundary

### Running Local Tests

Before deploying, you can simulate the deployment build process locally:

```bash
# Run migrations and build
npm run deploy

# Start the application
npm start
```

## First-Time Deployment Steps

When deploying for the first time:

1. Initialize the database schema:
   ```
   npx prisma migrate deploy
   ```

2. Create initial data for Skills and Locations:
   ```
   npx prisma db seed
   ```

3. Verify the application is running correctly by checking the logs

## Deployment Checklist

- [ ] Environment variables configured
- [ ] Build command set to `npm install --force && npm run deploy`
- [ ] Run command set to `npm start`
- [ ] Database connection string is correct
- [ ] All dynamic routes properly configured
- [ ] Initial data seeded