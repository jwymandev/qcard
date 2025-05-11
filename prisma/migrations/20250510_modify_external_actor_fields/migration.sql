-- Drop existing unique constraint
DROP INDEX IF EXISTS "ExternalActor_email_studioId_key";

-- Modify ExternalActor table to make email optional and firstName/lastName required
ALTER TABLE "ExternalActor" ALTER COLUMN "email" DROP NOT NULL;
ALTER TABLE "ExternalActor" ALTER COLUMN "firstName" SET NOT NULL;
ALTER TABLE "ExternalActor" ALTER COLUMN "lastName" SET NOT NULL;

-- Add new named unique constraint that handles null emails
CREATE UNIQUE INDEX "unique_email_per_studio" ON "ExternalActor"("email", "studioId") WHERE "email" IS NOT NULL;

-- Create index for looking up external actors by name
CREATE INDEX "idx_external_actor_name" ON "ExternalActor"("studioId", "firstName", "lastName");