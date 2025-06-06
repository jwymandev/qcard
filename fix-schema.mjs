#!/usr/bin/env node

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import readline from 'readline';

const models = [
  'User', 'Tenant', 'Profile', 'Skill', 'Location', 'Project', 
  'ProjectMember', 'CastingCall', 'Application', 'Studio', 
  'ProfileImage', 'Payment'
];

// Create regex pattern to find uppercase Prisma models
const modelPattern = `prisma\\.(${models.join('|')})`;
const includePattern = `include:\\s*{[^}]*?(${models.join('|')})`;
const propertyPattern = `\\.(${models.join('|')})`;

// Directory to search
const searchDir = 'src';

console.log('🔍 Scanning for case sensitivity issues in Prisma models...');

// Find files with issues
let grep1 = '', grep2 = '', grep3 = '';

try {
  grep1 = execSync(`grep -r "${modelPattern}" ${searchDir}/ --include="*.ts" --include="*.tsx"`, { encoding: 'utf8' }).trim();
} catch (error) {
  console.log('No direct model references found.');
}

try {
  grep2 = execSync(`grep -r "${includePattern}" ${searchDir}/ --include="*.ts" --include="*.tsx"`, { encoding: 'utf8' }).trim();
} catch (error) {
  console.log('No include patterns found.');
}

try {
  grep3 = execSync(`grep -r "${propertyPattern}" ${searchDir}/ --include="*.ts" --include="*.tsx"`, { encoding: 'utf8' }).trim();
} catch (error) {
  console.log('No property access patterns found.');
}

// Combine results and filter duplicates
const allResults = [...grep1.split('\n'), ...grep2.split('\n'), ...grep3.split('\n')]
  .filter(Boolean)
  .filter((value, index, self) => self.indexOf(value) === index);

console.log(`Found ${allResults.length} potential issues.`);

// Group by file
const fileMap = new Map();
for (const result of allResults) {
  const [filePath] = result.split(':');
  if (!fileMap.has(filePath)) {
    fileMap.set(filePath, []);
  }
  fileMap.get(filePath).push(result);
}

// Create a report
console.log('\n📊 Case sensitivity issues by file:');
for (const [filePath, results] of fileMap.entries()) {
  console.log(`\n📄 ${filePath} (${results.length} issues):`);
  results.forEach(r => console.log(`  - ${r.split(':').slice(1).join(':').trim()}`));
}

// In CI/CD environments or when running as part of scripts, 
// we'll automatically decide based on whether issues were found
if (allResults.length === 0) {
  console.log('\n✅ No issues found, nothing to fix!');
  process.exit(0);
}

// For interactive mode, ask the user
// But for automation (e.g. when run from npm scripts), bypass the prompt
const isNonInteractive = process.env.CI || process.argv.includes('--auto');

if (isNonInteractive || process.argv.includes('--yes')) {
  console.log('\n🔧 Automatically fixing issues...');
  processFixing(true);
} else if (process.argv.includes('--no')) {
  console.log('\n📝 Skipping fixes as requested.');
  process.exit(0);
} else {
  // Interactive mode
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  rl.question('\n🛠️ Do you want to attempt to fix these issues automatically? (yes/no): ', (answer) => {
    processFixing(answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y');
    rl.close();
  });
}

function processFixing(shouldFix) {
  if (shouldFix) {
    console.log('\n🔧 Fixing issues...');
    
    // Create mapping for replacements
    const replacements = models.reduce((acc, model) => {
      acc[model] = model.charAt(0).toLowerCase() + model.slice(1);
      return acc;
    }, {});
    
    // Process each file
    const processed = new Set();
    for (const [filePath, _] of fileMap.entries()) {
      if (processed.has(filePath)) continue;
      processed.add(filePath);
      
      try {
        console.log(`Processing ${filePath}...`);
        let content = fs.readFileSync(filePath, 'utf8');
        let modified = false;
        
        // Replace "prisma.Model" with "prisma.model"
        for (const [original, replacement] of Object.entries(replacements)) {
          const regex = new RegExp(`prisma\\.${original}\\b`, 'g');
          if (regex.test(content)) {
            content = content.replace(regex, `prisma.${replacement}`);
            modified = true;
          }
        }
        
        // Replace "include: { Model: " with "include: { model: "
        for (const [original, replacement] of Object.entries(replacements)) {
          const regex = new RegExp(`(include:\\s*{[^}]*?)${original}:\\s`, 'g');
          if (regex.test(content)) {
            content = content.replace(regex, `$1${replacement}: `);
            modified = true;
          }
        }
        
        // Replace ".Model" property access with ".model"
        for (const [original, replacement] of Object.entries(replacements)) {
          // Only replace when it's a property access, not a type
          const regex = new RegExp(`\\.${original}\\b(?!\\s*[:<])`, 'g');
          if (regex.test(content)) {
            content = content.replace(regex, `.${replacement}`);
            modified = true;
          }
        }
        
        // Improve error handling
        // This is a more complex transformation, just look for simple patterns
        const errorRegex = /catch\s*\(\s*error\s*\)\s*{[^}]*?error\.(\w+)/g;
        if (errorRegex.test(content)) {
          console.log(`  Potential unsafe error handling found in ${filePath}`);
        }
        
        if (modified) {
          fs.writeFileSync(filePath, content, 'utf8');
          console.log(`  ✅ Fixed case sensitivity issues in ${filePath}`);
        }
      } catch (error) {
        console.error(`  ❌ Error processing ${filePath}:`, error);
      }
    }
    
    console.log('\n🎉 Finished fixing case sensitivity issues!');
    console.log('\nNow run `npm run typecheck` to verify the changes don\'t introduce any type errors.');
  } else {
    console.log('\n📝 No changes made. Review the issues manually using the report above.');
  }
}