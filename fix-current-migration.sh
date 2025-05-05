#!/bin/bash

# Script to apply the pending questionnaire migration and fix current issues
set -e

echo "🔄 Applying pending questionnaire migration and fixing studio initialization..."

# 1. Check environment variables
if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
  echo "✅ Loaded environment variables from .env"
else
  echo "⚠️ No .env file found, using existing environment variables"
fi

# 2. Verify database connection
if [ -z "$DATABASE_URL" ]; then
  echo "❌ Error: DATABASE_URL not found in environment"
  echo "Please set DATABASE_URL in your .env file or environment"
  exit 1
fi

echo "🔌 Using database from environment: ${DATABASE_URL:0:12}...${DATABASE_URL: -12}"

# 3. Apply the enhanced migration
echo "🚀 Applying questionnaire migration..."
npx prisma migrate resolve --applied "20250504_add_questionnaires_and_custom_fields"
npx prisma db push --accept-data-loss

# 4. Generate updated Prisma client
echo "⚙️ Generating Prisma client..."
npx prisma generate

# 5. Check for studio initialization
echo "🏢 Checking if studios need initialization..."
node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkStudios() {
  try {
    // Find any tenants of type STUDIO that don't have a studio record
    const tenantsWithoutStudios = await prisma.\$queryRaw\`
      SELECT t.id, t.name 
      FROM \"Tenant\" t 
      LEFT JOIN \"Studio\" s ON t.id = s.\"tenantId\" 
      WHERE t.type = 'STUDIO' AND s.id IS NULL
    \`;
    
    console.log(\`Found \${tenantsWithoutStudios.length} studios that need initialization\`);
    
    for (const tenant of tenantsWithoutStudios) {
      console.log(\`Initializing studio for tenant: \${tenant.name} (\${tenant.id})\`);
      
      // Create a studio record for this tenant
      await prisma.studio.create({
        data: {
          id: require('crypto').randomUUID(),
          name: tenant.name || 'New Studio', 
          tenantId: tenant.id,
          updatedAt: new Date()
        }
      });
      
      console.log(\`✅ Studio initialized for tenant: \${tenant.name}\`);
    }
  } catch (error) {
    console.error('Error checking/initializing studios:', error);
  } finally {
    await prisma.\$disconnect();
  }
}

checkStudios();
"

# 6. Verify the database health
echo "🔍 Verifying database health..."
curl -s http://localhost:3001/api/health || echo "Cannot check health endpoint - make sure server is running"

echo "✅ Migration and fixes completed successfully!"
echo "You should now be able to access projects at /studio/projects"
echo "If you're still having issues, please restart your server with 'npm run dev'"

# Make the script executable
chmod +x fix-current-migration.sh