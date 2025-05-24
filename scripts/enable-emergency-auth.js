#!/usr/bin/env node

/**
 * Script to enable emergency authentication for Digital Ocean deployment
 * This script adds the ENABLE_EMERGENCY_AUTH environment variable to the app
 */

const { execSync } = require('child_process');

async function main() {
  try {
    console.log('🔐 Enabling emergency authentication mode...');
    
    // Get app ID from command line argument or default to 'qcard'
    const appName = process.argv[2] || 'qcard';
    
    // Set environment variable using Digital Ocean CLI
    const setEnvCommand = `doctl apps update-config ${appName} --set-env ENABLE_EMERGENCY_AUTH=true`;
    
    console.log(`Running command: ${setEnvCommand}`);
    const output = execSync(setEnvCommand, { encoding: 'utf8' });
    
    console.log('Environment variable set successfully:');
    console.log(output);
    
    console.log('✅ Emergency authentication mode enabled');
    console.log('Note: The app will need to redeploy for this change to take effect');
    
  } catch (error) {
    console.error('❌ Error enabling emergency authentication:', error.message);
    console.error('If doctl is not installed, please set the environment variable manually in the DigitalOcean dashboard:');
    console.error('1. Go to https://cloud.digitalocean.com/apps');
    console.error('2. Select your app');
    console.error('3. Go to "Settings" tab');
    console.error('4. Click "Edit" in the "Environment Variables" section');
    console.error('5. Add ENABLE_EMERGENCY_AUTH=true');
    console.error('6. Save changes');
    
    process.exit(1);
  }
}

main();