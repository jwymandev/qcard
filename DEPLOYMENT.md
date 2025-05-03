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

⚠️ **CRITICAL**: The `NEXTAUTH_URL` environment variable MUST include the `https://` protocol and match your production domain exactly. This is the most common cause of authentication issues in production.

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

### Authentication Issues

If you're experiencing authentication issues in production:

1. Verify that `NEXTAUTH_URL` matches your production domain exactly (including https://)
2. Check that `NEXTAUTH_SECRET` is properly set and is a strong secret key
3. Review browser console for any authentication errors
4. Make sure cookies are being set correctly (check browser developer tools)

### Navigation Issues (Dashboard/Profile Not Working)

If the Dashboard or Profile links don't work:

1. Check that the user's tenant type is correctly set in the session
2. Verify that the middleware is correctly handling route redirections
3. Make sure the proper role-based URLs are being generated for navigation links
4. Review browser console for any routing errors

### Database Issues

If you're experiencing database-related errors on deployment:

1. Check that your DATABASE_URL is correct and accessible from DigitalOcean
2. Verify that the database schema has been properly migrated with:
   ```
   npx prisma migrate deploy
   ```
3. Check for any database locks or migration issues

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

- [ ] Environment variables configured, especially `NEXTAUTH_URL` with https:// prefix
- [ ] Build command set to `npm install --force && npm run deploy`
- [ ] Run command set to `npm start`
- [ ] Database connection string is correct
- [ ] All dynamic routes properly configured
- [ ] Initial data seeded
- [ ] Test authentication flow end-to-end after deployment
- [ ] Verify Dashboard and Profile links are working correctly
- [ ] Check that tenant type (STUDIO/TALENT) is correctly detected