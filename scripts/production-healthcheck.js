#!/usr/bin/env node

/**
 * PRODUCTION HEALTH CHECK TOOL
 * 
 * Run this script to perform a comprehensive health check of your production environment
 * Will verify database connectivity, schema, and essential application components
 * 
 * Usage: node scripts/production-healthcheck.js [--remote https://your-app-url]
 */

const { PrismaClient } = require('@prisma/client');
const https = require('https');
const http = require('http');
const { URL } = require('url');

// ANSI color codes for terminal output
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
};

// Parse command line arguments
const args = process.argv.slice(2);
let remoteUrl = null;

// Look for --remote flag
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--remote' && i + 1 < args.length) {
    remoteUrl = args[i + 1];
    break;
  }
}

// Function to print a section header
function printHeader(text) {
  console.log('\n' + colors.bright + colors.blue + '='.repeat(80) + colors.reset);
  console.log(colors.bright + colors.blue + '  ' + text + colors.reset);
  console.log(colors.bright + colors.blue + '='.repeat(80) + colors.reset);
}

// Function to print a success message
function printSuccess(text) {
  console.log(colors.green + '✓ ' + text + colors.reset);
}

// Function to print a warning message
function printWarning(text) {
  console.log(colors.yellow + '⚠ ' + text + colors.reset);
}

// Function to print an error message
function printError(text) {
  console.log(colors.red + '✗ ' + text + colors.reset);
}

// Function to check remote health endpoint
function checkRemoteHealth(url) {
  return new Promise((resolve, reject) => {
    printHeader('CHECKING REMOTE HEALTH ENDPOINT');
    console.log(`Connecting to: ${url}/api/health`);
    
    const parsedUrl = new URL(`${url}/api/health`);
    const client = parsedUrl.protocol === 'https:' ? https : http;
    
    const req = client.get(parsedUrl, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const healthData = JSON.parse(data);
          console.log(`Status code: ${res.statusCode}`);
          
          if (res.statusCode === 200) {
            printSuccess('Connected to health endpoint successfully');
            
            // Check health status
            if (healthData.status === 'healthy') {
              printSuccess(`System status: ${healthData.status}`);
            } else if (healthData.status === 'degraded') {
              printWarning(`System status: ${healthData.status}`);
            } else {
              printError(`System status: ${healthData.status}`);
            }
            
            // Check database connectivity
            if (healthData.database && healthData.database.connected) {
              printSuccess('Database is connected');
              
              // Check table status
              if (healthData.database.tableStatus) {
                console.log('\nTable Status:');
                for (const [table, status] of Object.entries(healthData.database.tableStatus)) {
                  if (status.status === 'healthy') {
                    printSuccess(`- ${table}: ${status.count} records`);
                  } else {
                    printError(`- ${table}: ${status.error || 'Not healthy'}`);
                  }
                }
              }
            } else {
              printError('Database is not connected');
              if (healthData.database && healthData.database.error) {
                console.log(`  Error: ${healthData.database.error}`);
              }
            }
            
            // Print performance metrics
            if (healthData.responseTimeMs) {
              console.log(`\nResponse time: ${healthData.responseTimeMs}ms`);
            }
            
            // Print memory usage
            if (healthData.memory) {
              console.log(`Memory usage: ${healthData.memory.usage.toFixed(2)}MB / RSS: ${healthData.memory.rss.toFixed(2)}MB`);
            }
            
            resolve(healthData);
          } else {
            printError(`Health check failed with status code: ${res.statusCode}`);
            console.log(data);
            reject(new Error(`Health check failed with status code: ${res.statusCode}`));
          }
        } catch (error) {
          printError('Failed to parse health response');
          console.error(error);
          reject(error);
        }
      });
    });
    
    req.on('error', (error) => {
      printError(`Failed to connect to health endpoint: ${error.message}`);
      reject(error);
    });
    
    // Set a timeout of 10 seconds
    req.setTimeout(10000, () => {
      req.destroy();
      printError('Connection timed out after 10 seconds');
      reject(new Error('Connection timeout'));
    });
  });
}

// Function to verify local database connection
async function checkLocalDatabase() {
  printHeader('CHECKING LOCAL DATABASE CONNECTION');
  
  try {
    // Handle both DATABASE_URL formats and individual params
    if (process.env.DATABASE_URL) {
      if (process.env.DATABASE_URL.startsWith('postgresql://') || 
          process.env.DATABASE_URL.startsWith('postgres://')) {
        try {
          const url = new URL(process.env.DATABASE_URL);
          console.log(`Database: ${url.hostname}:${url.port}${url.pathname}`);
        } catch (e) {
          console.log('Using DATABASE_URL environment variable (format unknown)');
        }
      } else if (process.env.DATABASE_URL.startsWith('file:')) {
        console.log(`Database: SQLite (${process.env.DATABASE_URL})`);
        printWarning('Using SQLite for local development - this is not suitable for production!');
      }
    } else if (process.env.DATABASE_HOST) {
      const host = process.env.DATABASE_HOST;
      const port = process.env.DATABASE_PORT || '25060';
      const name = process.env.DATABASE_NAME || 'defaultdb';
      console.log(`Database: ${host}:${port}/${name} (from individual parameters)`);
    } else {
      printError('No database connection parameters found');
      console.log('Please set DATABASE_URL or individual connection parameters');
      return false;
    }
    
    console.log('Connecting to database...');
    const prisma = new PrismaClient();
    
    // Test connection
    await prisma.$connect();
    printSuccess('Connected to database successfully');
    
    // Check table access
    const essentialTables = ['User', 'Profile', 'Studio', 'Session', 'Tenant'];
    console.log('\nChecking tables:');
    
    for (const table of essentialTables) {
      try {
        const count = await (prisma as any)[table.toLowerCase()].count();
        printSuccess(`- ${table}: ${count} records`);
      } catch (error) {
        printError(`- ${table}: Failed to access - ${error.message}`);
      }
    }
    
    await prisma.$disconnect();
    return true;
  } catch (error) {
    printError(`Database check failed: ${error.message}`);
    return false;
  }
}

// Main function
async function main() {
  console.log(colors.bright + colors.magenta + '\nQCARD PRODUCTION HEALTH CHECK' + colors.reset);
  console.log(colors.magenta + 'This tool verifies your application\'s health in production environments\n' + colors.reset);
  
  // Print environment information
  console.log('Environment:');
  console.log(`- NODE_ENV: ${process.env.NODE_ENV || 'Not set'}`);
  console.log(`- Runtime: Node.js ${process.version}`);
  
  let hasErrors = false;
  
  // Check remote health endpoint if URL provided
  if (remoteUrl) {
    try {
      await checkRemoteHealth(remoteUrl);
    } catch (error) {
      hasErrors = true;
    }
  } else {
    printWarning('No remote URL provided - skipping remote health check');
    console.log('Run with --remote https://your-app-url to check remote health');
  }
  
  // Check local database connection
  try {
    const dbOk = await checkLocalDatabase();
    if (!dbOk) hasErrors = true;
  } catch (error) {
    printError(`Local database check failed: ${error.message}`);
    hasErrors = true;
  }
  
  // Summary
  printHeader('HEALTH CHECK SUMMARY');
  if (hasErrors) {
    printError('Health check detected issues that need attention');
    process.exit(1);
  } else {
    printSuccess('All checks passed successfully');
    process.exit(0);
  }
}

// Run the main function
main().catch(error => {
  printError(`Health check failed with error: ${error.message}`);
  process.exit(1);
});