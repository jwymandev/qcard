import { NextResponse } from 'next/server';
import { authPrisma } from '@/lib/secure-db-connection';
import { requireAdmin } from '@/lib/admin-helpers';

// GET /api/admin/audit-logs - Retrieve audit logs
export async function GET(request: Request) {
  try {
    console.log('GET /api/admin/audit-logs request received');
    
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
    
    // Get query parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100); // Max 100 per page
    const action = searchParams.get('action');
    const adminId = searchParams.get('adminId');
    const targetId = searchParams.get('targetId');
    const skip = (page - 1) * limit;
    
    // Build where clause
    const where: any = {};
    if (action) where.action = action;
    if (adminId) where.adminId = adminId;
    if (targetId) where.targetId = targetId;
    
    // Get total count
    const totalCount = await authPrisma.auditLog.count({ where });
    
    // Get audit logs
    const auditLogs = await authPrisma.auditLog.findMany({
      where,
      include: {
        admin: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true
          }
        },
        target: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit
    });
    
    console.log(`Found ${auditLogs.length} audit logs (page ${page})`);
    
    return NextResponse.json({
      auditLogs,
      pagination: {
        total: totalCount,
        page,
        limit,
        pages: Math.ceil(totalCount / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch audit logs', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}