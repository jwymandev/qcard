#!/bin/bash

# Pre-deployment script for QCard application
# This script prepares the application for deployment to DigitalOcean

set -e # Exit on error

echo "🚀 Starting pre-deployment process..."

# Install dependencies
echo "📦 Installing dependencies..."
npm ci

# Build the application
echo "🏗️ Building the application..."
npm run build:do

# Run Prisma fix script
echo "🔧 Running Prisma deployment fix..."
node scripts/prisma-deployment-fix.js

# Fix static file location for standalone mode
echo "📂 Copying static files to correct location for standalone mode..."
mkdir -p .next-do/standalone/.next
cp -r .next-do/static .next-do/standalone/.next/static

# Copy the Prisma schema to the standalone directory
echo "📄 Copying Prisma schema and engines..."
mkdir -p .next-do/standalone/.prisma/client
cp -r node_modules/.prisma/client/libquery_engine-* .next-do/standalone/.prisma/client/ 2>/dev/null || echo "No Prisma engines found"
cp prisma/schema.prisma .next-do/standalone/.prisma/client/
mkdir -p .next-do/standalone/prisma && cp prisma/schema.prisma .next-do/standalone/prisma/schema.prisma

# Generate a simple production start script
echo "📝 Creating production start script..."
cat > .next-do/standalone/start.sh << EOL
#!/bin/bash
export DATABASE_URL=\${DATABASE_URL}
echo "Starting QCard application..."
node server.js
EOL
chmod +x .next-do/standalone/start.sh

# Create a Dockerfile for DigitalOcean
echo "🐳 Creating Dockerfile..."
cat > Dockerfile << EOL
FROM node:20-slim

WORKDIR /app

# Copy the standalone build (which now includes static files in the right place)
COPY .next-do/standalone ./

# Copy public files
COPY public ./public

# Ensure files are properly accessible
RUN chmod -R 755 /app/public

# Set environment variables
ENV NODE_ENV production
ENV PORT 8080

# Install OpenSSL for Prisma
RUN apt-get update && apt-get install -y openssl

# Expose the port
EXPOSE 8080

# Start the application
CMD ["node", "server.js"]
EOL

echo "✅ Pre-deployment process completed!"
echo "📋 Next steps:"
echo "1. Commit these changes"
echo "2. Push to your DigitalOcean App Platform repository"
echo "3. Deploy the application through the DigitalOcean dashboard"