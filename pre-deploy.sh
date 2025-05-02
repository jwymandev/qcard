#!/bin/bash

# Exit script if any command fails
set -e

echo "🔍 Running pre-deployment checks..."

# Run TypeScript type checking
echo "✅ Running TypeScript type check..."
npm run typecheck

# Run linting
echo "✅ Running linter..."
npm run lint

# Run a production build
echo "✅ Testing production build..."
npm run build

echo "🚀 All checks passed! Ready to deploy."