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
END
$$;

-- Create ProfileField table if it doesn't exist
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

-- Create FieldOption table if it doesn't exist
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

-- Create ProfileFieldValue table if it doesn't exist
CREATE TABLE IF NOT EXISTS "ProfileFieldValue" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "fieldId" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProfileFieldValue_pkey" PRIMARY KEY ("id")
);

-- Create StudioFieldValue table if it doesn't exist
CREATE TABLE IF NOT EXISTS "StudioFieldValue" (
    "id" TEXT NOT NULL,
    "studioId" TEXT NOT NULL,
    "fieldId" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudioFieldValue_pkey" PRIMARY KEY ("id")
);

-- Create Questionnaire table if it doesn't exist
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

-- Create QuestionnaireQuestion table if it doesn't exist
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

-- Create QuestionnaireInvitation table if it doesn't exist
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

-- Create QuestionnaireResponse table if it doesn't exist
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

-- Create QuestionAnswer table if it doesn't exist
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

-- Create unique constraints
CREATE UNIQUE INDEX "ProfileFieldValue_profileId_fieldId_key" ON "ProfileFieldValue"("profileId", "fieldId");
CREATE UNIQUE INDEX "StudioFieldValue_studioId_fieldId_key" ON "StudioFieldValue"("studioId", "fieldId");
CREATE UNIQUE INDEX "QuestionnaireInvitation_questionnaireId_profileId_key" ON "QuestionnaireInvitation"("questionnaireId", "profileId");
CREATE UNIQUE INDEX "QuestionnaireResponse_invitationId_key" ON "QuestionnaireResponse"("invitationId");
CREATE UNIQUE INDEX "QuestionAnswer_responseId_questionId_key" ON "QuestionAnswer"("responseId", "questionId");

-- Add foreign key constraints
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