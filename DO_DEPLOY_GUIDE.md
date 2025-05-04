# QCard DigitalOcean Deployment Guide

This guide provides simple, foolproof instructions for deploying QCard to DigitalOcean App Platform.

## Prerequisites

- DigitalOcean account
- PostgreSQL database on DigitalOcean
- Database connection credentials

## Deployment Steps

### 1. Fork or Push Your Repository

Make sure your repository is accessible to DigitalOcean (either public or connected via OAuth).

### 2. Create a New App

1. Go to DigitalOcean App Platform
2. Click "Create App"
3. Select your repository
4. Select the "main" branch

### 3. Configure Your App

#### Resources:

- Select "Web Service"
- Set HTTP Port to 8080
- Choose "Basic" plan

#### Environment Variables:

Set these environment variables:

```
NODE_ENV=production
PORT=8080

# Database (Option 1: Individual Parameters)
DATABASE_HOST=your-db-host.db.ondigitalocean.com
DATABASE_PORT=25060
DATABASE_USERNAME=doadmin
DATABASE_PASSWORD=your-secure-password
DATABASE_NAME=defaultdb

# Authentication
NEXTAUTH_URL=https://your-app-url.ondigitalocean.app
NEXTAUTH_SECRET=your-secure-secret-key

# Any other required variables for your app
```

#### Build and Run Commands:

The build and run commands should be automatically detected from package.json:
- **Build Command**: `npm run build`
- **Run Command**: `npm start`

### 4. Deploy Your App

Click "Create Resources" to deploy your app.

### 5. Verify Deployment

After deployment completes:

1. Visit your app URL
2. Check the health endpoint at `/api/health`
3. Verify that all essential tables are present

## Troubleshooting

### Common Issues

#### Database Connection Errors

If you see "Database connection error" or "URL must start with postgresql://":

1. Check your environment variables
2. Verify your database credentials
3. Ensure your database is accessible from DigitalOcean

#### Missing Tables

If you see "Table does not exist" errors:

1. SSH into your app: `doctl app ssh YOUR_APP_ID`
2. Run: `node scripts/verify-db-connection.js`
3. If needed, run: `npx prisma db push`

## Deployment Health Check

To verify your deployment is healthy:

```bash
# Local check against remote app
npm run healthcheck:remote -- --remote https://your-app-url.ondigitalocean.app
```

## Further Resources

For more detailed instructions, refer to:
- `PRODUCTION_DEPLOYMENT.md` - Comprehensive production guide
- `DATABASE_CONNECTION_FIX.md` - Database connection details