import { NextResponse } from 'next/server';
import { authPrisma } from '@/lib/secure-db-connection';
import { requireAdmin } from '@/lib/admin-helpers';

// GET /api/admin/audit-logs/stats - Get audit log statistics
export async function GET() {
  try {
    console.log('GET /api/admin/audit-logs/stats request received');
    
    // Check admin access
    const session = await requireAdmin({ 
      redirectOnFailure: false, 
      throwOnFailure: true 
    });
    
    if (!session) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }
    
    // Get total count
    const totalLogs = await authPrisma.auditLog.count();
    
    // Get logs from last 24 hours
    const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentLogs = await authPrisma.auditLog.count({
      where: {
        createdAt: {
          gte: last24Hours
        }
      }
    });
    
    // Get top actions
    const actionStats = await authPrisma.auditLog.groupBy({
      by: ['action'],
      _count: {
        action: true
      },
      orderBy: {
        _count: {
          action: 'desc'
        }
      },
      take: 10
    });
    
    // Get top admins
    const adminStats = await authPrisma.auditLog.groupBy({
      by: ['adminId'],
      _count: {
        adminId: true
      },
      orderBy: {
        _count: {
          adminId: 'desc'
        }
      },
      take: 5
    });
    
    // Get admin details for the stats
    const adminIds = adminStats.map(stat => stat.adminId);
    const admins = await authPrisma.user.findMany({
      where: {
        id: {
          in: adminIds
        }
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true
      }
    });
    
    const adminStatsWithDetails = adminStats.map(stat => {
      const admin = admins.find(a => a.id === stat.adminId);
      return {
        ...stat,
        admin: admin ? {
          email: admin.email,
          name: `${admin.firstName || ''} ${admin.lastName || ''}`.trim() || admin.email
        } : null
      };
    });
    
    return NextResponse.json({
      totalLogs,
      recentLogs,
      actionStats: actionStats.map(stat => ({
        action: stat.action,
        count: stat._count.action
      })),
      adminStats: adminStatsWithDetails.map(stat => ({
        adminId: stat.adminId,
        count: stat._count.adminId,
        admin: stat.admin
      }))
    });
  } catch (error) {
    console.error('Error fetching audit log stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch audit log stats', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}