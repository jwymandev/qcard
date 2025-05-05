-- Add missing indices
CREATE INDEX IF NOT EXISTS "Location_regionId_idx" ON "Location"("regionId");
CREATE INDEX IF NOT EXISTS "CastingCall_regionId_idx" ON "CastingCall"("regionId");

-- Ensure relations
ALTER TABLE "Location" 
DROP CONSTRAINT IF EXISTS "Location_regionId_fkey",
ADD CONSTRAINT "Location_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES "Region"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "CastingCall" 
DROP CONSTRAINT IF EXISTS "CastingCall_regionId_fkey",
ADD CONSTRAINT "CastingCall_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES "Region"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Ensure junction tables are properly set up
CREATE TABLE IF NOT EXISTS "ProfileRegion" (
  "profileId" TEXT NOT NULL,
  "regionId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("profileId", "regionId")
);

CREATE TABLE IF NOT EXISTS "StudioRegion" (
  "studioId" TEXT NOT NULL,
  "regionId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("studioId", "regionId")
);

-- Ensure foreign keys on junction tables
ALTER TABLE "ProfileRegion" 
DROP CONSTRAINT IF EXISTS "ProfileRegion_profileId_fkey",
ADD CONSTRAINT "ProfileRegion_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ProfileRegion" 
DROP CONSTRAINT IF EXISTS "ProfileRegion_regionId_fkey",
ADD CONSTRAINT "ProfileRegion_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES "Region"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "StudioRegion" 
DROP CONSTRAINT IF EXISTS "StudioRegion_studioId_fkey",
ADD CONSTRAINT "StudioRegion_studioId_fkey" FOREIGN KEY ("studioId") REFERENCES "Studio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "StudioRegion" 
DROP CONSTRAINT IF EXISTS "StudioRegion_regionId_fkey",
ADD CONSTRAINT "StudioRegion_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES "Region"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Create indices on junction tables if they don't exist
CREATE INDEX IF NOT EXISTS "ProfileRegion_profileId_idx" ON "ProfileRegion"("profileId");
CREATE INDEX IF NOT EXISTS "ProfileRegion_regionId_idx" ON "ProfileRegion"("regionId");
CREATE INDEX IF NOT EXISTS "StudioRegion_studioId_idx" ON "StudioRegion"("studioId");
CREATE INDEX IF NOT EXISTS "StudioRegion_regionId_idx" ON "StudioRegion"("regionId");