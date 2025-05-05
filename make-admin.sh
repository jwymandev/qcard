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

# Automatically connect using DATABASE_URL from environment
if [ -f .env.do ]; then
  echo "🌐 Loading DigitalOcean environment..."
  set -o allexport
  source .env.do
  set +o allexport
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

# Run the script to make the user an admin
echo "👑 Promoting user to ADMIN role..."
node scripts/make-user-admin.js "$EMAIL"

if [ $? -eq 0 ]; then
  echo "✅ User $EMAIL has been successfully promoted to ADMIN"
else
  echo "❌ Failed to promote user $EMAIL to ADMIN"
  exit 1
fi