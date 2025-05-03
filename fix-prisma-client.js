#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Define the model names (should be PascalCase in Prisma schema but lowercase in client)
const models = [
  'User', 'Tenant', 'Profile', 'Skill', 'Location', 'Project', 
  'ProjectMember', 'CastingCall', 'Application', 'Studio', 
  'ProfileImage', 'Payment', 'Message', 'Scene', 'SceneTalent',
  'StudioNote'
];

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
  
  // Fix Prisma client method calls: tx.Application -> tx.application
  for (const model of models) {
    const lowercaseModel = model.charAt(0).toLowerCase() + model.slice(1);
    
    // Pattern: tx.Model.xxx
    const txPrismaModel = new RegExp(`tx\\.${model}\\.`, 'g');
    if (txPrismaModel.test(content)) {
      content = content.replace(txPrismaModel, `tx.${lowercaseModel}.`);
      modified = true;
    }
    
    // Pattern: prisma.Model.xxx
    const prismaModel = new RegExp(`prisma\\.${model}\\.`, 'g');
    if (prismaModel.test(content)) {
      content = content.replace(prismaModel, `prisma.${lowercaseModel}.`);
      modified = true;
    }
  }
  
  // Fix validatedData.Message -> validatedData.message
  const validatedDataMessage = /validatedData\.Message/g;
  if (validatedDataMessage.test(content)) {
    content = content.replace(validatedDataMessage, 'validatedData.message');
    modified = true;
  }
  
  // Fix missing ProjectMember fields
  const projectMemberCreate = /await tx\.projectMember\.create\(\{\s*data:\s*\{(?![^}]*id:)/g;
  if (projectMemberCreate.test(content)) {
    // Add missing required fields
    content = content.replace(
      /(await tx\.projectMember\.create\(\{\s*data:\s*\{)(?![^}]*id:)/g,
      '$1\n        id: crypto.randomUUID(),'
    );
    content = content.replace(
      /(await tx\.projectMember\.create\(\{\s*data:\s*\{(?:[^}]*?))(?![^}]*updatedAt:)(\s*}\))/g,
      '$1\n        updatedAt: new Date(),$2'
    );
    
    // Ensure crypto is imported
    if (!content.includes('import crypto from')) {
      content = content.replace(/^(import.*?;)(\s*)/m, '$1\nimport crypto from \'crypto\';$2');
    }
    
    modified = true;
  }
  
  // Write changes back to the file if modified
  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ Fixed Prisma client references in ${filePath}`);
  } else {
    console.log(`ℹ️ No Prisma client references to fix in ${filePath}`);
  }
  
  return modified;
}

// Main execution
function main() {
  console.log('🔍 Scanning for Prisma client references...');
  
  // Get all .ts files in src/app/api
  const tsFiles = findTsFiles(path.join(process.cwd(), 'src', 'app', 'api'));
  console.log(`Found ${tsFiles.length} TypeScript files to process.`);
  
  let fixedCount = 0;
  for (const file of tsFiles) {
    if (fixFile(file)) {
      fixedCount++;
    }
  }
  
  console.log(`\n✅ Fixed Prisma client references in ${fixedCount} files out of ${tsFiles.length} total.`);
}

main();