-- CreateTable
CREATE TABLE "ExternalActor" (
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "firstName" TEXT,
  "lastName" TEXT,
  "phoneNumber" TEXT,
  "notes" TEXT,
  "studioId" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "convertedToTalentAt" TIMESTAMP(3),
  "convertedProfileId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ExternalActor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExternalActorProject" (
  "id" TEXT NOT NULL,
  "externalActorId" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "role" TEXT,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ExternalActorProject_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ExternalActor_email_studioId_key" ON "ExternalActor"("email", "studioId");

-- AddForeignKey
ALTER TABLE "ExternalActor" ADD CONSTRAINT "ExternalActor_studioId_fkey" FOREIGN KEY ("studioId") REFERENCES "Studio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExternalActor" ADD CONSTRAINT "ExternalActor_convertedProfileId_fkey" FOREIGN KEY ("convertedProfileId") REFERENCES "Profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExternalActorProject" ADD CONSTRAINT "ExternalActorProject_externalActorId_fkey" FOREIGN KEY ("externalActorId") REFERENCES "ExternalActor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExternalActorProject" ADD CONSTRAINT "ExternalActorProject_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;