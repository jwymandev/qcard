# QCard DigitalOcean Deployment Guide

This guide explains how to properly deploy the QCard app to DigitalOcean App Platform with persistent data storage.

## Prerequisites

- DigitalOcean account
- PostgreSQL database (can be created through DigitalOcean)
- Git repository with your code

## Step 1: Create a PostgreSQL Database

1. In DigitalOcean, go to **Databases** in the left menu
2. Click **Create Database**
3. Select **PostgreSQL** as the database type
4. Choose a plan (Starter should be sufficient for development)
5. Select your region (ideally same as your app)
6. Give it a name (e.g. `qcard-db`)
7. Click **Create Database Cluster**

Once created, you'll need:
- The connection string (visible in the **Connection Details** section)

## Step 2: Configure the App Platform Service

1. Go to **Apps** in the left menu
2. Click **Create App**
3. Select your Git repository and connect it
4. Select the branch to deploy (usually `main`)
5. Choose **Next**

### App Configuration

1. Select the source directory (where package.json is located)
2. For **Build Command**, keep the default if it detects Next.js correctly.
   Otherwise, use `npm run build:production`
3. For **Run Command**, use `npm start`
4. Click **Next**

### Environment Variables

Add the following environment variables:

```
NODE_ENV=production
DATABASE_URL=[Your PostgreSQL Connection String]
NEXTAUTH_URL=https://your-app-url.ondigitalocean.app
NEXTAUTH_SECRET=[Your Secret Key]
```

Other environment variables from `.env.production` should also be added as needed.

### Resources and Region

1. Select an appropriate plan (Basic or higher recommended)
2. Choose the same region as your database for best performance
3. Click **Next**

### Review and Launch

1. Review your configuration
2. Click **Create Resource**

## Step 3: Verify Deployment

After deployment completes:

1. Visit your app URL
2. Go to `/api/health` to check database connectivity
3. If you see errors or the health check fails, check logs in the DigitalOcean console

## Troubleshooting

### Database Connection Issues

If your app can't connect to the database:

1. Verify the `DATABASE_URL` environment variable
2. Ensure the database is in the same region as the app
3. Check if the app's IP is allowed to access the database (in database firewall settings)

### Data Not Persisting

If user data isn't persisting between deployments:

1. Confirm you're using PostgreSQL, not SQLite
2. Verify database migrations are running correctly during deployment
3. Check the health endpoint to ensure database connectivity
4. Look for database-related errors in app logs

### Authentication Issues

If authentication is failing:

1. Make sure `NEXTAUTH_URL` matches the actual URL of your app
2. Verify `NEXTAUTH_SECRET` is properly set
3. Check browser console for CORS or cookie errors

## Monitoring and Maintenance

- Check the app's health endpoint regularly
- Set up DigitalOcean alerts for database and app metrics
- Take regular database backups

## Additional Resources

- [DigitalOcean App Platform Documentation](https://docs.digitalocean.com/products/app-platform/)
- [Next.js Deployment Documentation](https://nextjs.org/docs/deployment)
- [Prisma PostgreSQL Deployment](https://www.prisma.io/docs/orm/prisma-client/deployment/postgresql)