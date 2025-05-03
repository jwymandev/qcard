#!/bin/bash
set -e

echo "Starting deployment process..."

# Check if NEXTAUTH_SECRET is set
if [ -z "$NEXTAUTH_SECRET" ]; then
  echo "Warning: NEXTAUTH_SECRET environment variable is not set."
  echo "A random secret will be generated, but it's recommended to set a persistent secret."
  export NEXTAUTH_SECRET=$(openssl rand -base64 32)
fi

# Check if NEXTAUTH_URL is set
if [ -z "$NEXTAUTH_URL" ]; then
  echo "Warning: NEXTAUTH_URL environment variable is not set."
  echo "Using default domain. Make sure to set the correct URL in production."
  export NEXTAUTH_URL="https://qcard.app"
fi

# Log the database URL (without showing credentials)
echo "Running database migrations..."

# Run database migrations
npx prisma migrate deploy

# Generate Prisma client
npx prisma generate

# Build the app
echo "Building the application..."
npm run build

echo "Deployment process completed successfully!"