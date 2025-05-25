#!/usr/bin/env node

/**
 * Fix Prisma Engine Locations for Next.js Standalone Output
 * 
 * This script finds Prisma engine binaries and copies them to the correct locations
 * in the Next.js standalone output directory, ensuring they're available at runtime.
 * 
 * USAGE: This script should be run AFTER Next.js build in the DigitalOcean build process.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔧 Running Prisma Engine Fix Script...');

// Find Prisma engine files in the build output
function findEngineFiles() {
  const engineLocations = [
    path.join(process.cwd(), 'node_modules', '.prisma', 'client'),
    path.join(process.cwd(), 'node_modules', '@prisma', 'engines'),
    path.join(process.cwd(), '.next', 'cache', 'prisma')
  ];
  
  let engineFiles = [];
  
  for (const location of engineLocations) {
    if (fs.existsSync(location)) {
      try {
        const files = fs.readdirSync(location)
          .filter(file => file.startsWith('libquery_engine-'))
          .map(file => path.join(location, file));
        
        engineFiles = [...engineFiles, ...files];
        if (files.length > 0) {
          console.log(`Found ${files.length} engine files in ${location}`);
        }
      } catch (error) {
        console.error(`Error reading directory ${location}:`, error);
      }
    }
  }
  
  return engineFiles;
}

// Create the target directories for engine files
function createTargetDirs() {
  const targetDirs = [
    path.join(process.cwd(), '.next', 'standalone', 'node_modules', '.prisma', 'client'),
    path.join(process.cwd(), '.next', 'standalone', '.next', 'server'),
    path.join(process.cwd(), '.next', 'standalone', '.prisma', 'client')
  ];
  
  for (const dir of targetDirs) {
    if (!fs.existsSync(dir)) {
      try {
        fs.mkdirSync(dir, { recursive: true });
        console.log(`Created directory: ${dir}`);
      } catch (error) {
        console.error(`Error creating directory ${dir}:`, error);
      }
    }
  }
  
  return targetDirs;
}

// Copy all engine files to target directories
function copyEngineFiles(engineFiles, targetDirs) {
  for (const engineFile of engineFiles) {
    const fileName = path.basename(engineFile);
    
    for (const targetDir of targetDirs) {
      const targetPath = path.join(targetDir, fileName);
      try {
        fs.copyFileSync(engineFile, targetPath);
        console.log(`Copied ${fileName} to ${targetDir}`);
      } catch (error) {
        console.error(`Error copying ${fileName} to ${targetDir}:`, error);
      }
    }
  }
}

// Copy Prisma schema to target directories
function copyPrismaSchema(targetDirs) {
  const schemaPath = path.join(process.cwd(), 'prisma', 'schema.prisma');
  
  if (fs.existsSync(schemaPath)) {
    for (const targetDir of targetDirs) {
      const targetPath = path.join(targetDir, 'schema.prisma');
      try {
        fs.copyFileSync(schemaPath, targetPath);
        console.log(`Copied schema.prisma to ${targetDir}`);
      } catch (error) {
        console.error(`Error copying schema.prisma to ${targetDir}:`, error);
      }
    }
  } else {
    console.warn('schema.prisma not found in prisma directory');
  }
}

// Create a .env file in the standalone directory
function createEnvFile() {
  const envPath = path.join(process.cwd(), '.next', 'standalone', '.env');
  
  try {
    fs.writeFileSync(envPath, 'DATABASE_URL=${DATABASE_URL}\n');
    console.log(`Created .env file at ${envPath}`);
  } catch (error) {
    console.error(`Error creating .env file:`, error);
  }
}

// Main execution
async function main() {
  try {
    // Find engine files
    const engineFiles = findEngineFiles();
    
    if (engineFiles.length === 0) {
      console.error('❌ No Prisma engine files found!');
      
      // Try generating the Prisma client to create engine files
      console.log('📦 Attempting to generate Prisma client...');
      try {
        execSync('npx prisma generate', { stdio: 'inherit' });
        const newEngineFiles = findEngineFiles();
        
        if (newEngineFiles.length === 0) {
          console.error('❌ Still no engine files found after prisma generate!');
          process.exit(1);
        }
        
        console.log(`✅ Found ${newEngineFiles.length} engine files after generation`);
        
        // Create target directories and copy files
        const targetDirs = createTargetDirs();
        copyEngineFiles(newEngineFiles, targetDirs);
        copyPrismaSchema(targetDirs);
      } catch (error) {
        console.error('❌ Failed to generate Prisma client:', error);
        process.exit(1);
      }
    } else {
      console.log(`✅ Found ${engineFiles.length} engine files`);
      
      // Create target directories and copy files
      const targetDirs = createTargetDirs();
      copyEngineFiles(engineFiles, targetDirs);
      copyPrismaSchema(targetDirs);
    }
    
    // Create .env file
    createEnvFile();
    
    console.log('✅ Prisma engine fix completed successfully!');
  } catch (error) {
    console.error('❌ Error fixing Prisma engines:', error);
    process.exit(1);
  }
}

main();