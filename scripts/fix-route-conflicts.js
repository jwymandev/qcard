#!/usr/bin/env node

/**
 * This script fixes Next.js route conflicts in the app directory
 * specifically handling the id vs projectId parameter naming conflicts
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Key directories to check and fix
const APP_DIR = path.join(process.cwd(), 'src', 'app');
const STUDIO_PROJECTS_DIR = path.join(APP_DIR, 'studio', 'projects');
const API_PROJECTS_DIR = path.join(APP_DIR, 'api', 'studio', 'projects');

console.log('Fixing Next.js route conflicts...');

// 1. Remove [id] directories if [projectId] exists to avoid conflicts
function removeConflictingDirectories() {
  console.log('Checking for conflicting route directories...');
  
  // Check studio/projects/[id]
  const studioIdDir = path.join(STUDIO_PROJECTS_DIR, '[id]');
  const studioProjectIdDir = path.join(STUDIO_PROJECTS_DIR, '[projectId]');
  
  if (fs.existsSync(studioIdDir) && fs.existsSync(studioProjectIdDir)) {
    console.log(`Removing conflicting directory: ${studioIdDir}`);
    execSync(`rm -rf "${studioIdDir}"`);
  }
  
  // Check api/studio/projects/[id]
  const apiIdDir = path.join(API_PROJECTS_DIR, '[id]');
  const apiProjectIdDir = path.join(API_PROJECTS_DIR, '[projectId]');
  
  if (fs.existsSync(apiIdDir) && fs.existsSync(apiProjectIdDir)) {
    console.log(`Removing conflicting directory: ${apiIdDir}`);
    execSync(`rm -rf "${apiIdDir}"`);
  }
}

// 2. Check if we need to rename any [id] to [projectId] 
function renameIdDirectories() {
  console.log('Checking for directories to rename...');
  
  // Check studio/projects
  const studioIdDir = path.join(STUDIO_PROJECTS_DIR, '[id]');
  const studioProjectIdDir = path.join(STUDIO_PROJECTS_DIR, '[projectId]');
  
  if (fs.existsSync(studioIdDir) && !fs.existsSync(studioProjectIdDir)) {
    console.log(`Renaming: ${studioIdDir} -> ${studioProjectIdDir}`);
    execSync(`mkdir -p "${studioProjectIdDir}"`);
    
    // Copy all files
    const files = fs.readdirSync(studioIdDir);
    for (const file of files) {
      const sourceFile = path.join(studioIdDir, file);
      const destFile = path.join(studioProjectIdDir, file);
      
      if (fs.statSync(sourceFile).isDirectory()) {
        execSync(`cp -r "${sourceFile}" "${destFile}"`);
      } else {
        // Copy and update the parameter name
        let content = fs.readFileSync(sourceFile, 'utf8');
        content = content.replace(/params: \{ id: string \}/g, 'params: { projectId: string }');
        content = content.replace(/const \{ id \} = params;/g, 'const { projectId } = params;');
        content = content.replace(/\/api\/studio\/projects\/${id}/g, '/api/studio/projects/${projectId}');
        content = content.replace(/href={\`\/studio\/projects\/${id}/g, 'href={`/studio/projects/${projectId}');
        
        fs.writeFileSync(destFile, content);
      }
    }
    
    // Remove the old directory
    execSync(`rm -rf "${studioIdDir}"`);
  }
  
  // Check api/studio/projects
  const apiIdDir = path.join(API_PROJECTS_DIR, '[id]');
  const apiProjectIdDir = path.join(API_PROJECTS_DIR, '[projectId]');
  
  if (fs.existsSync(apiIdDir) && !fs.existsSync(apiProjectIdDir)) {
    console.log(`Renaming: ${apiIdDir} -> ${apiProjectIdDir}`);
    execSync(`mkdir -p "${apiProjectIdDir}"`);
    
    // Copy all files and subdirectories recursively
    execSync(`cp -r "${apiIdDir}"/* "${apiProjectIdDir}"/`);
    
    // Update parameter names in all TS files
    const updateFiles = (dir) => {
      const entries = fs.readdirSync(dir);
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry);
        
        if (fs.statSync(fullPath).isDirectory()) {
          updateFiles(fullPath);
        } else if (fullPath.endsWith('.ts') || fullPath.endsWith('.tsx')) {
          let content = fs.readFileSync(fullPath, 'utf8');
          content = content.replace(/params: \{ id: string \}/g, 'params: { projectId: string }');
          content = content.replace(/const \{ id \} = params;/g, 'const { projectId } = params;');
          content = content.replace(/id: projectId/g, 'id: projectId');
          
          // Handle where id is used directly as a variable
          content = content.replace(/where: \{ id \}/g, 'where: { id: projectId }');
          content = content.replace(/where: \{ id,/g, 'where: { id: projectId,');
          
          fs.writeFileSync(fullPath, content);
        }
      }
    };
    
    updateFiles(apiProjectIdDir);
    
    // Remove the old directory
    execSync(`rm -rf "${apiIdDir}"`);
  }
}

// Main function
function main() {
  try {
    // First remove any conflicting directories
    removeConflictingDirectories();
    
    // Then rename directories as needed
    renameIdDirectories();
    
    console.log('✅ Route conflicts fixed successfully!');
  } catch (error) {
    console.error('❌ Error fixing route conflicts:', error.message);
    process.exit(1);
  }
}

// Force copy of backup route files if needed
function forceInstallBackupFiles() {
  console.log('Checking for backup route files...');
  
  const backupRouteFile = path.join(API_PROJECTS_DIR, '[projectId]', 'route.ts.backup');
  const targetRouteFile = path.join(API_PROJECTS_DIR, '[projectId]', 'route.ts');
  
  if (fs.existsSync(backupRouteFile)) {
    console.log(`Installing backup route file from ${backupRouteFile} to ${targetRouteFile}`);
    fs.copyFileSync(backupRouteFile, targetRouteFile);
  }
}

// Delete conflicting [id] folders in all possible paths
function deleteAllIdFolders() {
  console.log('Searching for any [id] folders that might conflict...');
  
  try {
    // Find all [id] directories under src/app
    const results = execSync(`find ${APP_DIR} -type d -name "\\[id\\]"`, {
      encoding: 'utf8'
    }).trim().split('\n');
    
    // Check each found directory
    for (const dir of results) {
      if (!dir) continue;
      
      // Avoid removing non-conflicting ID dirs
      const dirName = path.basename(path.dirname(dir));
      if (dirName === 'projects') {
        console.log(`Removing directory: ${dir}`);
        execSync(`rm -rf "${dir}"`);
      }
    }
  } catch (error) {
    console.error('Error searching for [id] folders:', error.message);
  }
}

// Run the script
main();
forceInstallBackupFiles();
deleteAllIdFolders();

console.log('✅ All route conflicts have been fixed and cleanup completed!');