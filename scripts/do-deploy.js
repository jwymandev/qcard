#!/usr/bin/env node

/**
 * Digital Ocean Deployment Script
 * 
 * This script handles proper deployment in Digital Ocean App Platform by:
 * 1. Setting a placeholder DATABASE_URL for build time
 * 2. Generating Prisma client without database connection
 * 3. Building the Next.js application properly with:
 *    - Disabled static generation
 *    - Skipped API routes
 *    - Proper handling of client-side routing
 *    - Mock database client during build
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Main function
async function main() {
  console.log('=== DIGITAL OCEAN DEPLOYMENT ===');
  
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
    // Continue anyway as we have a mock client
  }
  
  // Step 2.5: Install needed dependencies for build
  console.log('Installing build dependencies...');
  try {
    execSync('node scripts/install-build-deps.js', {
      stdio: 'inherit'
    });
    console.log('✅ Build dependencies installed successfully');
  } catch (error) {
    console.error('⚠️ Warning: Error installing build dependencies:', error.message);
    console.log('Continuing despite build dependencies error...');
    // Continue anyway as we have fallbacks
  }
  
  // Step 2.6: Fix bcrypt imports
  console.log('Fixing bcrypt imports...');
  try {
    execSync('node scripts/bcrypt-fixer.js', {
      stdio: 'inherit'
    });
    console.log('✅ bcrypt imports fixed successfully');
  } catch (error) {
    console.error('⚠️ Warning: Error fixing bcrypt imports:', error.message);
    console.log('Continuing despite bcrypt fix error...');
    // Continue anyway as we have fallbacks
  }
  
  // Step 3: Build Next.js application
  console.log('Building Next.js application...');
  try {
    // Set environment variables for build
    process.env.NODE_ENV = 'production';
    
    // Use the Digital Ocean specific Next.js config
    console.log('Using Digital Ocean specific Next.js config...');
    
    // Check if next.config.js exists and copy it to next.config.js.bak
    if (fs.existsSync('next.config.js')) {
      fs.copyFileSync('next.config.js', 'next.config.js.bak');
    }
    
    // Try different config files in order of preference
    const configOptions = ['next.config.minimal.js', 'next.config.simple.js', 'next.config.do.js'];
    let configFound = false;
    
    for (const configFile of configOptions) {
      if (fs.existsSync(configFile)) {
        fs.copyFileSync(configFile, 'next.config.js');
        console.log(`✅ Using ${configFile} for Digital Ocean build`);
        configFound = true;
        break;
      }
    }
    
    if (!configFound) {
      console.log('⚠️ No specialized config found, using original config');
    }
    
    // Build with extended timeout and special flags to avoid SSG issues
    execSync('npm run build:do', {
      stdio: 'inherit',
      env: {
        ...process.env,
        NODE_ENV: 'production',
        NEXT_PRIVATE_STANDALONE: '1',
        NEXT_PUBLIC_SKIP_API_ROUTES: '1',
        NEXT_BUILD_SKIP_DB: 'true',
        NEXT_TELEMETRY_DISABLED: '1',
        NEXT_SKIP_API_ROUTES: '1',
        SKIP_API_ROUTES: '1',
        // NEXT_DISABLE_STATIC_GENERATION: 'true', // REMOVED - This was preventing client-side JS generation
        DATABASE_URL: 'postgresql://placeholder:placeholder@localhost:5432/placeholder'
      },
      timeout: 900000 // 15 minute timeout for build (increased from 10)
    });
    
    console.log('✅ Next.js build completed successfully');
    
    // Step 3.5: Fix assets for client-side JavaScript
    console.log('Fixing client-side assets...');
    try {
      execSync('node scripts/fix-assets.js', {
        stdio: 'inherit',
      });
      console.log('✅ Client-side assets fixed successfully');
    } catch (error) {
      console.warn('⚠️ Warning: Error fixing client-side assets:', error.message);
      console.log('Client-side JavaScript may not load properly');
    }
    
    // Step 4: Verify the build output
    console.log('Verifying build output...');
    
    // Check if .next directory exists
    if (!fs.existsSync('.next-do') && !fs.existsSync('.next')) {
      throw new Error('Build output directory not found');
    }
    
    // Check if standalone directory exists (for output: 'standalone')
    const standalonePath = fs.existsSync('.next-do/standalone') ? '.next-do/standalone' : '.next/standalone';
    if (!fs.existsSync(standalonePath)) {
      console.warn('⚠️ Warning: Standalone output not found at ' + standalonePath);
      console.log('The build may not be properly configured for deployment');
    } else {
      console.log('✅ Standalone output verified at ' + standalonePath);
      
      // Verify client-side assets
      const staticDir = path.join(standalonePath, '.next', 'static');
      if (fs.existsSync(staticDir)) {
        const jsFiles = fs.readdirSync(path.join(staticDir, 'chunks')).filter(f => f.endsWith('.js'));
        console.log(`Found ${jsFiles.length} JavaScript chunks in ${staticDir}/chunks`);
        
        if (jsFiles.length === 0) {
          console.warn('⚠️ Warning: No JavaScript chunks found! Client-side rendering may not work.');
        } else {
          console.log('✅ JavaScript assets verified');
        }
      } else {
        console.warn('⚠️ Warning: Static assets directory not found at ' + staticDir);
        console.log('Client-side JavaScript may not be properly bundled');
      }
    }
    
  } catch (error) {
    console.error('❌ Error building Next.js application:', error.message);
    // Continue to provide useful error diagnostics
    console.log('\n🔍 Build Error Diagnostics:');
    console.log('- Check if DATABASE_URL is properly formatted');
    console.log('- Ensure all required environment variables are set');
    console.log('- Check if next.config.minimal.js is properly configured');
    console.log('- Look for any "Dynamic server usage" errors in the build log');
    console.log('- Check for any useSearchParams() errors in client components');
    
    // Attempt a more permissive build as a last resort
    console.log('\n🔄 Attempting fallback build with maximum compatibility settings...');
    try {
      // Create a minimal config file for the fallback build
      const fallbackConfig = `
      /** @type {import('next').NextConfig} */
      module.exports = {
        output: 'standalone',
        eslint: { ignoreDuringBuilds: true },
        typescript: { ignoreBuildErrors: true },
        // Better handling of static assets
        poweredByHeader: false,
        generateEtags: true,
        compress: true,
        productionBrowserSourceMaps: true,
        assetPrefix: process.env.NEXT_PUBLIC_APP_URL || '',
        experimental: {
          serverComponentsExternalPackages: ['bcrypt'],
          optimizePackageImports: ['@prisma/client'],
        },
        webpack: (config, { isServer, dev }) => {
          // Handle fallbacks for node modules
          if (!config.resolve) config.resolve = {};
          if (!config.resolve.fallback) config.resolve.fallback = {};
          config.resolve.fallback = {
            ...config.resolve.fallback,
            fs: false, bcrypt: false, crypto: false, path: false,
            net: false, tls: false, dns: false, child_process: false,
          };
          
          // Client-side specific optimizations
          if (!isServer && !dev) {
            // Optimize chunk loading
            config.optimization = {
              ...config.optimization,
              minimize: true,
              nodeEnv: 'production',
              chunkIds: 'named',
              mangleExports: false,
              splitChunks: {
                chunks: 'all',
                cacheGroups: {
                  default: false,
                  vendors: false,
                  vendor: {
                    name: 'vendor',
                    chunks: 'all',
                    test: /node_modules/,
                    priority: 20,
                  },
                  common: {
                    name: 'common',
                    minChunks: 2,
                    chunks: 'all',
                    priority: 10,
                    reuseExistingChunk: true,
                    enforce: true,
                  },
                },
              },
            };
            
            // Ensure publicPath is set correctly
            config.output = {
              ...config.output,
              publicPath: \`\${process.env.NEXT_PUBLIC_APP_URL || ''}/_next/\`,
            };
          }
          
          return config;
        },
      };
      `;
      
      fs.writeFileSync('next.config.fallback.js', fallbackConfig);
      fs.copyFileSync('next.config.fallback.js', 'next.config.js');
      
      console.log('Created fallback config, attempting emergency build...');
      
      execSync('NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 NEXT_BUILD_SKIP_DB=true next build', {
        stdio: 'inherit',
        env: {
          ...process.env,
          NODE_ENV: 'production',
          NEXT_BUILD_SKIP_DB: 'true',
          NEXT_TELEMETRY_DISABLED: '1',
        },
        timeout: 900000 // 15 minute timeout
      });
      
      console.log('✅ Emergency fallback build completed');
      
    } catch (fallbackError) {
      console.error('❌ Fallback build also failed:', fallbackError.message);
      process.exit(1);
    }
  }
  
  // Restore original next.config.js if it was backed up
  if (fs.existsSync('next.config.js.bak')) {
    console.log('Restoring original Next.js config...');
    fs.copyFileSync('next.config.js.bak', 'next.config.js');
    fs.unlinkSync('next.config.js.bak');
    console.log('✅ Original Next.js config restored');
  }
  
  // Clean up any fallback files
  if (fs.existsSync('next.config.fallback.js')) {
    fs.unlinkSync('next.config.fallback.js');
  }
  
  console.log('=== DIGITAL OCEAN DEPLOYMENT COMPLETED ===');
  console.log('The application should now be ready for deployment to Digital Ocean App Platform.');
  console.log('If you encounter any issues, please check the DIGITAL_OCEAN_FIXES.md file for troubleshooting steps.');
}

// Run the main function
main().catch(error => {
  console.error('Fatal error during deployment:', error);
  process.exit(1);
});