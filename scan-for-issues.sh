#!/bin/bash

# Exit on error
set -e

echo "🔍 Scanning for case sensitivity issues in Prisma models..."

# Find uppercase references to Prisma models which should be lowercase
echo "⚠️ Checking for uppercase Prisma model names (should be lowercase):"
grep -r "prisma\.\([A-Z]\)" src/ --include="*.ts" --include="*.tsx" || echo "✅ No uppercase Prisma model references found"

# Find lowercase references to relation fields which should be uppercase
echo -e "\n⚠️ Checking for lowercase relation fields in include/where clauses (should match schema case):"
grep -r "include: *{.*\(profiles\|locations\|skills\|images\)" src/ --include="*.ts" --include="*.tsx" || echo "✅ No lowercase relation references found"
grep -r "where: *{.*\(profiles\|locations\|skills\|images\)" src/ --include="*.ts" --include="*.tsx" || echo "✅ No lowercase relation references found"

# Check for missing error type handling
echo -e "\n⚠️ Checking for unsafe error handling (error.toString()):"
grep -r "error\.toString()" src/ --include="*.ts" --include="*.tsx" || echo "✅ No unsafe error handling found"

# Scan for Prisma create operations that might be missing required fields
echo -e "\n⚠️ Checking for potential missing required fields in Prisma create operations:"
grep -r "\.create({" src/ --include="*.ts" --include="*.tsx" | grep -v "id: \|updatedAt:" || echo "✅ No obvious missing required fields found"

echo -e "\n✨ Scan complete!"