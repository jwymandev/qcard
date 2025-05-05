#!/usr/bin/env node

/**
 * Digital Ocean Full Deployment Script
 * This script handles the complete deployment process for Digital Ocean:
 * 1. Creates the necessary environment configuration
 * 2. Verifies that route conflicts are resolved
 * 3. Builds the application with proper environment settings
 * 4. Provides guidance for deployment
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

console.log(`${colors.cyan}=== QCard Digital Ocean Deployment Script ===${colors.reset}`);
console.log(`${colors.yellow}Starting deployment preparation...${colors.reset}\n`);

// Step 1: Check for route conflicts
console.log(`${colors.blue}Step 1: Checking for route conflicts...${colors.reset}`);

const projectPathsToCheck = [
  'src/app/studio/projects/[id]',
  'src/app/api/studio/projects/[id]'
];

let hasConflicts = false;

projectPathsToCheck.forEach(pathToCheck => {
  if (fs.existsSync(pathToCheck)) {
    console.log(`${colors.red}Error: Found conflicting route path: ${pathToCheck}${colors.reset}`);
    console.log(`This path conflicts with the standardized [projectId] parameter.`);
    hasConflicts = true;
  }
});

if (hasConflicts) {
  console.log(`${colors.red}Please resolve route conflicts before continuing.${colors.reset}`);
  console.log(`Refer to NEXT_ROUTE_MANUAL_FIX.md for guidance.`);
  process.exit(1);
} else {
  console.log(`${colors.green}✓ No route conflicts detected.${colors.reset}\n`);
}

// Step 2: Create production environment file
console.log(`${colors.blue}Step 2: Creating production environment configuration...${colors.reset}`);

try {
  // Run the create-env-production.js script
  require('./create-env-production');
  console.log(`${colors.green}✓ Created .env.production file.${colors.reset}\n`);
} catch (error) {
  console.log(`${colors.red}Error creating environment file: ${error.message}${colors.reset}`);
  process.exit(1);
}

// Step 3: Build the application
console.log(`${colors.blue}Step 3: Building the application...${colors.reset}`);
console.log(`${colors.yellow}This may take a few minutes...${colors.reset}`);

try {
  execSync('npx prisma generate', { stdio: 'inherit' });
  console.log(`${colors.green}✓ Prisma client generated.${colors.reset}`);
  
  execSync('NODE_ENV=production next build', { stdio: 'inherit' });
  console.log(`${colors.green}✓ Next.js build completed successfully.${colors.reset}\n`);
} catch (error) {
  console.log(`${colors.red}Build failed: ${error.message}${colors.reset}`);
  console.log(`Please fix the errors before deploying.`);
  process.exit(1);
}

// Step 4: Deployment instructions
console.log(`${colors.blue}Step 4: Deployment instructions${colors.reset}`);
console.log(`${colors.green}✓ Build process completed successfully!${colors.reset}`);
console.log(`\n${colors.cyan}To deploy to Digital Ocean:${colors.reset}`);
console.log(`1. Commit and push your changes to your repository`);
console.log(`2. Set up a new App in Digital Ocean App Platform`);
console.log(`3. Configure the following environment variables:`);
console.log(`   - DATABASE_HOST`);
console.log(`   - DATABASE_PORT`);
console.log(`   - DATABASE_USERNAME`);
console.log(`   - DATABASE_PASSWORD`);
console.log(`   - DATABASE_NAME`);
console.log(`   - NEXTAUTH_URL`);
console.log(`   - NEXTAUTH_SECRET\n`);

console.log(`${colors.cyan}For detailed deployment instructions, refer to:${colors.reset}`);
console.log(`DO_DEPLOY_GUIDE.md`);

console.log(`\n${colors.green}=== Deployment preparation complete! ===${colors.reset}`);