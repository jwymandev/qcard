#!/usr/bin/env node

/**
 * This script automatically updates all imports of bcrypt to use our wrapper
 * to avoid build issues in Digital Ocean
 */

const fs = require('fs');
const path = require('path');

// List of files to update
const filesToUpdate = [
  '/src/app/api/register/route.ts',
  '/src/app/api/admin/users/[id]/reset-password/route.ts',
  '/src/app/api/admin/users/[id]/route.ts',
  '/src/app/api/admin/users/route.ts',
  '/src/app/api/auth-debug/route.ts',
  '/src/app/api/user/change-password/route.ts',
  '/src/app/api/dev-reset-password/route.ts',
  '/src/app/api/dev-create-test-user/route.ts'
];

// Root directory of the project
const rootDir = path.resolve(__dirname, '..');

// Function to update a file
function updateFile(filePath) {
  const fullPath = path.join(rootDir, filePath);
  
  try {
    // Read the file
    let content = fs.readFileSync(fullPath, 'utf8');
    
    // Replace the bcrypt import
    const newContent = content.replace(
      /import bcrypt from ['"]bcrypt['"];/g, 
      'import bcrypt from "@/lib/bcrypt-wrapper";'
    );
    
    // Write the updated content back to the file
    fs.writeFileSync(fullPath, newContent);
    
    console.log(`✅ Updated ${filePath}`);
    return true;
  } catch (error) {
    console.error(`❌ Error updating ${filePath}:`, error.message);
    return false;
  }
}

// Main function
async function main() {
  console.log('=== UPDATING BCRYPT IMPORTS ===');
  
  let successCount = 0;
  let failCount = 0;
  
  // Process each file
  for (const file of filesToUpdate) {
    if (updateFile(file)) {
      successCount++;
    } else {
      failCount++;
    }
  }
  
  console.log(`\n✅ Successfully updated ${successCount} files`);
  if (failCount > 0) {
    console.log(`❌ Failed to update ${failCount} files`);
  }
  
  console.log('=== BCRYPT IMPORT UPDATE COMPLETED ===');
}

// Run the main function
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});