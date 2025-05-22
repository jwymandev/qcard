#!/usr/bin/env node

/**
 * Fix DB Assignment Script
 * 
 * This script checks and fixes the critical assignment error in db.ts
 * that's causing build failures in Digital Ocean.
 */

const fs = require('fs');
const path = require('path');

// Main function
function fixDbAssignment() {
  console.log('Checking for critical db.ts assignment error...');
  
  // Path to the db.ts file
  const dbFilePath = path.join(process.cwd(), 'src', 'lib', 'db.ts');
  
  // Check if the file exists
  if (!fs.existsSync(dbFilePath)) {
    console.log(`File not found: ${dbFilePath}`);
    return false;
  }
  
  // Read the file content
  let content = fs.readFileSync(dbFilePath, 'utf8');
  
  // Check for the reversed assignment
  const reversedAssignment = /["']postgresql:\/\/.*placeholder["']\s*=\s*databaseUrl/;
  const fixedAssignment = 'process.env.DATABASE_URL = databaseUrl';
  
  // If the reversed assignment exists, fix it
  if (reversedAssignment.test(content)) {
    console.log('Found reversed assignment in db.ts - fixing...');
    
    // Replace with the correct assignment
    const fixedContent = content.replace(reversedAssignment, fixedAssignment);
    
    // Write the fixed content back to the file
    fs.writeFileSync(dbFilePath, fixedContent, 'utf8');
    
    console.log('✅ Fixed db.ts assignment error');
    return true;
  } else {
    console.log('No reversed assignment found in db.ts');
    
    // Double check that the correct assignment exists
    if (content.includes(fixedAssignment)) {
      console.log('✅ Correct assignment already exists in db.ts');
      return true;
    } else {
      console.log('⚠️ Could not find the expected assignment pattern in db.ts');
      console.log('Please manually check the file for issues');
      return false;
    }
  }
}

// Run the function if this script is executed directly
if (require.main === module) {
  const result = fixDbAssignment();
  if (result) {
    console.log('db.ts file has been successfully fixed or was already correct');
    process.exit(0);
  } else {
    console.log('Failed to fix db.ts file');
    process.exit(1);
  }
}

// Export the function for use in other scripts
module.exports = {
  fixDbAssignment
};