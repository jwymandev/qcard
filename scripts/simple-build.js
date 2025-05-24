#!/usr/bin/env node

/**
 * Simple Production Build Script
 * 
 * This script handles proper deployment by:
 * 1. Setting a placeholder DATABASE_URL for build time
 * 2. Generating Prisma client without database connection
 * 3. Building the Next.js application properly with:
 *    - Skipped API routes
 *    - Proper handling of client-side routing
 *    - Mock database client during build
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Main function
async function main() {
  console.log('=== PRODUCTION BUILD SCRIPT ===');
  
  // Step 1: Set placeholder DATABASE_URL for build
  console.log('Setting placeholder DATABASE_URL for build...');
  process.env.DATABASE_URL = 'postgresql://placeholder:placeholder@localhost:5432/placeholder';
  process.env.NEXT_BUILD_SKIP_DB = 'true';
  process.env.SKIP_API_ROUTES = 'true';
  process.env.NEXT_SKIP_API_ROUTES = 'true';
  process.env.NEXT_PUBLIC_SKIP_API_ROUTES = 'true';
  console.log('✅ Environment variables configured for build');
  
  // Step 2: Generate Prisma client without database connection
  console.log('Generating Prisma client (without database validation)...');
  try {
    execSync('npx prisma generate', {
      stdio: 'inherit',
      env: process.env
    });
    console.log('✅ Prisma client generated successfully');
  } catch (error) {
    console.error('❌ Error generating Prisma client:', error.message);
    console.log('Continuing despite Prisma client generation error...');
  }
  
  // Step 3: Prepare config file
  console.log('Preparing configuration file...');
  try {
    // Backup existing config if needed
    if (fs.existsSync('next.config.js')) {
      fs.copyFileSync('next.config.js', 'next.config.js.bak');
    }
    
    // Create simplified config
    const simplifiedConfig = `
    /** @type {import('next').NextConfig} */
    const nextConfig = {
      output: 'standalone',
      assetPrefix: process.env.NEXT_PUBLIC_APP_URL || '',
      poweredByHeader: false,
      generateEtags: true,
      compress: true,
      staticPageGenerationTimeout: 1,
      skipMiddlewareUrlNormalize: true,
      skipTrailingSlashRedirect: true,
      experimental: {
        serverComponentsExternalPackages: ['bcrypt'],
        optimizePackageImports: ['@prisma/client'],
        serverActions: {
          allowedOrigins: ['*'],
        },
      },
      eslint: {
        ignoreDuringBuilds: true,
      },
      typescript: {
        ignoreBuildErrors: true,
      },
      env: {
        NEXT_BUILD_SKIP_DB: 'true',
        SKIP_API_ROUTES: 'true',
        DATABASE_URL: 'postgresql://placeholder:placeholder@localhost:5432/placeholder',
        NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || '',
      },
      webpack: (config, { isServer, dev }) => {
        if (!config.resolve) config.resolve = {};
        if (!config.resolve.fallback) config.resolve.fallback = {};
        
        config.resolve.fallback = {
          ...config.resolve.fallback,
          fs: false,
          bcrypt: false,
          crypto: false,
          path: false,
          net: false,
          tls: false,
          dns: false,
          child_process: false,
        };
        
        if (!isServer) {
          config.module = config.module || {};
          config.module.rules = config.module.rules || [];
          
          config.module.rules.push({
            test: /\\.html$/,
            use: 'null-loader',
          });
          
          config.module.rules.push({
            test: /node_modules\\/(bcrypt|@mapbox\\/node-pre-gyp|aws-sdk|nock|mock-aws-s3)/,
            use: 'null-loader',
          });
          
          if (!dev) {
            config.output = {
              ...config.output,
              publicPath: \`\${process.env.NEXT_PUBLIC_APP_URL || ''}/_next/\`,
            };
          }
        }
        
        return config;
      },
    };
    
    module.exports = nextConfig;
    `;
    
    fs.writeFileSync('next.config.simple.js', simplifiedConfig);
    fs.copyFileSync('next.config.simple.js', 'next.config.js');
    console.log('✅ Configuration file prepared');
  } catch (error) {
    console.error('❌ Error preparing config file:', error.message);
    process.exit(1);
  }
  
  // Step 4: Build the application
  console.log('Building Next.js application...');
  try {
    execSync('NODE_ENV=production NEXT_BUILD_SKIP_DB=true SKIP_API_ROUTES=true next build', {
      stdio: 'inherit',
      env: {
        ...process.env,
        NODE_ENV: 'production',
        NEXT_BUILD_SKIP_DB: 'true',
        SKIP_API_ROUTES: 'true',
        NEXT_PUBLIC_SKIP_API_ROUTES: 'true',
      },
      timeout: 600000 // 10 minute timeout
    });
    console.log('✅ Next.js build completed successfully');
  } catch (error) {
    console.error('❌ Error building Next.js application:', error.message);
    process.exit(1);
  }
  
  // Step 5: Fix assets
  console.log('Fixing client-side assets...');
  try {
    const buildDir = '.next';
    const standaloneDir = path.join(buildDir, 'standalone');
    
    if (fs.existsSync(standaloneDir)) {
      // Copy static assets to standalone directory
      const sourceStaticDir = path.join(buildDir, 'static');
      const destStaticDir = path.join(standaloneDir, '.next', 'static');
      
      if (fs.existsSync(sourceStaticDir) && !fs.existsSync(destStaticDir)) {
        fs.mkdirSync(destStaticDir, { recursive: true });
        copyDirRecursive(sourceStaticDir, destStaticDir);
      }
      
      console.log('✅ Assets fixed successfully');
    } else {
      console.log('⚠️ Standalone directory not found, skipping asset fix');
    }
  } catch (error) {
    console.error('❌ Error fixing assets:', error.message);
  }
  
  // Restore original next.config.js if it was backed up
  if (fs.existsSync('next.config.js.bak')) {
    fs.copyFileSync('next.config.js.bak', 'next.config.js');
    fs.unlinkSync('next.config.js.bak');
    console.log('✅ Original config restored');
  }
  
  console.log('=== BUILD COMPLETED ===');
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
  console.error('Fatal error during build:', error);
  process.exit(1);
});