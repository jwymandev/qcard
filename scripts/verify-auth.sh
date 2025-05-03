#!/bin/bash
set -e

# Make sure we're in the project root
cd "$(dirname "$0")/.."

echo "Checking NextAuth.js configuration..."

# Verify environment variables
if [ -z "$NEXTAUTH_SECRET" ]; then
  echo "Warning: NEXTAUTH_SECRET environment variable is not set."
  echo "Using default value from .env file"
fi

if [ -z "$NEXTAUTH_URL" ]; then
  echo "Warning: NEXTAUTH_URL environment variable is not set."
  echo "Using default value from .env file"
fi

# Check if the application is running
echo "Checking if the application is running locally..."
if curl -s http://localhost:3000 > /dev/null; then
  echo "Application is running!"
  
  # Check auth setup
  echo "Checking auth setup..."
  curl -s http://localhost:3000/api/auth/setup-check | grep -q "status.*OK" && echo "Auth setup looks good!" || echo "Auth setup may have issues."
  
  # Try to access a protected endpoint
  echo "Testing protected endpoint..."
  curl -s http://localhost:3000/api/auth/session 
else
  echo "Application doesn't appear to be running."
  echo "Please start the application with 'npm run dev' and try again."
fi

echo ""
echo "Auth verification complete."