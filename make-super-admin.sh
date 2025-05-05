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

# Run the script to make the user a super admin
echo "👑 Promoting user to SUPER_ADMIN role..."
node scripts/make-user-super-admin.js "$EMAIL"

if [ $? -eq 0 ]; then
  echo "✅ User $EMAIL has been successfully promoted to SUPER_ADMIN"
else
  echo "❌ Failed to promote user $EMAIL to SUPER_ADMIN"
  exit 1
fi