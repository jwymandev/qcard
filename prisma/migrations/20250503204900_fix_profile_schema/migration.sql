-- AlterTable: Remove age column if it exists
PRAGMA foreign_keys=OFF;
-- First create a backup of the existing table
CREATE TABLE "_Profile_backup" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "headshotUrl" TEXT,
  "bio" TEXT,
  "height" TEXT,
  "weight" TEXT,
  "hairColor" TEXT,
  "eyeColor" TEXT,
  "availability" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  "ethnicity" TEXT,
  "experience" TEXT,
  "gender" TEXT,
  "languages" TEXT,
  CONSTRAINT "Profile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Copy data from the original table to the backup, excluding the age column
INSERT INTO "_Profile_backup" SELECT 
  "id", 
  "userId", 
  "headshotUrl", 
  "bio", 
  "height", 
  "weight", 
  "hairColor", 
  "eyeColor", 
  "availability", 
  "createdAt", 
  "updatedAt", 
  "ethnicity", 
  "experience", 
  "gender", 
  "languages"
FROM "Profile";

-- Drop the original table
DROP TABLE "Profile";

-- Rename the backup table to the original name
ALTER TABLE "_Profile_backup" RENAME TO "Profile";

-- Create any necessary indexes
CREATE UNIQUE INDEX "Profile_userId_key" ON "Profile"("userId");

PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;