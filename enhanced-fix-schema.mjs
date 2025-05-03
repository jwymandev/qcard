#!/usr/bin/env node

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import readline from 'readline';

// Model names and their lowercase equivalents
const models = [
  'User', 'Tenant', 'Profile', 'Skill', 'Location', 'Project', 
  'ProjectMember', 'CastingCall', 'Application', 'Studio', 
  'ProfileImage', 'Payment'
];

// Create regex pattern to find uppercase Prisma models
const modelPattern = `prisma\\.(${models.join('|')})`;
const includePattern = `include:\\s*{[^}]*?(${models.join('|')})`;
const propertyPattern = `\\.(${models.join('|')})`;

// Directory to search - focus on API routes first
const searchDir = 'src/app/api';

console.log('🔍 Scanning for case sensitivity issues in Prisma models...');

// Find files with issues
const grep1 = execSync(`grep -r "${modelPattern}" ${searchDir}/ --include="*.ts"`, { encoding: 'utf8' }).trim();
const grep2 = execSync(`grep -r "${includePattern}" ${searchDir}/ --include="*.ts"`, { encoding: 'utf8' }).trim();
const grep3 = execSync(`grep -r "${propertyPattern}" ${searchDir}/ --include="*.ts"`, { encoding: 'utf8' }).trim();

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

// Ask if user wants to fix the issues automatically
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.question('\n🛠️ Do you want to attempt to fix these issues automatically? (yes/no): ', (answer) => {
  if (answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y') {
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
          // This regex more carefully targets include statements
          const regex = new RegExp(`(include\\s*:\\s*{[\\s\\S]*?)${original}\\s*:`, 'g');
          if (regex.test(content)) {
            content = content.replace(regex, `$1${replacement}:`);
            modified = true;
          }
        }
        
        // Handle nested includes more carefully
        for (const [original, replacement] of Object.entries(replacements)) {
          // This regex targets nested include statements
          const nestedRegex = new RegExp(`(include\\s*:\\s*{[\\s\\S]*?{[\\s\\S]*?)${original}\\s*:`, 'g');
          if (nestedRegex.test(content)) {
            content = content.replace(nestedRegex, `$1${replacement}:`);
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
        
        // Fix model references in custom relation names
        // This handles patterns like Profile_Message_talentReceiverIdToProfile
        for (const [original, replacement] of Object.entries(replacements)) {
          const relationRegex = new RegExp(`${original}_([A-Za-z_]+)`, 'g');
          if (relationRegex.test(content)) {
            content = content.replace(relationRegex, `${replacement}_$1`);
            modified = true;
          }
        }
        
        // Improve error handling
        const errorPattern = /(catch\s*\(\s*error\s*\)\s*{[\s\S]*?)(error\.\w+)/g;
        if (errorPattern.test(content)) {
          content = content.replace(errorPattern, (match, prefix, errorAccess) => {
            // Don't modify if it already has error type checking
            if (match.includes('instanceof Error')) {
              return match;
            }
            
            // Get the property being accessed
            const property = errorAccess.split('.')[1];
            return `${prefix}${errorAccess.replace(`.${property}`, ` instanceof Error ? error.${property} : String(error)`)}`;
          });
          modified = true;
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
  
  rl.close();
});