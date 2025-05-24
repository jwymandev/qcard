#!/usr/bin/env node

/**
 * Fix Asset Loading for Next.js Standalone Output
 * 
 * This script ensures that client-side JavaScript assets are properly copied
 * to the correct location in the standalone output.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Main function
async function main() {
  console.log('=== FIXING ASSET LOADING ===');
  
  // Determine the build output directories
  const buildDir = '.next';
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
    copyDirRecursive(sourceStaticDir, destStaticDir);
    console.log('✅ Static assets copied successfully');
  } catch (error) {
    console.error('❌ Error copying static assets:', error.message);
    process.exit(1);
  }
  
  // Verify JavaScript files
  const chunksDir = path.join(destStaticDir, 'chunks');
  if (fs.existsSync(chunksDir)) {
    const jsFiles = fs.readdirSync(chunksDir).filter(f => f.endsWith('.js'));
    console.log(`Found ${jsFiles.length} JavaScript chunks in ${chunksDir}`);
  }
  
  console.log('=== ASSET FIXING COMPLETED ===');
}

// Helper function for recursive directory copy
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