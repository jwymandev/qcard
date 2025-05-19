-- AlterTable to add new filterable columns to CastingCall table
ALTER TABLE "CastingCall" ADD COLUMN "compensationType" TEXT NOT NULL DEFAULT 'UNSPECIFIED';
ALTER TABLE "CastingCall" ADD COLUMN "experienceLevel" TEXT NOT NULL DEFAULT 'ANY';
ALTER TABLE "CastingCall" ADD COLUMN "ageRange" TEXT;
ALTER TABLE "CastingCall" ADD COLUMN "gender" TEXT NOT NULL DEFAULT 'ANY';
ALTER TABLE "CastingCall" ADD COLUMN "roleType" TEXT NOT NULL DEFAULT 'UNSPECIFIED';

-- Add index on compensationType for faster filtering
CREATE INDEX "CastingCall_compensationType_idx" ON "CastingCall"("compensationType");

-- Add index on roleType for faster filtering
CREATE INDEX "CastingCall_roleType_idx" ON "CastingCall"("roleType");

-- Add index on experienceLevel for faster filtering
CREATE INDEX "CastingCall_experienceLevel_idx" ON "CastingCall"("experienceLevel");

-- Add index on gender for faster filtering
CREATE INDEX "CastingCall_gender_idx" ON "CastingCall"("gender");