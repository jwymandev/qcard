#!/usr/bin/env node

/**
 * Fix Asset Loading for Digital Ocean Deployment
 * 
 * This script ensures that client-side JavaScript assets are properly copied
 * to the correct location in the standalone output for Digital Ocean App Platform.
 * It verifies that:
 * 1. All static assets are in the correct location
 * 2. The _next directory is properly structured
 * 3. All JavaScript chunks are accessible
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Main function
async function main() {
  console.log('=== FIXING ASSET LOADING FOR DIGITAL OCEAN ===');
  
  // Determine the build output directories
  const buildDir = fs.existsSync('.next-do') ? '.next-do' : '.next';
  const standaloneDir = path.join(buildDir, 'standalone');
  
  if (!fs.existsSync(standaloneDir)) {
    console.error(`❌ Error: Standalone directory not found at ${standaloneDir}`);
    console.log('Please run the build first with output: "standalone"');
    process.exit(1);
  }
  
  // Source and destination directories for static assets
  const sourceStaticDir = path.join(buildDir, 'static');
  const destStaticDir = path.join(standaloneDir, '.next', 'static');
  
  // Verify source static directory exists
  if (!fs.existsSync(sourceStaticDir)) {
    console.error(`❌ Error: Static directory not found at ${sourceStaticDir}`);
    console.log('The build may not have generated client-side assets');
    process.exit(1);
  }
  
  // Create destination directories if they don't exist
  if (!fs.existsSync(destStaticDir)) {
    console.log(`Creating static directory at ${destStaticDir}`);
    fs.mkdirSync(destStaticDir, { recursive: true });
  }
  
  // Copy static assets from source to destination
  console.log('Copying static assets...');
  try {
    // Use different copy methods based on platform
    if (process.platform === 'win32') {
      execSync(`xcopy "${sourceStaticDir}" "${destStaticDir}" /E /I /Y`);
    } else {
      execSync(`cp -R "${sourceStaticDir}"/* "${destStaticDir}"`);
    }
    console.log('✅ Static assets copied successfully');
  } catch (error) {
    console.error('❌ Error copying static assets:', error.message);
    console.log('Trying alternative method...');
    
    // Manual recursive copy as fallback
    try {
      copyDirRecursive(sourceStaticDir, destStaticDir);
      console.log('✅ Static assets copied successfully (manual method)');
    } catch (manualError) {
      console.error('❌ Error during manual copy:', manualError.message);
      process.exit(1);
    }
  }
  
  // Verify destination directory now has JavaScript chunks
  const chunksDir = path.join(destStaticDir, 'chunks');
  if (fs.existsSync(chunksDir)) {
    const jsFiles = fs.readdirSync(chunksDir).filter(f => f.endsWith('.js'));
    console.log(`Found ${jsFiles.length} JavaScript chunks in ${chunksDir}`);
    
    if (jsFiles.length === 0) {
      console.warn('⚠️ Warning: No JavaScript chunks found! Client-side rendering may not work.');
    } else {
      console.log('✅ JavaScript assets verified');
    }
  } else {
    console.warn('⚠️ Warning: Chunks directory not found at ' + chunksDir);
    console.log('Client-side JavaScript may not be properly bundled');
  }
  
  // Also copy the public directory to ensure all public assets are available
  const sourcePublicDir = 'public';
  const destPublicDir = path.join(standaloneDir, 'public');
  
  if (fs.existsSync(sourcePublicDir)) {
    console.log('Copying public assets...');
    try {
      // Use different copy methods based on platform
      if (process.platform === 'win32') {
        execSync(`xcopy "${sourcePublicDir}" "${destPublicDir}" /E /I /Y`);
      } else {
        // Create destination directory if it doesn't exist
        if (!fs.existsSync(destPublicDir)) {
          fs.mkdirSync(destPublicDir, { recursive: true });
        }
        execSync(`cp -R "${sourcePublicDir}"/* "${destPublicDir}"`);
      }
      console.log('✅ Public assets copied successfully');
    } catch (error) {
      console.error('❌ Error copying public assets:', error.message);
      // Continue anyway
    }
  }
  
  console.log('=== ASSET FIXING COMPLETED ===');
  console.log('All client-side JavaScript assets should now be properly configured for Digital Ocean App Platform.');
}

// Helper function for manual recursive directory copy
function copyDirRecursive(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  
  const entries = fs.readdirSync(src, { withFileTypes: true });
  
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    
    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

// Run the main function
main().catch(error => {
  console.error('Fatal error during asset fixing:', error);
  process.exit(1);
});