#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Define the model names (should be PascalCase in Prisma schema)
const models = [
  'User', 'Tenant', 'Profile', 'Skill', 'Location', 'Project', 
  'ProjectMember', 'CastingCall', 'Application', 'Studio', 
  'ProfileImage', 'Payment', 'Message', 'Scene', 'SceneTalent',
  'StudioNote'
];

// Special relation fields to be handled separately
const specialRelations = [
  'Studio_Message_studioSenderIdToStudio',
  'Studio_Message_studioReceiverIdToStudio',
  'Profile_Message_talentSenderIdToProfile',
  'Profile_Message_talentReceiverIdToProfile'
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
  
  // Fix include statements: { tenant: true } -> { Tenant: true }
  for (const model of models) {
    const lowercaseModel = model.charAt(0).toLowerCase() + model.slice(1);
    
    // Match include: { modelname: true } pattern (with whitespace variations)
    const includeRegex = new RegExp(`include:\\s*{[^}]*?\\b${lowercaseModel}\\s*:\\s*true`, 'g');
    if (includeRegex.test(content)) {
      content = content.replace(new RegExp(`(include:\\s*{[^}]*?)\\b${lowercaseModel}(\\s*:)`, 'g'), `$1${model}$2`);
      modified = true;
    }
    
    // Match include: { modelname: { ... }} pattern
    const nestedIncludeRegex = new RegExp(`include:\\s*{[^}]*?\\b${lowercaseModel}\\s*:\\s*{`, 'g');
    if (nestedIncludeRegex.test(content)) {
      content = content.replace(new RegExp(`(include:\\s*{[^}]*?)\\b${lowercaseModel}(\\s*:\\s*{)`, 'g'), `$1${model}$2`);
      modified = true;
    }
  }
  
  // Fix property references: user.tenant -> user.Tenant
  for (const model of models) {
    const lowercaseModel = model.charAt(0).toLowerCase() + model.slice(1);
    
    // Match object?.property pattern (safe access)
    const safeAccessRegex = new RegExp(`\\b\\w+\\??\\.${lowercaseModel}\\b(?!\\s*[:])`, 'g');
    if (safeAccessRegex.test(content)) {
      content = content.replace(new RegExp(`(\\b\\w+\\??\\.)${lowercaseModel}\\b(?!\\s*[:])`, 'g'), `$1${model}`);
      modified = true;
    }
    
    // Match object.property pattern (direct access)
    const directAccessRegex = new RegExp(`\\b\\w+\\.${lowercaseModel}\\b`, 'g');
    if (directAccessRegex.test(content)) {
      content = content.replace(new RegExp(`(\\b\\w+\\.)${lowercaseModel}\\b(?!\\s*[:])`, 'g'), `$1${model}`);
      modified = true;
    }
  }
  
  // Fix connection references
  const connectRegex = /(\s*\w+:\s*{\s*connect:\s*{)/g;
  if (connectRegex.test(content)) {
    for (const model of models) {
      const lowercaseModel = model.charAt(0).toLowerCase() + model.slice(1);
      content = content.replace(new RegExp(`(\\s*)${lowercaseModel}(\\s*:\\s*{\\s*connect:\\s*{)`, 'g'), `$1${model}$2`);
    }
    modified = true;
  }
  
  // Ensure special relation field cases remain as defined in schema
  for (const relation of specialRelations) {
    // This just ensures we don't accidentally lowercase these special fields
    const lowercaseRelation = relation.charAt(0).toLowerCase() + relation.slice(1);
    if (content.includes(lowercaseRelation)) {
      content = content.replace(new RegExp(`\\b${lowercaseRelation}\\b`, 'g'), relation);
      modified = true;
    }
  }
  
  // Fix missing required fields
  // Check for message/note creation without ID or updatedAt
  if (content.includes('prisma.message.create') || content.includes('prisma.studioNote.create')) {
    const createDataWithoutId = /data:\s*{(?![^}]*?id:)/g;
    if (createDataWithoutId.test(content)) {
      // Before modifying, check if we need to import crypto
      if (!content.includes('import crypto from')) {
        content = content.replace(/^(import.*?;)(\s*)/m, `$1\nimport crypto from 'crypto';$2`);
      }
      
      // Add id and updatedAt if missing
      content = content.replace(/(\s*data:\s*{)(?![^}]*?id:)/g, `$1\n        id: crypto.randomUUID(),`);
      content = content.replace(/(\s*data:\s*{(?:[^}]*?))(?![^}]*?updatedAt:)(\s*})/g, `$1\n        updatedAt: new Date(),$2`);
      modified = true;
    }
  }
  
  // Write changes back to the file if modified
  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ Fixed issues in ${filePath}`);
  } else {
    console.log(`ℹ️ No issues to fix in ${filePath}`);
  }
  
  return modified;
}

// Main execution
function main() {
  console.log('🔍 Scanning for case sensitivity issues in API routes...');
  
  // Get all .ts files in src/app/api
  const tsFiles = findTsFiles(path.join(process.cwd(), 'src', 'app', 'api'));
  console.log(`Found ${tsFiles.length} TypeScript files to process.`);
  
  let fixedCount = 0;
  for (const file of tsFiles) {
    if (fixFile(file)) {
      fixedCount++;
    }
  }
  
  console.log(`\n✅ Fixed issues in ${fixedCount} files out of ${tsFiles.length} total.`);
  
  if (fixedCount > 0) {
    console.log('\n🧪 It\'s recommended to run type checking to verify fixes:');
    console.log('   npm run typecheck');
  }
}

main();