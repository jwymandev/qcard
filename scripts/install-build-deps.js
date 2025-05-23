#!/usr/bin/env node

/**
 * This script installs needed devDependencies for building in Digital Ocean
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Main function
async function main() {
  console.log('=== INSTALLING BUILD DEPENDENCIES ===');
  
  // List of dependencies to install
  const dependencies = [
    'ignore-loader',
    'null-loader',
    'html-loader'
  ];
  
  // Install mock dependencies needed by @mapbox/node-pre-gyp
  const mockDependencies = [
    'mock-aws-s3',
    'nock'
  ];
  
  try {
    console.log('Installing build loader dependencies...');
    execSync(`npm install --save-dev ${dependencies.join(' ')}`, {
      stdio: 'inherit'
    });
    console.log('✅ Build loader dependencies installed successfully');
    
    console.log('Installing mock dependencies for @mapbox/node-pre-gyp...');
    execSync(`npm install --save-dev ${mockDependencies.join(' ')}`, {
      stdio: 'inherit'
    });
    console.log('✅ Mock dependencies installed successfully');
    
    // Create empty mock modules
    createEmptyMockModules();
    
  } catch (error) {
    console.error('❌ Error installing dependencies:', error.message);
    process.exit(1);
  }
  
  console.log('=== BUILD DEPENDENCIES INSTALLATION COMPLETED ===');
}

// Function to create empty mock modules
function createEmptyMockModules() {
  console.log('Creating empty mock modules...');
  
  const modulesDir = path.join(__dirname, '../node_modules');
  
  // Ensure mock-aws-s3 exists and is accessible
  const mockAwsDir = path.join(modulesDir, 'mock-aws-s3');
  if (!fs.existsSync(mockAwsDir)) {
    fs.mkdirSync(mockAwsDir, { recursive: true });
    fs.writeFileSync(path.join(mockAwsDir, 'index.js'), 'module.exports = {};');
    fs.writeFileSync(path.join(mockAwsDir, 'package.json'), JSON.stringify({
      name: 'mock-aws-s3',
      version: '0.0.1',
      main: 'index.js'
    }, null, 2));
  }
  
  // Ensure nock exists and is accessible
  const nockDir = path.join(modulesDir, 'nock');
  if (!fs.existsSync(nockDir)) {
    fs.mkdirSync(nockDir, { recursive: true });
    fs.writeFileSync(path.join(nockDir, 'index.js'), 'module.exports = function() { return {}; };');
    fs.writeFileSync(path.join(nockDir, 'package.json'), JSON.stringify({
      name: 'nock',
      version: '0.0.1',
      main: 'index.js'
    }, null, 2));
  }
  
  // Ensure ignore-loader exists and is accessible
  const ignoreLoaderDir = path.join(modulesDir, 'ignore-loader');
  if (!fs.existsSync(ignoreLoaderDir)) {
    fs.mkdirSync(ignoreLoaderDir, { recursive: true });
    fs.writeFileSync(path.join(ignoreLoaderDir, 'index.js'), 
      'module.exports = function() { this.cacheable && this.cacheable(); return "module.exports = {};"; };');
    fs.writeFileSync(path.join(ignoreLoaderDir, 'package.json'), JSON.stringify({
      name: 'ignore-loader',
      version: '0.0.1',
      main: 'index.js'
    }, null, 2));
  }
  
  // Also create ignore-loader directly in the project root
  const rootIgnoreLoader = path.join(__dirname, '../ignore-loader.js');
  fs.writeFileSync(rootIgnoreLoader, 
    'module.exports = function() { this.cacheable && this.cacheable(); return "module.exports = {};"; };');
  
  console.log('✅ Empty mock modules created successfully');
}

// Run the main function
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});