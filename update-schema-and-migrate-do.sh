#!/bin/bash

# Migration script for DigitalOcean using individual connection parameters
# This script constructs a DATABASE_URL from individual parameters
set -e

echo "📋 DigitalOcean: Updating schema and creating migrations for the Questionnaire feature"

# 1. Check if we have the updated schema
if [ ! -f ./prisma/schema.prisma.new ]; then
  echo "❌ Error: schema.prisma.new not found"
  exit 1
fi

# 2. Backup current schema
echo "📑 Creating backup of current schema..."
cp ./prisma/schema.prisma ./prisma/schema.prisma.backup

# 3. Update schema with new models
echo "📝 Updating schema with questionnaire models..."
cp ./prisma/schema.prisma.new ./prisma/schema.prisma

# 4. Create migration directory if it doesn't exist
mkdir -p ./prisma/migrations/20250504_add_questionnaires_and_custom_fields

# 5. Check if we have the migration SQL
if [ -f ./prisma/migrations/20250504_add_questionnaires_and_custom_fields/enhanced-migration.sql ]; then
  echo "✅ Using enhanced migration SQL for better error handling"
  cp ./prisma/migrations/20250504_add_questionnaires_and_custom_fields/enhanced-migration.sql ./prisma/migrations/20250504_add_questionnaires_and_custom_fields/migration.sql
elif [ ! -f ./prisma/migrations/20250504_add_questionnaires_and_custom_fields/migration.sql ]; then
  echo "❌ Error: migration.sql not found"
  exit 1
fi

# 6. Set up database connection - DigitalOcean method
echo "🔍 Setting up database connection for DigitalOcean..."

# Source connection parameters from .env files
if [ -f .env.do ]; then
  echo "🌐 Loading DigitalOcean environment variables from .env.do"
  set -o allexport
  source .env.do
  set +o allexport
elif [ -f .env.production ]; then
  echo "🌐 Loading production environment variables from .env.production"
  set -o allexport
  source .env.production
  set +o allexport
elif [ -f .env ]; then
  echo "💻 Loading local environment variables from .env"
  set -o allexport
  source .env
  set +o allexport
fi

# Check if we have individual connection parameters
DB_CONNECTION_READY=false

# Case 1: Using individual connection parameters
if [ -n "$DATABASE_HOST" ] && [ -n "$DATABASE_USERNAME" ]; then
  # Set defaults for optional parameters
  DB_PORT=${DATABASE_PORT:-25060}
  DB_NAME=${DATABASE_NAME:-defaultdb}
  
  if [ -z "$DATABASE_PASSWORD" ]; then
    echo "❌ Error: DATABASE_PASSWORD is required when using individual connection parameters"
    exit 1
  fi
  
  # Encode password for URL
  ENCODED_PASSWORD=$(echo -n "$DATABASE_PASSWORD" | jq -sRr @uri)
  
  # Construct PostgreSQL URL
  export DATABASE_URL="postgresql://${DATABASE_USERNAME}:${ENCODED_PASSWORD}@${DATABASE_HOST}:${DB_PORT}/${DB_NAME}?sslmode=require"
  
  echo "✅ Constructed database URL from individual parameters"
  echo "🔌 Using database host: ${DATABASE_HOST}"
  DB_CONNECTION_READY=true
  
# Case 2: Using DATABASE_URL directly
elif [ -n "$DATABASE_URL" ]; then
  if [[ "$DATABASE_URL" == postgresql://* || "$DATABASE_URL" == postgres://* ]]; then
    # Get the hostname from the URL for display purposes
    DB_HOST=$(echo $DATABASE_URL | sed -E 's/^postgresql:\/\/[^:]+:[^@]+@([^:]+):.*/\1/')
    echo "🔌 Using existing PostgreSQL DATABASE_URL with host: $DB_HOST"
    DB_CONNECTION_READY=true
  else
    echo "⚠️ DATABASE_URL is not a PostgreSQL URL. For a DigitalOcean deployment, PostgreSQL is required."
    echo "   Current DATABASE_URL: ${DATABASE_URL}"
  fi
fi

# Fail if we couldn't setup a proper connection
if [ "$DB_CONNECTION_READY" != true ]; then
  echo "❌ Error: Could not configure database connection."
  echo "Please set either:"
  echo "  - Individual connection parameters (DATABASE_HOST, DATABASE_USERNAME, DATABASE_PASSWORD, etc.)"
  echo "  - A valid PostgreSQL DATABASE_URL"
  exit 1
fi

# 7. Apply the migration
echo "🚀 Applying migration..."
npx prisma migrate dev --name add_questionnaires_and_custom_fields

# 8. Generate updated Prisma client
echo "⚙️ Generating updated Prisma client..."
npx prisma generate

# 9. Restore temporarily disabled components
echo "🔄 Restoring temporarily disabled components..."

# Restore profile-schema.ts if it was disabled
if [ -f ./src/lib/profile-schema.ts.disabled ]; then
  mv ./src/lib/profile-schema.ts.disabled ./src/lib/profile-schema.ts
fi

# Restore DynamicProfileForm component if it was disabled
if [ -f ./src/components/DynamicProfileForm.tsx.disabled ]; then
  mv ./src/components/DynamicProfileForm.tsx.disabled ./src/components/DynamicProfileForm.tsx
fi

# 10. Verify the build passes with the new schema
echo "🧪 Testing build with new schema..."
npm run build

echo "✅ Schema update and migration completed successfully!"
echo "You can now deploy the questionnaire feature to DigitalOcean."