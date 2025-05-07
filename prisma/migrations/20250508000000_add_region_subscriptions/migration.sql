-- CreateTable
CREATE TABLE "Region" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Region_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProfileRegion" (
    "profileId" TEXT NOT NULL,
    "regionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProfileRegion_pkey" PRIMARY KEY ("profileId","regionId")
);

-- CreateTable
CREATE TABLE "StudioRegion" (
    "studioId" TEXT NOT NULL,
    "regionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StudioRegion_pkey" PRIMARY KEY ("studioId","regionId")
);

-- CreateTable
CREATE TABLE "RegionSubscriptionPlan" (
    "id" TEXT NOT NULL,
    "regionId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price" DOUBLE PRECISION NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "stripePriceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RegionSubscriptionPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MultiRegionDiscount" (
    "id" TEXT NOT NULL,
    "regionCount" INTEGER NOT NULL,
    "discountPercentage" DOUBLE PRECISION NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MultiRegionDiscount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserRegionSubscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "regionPlanId" TEXT NOT NULL,
    "mainSubscriptionId" TEXT NOT NULL,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "stripeItemId" TEXT,
    "currentPeriodStart" TIMESTAMP(3) NOT NULL,
    "currentPeriodEnd" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserRegionSubscription_pkey" PRIMARY KEY ("id")
);

-- AddColumn
ALTER TABLE "Location" ADD COLUMN "regionId" TEXT;

-- AddColumn
ALTER TABLE "Subscription" ADD COLUMN "multiRegionDiscount" DOUBLE PRECISION;

-- CreateIndex
CREATE UNIQUE INDEX "Region_name_key" ON "Region"("name");

-- CreateIndex
CREATE UNIQUE INDEX "UserRegionSubscription_userId_regionPlanId_key" ON "UserRegionSubscription"("userId", "regionPlanId");

-- AddForeignKey
ALTER TABLE "Location" ADD CONSTRAINT "Location_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES "Region"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfileRegion" ADD CONSTRAINT "ProfileRegion_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfileRegion" ADD CONSTRAINT "ProfileRegion_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES "Region"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudioRegion" ADD CONSTRAINT "StudioRegion_studioId_fkey" FOREIGN KEY ("studioId") REFERENCES "Studio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudioRegion" ADD CONSTRAINT "StudioRegion_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES "Region"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegionSubscriptionPlan" ADD CONSTRAINT "RegionSubscriptionPlan_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES "Region"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserRegionSubscription" ADD CONSTRAINT "UserRegionSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserRegionSubscription" ADD CONSTRAINT "UserRegionSubscription_regionPlanId_fkey" FOREIGN KEY ("regionPlanId") REFERENCES "RegionSubscriptionPlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserRegionSubscription" ADD CONSTRAINT "UserRegionSubscription_mainSubscriptionId_fkey" FOREIGN KEY ("mainSubscriptionId") REFERENCES "Subscription"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Insert initial regions
INSERT INTO "Region" (id, name, description, "createdAt", "updatedAt")
VALUES 
  (gen_random_uuid(), 'West Coast', 'California, Oregon, Washington, etc.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'Southwest', 'Arizona, New Mexico, Nevada, etc.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'Mountain West', 'Colorado, Utah, Wyoming, etc.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'Midwest', 'Illinois, Michigan, Ohio, etc.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'Southeast', 'Georgia, Florida, North Carolina, etc.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'Northeast', 'New York, Massachusetts, etc.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Insert multi-region discount tiers
INSERT INTO "MultiRegionDiscount" (id, "regionCount", "discountPercentage", active, "createdAt", "updatedAt")
VALUES 
  (gen_random_uuid(), 2, 10.0, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 3, 15.0, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 4, 20.0, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 5, 25.0, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 6, 30.0, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Insert default subscription plans for each region
DO $$
DECLARE
  region_id TEXT;
  region_name TEXT;
BEGIN
  FOR region_id, region_name IN
    SELECT id, name FROM "Region"
  LOOP
    INSERT INTO "RegionSubscriptionPlan" (id, "regionId", name, description, price, "isActive", "createdAt", "updatedAt")
    VALUES
      (gen_random_uuid(), region_id, region_name || ' Basic', 'Basic access to ' || region_name || ' casting calls', 19.99, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
  END LOOP;
END $$;