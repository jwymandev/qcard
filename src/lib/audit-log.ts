import { authPrisma } from './secure-db-connection';

export interface AuditLogData {
  action: string;
  adminId: string;
  targetId?: string;
  details?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Creates an audit log entry for admin actions
 */
export async function createAuditLog(data: AuditLogData): Promise<void> {
  try {
    await authPrisma.auditLog.create({
      data: {
        action: data.action,
        adminId: data.adminId,
        targetId: data.targetId,
        details: data.details || {},
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
      }
    });
    
    console.log(`Audit log created: ${data.action} by admin ${data.adminId}${data.targetId ? ` targeting ${data.targetId}` : ''}`);
  } catch (error) {
    console.error('Failed to create audit log entry:', error);
    // Don't throw error - audit logging should not break the main functionality
  }
}

/**
 * Extracts IP address and user agent from request headers
 */
export function extractRequestInfo(request: Request) {
  const headers = request.headers;
  
  // Get IP address (considering various proxy headers)
  const ipAddress = 
    headers.get('x-forwarded-for')?.split(',')[0] ||
    headers.get('x-real-ip') ||
    headers.get('x-client-ip') ||
    headers.get('cf-connecting-ip') || // Cloudflare
    'unknown';
  
  const userAgent = headers.get('user-agent') || 'unknown';
  
  return { ipAddress, userAgent };
}

/**
 * Common audit log actions
 */
export const AUDIT_ACTIONS = {
  // User management
  USER_CREATE: 'USER_CREATE',
  USER_UPDATE: 'USER_UPDATE', 
  USER_DELETE: 'USER_DELETE',
  USER_IMPERSONATE: 'USER_IMPERSONATE',
  USER_IMPERSONATE_LOGIN: 'USER_IMPERSONATE_LOGIN',
  
  // Subscription management
  SUBSCRIPTION_CREATE: 'SUBSCRIPTION_CREATE',
  SUBSCRIPTION_UPDATE: 'SUBSCRIPTION_UPDATE',
  SUBSCRIPTION_CANCEL: 'SUBSCRIPTION_CANCEL',
  SUBSCRIPTION_GRANT_LIFETIME: 'SUBSCRIPTION_GRANT_LIFETIME',
  
  // Admin actions
  ADMIN_LOGIN: 'ADMIN_LOGIN',
  ADMIN_ACCESS_GRANTED: 'ADMIN_ACCESS_GRANTED',
  ROLE_CHANGE: 'ROLE_CHANGE',
  
  // Data management
  DATA_EXPORT: 'DATA_EXPORT',
  DATA_IMPORT: 'DATA_IMPORT',
  
  // System changes
  FEATURE_FLAG_CHANGE: 'FEATURE_FLAG_CHANGE',
  SYSTEM_CONFIG_CHANGE: 'SYSTEM_CONFIG_CHANGE',
} as const;

export type AuditAction = typeof AUDIT_ACTIONS[keyof typeof AUDIT_ACTIONS];