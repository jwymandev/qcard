#!/bin/bash

# Enhanced script to update the schema and run migrations for the questionnaire feature
# This script properly detects and uses the DATABASE_URL from the environment
set -e

echo "📋 Updating schema and creating migrations for the Questionnaire feature"

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

# 6. Determine the environment and set DATABASE_URL
echo "🔍 Determining environment and database connection..."

# If DATABASE_URL is already set in environment, use that
if [ -n "$DATABASE_URL" ]; then
  echo "✅ Using DATABASE_URL from environment"
# Try to load from various env files in priority order
elif [ -f .env.production ]; then
  echo "🌐 Found .env.production file"
  export $(grep -v '^#' .env.production | grep DATABASE_URL | xargs)
elif [ -f .env.do ]; then
  echo "🌐 Found .env.do file"
  export $(grep -v '^#' .env.do | grep DATABASE_URL | xargs)
elif [ -f .env ]; then
  echo "💻 Found .env file"
  export $(grep -v '^#' .env | grep DATABASE_URL | xargs)
fi

# Check if we can find a valid DATABASE_URL from any source
if [ -z "$DATABASE_URL" ]; then
  echo "❌ Error: DATABASE_URL not found in environment or any .env file"
  echo "Please ensure DATABASE_URL is set in your environment or in an .env file"
  exit 1
fi

# 7. Check if we're using PostgreSQL and sanitize connection output
if [[ "$DATABASE_URL" == postgresql://* || "$DATABASE_URL" == postgres://* ]]; then
  # Get the hostname from the URL for display purposes
  DB_HOST=$(echo $DATABASE_URL | sed -E 's/^postgresql:\/\/[^:]+:[^@]+@([^:]+):.*/\1/')
  echo "🔌 Using PostgreSQL database: $DB_HOST"
else
  echo "🔌 Using non-PostgreSQL database (possibly SQLite for development)"
fi

# 8. Apply the migration
echo "🚀 Applying migration..."
npx prisma migrate dev --name add_questionnaires_and_custom_fields

# 9. Generate updated Prisma client
echo "⚙️ Generating updated Prisma client..."
npx prisma generate

# 10. Restore temporarily disabled components
echo "🔄 Restoring temporarily disabled components..."

# Restore profile-schema.ts if it was disabled
if [ -f ./src/lib/profile-schema.ts.disabled ]; then
  mv ./src/lib/profile-schema.ts.disabled ./src/lib/profile-schema.ts
fi

# Restore DynamicProfileForm component if it was disabled
if [ -f ./src/components/DynamicProfileForm.tsx.disabled ]; then
  mv ./src/components/DynamicProfileForm.tsx.disabled ./src/components/DynamicProfileForm.tsx
fi

# 11. Verify the build passes with the new schema
echo "🧪 Testing build with new schema..."
npm run build

echo "✅ Schema update and migration completed successfully!"
echo "You can now re-enable and deploy the questionnaire feature."