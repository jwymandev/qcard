-- Add custom survey fields to CastingCode model
ALTER TABLE "CastingCode" ADD COLUMN "surveyFields" JSONB;

-- Create new table for survey responses
CREATE TABLE "CastingSubmissionSurvey" (
  "id" TEXT NOT NULL,
  "submissionId" TEXT NOT NULL,
  "responses" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "CastingSubmissionSurvey_pkey" PRIMARY KEY ("id")
);

-- Add foreign key to CastingSubmission
ALTER TABLE "CastingSubmissionSurvey" ADD CONSTRAINT "CastingSubmissionSurvey_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "CastingSubmission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Add unique constraint to ensure one survey per submission
CREATE UNIQUE INDEX "CastingSubmissionSurvey_submissionId_key" ON "CastingSubmissionSurvey"("submissionId");