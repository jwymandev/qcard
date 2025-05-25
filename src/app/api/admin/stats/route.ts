import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { authPrisma } from '@/lib/secure-db-connection';
import { requireAdmin } from '@/lib/admin-helpers';

// GET /api/admin/stats
export async function GET() {
  try {
    // Check admin access
    await requireAdmin();

    // Run queries in parallel for better performance
    // Use authPrisma for reliable database access
    console.log('Fetching admin statistics with authPrisma');
    const [
      usersCount,
      studiosCount, 
      talentsCount, 
      projectsCount, 
      castingCallsCount,
      recentActivity
    ] = await Promise.all([
      authPrisma.user.count(),
      authPrisma.studio.count(),
      authPrisma.profile.count(),
      authPrisma.project.count(),
      authPrisma.castingCall.count(),
      getRecentActivity()
    ]);

    return NextResponse.json({
      users: usersCount,
      studios: studiosCount,
      talents: talentsCount,
      projects: projectsCount,
      castingCalls: castingCallsCount,
      recentActivity
    });
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch admin statistics' },
      { status: 500 }
    );
  }
}

// Helper function to get recent activity
async function getRecentActivity() {
  // Get recent users, projects, casting calls limited to 5 total items - use authPrisma for reliable database access
  console.log('Fetching recent activity with authPrisma');
  const [recentUsers, recentProjects, recentCastingCalls] = await Promise.all([
    authPrisma.user.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        createdAt: true,
        Tenant: {
          select: {
            type: true
          }
        }
      }
    }),
    authPrisma.project.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        createdAt: true,
        Studio: {
          select: {
            name: true
          }
        }
      }
    }),
    authPrisma.castingCall.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        createdAt: true,
        Project: {
          select: {
            title: true
          }
        }
      }
    })
  ]);

  // Format and combine activities
  const activities = [
    ...recentUsers.map(user => ({
      type: 'user',
      id: user.id,
      description: `${user.firstName || ''} ${user.lastName || ''} (${user.Tenant?.type || 'User'}) registered`,
      time: user.createdAt
    })),
    ...recentProjects.map(project => ({
      type: 'project',
      id: project.id,
      description: `New project "${project.title}" created${project.Studio ? ` by ${project.Studio.name}` : ''}`,
      time: project.createdAt
    })),
    ...recentCastingCalls.map(call => ({
      type: 'castingCall',
      id: call.id,
      description: `Casting call "${call.title}" posted${call.Project ? ` for project "${call.Project.title}"` : ''}`,
      time: call.createdAt
    }))
  ];

  // Sort by date, most recent first, and take only 5
  return activities
    .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
    .slice(0, 5);
}