#!/usr/bin/env node

/**
 * Enhanced Prisma Engine Fix for DigitalOcean App Platform
 * 
 * This script resolves the "Prisma Client could not locate the Query Engine" error
 * in DigitalOcean App Platform deployments by:
 * 
 * 1. Finding all query engine binaries in the build environment
 * 2. Creating all possible target directories mentioned in error logs
 * 3. Copying engine binaries to all target locations
 * 4. Creating a special /tmp/prisma-engines directory for runtime lookup
 * 5. Setting up schema.prisma in all required locations
 * 
 * USAGE: Run this AFTER the Next.js build in DigitalOcean's build process
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔧 Running Enhanced Prisma Engine Fix for DigitalOcean...');

// Find ALL Prisma engine files in the build output
function findEngineFiles() {
  const engineLocations = [
    path.join(process.cwd(), 'node_modules', '.prisma', 'client'),
    path.join(process.cwd(), 'node_modules', '@prisma', 'engines'),
    path.join(process.cwd(), '.next', 'cache', 'prisma'),
    path.join(process.cwd(), 'node_modules', 'prisma', 'libquery_engine-*'),
    path.join(process.cwd(), '.prisma', 'client')
  ];
  
  let engineFiles = [];
  
  // Check each location for engine files
  for (const location of engineLocations) {
    if (location.includes('*')) {
      // Handle glob pattern for wildcard paths
      try {
        const baseDir = location.substring(0, location.indexOf('*') - 1);
        if (fs.existsSync(baseDir)) {
          const allFiles = walkDir(baseDir);
          const matchingFiles = allFiles.filter(file => 
            file.includes('libquery_engine-') || 
            file.includes('query-engine') ||
            file.includes('query_engine')
          );
          engineFiles = [...engineFiles, ...matchingFiles];
          if (matchingFiles.length > 0) {
            console.log(`Found ${matchingFiles.length} engine files in ${baseDir} with pattern`);
          }
        }
      } catch (error) {
        console.error(`Error searching with pattern ${location}:`, error);
      }
    } else if (fs.existsSync(location)) {
      try {
        const files = fs.readdirSync(location)
          .filter(file => 
            file.includes('libquery_engine-') || 
            file.includes('query-engine') ||
            file.includes('query_engine')
          )
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
  
  // De-duplicate the engine files
  const uniqueEngineFiles = [...new Set(engineFiles)];
  return uniqueEngineFiles;
}

// Recursively walk a directory to find all files
function walkDir(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  
  list.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat && stat.isDirectory()) {
      results = results.concat(walkDir(filePath));
    } else {
      results.push(filePath);
    }
  });
  
  return results;
}

// Create ALL possible target directories for engine files
function createTargetDirs() {
  // Get the list of all places Prisma looks for engine files
  // based on the error message and Prisma's documentation
  const targetDirs = [
    // Locations from error logs
    path.join(process.cwd(), '.next', 'standalone', 'node_modules', '.prisma', 'client'),
    path.join(process.cwd(), '.next', 'standalone', '.next', 'server'),
    path.join(process.cwd(), '.next', 'standalone', '.prisma', 'client'),
    path.join(process.cwd(), '.next', 'standalone', 'node_modules', '@prisma', 'client'),
    
    // Additional locations to be extra safe
    path.join(process.cwd(), '.next', 'standalone', '.next', 'server', 'chunks'),
    path.join(process.cwd(), '.next', 'standalone', '.next', 'server', 'app'),
    '/tmp/prisma-engines', // Special location that Prisma also checks
    path.join(process.cwd(), '.next', 'standalone', 'node_modules', 'prisma', 'query-engine'),
    path.join(process.cwd(), '.next', 'standalone', '.next', 'server', 'pages', 'api')
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

// Copy all engine files to ALL target directories
function copyEngineFiles(engineFiles, targetDirs) {
  if (engineFiles.length === 0) {
    console.error('❌ No engine files to copy!');
    return;
  }

  let successCount = 0;
  let failCount = 0;
  
  for (const engineFile of engineFiles) {
    const fileName = path.basename(engineFile);
    
    for (const targetDir of targetDirs) {
      const targetPath = path.join(targetDir, fileName);
      try {
        fs.copyFileSync(engineFile, targetPath);
        successCount++;
        console.log(`Copied ${fileName} to ${targetDir}`);
        
        // Make the file executable
        try {
          fs.chmodSync(targetPath, 0o755);
          console.log(`Made ${targetPath} executable`);
        } catch (chmodError) {
          console.warn(`Warning: Could not make ${targetPath} executable:`, chmodError);
        }
      } catch (error) {
        failCount++;
        console.error(`Error copying ${fileName} to ${targetDir}:`, error);
      }
    }
  }
  
  console.log(`📊 Engine copy results: ${successCount} successful, ${failCount} failed`);
}

// Copy Prisma schema to all target directories
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

// Create a symlink from where Prisma is looking to where engines are
function createEngineSymlinks(engineFiles, targetDirs) {
  if (engineFiles.length === 0) return;
  
  // Create symlinks for each target directory to each engine file
  const debianEngine = engineFiles.find(file => file.includes('debian-openssl-3.0.x'));
  
  if (debianEngine) {
    const engineFileName = path.basename(debianEngine);
    
    for (const targetDir of targetDirs) {
      try {
        const targetPath = path.join(targetDir, engineFileName);
        
        // If target file already exists from copy, skip symlink
        if (fs.existsSync(targetPath)) continue;
        
        // Find a source file that exists in another target dir
        for (const sourceDir of targetDirs) {
          const sourcePath = path.join(sourceDir, engineFileName);
          if (sourceDir !== targetDir && fs.existsSync(sourcePath)) {
            try {
              fs.symlinkSync(sourcePath, targetPath);
              console.log(`Created symlink from ${sourcePath} to ${targetPath}`);
              break;
            } catch (symlinkError) {
              console.error(`Error creating symlink:`, symlinkError);
            }
          }
        }
      } catch (error) {
        console.error(`Error with symlink for ${targetDir}:`, error);
      }
    }
  }
}

// Create an environment detection file to help debug
function createEnvDetectionFile() {
  const filePath = path.join(process.cwd(), '.next', 'standalone', 'prisma-env-detection.js');
  
  const content = `
// This file is created by the enhanced-prisma-engines-fix.js script
// It detects the runtime environment and creates a report
const fs = require('fs');
const path = require('path');
const os = require('os');

console.log('===== Prisma Environment Detection =====');
console.log('OS Platform:', process.platform);
console.log('OS Release:', os.release());
console.log('Node Version:', process.version);
console.log('Working Directory:', process.cwd());

// Check if we're running in a container
console.log('Running in container?', process.env.CONTAINER === 'true');

// Check for Prisma-related environment variables
console.log('DATABASE_URL set?', !!process.env.DATABASE_URL);
console.log('PRISMA_QUERY_ENGINE_LIBRARY set?', !!process.env.PRISMA_QUERY_ENGINE_LIBRARY);

// Check for engine files in key locations
const locations = [
  '/tmp/prisma-engines',
  path.join(process.cwd(), 'node_modules', '.prisma', 'client'),
  path.join(process.cwd(), '.prisma', 'client'),
  path.join(process.cwd(), '.next', 'server'),
  path.join(process.cwd(), 'node_modules', '@prisma', 'client')
];

for (const location of locations) {
  try {
    if (fs.existsSync(location)) {
      const files = fs.readdirSync(location);
      console.log(\`Files in \${location}:\`, files.join(', '));
    } else {
      console.log(\`Location does not exist: \${location}\`);
    }
  } catch (error) {
    console.log(\`Error checking \${location}:\`, error.message);
  }
}

console.log('===== End Environment Detection =====');
`;

  try {
    fs.writeFileSync(filePath, content);
    console.log(`Created environment detection file at ${filePath}`);
    
    // Make it executable
    fs.chmodSync(filePath, 0o755);
  } catch (error) {
    console.error(`Error creating environment detection file:`, error);
  }
}

// Create an auto-detector script that runs at app startup
function createAutoDetectorScript() {
  const startupFilePath = path.join(process.cwd(), '.next', 'standalone', 'prisma-runtime-fix.js');
  
  const content = `
// This file is created by the enhanced-prisma-engines-fix.js script
// It automatically detects and fixes Prisma engine issues at runtime
const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');

console.log('🔧 Running Prisma Runtime Fix...');

// Detect the runtime environment
const platform = process.platform;
const release = os.release();
console.log(\`Detected platform: \${platform}, release: \${release}\`);

// Determine the likely engine name based on platform
let enginePattern = '';
if (platform === 'linux') {
  if (release.includes('Debian') || release.includes('Ubuntu') || release.includes('Mint')) {
    enginePattern = 'libquery_engine-debian';
  } else {
    enginePattern = 'libquery_engine-linux';
  }
} else if (platform === 'darwin') {
  enginePattern = 'libquery_engine-darwin';
} else if (platform === 'win32') {
  enginePattern = 'query_engine-windows';
}

console.log(\`Looking for engine matching: \${enginePattern}\`);

// Find all potential query engine locations
const searchPaths = [
  path.join(process.cwd(), 'node_modules', '.prisma', 'client'),
  path.join(process.cwd(), '.prisma', 'client'),
  path.join(process.cwd(), '.next', 'server'),
  path.join(process.cwd(), 'node_modules', '@prisma', 'client'),
  '/tmp/prisma-engines'
];

// Find engine files
const engineFiles = [];
for (const searchPath of searchPaths) {
  try {
    if (fs.existsSync(searchPath)) {
      const files = fs.readdirSync(searchPath)
        .filter(file => file.includes('query_engine') || file.includes('query-engine'));
      
      if (files.length > 0) {
        console.log(\`Found \${files.length} engine files in \${searchPath}\`);
        files.forEach(file => {
          engineFiles.push(path.join(searchPath, file));
        });
      }
    }
  } catch (error) {
    console.error(\`Error searching \${searchPath}:\`, error.message);
  }
}

// Create missing directories
const targetDirs = [
  '/tmp/prisma-engines',
  path.join(process.cwd(), 'node_modules', '.prisma', 'client'),
  path.join(process.cwd(), '.prisma', 'client')
];

for (const dir of targetDirs) {
  if (!fs.existsSync(dir)) {
    try {
      fs.mkdirSync(dir, { recursive: true });
      console.log(\`Created directory: \${dir}\`);
    } catch (error) {
      console.error(\`Error creating directory \${dir}:\`, error.message);
    }
  }
}

// Copy engine files to all target locations
if (engineFiles.length > 0) {
  let successCount = 0;
  
  for (const engineFile of engineFiles) {
    const fileName = path.basename(engineFile);
    
    for (const targetDir of targetDirs) {
      const targetPath = path.join(targetDir, fileName);
      
      // Skip if the file already exists at the target
      if (fs.existsSync(targetPath)) continue;
      
      try {
        fs.copyFileSync(engineFile, targetPath);
        fs.chmodSync(targetPath, 0o755); // Make executable
        successCount++;
        console.log(\`Copied and made executable: \${targetPath}\`);
      } catch (error) {
        console.error(\`Error copying \${fileName} to \${targetDir}:\`, error.message);
      }
    }
  }
  
  console.log(\`✅ Copied \${successCount} engine files to target locations\`);
  
  // Set environment variable to help Prisma find the engine
  if (engineFiles.length > 0) {
    const primaryEngine = engineFiles[0];
    process.env.PRISMA_QUERY_ENGINE_LIBRARY = primaryEngine;
    console.log(\`Set PRISMA_QUERY_ENGINE_LIBRARY to \${primaryEngine}\`);
  }
} else {
  console.error('❌ No engine files found to copy!');
}

console.log('✅ Prisma runtime fix completed');
`;

  try {
    fs.writeFileSync(startupFilePath, content);
    console.log(`Created auto-detector script at ${startupFilePath}`);
    
    // Make it executable
    fs.chmodSync(startupFilePath, 0o755);
  } catch (error) {
    console.error(`Error creating auto-detector script:`, error);
  }
}

// Create a wrapper script that prepends the Prisma fix to the main start script
function createWrapperScript() {
  const wrapperPath = path.join(process.cwd(), '.next', 'standalone', 'production-start-wrapper.js');
  const originalStartPath = path.join(process.cwd(), '.next', 'standalone', 'production-start.js');
  
  if (!fs.existsSync(originalStartPath)) {
    console.warn(`Original start script not found at ${originalStartPath}, using node server.js fallback`);
  }
  
  const content = `#!/usr/bin/env node
/**
 * Production Start Wrapper with Prisma Fix
 * This wrapper runs the Prisma fix before starting the main application
 */
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// Run the Prisma runtime fix
try {
  console.log('Running Prisma runtime fix...');
  require('./prisma-runtime-fix.js');
  console.log('Prisma runtime fix completed');
} catch (error) {
  console.error('Error running Prisma runtime fix:', error);
  // Continue anyway
}

// Start the main application
console.log('Starting the main application...');
const startScript = fs.existsSync('./production-start.js') 
  ? './production-start.js' 
  : './server.js';

// Execute the actual start script
require(startScript);
`;

  try {
    fs.writeFileSync(wrapperPath, content);
    console.log(`Created wrapper script at ${wrapperPath}`);
    
    // Make it executable
    fs.chmodSync(wrapperPath, 0o755);
  } catch (error) {
    console.error(`Error creating wrapper script:`, error);
  }
}

// Update the package.json in the standalone output to use our wrapper
function updatePackageJson() {
  const packageJsonPath = path.join(process.cwd(), '.next', 'standalone', 'package.json');
  
  if (fs.existsSync(packageJsonPath)) {
    try {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      
      // Update the start script to use our wrapper
      if (packageJson.scripts && packageJson.scripts.start) {
        packageJson.scripts.start = 'node production-start-wrapper.js';
      } else if (packageJson.scripts) {
        packageJson.scripts.start = 'node production-start-wrapper.js';
      } else {
        packageJson.scripts = { start: 'node production-start-wrapper.js' };
      }
      
      // Add our custom engine env var
      if (!packageJson.prisma) {
        packageJson.prisma = {};
      }
      
      // Write the updated package.json
      fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
      console.log(`Updated package.json at ${packageJsonPath}`);
    } catch (error) {
      console.error(`Error updating package.json:`, error);
    }
  } else {
    console.warn(`package.json not found at ${packageJsonPath}, creating a new one`);
    
    const newPackageJson = {
      name: "qcard-standalone",
      version: "1.0.0",
      private: true,
      scripts: {
        start: "node production-start-wrapper.js"
      }
    };
    
    try {
      fs.writeFileSync(packageJsonPath, JSON.stringify(newPackageJson, null, 2));
      console.log(`Created new package.json at ${packageJsonPath}`);
    } catch (error) {
      console.error(`Error creating new package.json:`, error);
    }
  }
}

// Main execution
async function main() {
  try {
    // Find engine files
    console.log('🔍 Searching for Prisma engine files...');
    let engineFiles = findEngineFiles();
    
    if (engineFiles.length === 0) {
      console.error('❌ No Prisma engine files found!');
      
      // Try generating the Prisma client to create engine files
      console.log('📦 Attempting to generate Prisma client...');
      try {
        execSync('npx prisma generate', { stdio: 'inherit' });
        engineFiles = findEngineFiles();
        
        if (engineFiles.length === 0) {
          console.error('❌ Still no engine files found after prisma generate!');
          console.log('📦 Attempting to install @prisma/client explicitly...');
          
          execSync('npm install @prisma/client', { stdio: 'inherit' });
          engineFiles = findEngineFiles();
          
          if (engineFiles.length === 0) {
            console.error('❌ Failed to find or generate engine files!');
            process.exit(1);
          }
        }
      } catch (error) {
        console.error('❌ Failed to generate Prisma client:', error);
        process.exit(1);
      }
    }
    
    console.log(`✅ Found ${engineFiles.length} engine files`);
    console.log('Files found:');
    engineFiles.forEach(file => console.log(` - ${file}`));
    
    // Create target directories
    console.log('📁 Creating target directories...');
    const targetDirs = createTargetDirs();
    
    // Copy engine files and schema to target directories
    console.log('📋 Copying engine files to all target locations...');
    copyEngineFiles(engineFiles, targetDirs);
    
    console.log('📋 Copying schema.prisma to all target locations...');
    copyPrismaSchema(targetDirs);
    
    // Create symlinks for engines
    console.log('🔗 Creating engine symlinks for additional locations...');
    createEngineSymlinks(engineFiles, targetDirs);
    
    // Create environment detection file for debugging
    console.log('📝 Creating environment detection script...');
    createEnvDetectionFile();
    
    // Create auto-detector script
    console.log('🔧 Creating runtime auto-detector script...');
    createAutoDetectorScript();
    
    // Create wrapper script
    console.log('🔄 Creating start wrapper script...');
    createWrapperScript();
    
    // Update package.json
    console.log('📦 Updating package.json...');
    updatePackageJson();
    
    console.log('✅ Enhanced Prisma engine fix completed successfully!');
  } catch (error) {
    console.error('❌ Error fixing Prisma engines:', error);
    process.exit(1);
  }
}

main();