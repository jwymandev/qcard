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
npm run build

# Run Prisma fix script
echo "🔧 Running Prisma deployment fix..."
node scripts/prisma-deployment-fix.js

# Copy the Prisma schema to the standalone directory
echo "📄 Copying Prisma schema and engines..."
mkdir -p .next/standalone/.prisma/client
cp -r node_modules/.prisma/client/libquery_engine-* .next/standalone/.prisma/client/
cp prisma/schema.prisma .next/standalone/.prisma/client/
cp prisma/schema.prisma .next/standalone/prisma/schema.prisma 2>/dev/null || mkdir -p .next/standalone/prisma && cp prisma/schema.prisma .next/standalone/prisma/schema.prisma

# Generate a simple production start script
echo "📝 Creating production start script..."
cat > .next/standalone/start.sh << EOL
#!/bin/bash
export DATABASE_URL=\${DATABASE_URL}
echo "Starting QCard application..."
node server.js
EOL
chmod +x .next/standalone/start.sh

# Create a Dockerfile for DigitalOcean
echo "🐳 Creating Dockerfile..."
cat > Dockerfile << EOL
FROM node:20-slim

WORKDIR /app

# Copy the standalone build
COPY .next/standalone ./

# Copy static files - CRITICAL for client-side JavaScript
COPY .next/static ./.next/static
COPY public ./public

# Ensure static files are properly accessible and have correct permissions
RUN mkdir -p /app/.next/static && \
    mkdir -p /app/public && \
    chmod -R 755 /app/.next/static && \
    chmod -R 755 /app/public

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