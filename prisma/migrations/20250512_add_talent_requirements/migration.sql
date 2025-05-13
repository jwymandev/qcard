-- Create talent requirements table
CREATE TABLE "TalentRequirement" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "gender" TEXT,
  "minAge" TEXT,
  "maxAge" TEXT,
  "ethnicity" TEXT,
  "height" TEXT,
  "skills" TEXT,
  "otherRequirements" TEXT,
  "survey" JSONB,
  "projectId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TalentRequirement_pkey" PRIMARY KEY ("id")
);

-- Add foreign key constraint to Project
ALTER TABLE "TalentRequirement" ADD CONSTRAINT "TalentRequirement_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Add dateOfBirth to Profile for age calculation
ALTER TABLE "Profile" ADD COLUMN IF NOT EXISTS "dateOfBirth" TIMESTAMP(3);

-- Create indices for better query performance
CREATE INDEX "TalentRequirement_projectId_idx" ON "TalentRequirement"("projectId");
CREATE INDEX "TalentRequirement_isActive_idx" ON "TalentRequirement"("isActive");