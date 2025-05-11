-- CreateTable
CREATE TABLE "SceneExternalActor" (
  "id" TEXT NOT NULL,
  "sceneId" TEXT NOT NULL,
  "externalActorId" TEXT NOT NULL,
  "role" TEXT,
  "notes" TEXT,
  "status" TEXT NOT NULL DEFAULT 'CONFIRMED',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "SceneExternalActor_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "SceneExternalActor" ADD CONSTRAINT "SceneExternalActor_sceneId_fkey" FOREIGN KEY ("sceneId") REFERENCES "Scene"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SceneExternalActor" ADD CONSTRAINT "SceneExternalActor_externalActorId_fkey" FOREIGN KEY ("externalActorId") REFERENCES "ExternalActor"("id") ON DELETE CASCADE ON UPDATE CASCADE;