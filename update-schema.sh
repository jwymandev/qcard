#!/bin/bash

# This script updates the database schema and ensures everything is properly synchronized

# Push schema changes to database
echo "Pushing schema changes to database..."
npx prisma db push

# Generate Prisma client
echo "Generating Prisma client..."
npx prisma generate

# Run any database migrations if needed
# npx prisma migrate dev --name $1

# Clean Next.js cache (important after schema changes)
echo "Cleaning Next.js cache..."
rm -rf .next/cache

echo "Schema update complete. Please restart your development server."