#!/usr/bin/env node

/**
 * Prisma Deployment Fix for Next.js Standalone Mode
 * 
 * This script addresses the issue with Prisma engines not being found
 * when deploying Next.js applications in standalone mode to DigitalOcean.
 * 
 * The script ensures that the necessary Prisma engine binaries are copied
 * to the appropriate locations in the standalone output directory.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔧 Running Prisma Deployment Fix...');

// Determine the current platform
const getPlatformBinary = () => {
  const platform = process.platform;
  const arch = process.arch;

  if (platform === 'linux') {
    if (arch === 'x64') {
      return 'debian-openssl-3.0.x';
    } else if (arch === 'arm64') {
      return 'linux-arm64-openssl-3.0.x';
    }
  } else if (platform === 'darwin') {
    if (arch === 'x64') {
      return 'darwin';
    } else if (arch === 'arm64') {
      return 'darwin-arm64';
    }
  } else if (platform === 'win32') {
    return 'windows';
  }

  throw new Error(`Unsupported platform: ${platform} ${arch}`);
};

// Run the prisma generate command to ensure engines are present
try {
  console.log('📦 Generating Prisma Client...');
  execSync('npx prisma generate', { stdio: 'inherit' });
} catch (error) {
  console.error('❌ Failed to generate Prisma Client:', error);
  process.exit(1);
}

// Define source and target directories
const projectRoot = process.cwd();
const platformBinary = getPlatformBinary();
const engineFileName = `libquery_engine-${platformBinary}.${platformBinary.includes('windows') ? 'dll' : 'so.node'}`;

// Source locations
const sourceEngineDir = path.join(projectRoot, 'node_modules', '@prisma', 'client');
const sourceEnginePath = path.join(sourceEngineDir, 'libquery_engine-*');

// Target locations for standalone output
const targetDirs = [
  path.join(projectRoot, '.next', 'standalone', 'node_modules', '.prisma', 'client'),
  path.join(projectRoot, '.next', 'standalone', '.next', 'server'),
  path.join(projectRoot, '.next', 'standalone', '.prisma', 'client')
];

// Create the target directories if they don't exist
console.log('📂 Ensuring target directories exist...');
for (const dir of targetDirs) {
  if (!fs.existsSync(dir)) {
    console.log(`Creating directory: ${dir}`);
    fs.mkdirSync(dir, { recursive: true });
  }
}

// Find all Prisma engine files
console.log('🔍 Finding Prisma engine files...');
let engineFiles = [];
try {
  const engineDir = path.join(projectRoot, 'node_modules', '.prisma', 'client');
  if (fs.existsSync(engineDir)) {
    engineFiles = fs.readdirSync(engineDir)
      .filter(file => file.startsWith('libquery_engine-'))
      .map(file => path.join(engineDir, file));
  }
} catch (error) {
  console.error('⚠️ Error while searching for engine files:', error);
}

// If no engines found, try to locate them in another directory
if (engineFiles.length === 0) {
  try {
    const nodeModulesDir = path.join(projectRoot, 'node_modules', '@prisma', 'engines');
    if (fs.existsSync(nodeModulesDir)) {
      engineFiles = fs.readdirSync(nodeModulesDir)
        .filter(file => file.startsWith('libquery_engine-'))
        .map(file => path.join(nodeModulesDir, file));
    }
  } catch (error) {
    console.error('⚠️ Error while searching for engine files in alternative location:', error);
  }
}

// Report status
if (engineFiles.length === 0) {
  console.error('❌ No Prisma engine files found!');
  process.exit(1);
} else {
  console.log(`✅ Found ${engineFiles.length} Prisma engine files`);
}

// Copy schema.prisma to the target directories
console.log('📄 Copying schema.prisma...');
const schemaSource = path.join(projectRoot, 'prisma', 'schema.prisma');
if (fs.existsSync(schemaSource)) {
  for (const dir of targetDirs) {
    const schemaTarget = path.join(dir, 'schema.prisma');
    try {
      fs.copyFileSync(schemaSource, schemaTarget);
      console.log(`Copied schema.prisma to ${schemaTarget}`);
    } catch (error) {
      console.error(`⚠️ Error copying schema.prisma to ${schemaTarget}:`, error);
    }
  }
} else {
  console.error('⚠️ schema.prisma not found at', schemaSource);
}

// Copy all engine files to target directories
console.log('🔄 Copying engine files...');
for (const engineFile of engineFiles) {
  const engineFileName = path.basename(engineFile);
  for (const targetDir of targetDirs) {
    const targetPath = path.join(targetDir, engineFileName);
    try {
      fs.copyFileSync(engineFile, targetPath);
      console.log(`Copied ${engineFileName} to ${targetPath}`);
    } catch (error) {
      console.error(`⚠️ Error copying ${engineFileName} to ${targetPath}:`, error);
    }
  }
}

// Create a .env file in the standalone directory to ensure DATABASE_URL is available
console.log('📝 Ensuring .env file exists in standalone directory...');
const envContent = 'DATABASE_URL=${DATABASE_URL}\n';
const envTarget = path.join(projectRoot, '.next', 'standalone', '.env');
try {
  fs.writeFileSync(envTarget, envContent);
  console.log(`Created .env file at ${envTarget}`);
} catch (error) {
  console.error(`⚠️ Error creating .env file at ${envTarget}:`, error);
}

// Create index.js in .prisma/client directory
console.log('📝 Creating index.js in .prisma/client directory...');
const indexContent = `
const path = require('path');
const { config } = require('dotenv');
const { PrismaClient } = require('@prisma/client');

// Load environment variables
config();

// Export PrismaClient
module.exports = {
  PrismaClient
};
`;

for (const targetDir of targetDirs) {
  const indexTarget = path.join(targetDir, 'index.js');
  try {
    fs.writeFileSync(indexTarget, indexContent);
    console.log(`Created index.js at ${indexTarget}`);
  } catch (error) {
    console.error(`⚠️ Error creating index.js at ${indexTarget}:`, error);
  }
}

console.log('✅ Prisma Deployment Fix completed');