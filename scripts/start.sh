#!/bin/bash

# Print current environment information
echo "Starting application in ${NODE_ENV:-development} mode"
echo "PORT: ${PORT:-8080}"

# Set default port if not set
export PORT="${PORT:-8080}"

# Wait for Prisma to be ready
echo "Checking database connection..."
npx prisma db pull --force || (echo "Warning: Database connection check failed but continuing anyway")

# Start the Next.js application
echo "Starting Next.js on port ${PORT}"
exec next start -p ${PORT}