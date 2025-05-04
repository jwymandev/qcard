# QCard Production Deployment Guide

This document provides comprehensive instructions for deploying QCard to DigitalOcean in a production-ready configuration.

## Pre-Deployment Checklist

- [ ] PostgreSQL database is provisioned on DigitalOcean
- [ ] Database connection parameters are available
- [ ] Git repository contains the latest code
- [ ] Environment variables are prepared

## Environment Configuration

### Required Environment Variables

Set these environment variables in your DigitalOcean App Platform configuration:

**Database Connection (Choose Option 1 OR Option 2):**

**Option 1: Individual Parameters (Recommended for production)**
```
DATABASE_HOST=your-db-host.db.ondigitalocean.com
DATABASE_PORT=25060
DATABASE_USERNAME=doadmin
DATABASE_PASSWORD=your-secure-password
DATABASE_NAME=defaultdb
```

**Option 2: Direct Connection URL**
```
DATABASE_URL=postgresql://doadmin:your-secure-password@your-db-host.db.ondigitalocean.com:25060/defaultdb?sslmode=require
```

**Application Configuration:**
```
NODE_ENV=production
NEXTAUTH_URL=https://your-app-url.ondigitalocean.app
NEXTAUTH_SECRET=your-secure-secret-key
PORT=8080
```

**Additional Services (as needed):**
```
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

## Deployment Process

### 1. Prepare Your Codebase

Ensure your code includes the latest database connectivity updates:
```bash
git pull origin main
npm install
```

### 2. Run Pre-Deployment Checks

```bash
# Validate your TypeScript code
npm run typecheck

# Run linting to catch issues
npm run lint

# Verify database connectivity with mock production settings
DATABASE_HOST=your-db-host.db.ondigitalocean.com \
DATABASE_USERNAME=doadmin \
DATABASE_PASSWORD=your-password \
npm run db:verify
```

### 3. Deploy to DigitalOcean

```bash
# Option 1: Using the DigitalOcean CLI
doctl apps create --spec .do/app.yaml

# Option 2: Push to the deployment branch
git push origin main
```

### 4. Post-Deployment Verification

After deployment completes, verify your application:

1. **Check Health Endpoint**: Visit `https://your-app-url.ondigitalocean.app/api/health`
   - Status should be "healthy"
   - Database should show "connected: true"
   - All essential tables should be present

2. **Verify Authentication**: 
   - Test login functionality
   - Confirm session persistence

3. **Check Database Tables**:
   - Run `npm run db:verify` against production
   - Confirm all tables are properly created

## Monitoring & Maintenance

### Health Checks

Configure monitoring on your health endpoint:
```
GET https://your-app-url.ondigitalocean.app/api/health
```

Expected response format:
```json
{
  "status": "healthy",
  "database": {
    "connected": true,
    "tableStatus": {
      "user": { "exists": true, "count": 5, "status": "healthy" },
      "profile": { "exists": true, "count": 3, "status": "healthy" },
      "studio": { "exists": true, "count": 2, "status": "healthy" }
    },
    "responseTimeMs": 120
  },
  "memory": { "usage": 75.4, "rss": 102.1 },
  "uptime": 3600,
  "environment": "production",
  "timestamp": "2025-05-04T21:32:08.765Z",
  "version": "1.0.0",
  "responseTimeMs": 150
}
```

### Database Maintenance

1. **Regular Backups**: 
   - Set up automated database backups
   - Verify backup integrity monthly

2. **Performance Monitoring**:
   - Monitor query performance
   - Check for slow queries

3. **Schema Updates**:
   ```bash
   # Preview schema changes
   npm run db:push -- --preview
   
   # Apply schema changes with migrations
   npm run db:migrate
   ```

## Troubleshooting

### Database Connection Issues

If you encounter "Invalid URL format" errors:

1. **Verify Environment Variables**:
   ```bash
   # SSH into your deployment
   doctl apps ssh your-app-id
   
   # Check environment variables
   env | grep DATABASE
   ```

2. **Manual Connection Test**:
   ```bash
   # Run the verification script
   node scripts/verify-db-connection.js
   ```

3. **Reset Connection**:
   ```bash
   # If all else fails, restart the application
   doctl apps restart your-app-id
   ```

### Table Missing Issues

If tables are missing:

1. **Run Database Push**:
   ```bash
   DATABASE_URL=postgresql://doadmin:password@host:port/defaultdb?sslmode=require npx prisma db push
   ```

2. **Verify Schema**:
   ```bash
   npx prisma validate
   ```

## Security Best Practices

1. **Rotate Database Credentials** periodically
2. **Use SSL** for all database connections
3. **Implement Rate Limiting** for API endpoints
4. **Configure CORS** properly
5. **Set Up Network Rules** to restrict database access

## Scaling Considerations

1. **Connection Pooling**:
   - Default connection pool is 10
   - Adjust based on application needs

2. **Horizontal Scaling**:
   - Application is stateless and can be scaled horizontally
   - Database may require vertical scaling

## Emergency Contacts

- Database Issues: your-dba@company.com
- Application Issues: your-dev@company.com