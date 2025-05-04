// Script to fix the age column issue in the Profile table
const { PrismaClient } = require('@prisma/client');

// Create a new Prisma client
const prisma = new PrismaClient();

async function main() {
  console.log("Starting database fix script");
  
  try {
    // Check if the age column exists in the Profile table
    let hasAgeColumn = true;
    try {
      // Try to select the age column - if it doesn't exist, an error will occur
      await prisma.$queryRaw`SELECT age FROM Profile LIMIT 1`;
      console.log("Age column exists, needs to be removed");
    } catch (error) {
      hasAgeColumn = false;
      console.log("Age column does not exist, no need to fix");
    }
    
    if (hasAgeColumn) {
      console.log("Running fix to remove age column...");
      
      // Start a transaction for these operations
      await prisma.$transaction(async (tx) => {
        // 1. Create a temporary table without the age column
        await tx.$executeRaw`
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
          )
        `;
        
        // 2. Copy data from Profile to the backup table
        await tx.$executeRaw`
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
          FROM "Profile"
        `;
        
        // 3. Drop the old table
        await tx.$executeRaw`DROP TABLE "Profile"`;
        
        // 4. Rename the backup table to Profile
        await tx.$executeRaw`ALTER TABLE "_Profile_backup" RENAME TO "Profile"`;
        
        // 5. Create the unique index
        await tx.$executeRaw`CREATE UNIQUE INDEX "Profile_userId_key" ON "Profile"("userId")`;
        
        console.log("Successfully removed age column from Profile table");
      });
    }
    
    console.log("Database fix completed successfully");
  } catch (error) {
    console.error("Error fixing database:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .then(() => console.log("Script finished successfully"))
  .catch((error) => {
    console.error("Script failed:", error);
    process.exit(1);
  });