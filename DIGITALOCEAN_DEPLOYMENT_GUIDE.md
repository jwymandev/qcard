# QCard DigitalOcean Deployment Guide

This guide provides comprehensive instructions for deploying QCard to DigitalOcean App Platform with proper database configuration and environment setup.

## Prerequisites

- DigitalOcean account
- Git repository with your code
- DigitalOcean PostgreSQL database (or other PostgreSQL provider)

## Step 1: Database Setup

1. Create a PostgreSQL database in DigitalOcean:
   - Go to **Databases** in the left menu
   - Click **Create Database**
   - Select **PostgreSQL**
   - Choose an appropriate plan
   - Give it a name (e.g., `qcard-db`)

2. After creation, note down these connection details:
   - Database host
   - Database port (usually 25060)
   - Database username (usually doadmin)
   - Database password
   - Database name (usually defaultdb)

## Step 2: App Platform Configuration

1. Go to **Apps** in the left menu
2. Click **Create App**
3. Select your Git repository and branch

4. Build Configuration:
   - Source Directory: The root of your project (where package.json is located)
   - Build Command: `npm run do:deploy-full`
   - Run Command: `npm run start`

5. Add Environment Variables:
   - **Required Database Variables:**
     - `DATABASE_HOST`: Your database host
     - `DATABASE_PORT`: Your database port (usually 25060)
     - `DATABASE_USERNAME`: Your database username (usually doadmin)
     - `DATABASE_PASSWORD`: Your database password
     - `DATABASE_NAME`: Your database name (usually defaultdb)

   - **NextAuth Configuration:**
     - `NEXTAUTH_URL`: The URL of your app (e.g., https://your-app.ondigitalocean.app)
     - `NEXTAUTH_SECRET`: A secure random string for session encryption

   - **Stripe Configuration (if using payments):**
     - `STRIPE_SECRET_KEY`: Your Stripe secret key
     - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`: Your Stripe publishable key
     - `STRIPE_WEBHOOK_SECRET`: Your Stripe webhook secret

6. Resource Configuration:
   - Select an appropriate plan based on your needs
   - Enable auto-deployment if desired

7. Click **Create Resources**

## Step 3: First Deployment

Your first deployment will:
1. Automatically set up the DATABASE_URL from individual connection parameters
2. Create all database tables using Prisma schema
3. Generate the Prisma client
4. Build the Next.js application

This process is handled by the `do:deploy-full` script.

## Step 4: Verify Deployment

After deployment:

1. Navigate to your app URL
2. Check the `/api/health` endpoint to verify database connectivity:
   ```
   https://your-app.ondigitalocean.app/api/health
   ```

3. You should see a response like:
   ```json
   {
     "status": "healthy",
     "database": {
       "connected": true,
       "tableStatus": {
         "user": { "exists": true, "count": 0, "status": "healthy" },
         "profile": { "exists": true, "count": 0, "status": "healthy" },
         "studio": { "exists": true, "count": 0, "status": "healthy" }
       }
     }
   }
   ```

## Troubleshooting

### Database Connection Issues

If you see database connection errors:

1. Verify environment variables are correctly set in App Platform
2. Check if database firewall allows connections from App Platform
3. Run the manual fix script:
   ```
   node scripts/do-deployment-fix.js
   ```

### Next.js Build Errors

If you encounter Next.js build errors:

1. Check the build logs in DigitalOcean
2. Look for any route conflicts or other build-time errors
3. Fix the issues locally and push changes

### Missing Studios

If users with STUDIO tenant type can't access projects:

1. Run the studio initialization script:
   ```
   node scripts/startup-fix.js
   ```

## Maintenance

### Database Migrations

When you need to apply database migrations:

1. Push your schema changes to the repository
2. DigitalOcean will automatically run the `do:deploy-full` script
3. This script will detect and apply migrations

For manual migrations, you can run:
```bash
npx prisma db push
```

### Monitoring

- Use `/api/health` endpoint to monitor application health
- Set up DigitalOcean alerts for database metrics

## Advanced Configuration

### Custom Domain

1. Go to your app settings in DigitalOcean
2. Navigate to "Domains" tab
3. Add your custom domain
4. Update the `NEXTAUTH_URL` environment variable

### Performance Optimization

For better performance:

1. Configure build caching in DigitalOcean
2. Consider using the DigitalOcean CDN for static assets
3. Scale up resources as needed

## Support

If you encounter any issues, check:
- The deployment logs in DigitalOcean
- The application logs in DigitalOcean
- Run `/api/health` endpoint for database status