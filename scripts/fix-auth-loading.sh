#!/bin/bash

# Authentication Loading Fix Deployment Script
# This script updates the middleware and adds debug pages to fix authentication loading issues

echo "🛠️  Authentication Loading Fix Deployment Script"
echo "================================================"

# PART 1: Apply middleware fix
echo "📝 Applying middleware fix..."

# Rename existing middleware.ts to middleware.ts.backup
echo "   - Backing up current middleware..."
cp src/middleware.ts src/middleware.ts.backup

# Replace middleware with debug version
echo "   - Installing debug middleware..."
cp src/middleware-debug.ts src/middleware.ts

# PART 2: Build application
echo "🔨 Building application..."
npm run build

# PART 3: Deploy to Digital Ocean
echo "🚀 Deploying to Digital Ocean..."
echo "   You can now deploy to Digital Ocean using your normal deployment process."
echo "   After deploying, access your site with '?emergency_bypass=true' added to the URL."
echo "   Example: https://yourapp.ondigitalocean.app/?emergency_bypass=true"
echo ""
echo "✨ Once you're logged in, you can create an admin user and reset your database."
echo "   Follow the instructions in DIGITALOCEAN_DATABASE_RESET_STEPS.md for details."

# Add execution permissions to this script
chmod +x scripts/fix-auth-loading.sh

echo "✅ Fix script completed!"