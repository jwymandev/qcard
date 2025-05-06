-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'PAST_DUE', 'CANCELED', 'INCOMPLETE', 'INCOMPLETE_EXPIRED', 'TRIALING', 'UNPAID');

-- CreateTable
CREATE TABLE "SubscriptionPlan" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price" DOUBLE PRECISION NOT NULL,
    "interval" TEXT NOT NULL DEFAULT 'month',
    "features" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "stripePriceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SubscriptionPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "studioId" TEXT,
    "planId" TEXT NOT NULL,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "stripeCustomerId" TEXT,
    "stripeSubscriptionId" TEXT,
    "currentPeriodStart" TIMESTAMP(3) NOT NULL,
    "currentPeriodEnd" TIMESTAMP(3) NOT NULL,
    "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
    "canceledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubscriptionFeature" (
    "id" TEXT NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "featureKey" TEXT NOT NULL,
    "featureValue" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SubscriptionFeature_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeatureFlag" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "defaultValue" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FeatureFlag_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FeatureFlag_key_key" ON "FeatureFlag"("key");

-- CreateIndex
CREATE UNIQUE INDEX "SubscriptionFeature_subscriptionId_featureKey_key" ON "SubscriptionFeature"("subscriptionId", "featureKey");

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_studioId_fkey" FOREIGN KEY ("studioId") REFERENCES "Studio"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_planId_fkey" FOREIGN KEY ("planId") REFERENCES "SubscriptionPlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubscriptionFeature" ADD CONSTRAINT "SubscriptionFeature_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "Subscription"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Insert default subscription plans
INSERT INTO "SubscriptionPlan" ("id", "name", "description", "price", "interval", "features", "isActive", "createdAt", "updatedAt")
VALUES 
  ('plan_basic', 'Basic', 'Access to one location', 19.99, 'month', '["basic_messaging", "max_locations_1", "subscribed"]', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('plan_pro', 'Professional', 'Access to all locations and premium features', 39.99, 'month', '["unlimited_messaging", "advanced_search", "questionnaires", "max_locations_5", "subscribed"]', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('plan_business', 'Business', 'Everything in Pro plus enterprise features', 99.99, 'month', '["unlimited_messaging", "advanced_search", "questionnaires", "unlimited_locations", "custom_branding", "external_actors", "priority_support", "subscribed"]', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Insert default feature flags
INSERT INTO "FeatureFlag" ("id", "key", "name", "description", "defaultValue", "createdAt", "updatedAt")
VALUES
  ('flag_adv_search', 'advanced_search', 'Advanced Talent Search', 'Access to advanced search filters and talent matching', false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('flag_quest', 'questionnaires', 'Custom Questionnaires', 'Create and manage custom questionnaires for talents', false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('flag_unlimited_msg', 'unlimited_messaging', 'Unlimited Messaging', 'Send unlimited messages to talents', false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('flag_ext_actors', 'external_actors', 'External Actor Management', 'Manage actors that are not yet on the platform', false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('flag_casting_calls', 'casting_calls', 'Casting Calls', 'Create and manage casting calls', false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('flag_custom_brand', 'custom_branding', 'Custom Branding', 'Customize branding for your studio', false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('flag_multi_proj', 'multiple_projects', 'Multiple Projects', 'Manage multiple projects simultaneously', false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('flag_subscribed', 'subscribed', 'Active Subscription', 'User has an active subscription', false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);