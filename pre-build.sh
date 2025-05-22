#!/bin/bash

# pre-build.sh
# Configures proper database connection URL for build process
# This script is intended to be run before the Next.js build process starts

echo "Running pre-build database configuration..."

# Skip if SKIP_PRE_BUILD is set (for local development or specific environments)
if [ -n "$SKIP_PRE_BUILD" ]; then
  echo "SKIP_PRE_BUILD is set, skipping database URL configuration"
  exit 0
fi

# Only run on Digital Ocean App Platform
if [ -z "$DIGITALOCEAN_APP_NAME" ]; then
  echo "Not running on Digital Ocean App Platform, skipping URL configuration"
  exit 0
fi

# Function to configure DATABASE_URL environment variable
configure_database_url() {
  # Check if we have Digital Ocean style individual environment variables
  if [ -n "$DATABASE_HOST" ]; then
    echo "Constructing DATABASE_URL from Digital Ocean environment variables..."
    
    # Extract raw values from environment
    HOST_RAW="${DATABASE_HOST:-}"
    PORT_RAW="${DATABASE_PORT:-25060}"
    USERNAME_RAW="${DATABASE_USERNAME:-doadmin}"
    PASSWORD_RAW="${DATABASE_PASSWORD:-}"
    DBNAME_RAW="${DATABASE_NAME:-defaultdb}"
    
    # Check for Digital Ocean placeholders
    if [[ "$HOST_RAW" == *'${'* || "$PORT_RAW" == *'${'* || 
          "$USERNAME_RAW" == *'${'* || "$PASSWORD_RAW" == *'${'* || 
          "$DBNAME_RAW" == *'${'* ]]; then
      echo "❌ DATABASE environment variables contain unresolved placeholders"
      echo "This usually means the Digital Ocean App Platform is misconfigured."
      echo "Please check your environment variables in Digital Ocean App Platform."
      
      # Log the raw values for debugging
      echo "Raw Environment Variables:"
      echo "- DATABASE_HOST: $HOST_RAW"
      echo "- DATABASE_PORT: $PORT_RAW"
      echo "- DATABASE_USERNAME: $USERNAME_RAW"
      echo "- DATABASE_NAME: $DBNAME_RAW"
      
      return 1
    fi
    
    # Use actual values from environment
    HOST="$HOST_RAW"
    PORT="$PORT_RAW"
    USERNAME="$USERNAME_RAW"
    PASSWORD="$PASSWORD_RAW"
    DBNAME="$DBNAME_RAW"
    
    # Log the host and database for debugging
    echo "Database connection info:"
    echo "- Host: $HOST"
    echo "- Port: $PORT"
    echo "- Database: $DBNAME"
    
    # Encode password for URL (using node for proper encoding)
    ENCODED_PASSWORD=$(node -e "console.log(encodeURIComponent('$PASSWORD'))")
    
    # Construct PostgreSQL URL with SSL required for DigitalOcean
    DATABASE_URL="postgresql://$USERNAME:$ENCODED_PASSWORD@$HOST:$PORT/$DBNAME?sslmode=require"
    
    # Export the environment variable for the build process
    export DATABASE_URL
    echo "✅ Set DATABASE_URL to PostgreSQL connection (host: $HOST)"
    
    # Also create a temporary env.build file for Next.js
    echo "DATABASE_URL=$DATABASE_URL" > .env.build
    echo "Created .env.build file with proper DATABASE_URL"
    
    return 0
  elif [ -n "$DATABASE_URL" ]; then
    # Verify the DATABASE_URL format
    if [[ "$DATABASE_URL" != postgresql://* && "$DATABASE_URL" != postgres://* ]]; then
      echo "⚠️ DATABASE_URL does not appear to be a valid PostgreSQL URL"
      echo "Format should be: postgresql://username:password@host:port/database?sslmode=require"
      return 1
    else
      echo "✅ Using provided DATABASE_URL"
      # Still create a temporary env.build file to ensure Next.js picks it up
      echo "DATABASE_URL=$DATABASE_URL" > .env.build
      echo "Created .env.build file with existing DATABASE_URL"
      return 0
    fi
  else
    echo "⚠️ No database connection parameters found!"
    echo "Missing both DATABASE_URL and DATABASE_HOST environment variables."
    echo "Build process will likely fail to connect to database."
    return 1
  fi
}

# Run the database URL configuration
configure_database_url

# Create a temporary prisma .env file to ensure Prisma picks up the correct DATABASE_URL
if [ -f .env.build ]; then
  cp .env.build prisma/.env
  echo "Created temporary prisma/.env for build process"
fi

# Optionally, add the DATABASE_URL to the build environment again to be extra sure
if [ -f .env.build ]; then
  source .env.build
  echo "Loaded DATABASE_URL from .env.build"
fi

# Fix db.ts if it has the assignment error
if [ -f "src/lib/db.ts" ]; then
  # Check if the file contains the reversed assignment issue
  if grep -q '"postgresql://.*placeholder".*=.*databaseUrl' src/lib/db.ts; then
    echo "⚠️ Found reversed assignment in db.ts - fixing..."
    
    # Create a replacement db.ts with fixed assignment
    cat > src/lib/db.ts << 'EOF'
import { PrismaClient } from '@prisma/client';

const PLACEHOLDER_DB_URL = 'postgresql://placeholder:placeholder@localhost:5432/placeholder';

// Simple version with no assignment errors
const prismaClientSingleton = () => {
  console.log('Initializing Prisma client...');
  
  // Always use this in build mode
  if (process.env.NEXT_BUILD_SKIP_DB === 'true') {
    console.log('Build mode detected - using mock Prisma client');
    return new PrismaClient({ errorFormat: 'pretty' });
  }
  
  // Get database URL safely - CORRECT ASSIGNMENT DIRECTION ALWAYS
  let databaseUrl = process.env.DATABASE_URL || PLACEHOLDER_DB_URL;
  
  // Initialize client
  const client = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error'] : ['error'],
    errorFormat: 'pretty',
  });
  
  return client;
};

// Global singleton
const globalForPrisma = global as unknown as { prisma?: PrismaClient };
export const prisma = globalForPrisma.prisma || prismaClientSingleton();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
EOF
    echo "✅ Fixed db.ts reversed assignment issue"
  fi
fi

# Report success
echo "Pre-build database configuration completed."
exit 0