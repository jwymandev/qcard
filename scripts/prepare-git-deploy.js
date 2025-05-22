#!/usr/bin/env node

/**
 * Prepare Git Deployment Script
 * 
 * This script prepares the repository for Git-based deployment to Digital Ocean App Platform.
 * It ensures all the necessary files are properly set up.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('=== Preparing for Git-based deployment to Digital Ocean ===');

// Function to ensure a file is properly set up
function ensureFile(filePath, content, description) {
  console.log(`Checking ${description}...`);
  
  const fullPath = path.join(process.cwd(), filePath);
  
  // Check if file exists
  if (fs.existsSync(fullPath)) {
    console.log(`✅ ${description} already exists`);
    return;
  }
  
  // Create the file
  try {
    // Ensure directory exists
    const dir = path.dirname(fullPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    // Write the file
    fs.writeFileSync(fullPath, content, 'utf8');
    console.log(`✅ Created ${description}`);
  } catch (error) {
    console.error(`❌ Error creating ${description}:`, error.message);
  }
}

// 1. Ensure the do.app file exists for Digital Ocean App Platform configuration
ensureFile('.do/app.yaml', `
name: qcard
services:
- name: web
  github:
    branch: main
    deploy_on_push: true
    repo: username/qcard
  build_command: npm run build
  run_command: npm start
  environment_slug: node-js
  envs:
  - key: NODE_ENV
    value: production
  - key: NEXT_BUILD_SKIP_DB
    value: "true"
  # Add any other environment variables your app needs here
`, 'Digital Ocean App Platform configuration');

// 2. Ensure .gitignore excludes unnecessary files
ensureFile('.gitignore', `
# Dependencies
node_modules
.pnp
.pnp.js

# Testing
coverage

# Next.js
.next/
out/
build
dist

# Debug
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Environment Variables
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# Vercel
.vercel

# Local database
*.db
*.db-journal

# Logs
logs
*.log

# OS specific
.DS_Store
Thumbs.db

# Temp files
*.tmp
*.temp
.cache
`, 'Git ignore file');

// 3. Update package.json scripts if needed
try {
  console.log('Checking package.json scripts...');
  
  const packageJsonPath = path.join(process.cwd(), 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  
  let modified = false;
  
  // Ensure we have a proper start command for production
  if (!packageJson.scripts.start || !packageJson.scripts.start.includes('production')) {
    packageJson.scripts.start = 'NODE_ENV=production node production-start.js';
    modified = true;
    console.log('✅ Updated start script in package.json');
  }
  
  // Ensure we have a proper build command
  if (!packageJson.scripts.build || !packageJson.scripts.build.includes('NEXT_BUILD_SKIP_DB')) {
    packageJson.scripts.build = 'NEXT_BUILD_SKIP_DB=true npx prisma generate && NODE_ENV=production next build';
    modified = true;
    console.log('✅ Updated build script in package.json');
  }
  
  // Write changes if needed
  if (modified) {
    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2), 'utf8');
    console.log('✅ Saved changes to package.json');
  } else {
    console.log('✅ package.json scripts are already configured correctly');
  }
} catch (error) {
  console.error('❌ Error updating package.json:', error.message);
}

// 4. Ensure we have a production-start.js file
ensureFile('production-start.js', `
/**
 * Production Start Script
 * 
 * This script ensures proper configuration before starting the Next.js server.
 */

// Set production environment
process.env.NODE_ENV = 'production';

// Get the port from environment or use default
const PORT = process.env.PORT || 8080;

console.log(\`Starting server on port \${PORT}...\`);

// Configure database URL if needed
if (process.env.DATABASE_HOST && !process.env.DATABASE_URL) {
  const host = process.env.DATABASE_HOST;
  const port = process.env.DATABASE_PORT || '5432';
  const username = process.env.DATABASE_USERNAME || 'postgres';
  const password = process.env.DATABASE_PASSWORD || '';
  const dbName = process.env.DATABASE_NAME || 'postgres';
  
  // Encode password for URL
  const encodedPassword = encodeURIComponent(password);
  
  // Construct the URL with SSL
  process.env.DATABASE_URL = \`postgresql://\${username}:\${encodedPassword}@\${host}:\${port}/\${dbName}?sslmode=require\`;
  
  console.log(\`Database URL constructed from environment variables\`);
}

// Start the server
require('next/dist/bin/next');
`, 'Production start script');

// 5. Create a Procfile for Digital Ocean
ensureFile('Procfile', 'web: npm start', 'Procfile for Digital Ocean');

console.log('\n=== Git-based deployment preparation complete! ===');
console.log('To deploy to Digital Ocean App Platform:');
console.log('1. Commit these changes to your repository');
console.log('2. Push to the branch connected to your Digital Ocean App');
console.log('3. Digital Ocean will automatically deploy the new code');
console.log('\nCommand to commit and push:');
console.log('git add . && git commit -m "Configure for Digital Ocean deployment" && git push');