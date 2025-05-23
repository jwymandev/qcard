#!/usr/bin/env node

/**
 * Digital Ocean Build Preparation Script
 * 
 * This script installs necessary dev dependencies for Digital Ocean build
 * and creates the necessary webpack loader config
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Main function
async function main() {
  console.log('=== PREPARING FOR DIGITAL OCEAN BUILD ===');
  
  // Step 1: Install loaders for HTML files and other dependencies
  console.log('Installing build dependencies...');
  try {
    // Install all required loaders as a single command
    execSync('npm install --no-save ignore-loader null-loader html-loader', {
      stdio: 'inherit'
    });
    console.log('✅ Build dependencies installed successfully');
  } catch (error) {
    console.error('⚠️ Warning: Error installing build dependencies:', error.message);
    // Continue anyway and create our own loaders
  }
  
  // Step 1.5: Always create our own ignore-loader in root directory
  try {
    console.log('Creating local ignore-loader module...');
    const ignoreLoaderPath = path.join(__dirname, '..', 'ignore-loader.js');
    const content = `/**
 * Simple ignore-loader implementation for webpack
 * This loader simply returns an empty module for any content it processes
 */

module.exports = function() {
  this.cacheable && this.cacheable();
  return 'module.exports = {}';
};`;
    
    fs.writeFileSync(ignoreLoaderPath, content);
    console.log('✅ Local ignore-loader created at project root');
    
    // Also create it in node_modules as a backup
    const nodeModulesPath = path.join(__dirname, '..', 'node_modules');
    if (!fs.existsSync(path.join(nodeModulesPath, 'ignore-loader'))) {
      fs.mkdirSync(path.join(nodeModulesPath, 'ignore-loader'), { recursive: true });
      fs.writeFileSync(
        path.join(nodeModulesPath, 'ignore-loader', 'index.js'),
        content
      );
      fs.writeFileSync(
        path.join(nodeModulesPath, 'ignore-loader', 'package.json'),
        JSON.stringify({
          name: 'ignore-loader',
          version: '0.1.0',
          main: 'index.js'
        }, null, 2)
      );
      console.log('✅ ignore-loader module created in node_modules');
    }
  } catch (error) {
    console.error('❌ Failed to create local ignore-loader:', error.message);
  }
  
  // Step 2: Create empty file for problematic imports
  console.log('Creating empty module for problematic imports...');
  
  // Create directory if it doesn't exist
  const emptyModulePath = path.join(__dirname, '..', 'src', 'lib', 'empty-module.js');
  
  fs.writeFileSync(emptyModulePath, `
// This is an empty module for webpack to use when problematic imports are encountered
module.exports = {};
  `);
  
  console.log(`✅ Empty module created at ${emptyModulePath}`);
  
  // Step 3: Create special webpack loader config
  console.log('Creating webpack resolver config...');
  
  const webpackResolverPath = path.join(__dirname, '..', 'webpack-resolver.js');
  
  fs.writeFileSync(webpackResolverPath, `
// Special webpack resolver for Digital Ocean builds
module.exports = {
  // This file helps webpack resolve problematic dependencies
  resolveLoader: {
    alias: {
      'ignore-loader': require.resolve('ignore-loader')
    }
  },
  resolve: {
    alias: {
      'bcrypt': require.resolve('./src/lib/empty-module.js'),
      '@mapbox/node-pre-gyp': require.resolve('./src/lib/empty-module.js'),
      'aws-sdk': require.resolve('./src/lib/empty-module.js'),
      'nock': require.resolve('./src/lib/empty-module.js'),
      'mock-aws-s3': require.resolve('./src/lib/empty-module.js')
    }
  }
};
  `);
  
  console.log(`✅ Webpack resolver config created at ${webpackResolverPath}`);
  
  console.log('=== DIGITAL OCEAN BUILD PREPARATION COMPLETED ===');
}

// Run the main function
main().catch(error => {
  console.error('Fatal error during preparation:', error);
  process.exit(1);
});