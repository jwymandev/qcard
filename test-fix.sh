#!/bin/bash

# Helper script to verify case sensitivity fixes
# Usage: ./test-fix.sh path/to/file.ts

FILE_PATH=$1

if [ -z "$FILE_PATH" ]; then
  echo "Please provide a file path to test"
  echo "Usage: ./test-fix.sh path/to/file.ts"
  exit 1
fi

if [ ! -f "$FILE_PATH" ]; then
  echo "Error: File not found: $FILE_PATH"
  exit 1
fi

# Make a backup of the original file
cp "$FILE_PATH" "${FILE_PATH}.bak"
echo "✅ Made backup of original file: ${FILE_PATH}.bak"

# Create list of model names and their lowercase versions
declare -A models
models=(
  ["User"]="user" 
  ["Tenant"]="tenant" 
  ["Profile"]="profile" 
  ["Skill"]="skill" 
  ["Location"]="location" 
  ["Project"]="project"
  ["ProjectMember"]="projectMember" 
  ["CastingCall"]="castingCall" 
  ["Application"]="application" 
  ["Studio"]="studio"
  ["ProfileImage"]="profileImage" 
  ["Payment"]="payment"
)

echo "🔍 Scanning for issues in $FILE_PATH"

# Check for prisma model references
for model in "${!models[@]}"; do
  count=$(grep -c "prisma\.${model}\b" "$FILE_PATH")
  if [ $count -gt 0 ]; then
    echo "  - Found $count references to prisma.${model} (should be prisma.${models[$model]})"
  fi
done

# Check for include statements
for model in "${!models[@]}"; do
  count=$(grep -c "include:.*${model}:" "$FILE_PATH")
  if [ $count -gt 0 ]; then
    echo "  - Found $count references to ${model}: in include statements (should be ${models[$model]}:)"
  fi
done

# Check for property access
for model in "${!models[@]}"; do
  count=$(grep -c "\.${model}\b" "$FILE_PATH")
  if [ $count -gt 0 ]; then
    echo "  - Found $count references to .${model} property access (should be .${models[$model]})"
  fi
done

# Check for error handling
unsafe_errors=$(grep -c "catch.*error.*error\.[a-zA-Z]" "$FILE_PATH")
if [ $unsafe_errors -gt 0 ]; then
  echo "  - Found $unsafe_errors potential unsafe error handling patterns"
fi

echo ""
echo "To apply fixes automatically, run:"
echo "node fix-schema.mjs"
echo ""
echo "To restore the original file:"
echo "mv ${FILE_PATH}.bak ${FILE_PATH}"