#!/bin/bash

# Script to verify that all the fixes are in place
echo "=== Verifying Digital Ocean deployment fixes ==="

# Check if pre-build.sh exists and is executable
if [ -f "pre-build.sh" ]; then
  if [ -x "pre-build.sh" ]; then
    echo "✅ pre-build.sh exists and is executable"
  else
    echo "⚠️ pre-build.sh exists but is not executable"
    echo "   Run: chmod +x pre-build.sh"
  fi
else
  echo "❌ pre-build.sh does not exist"
fi

# Check if pre-deploy-do.sh exists and is executable
if [ -f "pre-deploy-do.sh" ]; then
  if [ -x "pre-deploy-do.sh" ]; then
    echo "✅ pre-deploy-do.sh exists and is executable"
  else
    echo "⚠️ pre-deploy-do.sh exists but is not executable"
    echo "   Run: chmod +x pre-deploy-do.sh"
  fi
else
  echo "❌ pre-deploy-do.sh does not exist"
fi

# Check if replace-db-file.js exists
if [ -f "scripts/replace-db-file.js" ]; then
  echo "✅ replace-db-file.js exists"
else
  echo "❌ replace-db-file.js does not exist"
fi

# Check if setup-do-database-simple.js exists
if [ -f "scripts/setup-do-database-simple.js" ]; then
  echo "✅ setup-do-database-simple.js exists"
else
  echo "❌ setup-do-database-simple.js does not exist"
fi

# Check for reversed assignment in db.ts
if [ -f "src/lib/db.ts" ]; then
  if grep -q '"postgresql://.*placeholder".*=.*databaseUrl' src/lib/db.ts; then
    echo "❌ db.ts contains reversed assignment error"
    echo "   Run: node scripts/replace-db-file.js"
  else
    if grep -q "process.env.DATABASE_URL = databaseUrl" src/lib/db.ts; then
      echo "✅ db.ts has correct assignment direction"
    else
      echo "⚠️ db.ts does not contain the standard assignment pattern"
      echo "   This may be fine if using a simplified version"
    fi
  fi
else
  echo "❌ db.ts does not exist"
fi

# Check package.json for needed scripts
if [ -f "package.json" ]; then
  if grep -q '"prebuild:do"' package.json; then
    echo "✅ package.json contains prebuild:do script"
  else
    echo "❌ package.json does not contain prebuild:do script"
  fi
  
  if grep -q '"do:deploy-full"' package.json; then
    echo "✅ package.json contains do:deploy-full script"
  else
    echo "❌ package.json does not contain do:deploy-full script"
  fi
else
  echo "❌ package.json does not exist"
fi

echo -e "\n=== Verification summary ==="
echo "If all checks passed, your setup should be ready for Digital Ocean deployment."
echo "If any checks failed, please run the appropriate commands to fix them."
echo "For Digital Ocean deployment, use: npm run do:deploy-full"
echo "============================"