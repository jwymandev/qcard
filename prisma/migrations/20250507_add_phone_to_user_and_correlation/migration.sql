-- Add phone field to User model
ALTER TABLE "User" ADD COLUMN "phoneNumber" TEXT;

-- Add index on ExternalActor.phoneNumber to improve correlation queries
CREATE INDEX "ExternalActor_phoneNumber_idx" ON "ExternalActor"("phoneNumber");