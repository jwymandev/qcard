#!/bin/bash

# Script to update Prisma schema references in the API routes
# Focuses specifically on fixing case sensitivity issues

# Define model names
models=(
  "User:user" 
  "Tenant:tenant" 
  "Profile:profile" 
  "Skill:skill" 
  "Location:location" 
  "Project:project" 
  "ProjectMember:projectMember" 
  "CastingCall:castingCall" 
  "Application:application" 
  "Studio:studio" 
  "ProfileImage:profileImage" 
  "Payment:payment"
)

API_ROUTES_DIR="src/app/api"

echo "🔍 Scanning API routes for case sensitivity issues..."

# Find all TypeScript files in the API routes directory
FILES=$(find "$API_ROUTES_DIR" -name "*.ts")

# Store issues by file for reporting
declare -A file_issues

# Check each file for issues
for file in $FILES; do
  file_has_issues=false
  
  # Check for model references
  for model_pair in "${models[@]}"; do
    IFS=':' read -r uppercase lowercase <<< "$model_pair"
    
    # Check prisma model references
    prisma_refs=$(grep -c "prisma\.${uppercase}\b" "$file")
    if [ "$prisma_refs" -gt 0 ]; then
      file_issues["$file"]="$file_issues[$file] prisma.${uppercase}"
      file_has_issues=true
    fi
    
    # Check include statements
    include_refs=$(grep -c "include:.*${uppercase}:" "$file")
    if [ "$include_refs" -gt 0 ]; then
      file_issues["$file"]="$file_issues[$file] include:${uppercase}"
      file_has_issues=true
    fi
    
    # Check property access
    prop_refs=$(grep -c "\.${uppercase}\b" "$file")
    if [ "$prop_refs" -gt 0 ]; then
      file_issues["$file"]="$file_issues[$file] .${uppercase}"
      file_has_issues=true
    fi
  done
  
  # Check for unsafe error handling
  unsafe_errors=$(grep -c "catch.*error.*error\.[a-zA-Z]" "$file")
  if [ "$unsafe_errors" -gt 0 ]; then
    file_issues["$file"]="$file_issues[$file] unsafe_errors"
    file_has_issues=true
  fi
  
  if [ "$file_has_issues" = true ]; then
    echo "🔴 Issues found in $file"
  fi
done

echo ""
echo "📊 Found issues in ${#file_issues[@]} files."

# Ask if user wants to run the fix script
read -p "🛠️ Do you want to run the fix-schema.mjs script to fix these issues? (y/n): " answer

if [[ "$answer" =~ ^[Yy]$ ]]; then
  echo "Running fix-schema.mjs..."
  node fix-schema.mjs
else
  echo "No changes made. Review the issues manually."
fi

echo ""
echo "After fixing, remember to run:"
echo "  npm run typecheck - to verify TypeScript is happy"
echo "  npm run validate - to validate the entire project"