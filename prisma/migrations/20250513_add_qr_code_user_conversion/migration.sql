-- Add convertedUserId column to CastingSubmission
ALTER TABLE "CastingSubmission" ADD COLUMN "convertedUserId" TEXT;

-- Add convertedToUserId column to ExternalActor
ALTER TABLE "ExternalActor" ADD COLUMN "convertedToUserId" TEXT;

-- Add foreign key constraints
ALTER TABLE "CastingSubmission" ADD CONSTRAINT "CastingSubmission_convertedUserId_fkey" FOREIGN KEY ("convertedUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ExternalActor" ADD CONSTRAINT "ExternalActor_convertedToUserId_fkey" FOREIGN KEY ("convertedToUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Create indexes for better query performance
CREATE INDEX "CastingSubmission_convertedUserId_idx" ON "CastingSubmission"("convertedUserId");
CREATE INDEX "ExternalActor_convertedToUserId_idx" ON "ExternalActor"("convertedToUserId");