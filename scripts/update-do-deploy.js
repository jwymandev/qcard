/**
 * Script to update deployment scripts to include database verification
 */

const fs = require('fs');
const path = require('path');

// Paths to update
const SCRIPTS_TO_UPDATE = [
  'do-deploy.js',
  'do-full-deployment.js',
  'do-production-deploy.js'
];

// Function to update a deployment script
function updateDeploymentScript(scriptPath) {
  if (!fs.existsSync(scriptPath)) {
    console.log(`Script ${scriptPath} does not exist, skipping.`);
    return false;
  }
  
  console.log(`Updating ${scriptPath}...`);
  
  // Read the original content
  let content = fs.readFileSync(scriptPath, 'utf8');
  
  // Check if the script already has DB verification
  if (content.includes('verify-deployment-db.js')) {
    console.log(`Script ${scriptPath} already includes DB verification, skipping.`);
    return false;
  }
  
  // Define the verification code to insert
  const verificationCode = `
// Run database verification after deployment
console.log('Running database connectivity verification...');
try {
  require('./verify-deployment-db');
  console.log('Database verification initiated.');
} catch (error) {
  console.error('Error running database verification:', error);
  console.log('Deployment will continue, but database verification failed.');
}
`;
  
  // Find the appropriate place to insert the verification code
  let modifiedContent;
  
  if (content.includes('console.log(\'Deployment completed')) {
    // Insert before deployment completed message
    modifiedContent = content.replace(
      /(console\.log\(['"]Deployment completed)/,
      `${verificationCode}\n$1`
    );
  } else if (content.includes('console.log(`Deployment')) {
    // Insert before deployment completed message (template literal version)
    modifiedContent = content.replace(
      /(console\.log\(`Deployment)/,
      `${verificationCode}\n$1`
    );
  } else {
    // If no deployment message found, append to the end
    modifiedContent = content + '\n' + verificationCode;
  }
  
  // Write the updated content
  fs.writeFileSync(scriptPath, modifiedContent, 'utf8');
  console.log(`✅ Updated ${scriptPath}`);
  return true;
}

// Main function
function main() {
  console.log('Updating deployment scripts to include database verification...');
  
  // Get the directory of this script
  const scriptsDir = __dirname;
  
  // Process each script
  let updatedCount = 0;
  
  for (const scriptName of SCRIPTS_TO_UPDATE) {
    const scriptPath = path.join(scriptsDir, scriptName);
    if (updateDeploymentScript(scriptPath)) {
      updatedCount++;
    }
  }
  
  console.log(`\nCompleted updates: ${updatedCount} script(s) modified.`);
  
  // Update package.json to add new script
  try {
    const packageJsonPath = path.join(scriptsDir, '..', 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    
    if (!packageJson.scripts) {
      packageJson.scripts = {};
    }
    
    if (!packageJson.scripts['verify:db']) {
      packageJson.scripts['verify:db'] = 'node scripts/verify-deployment-db.js';
      fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2), 'utf8');
      console.log('✅ Added verify:db script to package.json');
    } else {
      console.log('verify:db script already exists in package.json');
    }
  } catch (error) {
    console.error('Error updating package.json:', error);
  }
  
  console.log('\nDone! You can now run database verification with: npm run verify:db');
}

// Run main function
main();