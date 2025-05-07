#!/bin/bash

# Script to promote a user to admin role
# This is a user-friendly wrapper around the make-user-admin.js script

# Ensure an email was provided
if [ -z "$1" ]; then
  echo "❌ Error: Email address is required"
  echo "Usage: ./make-admin.sh <user-email>"
  exit 1
fi

EMAIL="$1"

# Load environment variables
if [ -f .env.do ]; then
  echo "🌐 Loading DigitalOcean environment..."
  set -o allexport
  source .env.do
  set +o allexport
  
  # Build DATABASE_URL from individual parameters if they exist
  if [ -n "$DATABASE_HOST" ] && [ -n "$DATABASE_USERNAME" ] && [ -n "$DATABASE_PASSWORD" ] && [ -n "$DATABASE_NAME" ]; then
    echo "🔧 Building connection string from environment variables..."
    
    # Default port to 25060 if not specified (standard DigitalOcean managed DB port)
    DATABASE_PORT=${DATABASE_PORT:-25060}
    
    # Construct the DATABASE_URL
    export DATABASE_URL="postgresql://${DATABASE_USERNAME}:${DATABASE_PASSWORD}@${DATABASE_HOST}:${DATABASE_PORT}/${DATABASE_NAME}?sslmode=require"
    echo "🔗 Created connection string using: ${DATABASE_HOST}:${DATABASE_PORT} (Username: ${DATABASE_USERNAME}, Database: ${DATABASE_NAME})"
  else
    echo "⚠️ Some database environment variables are missing. Will try using DATABASE_URL directly."
  fi
  
elif [ -f .env.production ]; then
  echo "🌐 Loading production environment..."
  set -o allexport
  source .env.production
  set +o allexport
elif [ -f .env ]; then
  echo "💻 Loading local environment..."
  set -o allexport
  source .env
  set +o allexport
fi

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
  echo "❌ Error: DATABASE_URL is not set"
  echo "Please provide database connection details in your environment file."
  echo "Required variables: DATABASE_HOST, DATABASE_USERNAME, DATABASE_PASSWORD, DATABASE_NAME, DATABASE_PORT (optional)"
  exit 1
fi

# Run the script to make the user an admin
echo "👑 Promoting user to ADMIN role..."
node scripts/make-user-admin.js "$EMAIL"

if [ $? -eq 0 ]; then
  echo "✅ User $EMAIL has been successfully promoted to ADMIN"
else
  echo "❌ Failed to promote user $EMAIL to ADMIN"
  exit 1
fi