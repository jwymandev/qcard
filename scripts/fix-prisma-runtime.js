#!/usr/bin/env node

/**
 * Prisma Runtime Fix for DigitalOcean App Platform
 * 
 * This script fixes the "Prisma Client could not locate the Query Engine" error by:
 * 1. Identifying the correct Prisma engine binary for the current platform
 * 2. Ensuring it's copied to all locations Prisma looks for it
 * 3. Setting the PRISMA_QUERY_ENGINE_LIBRARY environment variable
 * 
 * Run this script:
 * - During build process after Next.js build
 * - At application startup before server initialization
 */

const fs = require('fs');
const path = require('path');
const { execSync, spawnSync } = require('child_process');

// Configure logging
const logger = {
  info: (message) => console.log(`[prisma-fix] INFO: ${message}`),
  warn: (message) => console.warn(`[prisma-fix] WARN: ${message}`),
  error: (message) => console.error(`[prisma-fix] ERROR: ${message}`),
  debug: (message) => console.log(`[prisma-fix] DEBUG: ${message}`)
};

// Detect environment
const isProduction = process.env.NODE_ENV === 'production';
const isBuildTime = process.env.NEXT_BUILD_SKIP_DB === 'true';
const isDigitalOcean = process.env.PLATFORM === 'digital_ocean' || 
                      !!process.env.DIGITALOCEAN_APPID ||
                      fs.existsSync('/workspace');

logger.info(`Environment: ${isProduction ? 'production' : 'development'}, ${isBuildTime ? 'build-time' : 'runtime'}, ${isDigitalOcean ? 'DigitalOcean' : 'other'}`);

// Get platform-specific information
function getPlatformInfo() {
  try {
    const platform = process.platform;
    let osRelease = '';
    
    // Get more detailed OS information for Linux
    if (platform === 'linux') {
      try {
        // Try to detect debian/ubuntu
        if (fs.existsSync('/etc/os-release')) {
          const osReleaseContent = fs.readFileSync('/etc/os-release', 'utf8');
          if (osReleaseContent.includes('debian') || osReleaseContent.includes('ubuntu')) {
            osRelease = 'debian';
          }
        }
        
        // Check for OpenSSL version
        try {
          const opensslOutput = execSync('openssl version').toString();
          if (opensslOutput.includes('3.0.')) {
            osRelease += '-openssl-3.0.x';
          } else if (opensslOutput.includes('1.1.')) {
            osRelease += '-openssl-1.1.x';
          }
        } catch (e) {
          logger.warn(`Could not determine OpenSSL version: ${e.message}`);
        }
      } catch (e) {
        logger.warn(`Error getting detailed OS info: ${e.message}`);
      }
    }
    
    return {
      platform,
      osRelease,
      arch: process.arch,
      nodeVersion: process.version,
    };
  } catch (error) {
    logger.error(`Error getting platform info: ${error.message}`);
    return {
      platform: process.platform,
      osRelease: '',
      arch: process.arch,
      nodeVersion: process.version
    };
  }
}

// Get the expected engine filename pattern based on platform
function getEngineFilenamePattern(platformInfo) {
  const { platform, osRelease, arch } = platformInfo;
  
  // Default patterns based on platform
  let patterns = [];
  
  if (platform === 'linux') {
    if (osRelease.includes('debian') && osRelease.includes('openssl-3.0.x')) {
      patterns.push('libquery_engine-debian-openssl-3.0.x.so.node');
    } else if (osRelease.includes('debian') && osRelease.includes('openssl-1.1.x')) {
      patterns.push('libquery_engine-debian-openssl-1.1.x.so.node');
    } else if (osRelease.includes('debian')) {
      // Try both OpenSSL versions for Debian
      patterns.push('libquery_engine-debian-openssl-3.0.x.so.node');
      patterns.push('libquery_engine-debian-openssl-1.1.x.so.node');
    }
    
    // Generic Linux patterns as fallback
    patterns.push('libquery_engine-linux');
    patterns.push('libquery_engine-linux-musl');
    patterns.push('libquery_engine-linux-');
  } else if (platform === 'darwin') {
    patterns.push('libquery_engine-darwin');
  } else if (platform === 'win32') {
    patterns.push('query_engine-windows');
  }
  
  // Add generic pattern as last resort
  patterns.push('libquery_engine-');
  patterns.push('query_engine-');
  
  return patterns;
}

// Find all potential locations where Prisma engines might be stored
function getPotentialEnginePaths() {
  const rootDir = process.cwd();
  
  // Standard locations
  const paths = [
    path.join(rootDir, 'node_modules', '.prisma', 'client'),
    path.join(rootDir, 'node_modules', '@prisma', 'client'),
    path.join(rootDir, 'node_modules', '@prisma', 'engines'),
    path.join(rootDir, 'node_modules', 'prisma', 'libquery_engine-'),
    path.join(rootDir, '.prisma', 'client'),
    path.join(rootDir, 'prisma', 'client'),
    
    // Next.js specific locations
    path.join(rootDir, '.next', 'cache', 'prisma'),
    path.join(rootDir, '.next', 'server', 'chunks'),
    
    // Next.js standalone specific locations
    path.join(rootDir, '.next', 'standalone', 'node_modules', '.prisma', 'client'),
    path.join(rootDir, '.next', 'standalone', '.prisma', 'client'),
    
    // DigitalOcean specific paths
    '/workspace/node_modules/.prisma/client',
    '/workspace/.prisma/client',
    '/workspace/.next/standalone/.prisma/client',
    '/workspace/.next/standalone/node_modules/.prisma/client',
    
    // Special tmp directory that Prisma also checks
    '/tmp/prisma-engines',
  ];
  
  // Only include paths that exist
  return paths.filter(p => {
    // Handle wildcard paths
    if (p.includes('*') || p.includes('libquery_engine-')) {
      const dirPath = p.split('libquery_engine-')[0];
      return fs.existsSync(dirPath);
    }
    return fs.existsSync(p);
  });
}

// Search directories recursively for engine files
function findEngineFiles(patterns) {
  const enginePaths = getPotentialEnginePaths();
  let engines = [];
  
  for (const enginePath of enginePaths) {
    try {
      // If path contains wildcard or pattern, we need to walk the directory
      if (enginePath.includes('*') || enginePath.includes('libquery_engine-')) {
        const dirPath = enginePath.includes('libquery_engine-') 
          ? enginePath.split('libquery_engine-')[0] 
          : enginePath.replace(/\*.*$/, '');
          
        if (fs.existsSync(dirPath)) {
          // Recursively walk this directory to find engine files
          const foundFiles = walkDirForEngines(dirPath, patterns);
          engines = [...engines, ...foundFiles];
        }
      } 
      // Otherwise just list the directory contents
      else if (fs.existsSync(enginePath)) {
        const files = fs.readdirSync(enginePath);
        
        const matchingFiles = files.filter(file => {
          return patterns.some(pattern => file.includes(pattern));
        }).map(file => path.join(enginePath, file));
        
        engines = [...engines, ...matchingFiles];
      }
    } catch (error) {
      logger.warn(`Error searching ${enginePath}: ${error.message}`);
    }
  }
  
  // Remove duplicates
  return [...new Set(engines)];
}

// Recursively walk directory looking for engine files
function walkDirForEngines(dir, patterns, depth = 0) {
  if (depth > 5) return []; // Prevent infinite recursion
  
  let results = [];
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      if (entry.isDirectory()) {
        // Skip node_modules recursion except for specific paths
        if (entry.name === 'node_modules' && !fullPath.includes('@prisma') && !fullPath.includes('.prisma')) {
          continue;
        }
        
        const subResults = walkDirForEngines(fullPath, patterns, depth + 1);
        results = [...results, ...subResults];
      } else if (entry.isFile()) {
        if (patterns.some(pattern => entry.name.includes(pattern))) {
          results.push(fullPath);
        }
      }
    }
  } catch (error) {
    logger.warn(`Error walking directory ${dir}: ${error.message}`);
  }
  
  return results;
}

// Create all required target directories
function createTargetDirs() {
  const targetDirs = [
    // Primary locations Prisma checks
    path.join(process.cwd(), 'node_modules', '.prisma', 'client'),
    path.join(process.cwd(), '.prisma', 'client'),
    
    // Next.js standalone locations
    path.join(process.cwd(), '.next', 'standalone', 'node_modules', '.prisma', 'client'),
    path.join(process.cwd(), '.next', 'standalone', '.prisma', 'client'),
    
    // DigitalOcean specific paths
    '/workspace/node_modules/.prisma/client',
    '/workspace/.prisma/client',
    '/workspace/.next/standalone/.prisma/client',
    '/workspace/.next/standalone/node_modules/.prisma/client',
    
    // Special tmp directory
    '/tmp/prisma-engines',
  ];
  
  const createdDirs = [];
  
  for (const dir of targetDirs) {
    try {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        createdDirs.push(dir);
      }
    } catch (error) {
      logger.warn(`Could not create directory ${dir}: ${error.message}`);
    }
  }
  
  return {
    allDirs: targetDirs,
    createdDirs
  };
}

// Copy engine files to target directories
function copyEnginesToTargets(engines, targetDirs) {
  if (engines.length === 0) {
    logger.warn('No engine files found to copy');
    return { success: 0, failed: 0 };
  }
  
  let successCount = 0;
  let failedCount = 0;
  
  for (const engine of engines) {
    const fileName = path.basename(engine);
    
    for (const targetDir of targetDirs) {
      try {
        // Skip if directory doesn't exist
        if (!fs.existsSync(targetDir)) continue;
        
        const targetPath = path.join(targetDir, fileName);
        
        // Skip if file already exists at target
        if (fs.existsSync(targetPath)) {
          logger.debug(`Engine already exists at ${targetPath}`);
          continue;
        }
        
        fs.copyFileSync(engine, targetPath);
        logger.debug(`Copied ${fileName} to ${targetDir}`);
        
        // Make the file executable
        try {
          fs.chmodSync(targetPath, 0o755);
        } catch (chmodError) {
          logger.warn(`Could not make ${targetPath} executable: ${chmodError.message}`);
        }
        
        successCount++;
      } catch (error) {
        logger.warn(`Error copying ${fileName} to ${targetDir}: ${error.message}`);
        failedCount++;
      }
    }
  }
  
  return { success: successCount, failed: failedCount };
}

// Generate environment variable setup
function setupEnvironmentVariables(enginePath) {
  if (!enginePath) {
    logger.warn('No engine path to set in environment variables');
    return false;
  }
  
  try {
    // Set for current process
    process.env.PRISMA_QUERY_ENGINE_LIBRARY = enginePath;
    process.env.PRISMA_ENGINES_CHECKSUM_IGNORE_MISSING = '1';
    
    logger.info(`Set PRISMA_QUERY_ENGINE_LIBRARY=${enginePath}`);
    return true;
  } catch (error) {
    logger.error(`Error setting environment variables: ${error.message}`);
    return false;
  }
}

// Try to generate Prisma client if no engines found
function generatePrismaClient() {
  try {
    logger.info('Attempting to generate Prisma client');
    
    // Don't run in production runtime - only during build
    if (isProduction && !isBuildTime) {
      logger.warn('Skipping Prisma generation in production runtime');
      return false;
    }
    
    // Run prisma generate
    const result = spawnSync('npx', ['prisma', 'generate'], { 
      stdio: 'inherit',
      shell: true 
    });
    
    if (result.status === 0) {
      logger.info('Successfully generated Prisma client');
      return true;
    } else {
      logger.error(`Failed to generate Prisma client: exit code ${result.status}`);
      return false;
    }
  } catch (error) {
    logger.error(`Error generating Prisma client: ${error.message}`);
    return false;
  }
}

// Create a dot-env file in all required locations
function createDotEnvFiles(enginePath) {
  const envContent = `
# Auto-generated by Prisma fix script
PRISMA_QUERY_ENGINE_LIBRARY=${enginePath}
PRISMA_ENGINES_CHECKSUM_IGNORE_MISSING=1
`;

  const envLocations = [
    path.join(process.cwd(), '.env.local'),
    path.join(process.cwd(), '.next', 'standalone', '.env.local'),
    '/workspace/.env.local'
  ];
  
  let successCount = 0;
  
  for (const envLocation of envLocations) {
    try {
      // Skip if directory doesn't exist
      const envDir = path.dirname(envLocation);
      if (!fs.existsSync(envDir)) continue;
      
      // Don't overwrite existing .env files, append to them
      let finalContent = envContent;
      if (fs.existsSync(envLocation)) {
        const existingContent = fs.readFileSync(envLocation, 'utf8');
        if (!existingContent.includes('PRISMA_QUERY_ENGINE_LIBRARY=')) {
          finalContent = existingContent + envContent;
        } else {
          // Skip if already configured
          continue;
        }
      }
      
      fs.writeFileSync(envLocation, finalContent);
      logger.info(`Created/updated .env file at ${envLocation}`);
      successCount++;
    } catch (error) {
      logger.warn(`Error creating .env file at ${envLocation}: ${error.message}`);
    }
  }
  
  return successCount;
}

// Main execution
async function main() {
  logger.info('Starting Prisma engine fix');
  
  // 1. Get platform information
  const platformInfo = getPlatformInfo();
  logger.info(`Platform: ${platformInfo.platform}, Release: ${platformInfo.osRelease}, Arch: ${platformInfo.arch}`);
  
  // 2. Get expected engine filename patterns
  const enginePatterns = getEngineFilenamePattern(platformInfo);
  logger.info(`Looking for engine patterns: ${enginePatterns.join(', ')}`);
  
  // 3. Find engine files
  let engineFiles = findEngineFiles(enginePatterns);
  
  // 4. If no engines found, try to generate Prisma client
  if (engineFiles.length === 0) {
    logger.warn('No engine files found, attempting to generate Prisma client');
    
    const generated = generatePrismaClient();
    if (generated) {
      // Look for engines again
      engineFiles = findEngineFiles(enginePatterns);
    }
    
    if (engineFiles.length === 0) {
      logger.error('Still no engine files found after generation. Fix will be incomplete.');
    }
  }
  
  logger.info(`Found ${engineFiles.length} engine files`);
  for (const engine of engineFiles) {
    logger.debug(`  - ${engine}`);
  }
  
  // 5. Create target directories
  const { allDirs, createdDirs } = createTargetDirs();
  logger.info(`Created ${createdDirs.length} directories`);
  
  // 6. Copy engines to target directories
  const copyResults = copyEnginesToTargets(engineFiles, allDirs);
  logger.info(`Copied ${copyResults.success} engine files (${copyResults.failed} failed)`);
  
  // 7. Set up environment variables
  if (engineFiles.length > 0) {
    // Try to find the debian-openssl-3.0.x engine first
    const debianEngine = engineFiles.find(engine => engine.includes('debian-openssl-3.0.x'));
    const primaryEngine = debianEngine || engineFiles[0];
    
    setupEnvironmentVariables(primaryEngine);
    
    // 8. Create .env files
    const envCount = createDotEnvFiles(primaryEngine);
    logger.info(`Created/updated ${envCount} .env files`);
    
    logger.info('Prisma engine fix completed successfully');
    return 0;
  } else {
    logger.error('Prisma engine fix incomplete - no engines found');
    return 1;
  }
}

// Run the main function
main().catch(error => {
  logger.error(`Unhandled error: ${error.message}`);
  logger.error(error.stack);
  process.exit(1);
});