#!/bin/bash

# pre-deploy-do.sh - Prepare the application for Digital Ocean deployment

echo "=== QCard Digital Ocean Pre-Deploy Setup ==="
echo "Setting up application for Digital Ocean deployment..."

# 1. Create the db.ts.new file if it doesn't exist
if [ ! -f "src/lib/db.ts.new" ]; then
  echo "Creating db.ts.new file..."
  cat > src/lib/db.ts.new << 'EOF'
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
  echo "✅ Created db.ts.new file"
fi

# 2. Ensure setup-do-database-simple.js exists
if [ ! -f "scripts/setup-do-database-simple.js" ]; then
  echo "Creating setup-do-database-simple.js..."
  cat > scripts/setup-do-database-simple.js << 'EOF'
#!/usr/bin/env node

/**
 * Simple Digital Ocean Database Setup Script
 */

function setupDatabaseUrl() {
  // Always use placeholder in build mode
  process.env.DATABASE_URL = 'postgresql://placeholder:placeholder@localhost:5432/placeholder';
  console.log('Using placeholder DATABASE_URL for build');
  return process.env.DATABASE_URL;
}

// Run the setup
const url = setupDatabaseUrl();

// Export the URL for other scripts to use
module.exports = {
  databaseUrl: url
};
EOF
  echo "✅ Created setup-do-database-simple.js"
fi

# 3. Ensure replace-db-file.js exists
if [ ! -f "scripts/replace-db-file.js" ]; then
  echo "Creating replace-db-file.js..."
  cat > scripts/replace-db-file.js << 'EOF'
#!/usr/bin/env node

/**
 * Replace DB File Script
 */

const fs = require('fs');
const path = require('path');

function replaceDbFile() {
  console.log('Replacing db.ts file with known-good version...');
  
  // Path to the destination file
  const destPath = path.join(process.cwd(), 'src', 'lib', 'db.ts');
  
  // Simple replacement with no assignment errors
  const simpleReplacement = `import { PrismaClient } from '@prisma/client';

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
}`;
  
  // Write the simple replacement file
  fs.writeFileSync(destPath, simpleReplacement, 'utf8');
  console.log('Created simple replacement db.ts file');
  return true;
}

// Run the function
replaceDbFile();

// Export the function for use in other scripts
module.exports = {
  replaceDbFile
};
EOF
  chmod +x scripts/replace-db-file.js
  echo "✅ Created replace-db-file.js"
fi

# 4. Replace db.ts file with the simplified version
echo "Replacing db.ts with simplified version..."
node scripts/replace-db-file.js
echo "✅ Replaced db.ts with simplified version"

echo "✅ Pre-deployment setup complete!"
echo "You can now deploy to Digital Ocean with: npm run do:deploy-full"