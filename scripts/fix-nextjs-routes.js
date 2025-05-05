#!/usr/bin/env node

/**
 * Next.js Route Structure Fixer
 * 
 * This script fixes Next.js route conflicts by deleting conflicting route files.
 * It specifically targets the id vs projectId conflict.
 */

const fs = require('fs');
const path = require('path');

// Paths to check
const APP_DIR = path.join(process.cwd(), 'src', 'app');
const STUDIO_PROJECTS_DIR = path.join(APP_DIR, 'studio', 'projects');
const API_PROJECTS_DIR = path.join(APP_DIR, 'api', 'studio', 'projects');

console.log('Fixing Next.js route conflicts...');

// Delete file if it exists
function safeDeleteFile(filePath) {
  if (fs.existsSync(filePath)) {
    console.log(`Deleting file: ${filePath}`);
    fs.unlinkSync(filePath);
    return true;
  }
  return false;
}

// Delete directory if it exists
function safeDeleteDir(dirPath) {
  if (fs.existsSync(dirPath)) {
    console.log(`Deleting directory: ${dirPath}`);
    
    // Delete all contents recursively
    function deleteDirRecursive(dir) {
      if (fs.existsSync(dir)) {
        fs.readdirSync(dir).forEach(file => {
          const currentPath = path.join(dir, file);
          if (fs.lstatSync(currentPath).isDirectory()) {
            // Recursive case: it's a directory
            deleteDirRecursive(currentPath);
          } else {
            // Base case: it's a file
            fs.unlinkSync(currentPath);
          }
        });
        
        // Remove directory itself
        fs.rmdirSync(dir);
      }
    }
    
    deleteDirRecursive(dirPath);
    return true;
  }
  return false;
}

// Files to delete (from most specific to least specific)
const filesToDelete = [
  // Studio project files
  path.join(STUDIO_PROJECTS_DIR, '[id]', 'page.tsx'),
  
  // API route files 
  path.join(API_PROJECTS_DIR, '[id]', 'route.ts'),
  path.join(API_PROJECTS_DIR, '[id]', 'archive', 'route.ts'),
  path.join(API_PROJECTS_DIR, '[id]', 'members', 'route.ts'),
  path.join(API_PROJECTS_DIR, '[id]', 'scenes', 'route.ts'),
  
  // Nested API route files
  path.join(API_PROJECTS_DIR, '[id]', 'members', '[memberId]', 'route.ts'),
  path.join(API_PROJECTS_DIR, '[id]', 'scenes', '[sceneId]', 'route.ts'),
  path.join(API_PROJECTS_DIR, '[id]', 'scenes', '[sceneId]', 'talents', 'route.ts'),
  path.join(API_PROJECTS_DIR, '[id]', 'scenes', '[sceneId]', 'talents', '[talentId]', 'route.ts')
];

// Directories to delete (from most nested to least nested)
const dirsToDelete = [
  // Most nested first
  path.join(API_PROJECTS_DIR, '[id]', 'scenes', '[sceneId]', 'talents', '[talentId]'),
  path.join(API_PROJECTS_DIR, '[id]', 'scenes', '[sceneId]', 'talents'),
  path.join(API_PROJECTS_DIR, '[id]', 'scenes', '[sceneId]'),
  path.join(API_PROJECTS_DIR, '[id]', 'members', '[memberId]'),
  path.join(API_PROJECTS_DIR, '[id]', 'scenes'),
  path.join(API_PROJECTS_DIR, '[id]', 'members'),
  path.join(API_PROJECTS_DIR, '[id]', 'archive'),
  path.join(API_PROJECTS_DIR, '[id]'),
  path.join(STUDIO_PROJECTS_DIR, '[id]')
];

// Delete files
let filesDeleted = 0;
for (const file of filesToDelete) {
  if (safeDeleteFile(file)) {
    filesDeleted++;
  }
}

// Delete directories
let dirsDeleted = 0;
for (const dir of dirsToDelete) {
  if (safeDeleteDir(dir)) {
    dirsDeleted++;
  }
}

if (filesDeleted === 0 && dirsDeleted === 0) {
  console.log('No conflicting files or directories found. Routes are already clean.');
} else {
  console.log(`Fixed route conflicts: deleted ${filesDeleted} files and ${dirsDeleted} directories.`);
}

console.log('✅ Route structure fixed successfully!');