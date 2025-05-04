#!/bin/bash

# Script to update the schema and run migrations for the questionnaire feature
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
if [ ! -f ./prisma/migrations/20250504_add_questionnaires_and_custom_fields/migration.sql ]; then
  echo "❌ Error: migration.sql not found"
  exit 1
fi

# 6. Apply the migration
echo "🚀 Applying migration..."
export DATABASE_URL="postgresql://postgres:postgres@localhost:5432/qcard_dev?schema=public"
npx prisma migrate dev --name add_questionnaires_and_custom_fields

# 7. Generate updated Prisma client
echo "⚙️ Generating updated Prisma client..."
npx prisma generate

# 8. Restore temporarily disabled components
echo "🔄 Restoring temporarily disabled components..."

# Restore profile-schema.ts if it was disabled
if [ -f ./src/lib/profile-schema.ts.disabled ]; then
  mv ./src/lib/profile-schema.ts.disabled ./src/lib/profile-schema.ts
fi

# Restore DynamicProfileForm component if it was disabled
if [ -f ./src/components/DynamicProfileForm.tsx.disabled ]; then
  mv ./src/components/DynamicProfileForm.tsx.disabled ./src/components/DynamicProfileForm.tsx
fi

# 9. Verify the build passes with the new schema
echo "🧪 Testing build with new schema..."
npm run build

echo "✅ Schema update and migration completed successfully!"
echo "You can now re-enable and deploy the questionnaire feature."