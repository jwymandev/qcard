# QCard DigitalOcean Database Fix Instructions

This guide provides simple, direct instructions to fix database issues with your DigitalOcean deployment.

## The Problem

- Your PostgreSQL database isn't properly initialized
- Only basic tables exist (User, Session, Tenant) but application tables are missing (Profile, Studio, etc.)
- This causes authentication to work but other features fail

## Fix Instructions

### Option 1: Reset Database (Recommended)

This completely resets the database and creates all tables properly.

```bash
# SSH into your server or run these locally with your DigitalOcean database credentials

# Step 1: Set database connection info 
export DATABASE_HOST=your-db-host.db.ondigitalocean.com
export DATABASE_PORT=25060
export DATABASE_USERNAME=doadmin
export DATABASE_PASSWORD=your-password
export DATABASE_NAME=defaultdb

# Step 2: Run the database reset script
node scripts/do-reset-db.js

# Step 3: Verify it worked
curl http://localhost:3001/api/health
```

### Option 2: Quick Schema Push

If you can't run the reset script or don't want to lose data:

```bash
# Set database connection string directly
export DATABASE_URL=postgresql://doadmin:your-password@your-db-host.db.ondigitalocean.com:25060/defaultdb?sslmode=require

# Push Prisma schema to database
npx prisma db push

# Verify tables exist
npx prisma db execute --file=./scripts/list-tables.sql
```

## Verifying the Fix

After applying either fix:

1. Check the health endpoint: `/api/health`
2. You should see `"status": "healthy"` and counts for users, studios, and talents

## Avoiding This Issue in Future

1. Make sure your schema.prisma file has `provider = "postgresql"`
2. Ensure DATABASE_URL is a valid PostgreSQL URL in production
3. Run migrations properly during deployment with:
   
   ```bash
   npx prisma generate && npx prisma migrate deploy
   ```

## Common Pitfalls

- DATABASE_URL format is incorrect (should start with `postgresql://`)
- Missing SSL requirements (add `?sslmode=require` to your connection string)
- Using SQLite locally but PostgreSQL in production
- Confusing table casing (PostgreSQL is case-sensitive)

## Support

If you continue to have issues, please contact the development team for further assistance.