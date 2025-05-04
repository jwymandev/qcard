# QCard DigitalOcean Deployment Instructions

## Database Connection Issue Fix

We've identified that the application is failing to deploy due to a mismatch between the SQLite database schema and the PostgreSQL database you're trying to use on DigitalOcean. Here's how to fix it:

## Step 1: Setup PostgreSQL Database on DigitalOcean

1. In DigitalOcean dashboard, go to "Databases"
2. Click "Create Database Cluster"
3. Choose PostgreSQL
4. Select your plan (Basic should be sufficient for testing)
5. Choose your region (same as where your app is deployed)
6. Give it a name (e.g., qcard-db)
7. Click "Create Database Cluster"

## Step 2: Get Connection Details

1. Once your database is created, go to the "Connection Details" tab
2. Under "Connection Parameters", find the connection string
3. It should look like: `postgresql://doadmin:password@db-postgresql-nyc3-12345-do-user-123456-0.b.db.ondigitalocean.com:25060/defaultdb?sslmode=require`

## Step 3: Update Your App on DigitalOcean

1. Go to "Apps" in DigitalOcean
2. Select your QCard app
3. Go to "Settings" > "Environment Variables"
4. Find `DATABASE_URL` or add it if it doesn't exist
5. Paste the connection string you copied from your database
6. Make sure it starts with `postgresql://` and includes all necessary details
7. Click "Save" 

## Step 4: Configure the Deploy Command

1. In your app settings, find "Build Command"
2. Change it to: `npm run do:deploy`
3. This will run our special setup script for PostgreSQL

## Step 5: Redeploy Your App

1. In the app dashboard, click "Force Rebuild and Deploy"
2. Watch the deployment logs for any errors

## Common Issues

### Error: DATABASE_URL must start with postgresql://

This means your connection string is either:
- Missing from environment variables 
- Not formatted correctly
- Not starting with the right protocol

Solution: Make sure your `DATABASE_URL` environment variable is set exactly as shown in the "Connection Details" of your PostgreSQL database.

### Error: Could not connect to database

This might mean:
- The database server is not accepting connections
- The database doesn't exist yet
- The credentials are wrong

Solution: Make sure your database is up and running, and the connection string is correct. You might need to allow access to your app's IP address in the database firewall settings.

## Data Persistence

Once you've switched to PostgreSQL:
- Your data will persist between deployments
- Studio users will be able to save projects
- Talent search will function properly 
- User accounts will be preserved

## For Local Development

To continue using SQLite for local development while using PostgreSQL in production, you can run:

```bash
# For local development (SQLite)
npm run dev

# To test PostgreSQL locally (if you have a PostgreSQL server)
DATABASE_URL="postgresql://username:password@localhost:5432/qcard" npm run dev
```