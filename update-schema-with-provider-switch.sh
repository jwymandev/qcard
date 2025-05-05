#!/bin/bash

# Script to update schema with provider switch from SQLite to PostgreSQL
set -e

echo "📋 DigitalOcean: Updating schema with provider switch from SQLite to PostgreSQL"

# 1. Check if we have the updated schema
if [ ! -f ./prisma/schema.prisma.new ]; then
  echo "❌ Error: schema.prisma.new not found"
  exit 1
fi

# 2. Backup current schema
echo "📑 Creating backup of current schema..."
cp ./prisma/schema.prisma ./prisma/schema.prisma.backup

# 3. Update schema with new models
echo "📝 Updating schema with questionnaire models..."
cp ./prisma/schema.prisma.new ./prisma/schema.prisma

# 4. Set up database connection - DigitalOcean method
echo "🔍 Setting up database connection for DigitalOcean..."

# Source connection parameters from .env files
if [ -f .env.do ]; then
  echo "🌐 Loading DigitalOcean environment variables from .env.do"
  set -o allexport
  source .env.do
  set +o allexport
elif [ -f .env.production ]; then
  echo "🌐 Loading production environment variables from .env.production"
  set -o allexport
  source .env.production
  set +o allexport
elif [ -f .env ]; then
  echo "💻 Loading local environment variables from .env"
  set -o allexport
  source .env
  set +o allexport
fi

# Check if we have individual connection parameters
DB_CONNECTION_READY=false

# Case 1: Using individual connection parameters
if [ -n "$DATABASE_HOST" ] && [ -n "$DATABASE_USERNAME" ]; then
  # Set defaults for optional parameters
  DB_PORT=${DATABASE_PORT:-25060}
  DB_NAME=${DATABASE_NAME:-defaultdb}
  
  if [ -z "$DATABASE_PASSWORD" ]; then
    echo "❌ Error: DATABASE_PASSWORD is required when using individual connection parameters"
    exit 1
  fi
  
  # Encode password for URL using built-in tools
  # Replace special characters with URL-encoded versions
  ENCODED_PASSWORD=$(echo -n "$DATABASE_PASSWORD" | 
    sed -e 's/%/%25/g' \
        -e 's/ /%20/g' \
        -e 's/!/%21/g' \
        -e 's/"/%22/g' \
        -e "s/'/%27/g" \
        -e 's/#/%23/g' \
        -e 's/(/%28/g' \
        -e 's/)/%29/g' \
        -e 's/\*/%2A/g' \
        -e 's/+/%2B/g' \
        -e 's/,/%2C/g' \
        -e 's/\//%2F/g' \
        -e 's/:/%3A/g' \
        -e 's/;/%3B/g' \
        -e 's/=/%3D/g' \
        -e 's/?/%3F/g' \
        -e 's/@/%40/g' \
        -e 's/\[/%5B/g' \
        -e 's/\]/%5D/g' \
        -e 's/\^/%5E/g' \
        -e 's/{/%7B/g' \
        -e 's/|/%7C/g' \
        -e 's/}/%7D/g')
  
  # Construct PostgreSQL URL
  export DATABASE_URL="postgresql://${DATABASE_USERNAME}:${ENCODED_PASSWORD}@${DATABASE_HOST}:${DB_PORT}/${DB_NAME}?sslmode=require"
  
  echo "✅ Constructed database URL from individual parameters"
  echo "🔌 Using database host: ${DATABASE_HOST}"
  DB_CONNECTION_READY=true
  
# Case 2: Using DATABASE_URL directly
elif [ -n "$DATABASE_URL" ]; then
  if [[ "$DATABASE_URL" == postgresql://* || "$DATABASE_URL" == postgres://* ]]; then
    # Get the hostname from the URL for display purposes
    DB_HOST=$(echo $DATABASE_URL | sed -E 's/^postgresql:\/\/[^:]+:[^@]+@([^:]+):.*/\1/')
    echo "🔌 Using existing PostgreSQL DATABASE_URL with host: $DB_HOST"
    DB_CONNECTION_READY=true
  else
    echo "⚠️ DATABASE_URL is not a PostgreSQL URL. For a DigitalOcean deployment, PostgreSQL is required."
    echo "   Current DATABASE_URL: ${DATABASE_URL}"
  fi
fi

# Fail if we couldn't setup a proper connection
if [ "$DB_CONNECTION_READY" != true ]; then
  echo "❌ Error: Could not configure database connection."
  echo "Please set either:"
  echo "  - Individual connection parameters (DATABASE_HOST, DATABASE_USERNAME, DATABASE_PASSWORD, etc.)"
  echo "  - A valid PostgreSQL DATABASE_URL"
  exit 1
fi

# 5. Reset migration history for provider switch
echo "🧹 Resetting migration history due to provider switch (SQLite to PostgreSQL)..."
echo "   This is required when switching database providers"

# Remove migration directory
if [ -d ./prisma/migrations ]; then
  echo "🗑️ Removing existing migration history..."
  rm -rf ./prisma/migrations
  mkdir -p ./prisma/migrations
fi

# 6. Create directory for initial migration 
echo "📁 Creating directory for initial PostgreSQL migration..."
mkdir -p ./prisma/migrations/initial_postgresql

# 7. Create SQL file with the complete schema
echo "📄 Creating initial migration SQL file..."
cat > ./prisma/migrations/initial_postgresql/migration.sql << 'EOF'
-- Initial PostgreSQL migration created for provider switch

-- Check if enums already exist and create if not
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'fieldtype') THEN
        CREATE TYPE "FieldType" AS ENUM ('TEXT', 'TEXTAREA', 'NUMBER', 'DROPDOWN', 'BOOLEAN', 'DATE', 'EMAIL', 'URL', 'PHONE');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'profiletype') THEN
        CREATE TYPE "ProfileType" AS ENUM ('TALENT', 'STUDIO', 'BOTH');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'questiontype') THEN
        CREATE TYPE "QuestionType" AS ENUM ('SHORT_TEXT', 'LONG_TEXT', 'SINGLE_CHOICE', 'MULTIPLE_CHOICE', 'RATING', 'DATE', 'FILE_UPLOAD', 'YES_NO');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'userrole') THEN
        CREATE TYPE "UserRole" AS ENUM ('USER', 'ADMIN', 'SUPER_ADMIN');
    END IF;
END
$$;

-- Create tables for the core schema
CREATE TABLE IF NOT EXISTS "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT,
    "firstName" TEXT,
    "lastName" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'USER',
    "tenantId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

CREATE TABLE IF NOT EXISTS "Tenant" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Studio" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "tenantId" TEXT NOT NULL,
    "contactName" TEXT,
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "website" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Studio_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Profile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "headshotUrl" TEXT,
    "bio" TEXT,
    "height" TEXT,
    "weight" TEXT,
    "hairColor" TEXT,
    "eyeColor" TEXT,
    "availability" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "ethnicity" TEXT,
    "experience" TEXT,
    "gender" TEXT,
    "languages" TEXT,

    CONSTRAINT "Profile_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ProfileImage" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "profileId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProfileImage_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "StudioNote" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "studioId" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudioNote_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Project" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'PLANNING',
    "studioId" TEXT NOT NULL,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ProjectMember" (
    "id" TEXT NOT NULL,
    "role" TEXT,
    "notes" TEXT,
    "projectId" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectMember_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Scene" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "locationId" TEXT,
    "shootDate" TIMESTAMP(3),
    "duration" INTEGER,
    "talentNeeded" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'PLANNING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Scene_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "SceneTalent" (
    "id" TEXT NOT NULL,
    "sceneId" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "role" TEXT,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'CONFIRMED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SceneTalent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Location" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Location_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Payment" (
    "id" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'usd',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "studioId" TEXT,
    "userId" TEXT,
    "stripeId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Message" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "subject" TEXT NOT NULL DEFAULT 'New Message',
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "studioSenderId" TEXT,
    "talentReceiverId" TEXT,
    "talentSenderId" TEXT,
    "studioReceiverId" TEXT,
    "relatedToProjectId" TEXT,
    "relatedToCastingCallId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "CastingCall" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "requirements" TEXT,
    "compensation" TEXT,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "studioId" TEXT NOT NULL,
    "locationId" TEXT,
    "projectId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CastingCall_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Application" (
    "id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "message" TEXT,
    "profileId" TEXT NOT NULL,
    "castingCallId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Application_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Skill" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Skill_pkey" PRIMARY KEY ("id")
);

-- Create tables for the questionnaire models
CREATE TABLE IF NOT EXISTS "ProfileField" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "type" "FieldType" NOT NULL,
    "profileType" "ProfileType" NOT NULL,
    "isRequired" BOOLEAN NOT NULL DEFAULT false,
    "isVisible" BOOLEAN NOT NULL DEFAULT true,
    "defaultValue" TEXT,
    "placeholder" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "groupName" TEXT,
    "validationRules" TEXT,

    CONSTRAINT "ProfileField_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "FieldOption" (
    "id" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "color" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "fieldId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FieldOption_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ProfileFieldValue" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "fieldId" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProfileFieldValue_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "StudioFieldValue" (
    "id" TEXT NOT NULL,
    "studioId" TEXT NOT NULL,
    "fieldId" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudioFieldValue_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Questionnaire" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "studioId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "requiresApproval" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Questionnaire_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "QuestionnaireQuestion" (
    "id" TEXT NOT NULL,
    "questionnaireId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "description" TEXT,
    "type" "QuestionType" NOT NULL,
    "isRequired" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL,
    "options" JSONB,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuestionnaireQuestion_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "QuestionnaireInvitation" (
    "id" TEXT NOT NULL,
    "questionnaireId" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "message" TEXT,

    CONSTRAINT "QuestionnaireInvitation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "QuestionnaireResponse" (
    "id" TEXT NOT NULL,
    "invitationId" TEXT NOT NULL,
    "questionnaireId" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'SUBMITTED',
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),
    "reviewNotes" TEXT,

    CONSTRAINT "QuestionnaireResponse_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "QuestionAnswer" (
    "id" TEXT NOT NULL,
    "responseId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "textValue" TEXT,
    "choiceValues" JSONB,
    "fileUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuestionAnswer_pkey" PRIMARY KEY ("id")
);

-- Create join tables for many-to-many relationships
CREATE TABLE IF NOT EXISTS "_LocationToProfile" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS "_LocationToStudio" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS "_CastingCallToSkill" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS "_ProfileToSkill" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- Create unique indexes
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "User_tenantId_key" ON "User"("tenantId");
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");
CREATE UNIQUE INDEX "Studio_tenantId_key" ON "Studio"("tenantId");
CREATE UNIQUE INDEX "Profile_userId_key" ON "Profile"("userId");
CREATE UNIQUE INDEX "Skill_name_key" ON "Skill"("name");
CREATE UNIQUE INDEX "Payment_stripeId_key" ON "Payment"("stripeId");

CREATE UNIQUE INDEX "ProfileFieldValue_profileId_fieldId_key" ON "ProfileFieldValue"("profileId", "fieldId");
CREATE UNIQUE INDEX "StudioFieldValue_studioId_fieldId_key" ON "StudioFieldValue"("studioId", "fieldId");
CREATE UNIQUE INDEX "QuestionnaireInvitation_questionnaireId_profileId_key" ON "QuestionnaireInvitation"("questionnaireId", "profileId");
CREATE UNIQUE INDEX "QuestionnaireResponse_invitationId_key" ON "QuestionnaireResponse"("invitationId");
CREATE UNIQUE INDEX "QuestionAnswer_responseId_questionId_key" ON "QuestionAnswer"("responseId", "questionId");

-- Create indexes for join tables
CREATE UNIQUE INDEX "_LocationToProfile_AB_unique" ON "_LocationToProfile"("A", "B");
CREATE INDEX "_LocationToProfile_B_index" ON "_LocationToProfile"("B");
CREATE UNIQUE INDEX "_LocationToStudio_AB_unique" ON "_LocationToStudio"("A", "B");
CREATE INDEX "_LocationToStudio_B_index" ON "_LocationToStudio"("B");
CREATE UNIQUE INDEX "_CastingCallToSkill_AB_unique" ON "_CastingCallToSkill"("A", "B");
CREATE INDEX "_CastingCallToSkill_B_index" ON "_CastingCallToSkill"("B");
CREATE UNIQUE INDEX "_ProfileToSkill_AB_unique" ON "_ProfileToSkill"("A", "B");
CREATE INDEX "_ProfileToSkill_B_index" ON "_ProfileToSkill"("B");

-- Add foreign key constraints
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "User" ADD CONSTRAINT "User_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON UPDATE CASCADE;
ALTER TABLE "Studio" ADD CONSTRAINT "Studio_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON UPDATE CASCADE;
ALTER TABLE "Profile" ADD CONSTRAINT "Profile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProfileImage" ADD CONSTRAINT "ProfileImage_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StudioNote" ADD CONSTRAINT "StudioNote_studioId_fkey" FOREIGN KEY ("studioId") REFERENCES "Studio"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StudioNote" ADD CONSTRAINT "StudioNote_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Project" ADD CONSTRAINT "Project_studioId_fkey" FOREIGN KEY ("studioId") REFERENCES "Studio"("id") ON UPDATE CASCADE;
ALTER TABLE "ProjectMember" ADD CONSTRAINT "ProjectMember_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON UPDATE CASCADE;
ALTER TABLE "ProjectMember" ADD CONSTRAINT "ProjectMember_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON UPDATE CASCADE;
ALTER TABLE "Scene" ADD CONSTRAINT "Scene_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON UPDATE CASCADE;
ALTER TABLE "Scene" ADD CONSTRAINT "Scene_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON UPDATE CASCADE;
ALTER TABLE "SceneTalent" ADD CONSTRAINT "SceneTalent_sceneId_fkey" FOREIGN KEY ("sceneId") REFERENCES "Scene"("id") ON UPDATE CASCADE;
ALTER TABLE "SceneTalent" ADD CONSTRAINT "SceneTalent_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON UPDATE CASCADE;
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON UPDATE CASCADE;
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_studioId_fkey" FOREIGN KEY ("studioId") REFERENCES "Studio"("id") ON UPDATE CASCADE;
ALTER TABLE "Message" ADD CONSTRAINT "Message_studioSenderId_fkey" FOREIGN KEY ("studioSenderId") REFERENCES "Studio"("id") ON UPDATE SET NULL;
ALTER TABLE "Message" ADD CONSTRAINT "Message_talentReceiverId_fkey" FOREIGN KEY ("talentReceiverId") REFERENCES "Profile"("id") ON UPDATE SET NULL;
ALTER TABLE "Message" ADD CONSTRAINT "Message_talentSenderId_fkey" FOREIGN KEY ("talentSenderId") REFERENCES "Profile"("id") ON UPDATE SET NULL;
ALTER TABLE "Message" ADD CONSTRAINT "Message_studioReceiverId_fkey" FOREIGN KEY ("studioReceiverId") REFERENCES "Studio"("id") ON UPDATE SET NULL;
ALTER TABLE "CastingCall" ADD CONSTRAINT "CastingCall_studioId_fkey" FOREIGN KEY ("studioId") REFERENCES "Studio"("id") ON UPDATE CASCADE;
ALTER TABLE "CastingCall" ADD CONSTRAINT "CastingCall_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON UPDATE SET NULL;
ALTER TABLE "CastingCall" ADD CONSTRAINT "CastingCall_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON UPDATE SET NULL;
ALTER TABLE "Application" ADD CONSTRAINT "Application_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON UPDATE CASCADE;
ALTER TABLE "Application" ADD CONSTRAINT "Application_castingCallId_fkey" FOREIGN KEY ("castingCallId") REFERENCES "CastingCall"("id") ON UPDATE CASCADE;

-- Add foreign keys for questionnaire models
ALTER TABLE "FieldOption" ADD CONSTRAINT "FieldOption_fieldId_fkey" FOREIGN KEY ("fieldId") REFERENCES "ProfileField"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Questionnaire" ADD CONSTRAINT "Questionnaire_studioId_fkey" FOREIGN KEY ("studioId") REFERENCES "Studio"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "QuestionnaireQuestion" ADD CONSTRAINT "QuestionnaireQuestion_questionnaireId_fkey" FOREIGN KEY ("questionnaireId") REFERENCES "Questionnaire"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "QuestionnaireInvitation" ADD CONSTRAINT "QuestionnaireInvitation_questionnaireId_fkey" FOREIGN KEY ("questionnaireId") REFERENCES "Questionnaire"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "QuestionnaireInvitation" ADD CONSTRAINT "QuestionnaireInvitation_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "QuestionnaireResponse" ADD CONSTRAINT "QuestionnaireResponse_invitationId_fkey" FOREIGN KEY ("invitationId") REFERENCES "QuestionnaireInvitation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "QuestionnaireResponse" ADD CONSTRAINT "QuestionnaireResponse_questionnaireId_fkey" FOREIGN KEY ("questionnaireId") REFERENCES "Questionnaire"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "QuestionnaireResponse" ADD CONSTRAINT "QuestionnaireResponse_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "QuestionAnswer" ADD CONSTRAINT "QuestionAnswer_responseId_fkey" FOREIGN KEY ("responseId") REFERENCES "QuestionnaireResponse"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "QuestionAnswer" ADD CONSTRAINT "QuestionAnswer_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "QuestionnaireQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Add foreign keys for join tables
ALTER TABLE "_LocationToProfile" ADD CONSTRAINT "_LocationToProfile_A_fkey" FOREIGN KEY ("A") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "_LocationToProfile" ADD CONSTRAINT "_LocationToProfile_B_fkey" FOREIGN KEY ("B") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "_LocationToStudio" ADD CONSTRAINT "_LocationToStudio_A_fkey" FOREIGN KEY ("A") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "_LocationToStudio" ADD CONSTRAINT "_LocationToStudio_B_fkey" FOREIGN KEY ("B") REFERENCES "Studio"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "_CastingCallToSkill" ADD CONSTRAINT "_CastingCallToSkill_A_fkey" FOREIGN KEY ("A") REFERENCES "CastingCall"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "_CastingCallToSkill" ADD CONSTRAINT "_CastingCallToSkill_B_fkey" FOREIGN KEY ("B") REFERENCES "Skill"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "_ProfileToSkill" ADD CONSTRAINT "_ProfileToSkill_A_fkey" FOREIGN KEY ("A") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "_ProfileToSkill" ADD CONSTRAINT "_ProfileToSkill_B_fkey" FOREIGN KEY ("B") REFERENCES "Skill"("id") ON DELETE CASCADE ON UPDATE CASCADE;

EOF

# 8. Create migration_lock.toml with the new provider
echo "🔒 Creating new migration_lock.toml with PostgreSQL provider..."
cat > ./prisma/migrations/migration_lock.toml << EOF
# Please do not edit this file manually
# It should be added in your version-control system (i.e. Git)
provider = "postgresql"
EOF

# 9. Apply the migration
echo "🚀 Creating new migration history for PostgreSQL..."
npx prisma migrate resolve --applied initial_postgresql

# 10. Generate updated Prisma client
echo "⚙️ Generating updated Prisma client..."
npx prisma generate

# 11. Verify the client was generated correctly
echo "🔍 Verifying Prisma client generation..."
if [ -d "./node_modules/.prisma/client" ]; then
  echo "✅ Prisma client generated successfully"
else
  echo "⚠️ Prisma client generation may have issues - check for errors"
fi

# 12. Restore temporarily disabled components
echo "🔄 Restoring temporarily disabled components..."

# Restore profile-schema.ts if it was disabled
if [ -f ./src/lib/profile-schema.ts.disabled ]; then
  mv ./src/lib/profile-schema.ts.disabled ./src/lib/profile-schema.ts
fi

# Restore DynamicProfileForm component if it was disabled
if [ -f ./src/components/DynamicProfileForm.tsx.disabled ]; then
  mv ./src/components/DynamicProfileForm.tsx.disabled ./src/components/DynamicProfileForm.tsx
fi

echo "✅ Schema update completed with provider switch from SQLite to PostgreSQL!"
echo "   The migration history has been reset for the new provider."
echo "   You can now deploy the questionnaire feature to DigitalOcean."