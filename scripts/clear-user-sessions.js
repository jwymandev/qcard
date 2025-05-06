/**
 * Script to clear user sessions for testing purposes
 * 
 * Usage:
 * node scripts/clear-user-sessions.js <email>
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function clearUserSessions(email) {
  try {
    if (!email) {
      console.error('Please provide a user email as an argument');
      process.exit(1);
    }

    // Find the user
    const user = await prisma.user.findUnique({
      where: { email },
      include: { Session: true }
    });

    if (!user) {
      console.error(`User not found with email: ${email}`);
      process.exit(1);
    }

    console.log(`Found user: ${user.id} (${user.email})`);
    
    // Delete all sessions for this user
    const { count } = await prisma.session.deleteMany({
      where: { userId: user.id }
    });
    
    console.log(`Deleted ${count} sessions for user ${email}`);
    
    console.log("\nTo complete the process:");
    console.log("1. Clear your browser cookies for this site");
    console.log("2. Sign in again with the same email");
    console.log("3. Visit the /debug-session page to verify your session");
    
  } catch (error) {
    console.error('Error clearing sessions:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Get email from command line arguments
const email = process.argv[2];
clearUserSessions(email).catch(console.error);