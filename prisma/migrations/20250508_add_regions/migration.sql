-- CreateTable
CREATE TABLE "Region" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  PRIMARY KEY ("id")
);

-- Add region to Location
ALTER TABLE "Location" ADD COLUMN "regionId" TEXT;

-- Add region to CastingCall
ALTER TABLE "CastingCall" ADD COLUMN "regionId" TEXT;

-- Add region relationship to Location
ALTER TABLE "Location" ADD CONSTRAINT "Location_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES "Region"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Add region relationship to CastingCall
ALTER TABLE "CastingCall" ADD CONSTRAINT "CastingCall_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES "Region"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Create ProfileRegion junction table for many-to-many relationship
CREATE TABLE "ProfileRegion" (
  "profileId" TEXT NOT NULL,
  "regionId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("profileId", "regionId")
);

-- Create StudioRegion junction table for many-to-many relationship
CREATE TABLE "StudioRegion" (
  "studioId" TEXT NOT NULL,
  "regionId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("studioId", "regionId")
);

-- Add foreign keys to ProfileRegion
ALTER TABLE "ProfileRegion" ADD CONSTRAINT "ProfileRegion_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProfileRegion" ADD CONSTRAINT "ProfileRegion_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES "Region"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Add foreign keys to StudioRegion
ALTER TABLE "StudioRegion" ADD CONSTRAINT "StudioRegion_studioId_fkey" FOREIGN KEY ("studioId") REFERENCES "Studio"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StudioRegion" ADD CONSTRAINT "StudioRegion_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES "Region"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Create indexes
CREATE INDEX "Location_regionId_idx" ON "Location"("regionId");
CREATE INDEX "CastingCall_regionId_idx" ON "CastingCall"("regionId");
CREATE INDEX "ProfileRegion_profileId_idx" ON "ProfileRegion"("profileId");
CREATE INDEX "ProfileRegion_regionId_idx" ON "ProfileRegion"("regionId");
CREATE INDEX "StudioRegion_studioId_idx" ON "StudioRegion"("studioId");
CREATE INDEX "StudioRegion_regionId_idx" ON "StudioRegion"("regionId");

-- Insert some default regions
INSERT INTO "Region" ("id", "name", "description", "createdAt", "updatedAt") VALUES
('reg-1', 'North America', 'United States, Canada, and Mexico', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('reg-2', 'Europe', 'European countries including UK', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('reg-3', 'Asia Pacific', 'East Asia, Southeast Asia, and Oceania', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('reg-4', 'Latin America', 'Central and South America', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('reg-5', 'Middle East & Africa', 'Middle East and African countries', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);