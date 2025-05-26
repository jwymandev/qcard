#!/usr/bin/env node

/**
 * Clear Stale Sessions
 * 
 * This script clears any sessions that reference non-existent users
 * which could cause infinite loops or authentication issues.
 */

const { PrismaClient } = require('@prisma/client');

// Create Prisma client
const prisma = new PrismaClient();

async function main() {
  try {
    console.log('🧹 Clearing stale sessions...\n');

    // Get all valid user IDs
    const validUsers = await prisma.user.findMany({
      select: { id: true }
    });
    const validUserIds = new Set(validUsers.map(u => u.id));
    
    console.log(`Found ${validUserIds.size} valid users in database`);

    try {
      // Get all sessions
      const allSessions = await prisma.session.findMany({
        select: { id: true, userId: true }
      });
      
      console.log(`Found ${allSessions.length} total sessions`);
      
      // Find stale sessions (sessions for users that don't exist)
      const staleSessions = allSessions.filter(session => 
        session.userId && !validUserIds.has(session.userId)
      );
      
      if (staleSessions.length > 0) {
        console.log(`\n❌ Found ${staleSessions.length} stale sessions:`);
        staleSessions.forEach(session => {
          console.log(`  - Session ${session.id} for non-existent user ${session.userId}`);
        });
        
        // Delete stale sessions
        const deleteResult = await prisma.session.deleteMany({
          where: {
            userId: {
              notIn: Array.from(validUserIds)
            }
          }
        });
        
        console.log(`\n✅ Deleted ${deleteResult.count} stale sessions`);
      } else {
        console.log('\n✅ No stale sessions found');
      }
      
      // Also clean up any sessions older than 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const oldSessionsResult = await prisma.session.deleteMany({
        where: {
          expires: {
            lt: thirtyDaysAgo
          }
        }
      });
      
      if (oldSessionsResult.count > 0) {
        console.log(`🗑️  Deleted ${oldSessionsResult.count} expired sessions (older than 30 days)`);
      }
      
    } catch (error) {
      if (error.code === 'P2021') {
        console.log('ℹ️  Session table does not exist - no sessions to clean');
      } else {
        console.error('Error cleaning sessions:', error.message);
      }
    }

    console.log('\n✅ Session cleanup completed');

  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run main function
main();