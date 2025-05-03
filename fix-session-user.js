#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Find all TypeScript files in src/app/api
function findTsFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      findTsFiles(filePath, fileList);
    } else if (stat.isFile() && filePath.endsWith('.ts')) {
      fileList.push(filePath);
    }
  }
  
  return fileList;
}

// Fix a specific file
function fixFile(filePath) {
  console.log(`Processing ${filePath}...`);
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;
  
  // Replace all instances of session.User with session.user
  // Pattern: session.User
  const sessionUser = /session\.User/g;
  if (sessionUser.test(content)) {
    content = content.replace(sessionUser, 'session.user');
    modified = true;
  }

  // Pattern: session?.User
  const sessionOptionalUser = /session\?\.User/g;
  if (sessionOptionalUser.test(content)) {
    content = content.replace(sessionOptionalUser, 'session?.user');
    modified = true;
  }
  
  // Write changes back to the file if modified
  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ Fixed session.User references in ${filePath}`);
  } else {
    console.log(`ℹ️ No session.User references to fix in ${filePath}`);
  }
  
  return modified;
}

// Main execution
function main() {
  console.log('🔍 Scanning for session.User references...');
  
  // Get all .ts files in src/app
  const tsFiles = findTsFiles(path.join(process.cwd(), 'src', 'app'));
  console.log(`Found ${tsFiles.length} TypeScript files to process.`);
  
  let fixedCount = 0;
  for (const file of tsFiles) {
    if (fixFile(file)) {
      fixedCount++;
    }
  }
  
  console.log(`\n✅ Fixed session.User references in ${fixedCount} files out of ${tsFiles.length} total.`);
}

main();