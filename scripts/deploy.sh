#!/bin/bash
set -e

# Log the database URL (without showing credentials)
echo "Running database migrations..."

# Run database migrations
npx prisma migrate deploy

# Generate Prisma client
npx prisma generate

# Build the app
npm run build