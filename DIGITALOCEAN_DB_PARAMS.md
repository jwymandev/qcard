# Using DigitalOcean Database Parameters

This guide explains how to use individual database parameters in DigitalOcean instead of a single DATABASE_URL.

## New Approach: Using Individual Parameters

Your app now supports connecting to PostgreSQL using individual connection parameters instead of a single URL string. This approach has several advantages:

1. It's easier to manage in DigitalOcean's environment variables UI
2. It's more secure, as passwords aren't stored in a single connection string
3. It works better with DigitalOcean's managed database integration

## Required Environment Variables

Set these variables in your DigitalOcean App Platform settings:

| Variable Name       | Description               | Example Value                                         |
|---------------------|---------------------------|-------------------------------------------------------|
| DATABASE_HOST       | Database hostname         | db-qcarddevelopment-do-user-15547991-0.k.db.ondigitalocean.com |
| DATABASE_PORT       | Database port             | 25060                                                 |
| DATABASE_NAME       | Database name             | defaultdb                                             |
| DATABASE_USERNAME   | Database username         | doadmin                                               |
| DATABASE_PASSWORD   | Database password         | Your-Password-Here                                    |

You can find these values in your DigitalOcean Database dashboard under "Connection Details".

## How It Works

1. The application now uses a database connection helper (`src/lib/db-connection.ts` and scripts/setup-db-config.js) that:
   - Checks for individual database parameters (DATABASE_HOST, etc.)
   - Constructs a valid PostgreSQL connection URL from these parameters
   - Falls back to DATABASE_URL if it exists
   - Supports both PostgreSQL and SQLite configurations

2. Updated scripts:
   - `do:build`: Simple build script with database configuration setup
   - `do:init-db`: Initializes the database tables using parameters
   - `do:deploy`: Full deployment script with database setup and migration

## Configuration in DigitalOcean

1. Go to your App in DigitalOcean App Platform
2. Navigate to Settings > Environment Variables
3. Add each of the database parameters listed above
4. Set Build Command to:
   ```
   npm run do:build
   ```

## Fallback to DATABASE_URL

If you prefer to continue using DATABASE_URL, that's fine too! The application will:
1. First check if DATABASE_URL exists and is properly formatted
2. If not, it will construct the URL from individual parameters
3. If neither method works, it will fall back to SQLite for local development

## Additional Notes

- Ensure your App has access to the database. In the database settings, add your App to "Trusted Sources"
- If using this approach locally, you can set the variables in your .env file:
  ```
  DATABASE_HOST=localhost
  DATABASE_PORT=5432
  DATABASE_NAME=qcard
  DATABASE_USERNAME=postgres
  DATABASE_PASSWORD=mypassword
  ```
- For local development with SQLite, you don't need to set any of these variables