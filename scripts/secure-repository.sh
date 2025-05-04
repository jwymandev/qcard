#!/bin/bash
# Script to secure the repository by removing sensitive files from Git tracking

# Set error handling
set -e
echo "🛡️  Securing repository from credential exposure..."

# Check if running from the project root
if [ ! -f "package.json" ]; then
  echo "❌ Error: This script must be run from the project root directory!"
  exit 1
fi

# Remove sensitive files from Git tracking but keep the files locally
echo "📝 Removing sensitive files from Git tracking..."
files_to_remove=(.env .env.production .env.do .env-e .env.*)
for file in "${files_to_remove[@]}"; do
  if git ls-files --error-unmatch "$file" &> /dev/null; then
    git rm --cached "$file"
    echo "✅ Removed $file from Git tracking"
  else
    echo "ℹ️  $file is not tracked by Git"
  fi
done

# Check .gitignore to make sure these files are ignored
echo "📝 Verifying .gitignore contains all sensitive patterns..."
gitignore_patterns=(".env" ".env.*" ".env.production" ".env.do" ".env-e")
gitignore_updated=false

for pattern in "${gitignore_patterns[@]}"; do
  if ! grep -q "$pattern" .gitignore; then
    echo "$pattern" >> .gitignore
    echo "✅ Added $pattern to .gitignore"
    gitignore_updated=true
  fi
done

if [ "$gitignore_updated" = false ]; then
  echo "✅ .gitignore already contains all necessary patterns"
fi

# Rotate secrets
echo "🔄 Running secret rotation script..."
if [ -f "scripts/rotate-secrets.js" ]; then
  node scripts/rotate-secrets.js
else
  echo "⚠️  Secret rotation script not found. Skipping..."
fi

# Create a commit with these changes
echo "📝 Creating a commit with security changes..."
git add .gitignore
git commit -m "security: remove sensitive files from git tracking and update gitignore"

# Final instructions
echo ""
echo "🛡️  Repository security improvements applied!"
echo ""
echo "⚠️  IMPORTANT NEXT STEPS:"
echo "1. Run 'git push' to update the remote repository"
echo "2. Update production environment variables with new secrets"
echo "3. Rotate your DigitalOcean database password immediately"
echo "4. Follow the guidelines in SECURITY_CHECKLIST.md"
echo ""
echo "Optional (but recommended): If you need to completely remove sensitive"
echo "data from commit history, consider using BFG Repo-Cleaner:"
echo "https://rtyley.github.io/bfg-repo-cleaner/"
echo ""

exit 0