-- CreateTable
CREATE TABLE "CastingCode" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "expiresAt" TIMESTAMP(3),
  "studioId" TEXT NOT NULL,
  "projectId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "CastingCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CastingSubmission" (
  "id" TEXT NOT NULL,
  "firstName" TEXT NOT NULL,
  "lastName" TEXT NOT NULL,
  "email" TEXT,
  "phoneNumber" TEXT,
  "message" TEXT,
  "externalActorId" TEXT,
  "castingCodeId" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "convertedToProfileId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "CastingSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CastingCode_code_key" ON "CastingCode"("code");

-- AddForeignKey
ALTER TABLE "CastingCode" ADD CONSTRAINT "CastingCode_studioId_fkey" FOREIGN KEY ("studioId") REFERENCES "Studio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CastingCode" ADD CONSTRAINT "CastingCode_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CastingSubmission" ADD CONSTRAINT "CastingSubmission_castingCodeId_fkey" FOREIGN KEY ("castingCodeId") REFERENCES "CastingCode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CastingSubmission" ADD CONSTRAINT "CastingSubmission_externalActorId_fkey" FOREIGN KEY ("externalActorId") REFERENCES "ExternalActor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CastingSubmission" ADD CONSTRAINT "CastingSubmission_convertedToProfileId_fkey" FOREIGN KEY ("convertedToProfileId") REFERENCES "Profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;