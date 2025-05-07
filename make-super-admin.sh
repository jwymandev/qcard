#!/bin/bash

# Script to promote a user to super admin role
# This is a user-friendly wrapper around the make-user-super-admin.js script

# Ensure an email was provided
if [ -z "$1" ]; then
  echo "❌ Error: Email address is required"
  echo "Usage: ./make-super-admin.sh <user-email>"
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
  if [ -n "$DB_HOST" ] && [ -n "$DB_USER" ] && [ -n "$DB_PASSWORD" ] && [ -n "$DB_NAME" ]; then
    echo "🔧 Building connection string from environment variables..."
    
    # Default port to 25060 if not specified (standard DigitalOcean managed DB port)
    DB_PORT=${DB_PORT:-25060}
    
    # Construct the DATABASE_URL
    export DATABASE_URL="postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}?sslmode=require"
    echo "🔗 Created connection string using: ${DB_HOST}:${DB_PORT} (Username: ${DB_USER}, Database: ${DB_NAME})"
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
  echo "Required variables: DB_HOST, DB_USER, DB_PASSWORD, DB_NAME, DB_PORT (optional)"
  exit 1
fi

# Run the script to make the user a super admin
echo "👑 Promoting user to SUPER_ADMIN role..."
node scripts/make-user-super-admin.js "$EMAIL"

if [ $? -eq 0 ]; then
  echo "✅ User $EMAIL has been successfully promoted to SUPER_ADMIN"
else
  echo "❌ Failed to promote user $EMAIL to SUPER_ADMIN"
  exit 1
fi