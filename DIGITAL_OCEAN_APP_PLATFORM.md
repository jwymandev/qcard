# DigitalOcean App Platform Deployment Guide for QCard

This guide provides detailed instructions for deploying QCard on DigitalOcean App Platform, addressing the specific requirements and constraints of the platform.

## Key Points to Understand

1. **Two-Phase Deployment Process**:
   - **Build Phase**: No database access available, can only build code
   - **Runtime Phase**: Full database access and environment variables are available

2. **Environment Variables**:
   - App Platform provides individual database variables instead of a single `DATABASE_URL`
   - The app automatically constructs `DATABASE_URL` at runtime from these variables

## Step 1: Create a PostgreSQL Database

1. In DigitalOcean, go to **Databases** > **Create Database Cluster** 
2. Select PostgreSQL (version 15 or later recommended)
3. Choose a sizing plan appropriate for your needs
4. Select the same region as your app will be deployed to
5. Give your database a name (e.g., `qcard-db`)
6. Click **Create Database Cluster**

## Step 2: Configure App Platform

1. Go to **Apps** > **Create App**
2. Select your GitHub repository and branch
3. Leave the autodeploy option enabled
4. Configure the source directory (usually the repository root)

### Configure Build Settings

1. Set the build command to:
   ```
   npm run do:deploy-full
   ```

2. Set the run command to:
   ```
   npm run start
   ```

### Configure Environment Variables

Add these environment variables:

1. **Database Connection** (DigitalOcean will populate these automatically if you link the database):
   - `DATABASE_HOST`
   - `DATABASE_PORT`
   - `DATABASE_USERNAME`
   - `DATABASE_PASSWORD`
   - `DATABASE_NAME`

2. **Auth Configuration**:
   - `NEXTAUTH_URL`: The full URL of your app (e.g., `https://your-app.ondigitalocean.app`)
   - `NEXTAUTH_SECRET`: A secure random string (generate with `openssl rand -base64 32`)

3. **App Configuration**:
   - `NODE_ENV`: Set to `production`
   - `NEXT_PUBLIC_APP_URL`: Same as `NEXTAUTH_URL`

4. **Stripe Configuration** (if using payments):
   - `STRIPE_SECRET_KEY`
   - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
   - `STRIPE_WEBHOOK_SECRET`

### Link Database Resource

1. Under **Resources** > **Add Resource** > **Database**
2. Select the PostgreSQL database you created
3. This will automatically configure the database environment variables

## Step 3: Deploy Application

1. Complete the App Platform setup and click **Create Resource**
2. The initial build will succeed (creating app files) but database setup happens at runtime
3. After deployment completes, the app will automatically:
   - Configure the database connection using environment variables
   - Generate the Prisma client
   - Apply any pending migrations
   - Run startup fixes (including studio initialization)

## Step 4: Verify Deployment

After deployment:

1. Visit your app URL provided by DigitalOcean
2. Check the `/api/health` endpoint to verify database connection
3. If there are issues, check the app logs in DigitalOcean

## Troubleshooting

### Database Connection Issues

If you see database connection errors:

1. Verify your database is in the same region as your app
2. Check database firewall settings (whitelist App Platform IPs)
3. Manually test connection with:
   ```
   curl https://your-app.ondigitalocean.app/api/health
   ```

### Missing Studios/Projects

If users with STUDIO tenant type can't access projects:

1. Log into your app
2. Check logs for any studio initialization errors
3. Try accessing `/api/studio/projects` to see specific error messages

### Deployment Failures

If the build fails:

1. Check the build logs for specific errors
2. Ensure `do:deploy-full` script is correctly set in App Platform
3. Verify `production-start.js` is being used correctly

## Updating the Database Schema

When you need to make database schema changes:

1. Update your Prisma schema in `prisma/schema.prisma`
2. Create new migrations if needed: `npx prisma migrate dev --name your-migration-name`
3. Push changes to GitHub
4. DigitalOcean will automatically redeploy your app
5. During runtime, `production-start.js` will apply the new migrations

## Additional Resources

- [DigitalOcean App Platform Docs](https://docs.digitalocean.com/products/app-platform/)
- [Prisma with PostgreSQL](https://www.prisma.io/docs/reference/database-reference/connection-urls#postgresql)