import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/db';
import { authPrisma } from '../../../lib/secure-db-connection';

/**
 * Production-grade health check endpoint
 * Provides comprehensive system status information suitable for monitoring systems
 * Use with uptime monitoring and alerts for production reliability
 */

// Type definitions to properly handle health status
type TableStatus = {
  [key: string]: {
    exists: boolean;
    count?: number;
    status: 'healthy' | 'unhealthy';
    error?: string;
  };
};

type HealthStatus = {
  status: 'initializing' | 'healthy' | 'degraded' | 'unhealthy' | 'critical';
  database: {
    connected: boolean;
    tableStatus: TableStatus;
    responseTimeMs: number;
    error?: string;
  };
  memory: {
    usage: number;
    rss: number;
  };
  uptime: number;
  environment: string;
  timestamp: string;
  version: string;
  responseTimeMs?: number;
};

export async function GET() {
  // Track start time for performance monitoring
  const startTime = Date.now();
  
  // System health components
  const healthStatus: HealthStatus = {
    status: 'initializing',
    database: {
      connected: false,
      tableStatus: {},
      responseTimeMs: 0
    },
    memory: {
      usage: process.memoryUsage().heapUsed / 1024 / 1024, // MB
      rss: process.memoryUsage().rss / 1024 / 1024 // MB
    },
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'unknown',
    timestamp: new Date().toISOString(),
    version: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
  };
  
  try {
    // Try essential database operations with timeout protection
    const dbCheckStart = Date.now();
    
    try {
      // Essential tables to check
      const essentialTables = ['User', 'Profile', 'Studio', 'Session', 'Tenant'];
      const tableResults: TableStatus = {};
      
      // Check each table's connectivity
      for (const table of essentialTables) {
        try {
          // Try authPrisma first, fall back to regular prisma
          let count = 0;
          try {
            // Dynamic table access with authPrisma (more reliable)
            count = await (authPrisma as any)[table.toLowerCase()].count();
          } catch (authPrismaError) {
            // Fall back to regular prisma
            count = await (prisma as any)[table.toLowerCase()].count();
          }
          
          tableResults[table.toLowerCase()] = {
            exists: true,
            count: count,
            status: 'healthy'
          };
        } catch (tableError) {
          // Try a simpler check if count fails
          try {
            // Just check if the table exists by finding first record
            await (authPrisma as any)[table.toLowerCase()].findFirst();
            tableResults[table.toLowerCase()] = {
              exists: true,
              status: 'healthy'
            };
          } catch (fallbackError) {
            tableResults[table.toLowerCase()] = {
              exists: false,
              error: tableError instanceof Error ? tableError.message : 'Unknown error',
              status: 'unhealthy'
            };
          }
        }
      }
      
      // Update health status with database results
      healthStatus.database.connected = true;
      healthStatus.database.tableStatus = tableResults;
      healthStatus.database.responseTimeMs = Date.now() - dbCheckStart;
      
      // Determine overall status based on critical tables
      const criticalTablesHealthy = ['user', 'profile', 'studio'].every(
        table => tableResults[table]?.status === 'healthy'
      );
      
      healthStatus.status = criticalTablesHealthy ? 'healthy' : 'degraded';
    } catch (dbError) {
      // Database completely unavailable
      healthStatus.status = 'unhealthy';
      healthStatus.database.error = dbError instanceof Error ? dbError.message : 'Unknown database error';
    }
    
    // Set appropriate HTTP status code based on health
    const httpStatus = healthStatus.status === 'healthy' ? 200 : 
                       healthStatus.status === 'degraded' ? 200 : 503;
    
    // Add total response time to health data
    healthStatus.responseTimeMs = Date.now() - startTime;
    
    return NextResponse.json(healthStatus, { status: httpStatus });
  } catch (error) {
    // Catastrophic failure
    console.error('Health check failed:', error);
    
    return NextResponse.json({
      status: 'critical',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      responseTimeMs: Date.now() - startTime
    }, { status: 500 });
  }
}