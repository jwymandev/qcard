#!/bin/bash

# Script to fix all studio API endpoints to use authPrisma for consistency

echo "Fixing studio API endpoints to use authPrisma..."

# List of files that need updating
files=(
  "/Users/jake/Documents/Projects/qcard/src/app/api/studio/casting-codes/qrcode/route.ts"
  "/Users/jake/Documents/Projects/qcard/src/app/api/studio/casting-codes/submissions/[id]/route.ts"
  "/Users/jake/Documents/Projects/qcard/src/app/api/studio/casting-codes/[id]/route.ts"
  "/Users/jake/Documents/Projects/qcard/src/app/api/studio/messages/[id]/route.ts"
  "/Users/jake/Documents/Projects/qcard/src/app/api/studio/projects/[id]/scenes/route.ts"
  "/Users/jake/Documents/Projects/qcard/src/app/api/studio/projects/[id]/scenes/[sceneId]/external-actors/[actorId]/route.ts"
  "/Users/jake/Documents/Projects/qcard/src/app/api/studio/projects/[id]/scenes/[sceneId]/external-actors/route.ts"
  "/Users/jake/Documents/Projects/qcard/src/app/api/studio/projects/[id]/archive/route.ts"
  "/Users/jake/Documents/Projects/qcard/src/app/api/studio/projects/[id]/talent-requirements/[roleId]/route.ts"
  "/Users/jake/Documents/Projects/qcard/src/app/api/studio/projects/[id]/talent-requirements/route.ts"
  "/Users/jake/Documents/Projects/qcard/src/app/api/studio/projects/[id]/route.ts"
  "/Users/jake/Documents/Projects/qcard/src/app/api/studio/projects/[id]/members/route.ts"
  "/Users/jake/Documents/Projects/qcard/src/app/api/studio/projects/[id]/invitations/route.ts"
  "/Users/jake/Documents/Projects/qcard/src/app/api/studio/external-actors/projects/route.ts"
  "/Users/jake/Documents/Projects/qcard/src/app/api/studio/external-actors/search/route.ts"
  "/Users/jake/Documents/Projects/qcard/src/app/api/studio/notes/[id]/route.ts"
  "/Users/jake/Documents/Projects/qcard/src/app/api/studio/casting-calls/[id]/route.ts"
  "/Users/jake/Documents/Projects/qcard/src/app/api/studio/casting-calls/[id]/invitations/route.ts"
  "/Users/jake/Documents/Projects/qcard/src/app/api/studio/invitations/route.ts"
)

# Function to update a file
update_file() {
  local file="$1"
  echo "Updating $file..."
  
  # Check if file exists
  if [[ ! -f "$file" ]]; then
    echo "  Skipping $file (not found)"
    return
  fi
  
  # Add authPrisma import if it doesn't exist and prisma import exists
  if grep -q "import.*prisma.*from.*@/lib/db" "$file" && ! grep -q "authPrisma" "$file"; then
    echo "  Adding authPrisma import..."
    sed -i.bak "s|import { prisma } from '@/lib/db';|import { prisma } from '@/lib/db';\nimport { authPrisma } from '@/lib/secure-db-connection';|g" "$file"
  fi
  
  # Replace prisma.user.findUnique with authPrisma.user.findUnique
  if grep -q "prisma\.user\.findUnique" "$file"; then
    echo "  Replacing prisma.user.findUnique with authPrisma.user.findUnique..."
    sed -i.bak "s|prisma\.user\.findUnique|authPrisma.user.findUnique|g" "$file"
  fi
  
  # Replace prisma.studio.findFirst with authPrisma.studio.findFirst
  if grep -q "prisma\.studio\.findFirst" "$file"; then
    echo "  Replacing prisma.studio.findFirst with authPrisma.studio.findFirst..."
    sed -i.bak "s|prisma\.studio\.findFirst|authPrisma.studio.findFirst|g" "$file"
  fi
  
  # Replace prisma.studio.findUnique with authPrisma.studio.findUnique
  if grep -q "prisma\.studio\.findUnique" "$file"; then
    echo "  Replacing prisma.studio.findUnique with authPrisma.studio.findUnique..."
    sed -i.bak "s|prisma\.studio\.findUnique|authPrisma.studio.findUnique|g" "$file"
  fi
  
  echo "  Updated $file"
}

# Update each file
for file in "${files[@]}"; do
  update_file "$file"
done

echo "All studio API endpoints have been updated to use authPrisma for user authentication queries."
echo "Backup files (.bak) have been created for each modified file."
echo "You can remove backup files with: find /Users/jake/Documents/Projects/qcard/src/app/api/studio -name '*.bak' -delete"