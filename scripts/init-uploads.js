#!/usr/bin/env node

/**
 * This script initializes the uploads directory for profile images
 */

const fs = require('fs');
const path = require('path');

// Define the uploads directory
const uploadsDir = path.join(process.cwd(), 'public', 'uploads');

// Check if it exists
if (!fs.existsSync(uploadsDir)) {
  console.log(`Creating uploads directory at ${uploadsDir}`);
  try {
    // Create directory with recursive option
    fs.mkdirSync(uploadsDir, { recursive: true });
    console.log('✅ Uploads directory created successfully');
  } catch (error) {
    console.error('❌ Error creating uploads directory:', error.message);
    process.exit(1);
  }
} else {
  console.log(`✅ Uploads directory already exists at ${uploadsDir}`);
}

// Ensure directory is writable
try {
  // Test write permissions by creating and removing a test file
  const testFile = path.join(uploadsDir, '.test-write-permissions');
  fs.writeFileSync(testFile, 'test');
  fs.unlinkSync(testFile);
  console.log('✅ Uploads directory is writable');
} catch (error) {
  console.error('❌ Uploads directory is not writable:', error.message);
  console.log('Please ensure the directory has the correct permissions:');
  console.log(`chmod -R 755 ${uploadsDir}`);
  process.exit(1);
}

console.log('Uploads directory setup completed successfully');