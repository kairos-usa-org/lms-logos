import { NextRequest } from "next/server";
import { cookies } from "next/headers";

import { createServerClient } from "@supabase/ssr";

export interface AuditLogEntry {
  user_id: string;
  organization_id: string;
  action: string;
  resource_type?: string;
  resource_id?: string;
  details?: Record<string, unknown>;
  ip_address?: string;
  user_agent?: string;
  outcome: "success" | "failure" | "error";
}

export interface AuditLogQuery {
  organizationId?: string;
  userId?: string;
  action?: string;
  resourceType?: string;
  startDate?: Date;
  endDate?: Date;
  outcome?: "success" | "failure" | "error";
  limit?: number;
  offset?: number;
}

export interface AuditLogStats {
  totalLogs: number;
  successCount: number;
  failureCount: number;
  errorCount: number;
  topActions: Array<{ action: string; count: number }>;
  topUsers: Array<{ user_id: string; count: number }>;
  dailyActivity: Array<{ date: string; count: number }>;
}

/**
 * Audit logging service for compliance and security tracking
 * Provides immutable audit logs with organization isolation
 */
export class AuditLogger {
  private supabase: ReturnType<typeof createServerClient>;

  constructor() {
    // Create Supabase client for server-side operations
    const cookieStore = cookies();
    this.supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
        },
      }
    );
  }

  /**
   * Log an audit event
   */
  async log(entry: AuditLogEntry): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('audit_logs')
        .insert({
          user_id: entry.user_id,
          organization_id: entry.organization_id,
          action: entry.action,
          resource_type: entry.resource_type,
          resource_id: entry.resource_id,
          details: entry.details || {},
          ip_address: entry.ip_address,
          user_agent: entry.user_agent,
          outcome: entry.outcome,
        });

      if (error) {
        console.error('Audit log error:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Audit log error:', error);
      return false;
    }
  }

  /**
   * Log a successful action
   */
  async logSuccess(
    userId: string,
    organizationId: string,
    action: string,
    options: {
      resourceType?: string;
      resourceId?: string;
      details?: Record<string, unknown>;
      ipAddress?: string;
      userAgent?: string;
    } = {}
  ): Promise<boolean> {
    return this.log({
      user_id: userId,
      organization_id: organizationId,
      action,
      resource_type: options.resourceType,
      resource_id: options.resourceId,
      details: options.details ?? {},
      ip_address: options.ipAddress,
      user_agent: options.userAgent,
      outcome: "success",
    });
  }

  /**
   * Log a failed action
   */
  async logFailure(
    userId: string,
    organizationId: string,
    action: string,
    options: {
      resourceType?: string;
      resourceId?: string;
      details?: Record<string, unknown>;
      ipAddress?: string;
      userAgent?: string;
    } = {}
  ): Promise<boolean> {
    return this.log({
      user_id: userId,
      organization_id: organizationId,
      action,
      resource_type: options.resourceType,
      resource_id: options.resourceId,
      details: options.details ?? {},
      ip_address: options.ipAddress,
      user_agent: options.userAgent,
      outcome: "failure",
    });
  }

  /**
   * Log an error
   */
  async logError(
    userId: string,
    organizationId: string,
    action: string,
    error: Error,
    options: {
      resourceType?: string;
      resourceId?: string;
      details?: Record<string, unknown>;
      ipAddress?: string;
      userAgent?: string;
    } = {}
  ): Promise<boolean> {
    return this.log({
      user_id: userId,
      organization_id: organizationId,
      action,
      resource_type: options.resourceType,
      resource_id: options.resourceId,
      details: {
        ...options.details,
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack,
        },
      },
      ip_address: options.ipAddress,
      user_agent: options.userAgent,
      outcome: "error",
    });
  }

  /**
   * Query audit logs with filters
   */
  async queryLogs(query: AuditLogQuery): Promise<{
    logs: Array<AuditLogEntry & { id: string; timestamp: string }>;
    total: number;
  }> {
    try {
      let supabaseQuery = this.supabase
        .from("audit_logs")
        .select("*", { count: "exact" });

      // Apply filters
      if (query.organizationId) {
        supabaseQuery = supabaseQuery.eq("organization_id", query.organizationId);
      }

      if (query.userId) {
        supabaseQuery = supabaseQuery.eq("user_id", query.userId);
      }

      if (query.action) {
        supabaseQuery = supabaseQuery.eq("action", query.action);
      }

      if (query.resourceType) {
        supabaseQuery = supabaseQuery.eq("resource_type", query.resourceType);
      }

      if (query.outcome) {
        supabaseQuery = supabaseQuery.eq("outcome", query.outcome);
      }

      if (query.startDate) {
        supabaseQuery = supabaseQuery.gte("timestamp", query.startDate.toISOString());
      }

      if (query.endDate) {
        supabaseQuery = supabaseQuery.lte("timestamp", query.endDate.toISOString());
      }

      // Apply pagination
      if (query.limit) {
        supabaseQuery = supabaseQuery.limit(query.limit);
      }

      if (query.offset) {
        supabaseQuery = supabaseQuery.range(query.offset, query.offset + (query.limit || 50) - 1);
      }

      // Order by timestamp descending
      supabaseQuery = supabaseQuery.order("timestamp", { ascending: false });

      const { data, error, count } = await supabaseQuery;

      if (error) {
        console.error("Audit log query error:", error);
        return { logs: [], total: 0 };
      }

      return {
        logs: data || [],
        total: count || 0,
      };
    } catch (error) {
      console.error('Audit log query error:', error);
      return { logs: [], total: 0 };
    }
  }

  /**
   * Get audit log statistics
   */
  async getStats(organizationId?: string): Promise<AuditLogStats> {
    try {
      let query = this.supabase.from('audit_logs').select('*');

      if (organizationId) {
        query = query.eq('organization_id', organizationId);
      }

      const { data: logs, error } = await query;

      if (error) {
        console.error('Audit log stats error:', error);
        return {
          totalLogs: 0,
          successCount: 0,
          failureCount: 0,
          errorCount: 0,
          topActions: [],
          topUsers: [],
          dailyActivity: [],
        };
      }

      const totalLogs = logs?.length || 0;
      const successCount = logs?.filter((log: any) => log.outcome === "success").length || 0;
      const failureCount = logs?.filter((log: any) => log.outcome === "failure").length || 0;
      const errorCount = logs?.filter((log: any) => log.outcome === "error").length || 0;

      // Top actions
      const actionCounts: Record<string, number> = {};
      logs?.forEach((log: any) => {
        actionCounts[log.action] = (actionCounts[log.action] || 0) + 1;
      });
      const topActions = Object.entries(actionCounts)
        .map(([action, count]) => ({ action, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      // Top users
      const userCounts: Record<string, number> = {};
      logs?.forEach((log: any) => {
        userCounts[log.user_id] = (userCounts[log.user_id] || 0) + 1;
      });
      const topUsers = Object.entries(userCounts)
        .map(([user_id, count]) => ({ user_id, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      // Daily activity (last 30 days)
      const dailyActivity: Record<string, number> = {};
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      logs?.forEach((log: any) => {
        const logDate = new Date(log.timestamp);
        if (logDate >= thirtyDaysAgo) {
          const dateKey = logDate.toISOString().split("T")[0];
          dailyActivity[dateKey] = (dailyActivity[dateKey] || 0) + 1;
        }
      });

      const dailyActivityArray = Object.entries(dailyActivity)
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => a.date.localeCompare(b.date));

      return {
        totalLogs,
        successCount,
        failureCount,
        errorCount,
        topActions,
        topUsers,
        dailyActivity: dailyActivityArray,
      };
    } catch (error) {
      console.error('Audit log stats error:', error);
      return {
        totalLogs: 0,
        successCount: 0,
        failureCount: 0,
        errorCount: 0,
        topActions: [],
        topUsers: [],
        dailyActivity: [],
      };
    }
  }

  /**
   * Clean up old audit logs (older than retention period)
   */
  async cleanup(retentionDays: number = 2555): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

      const { data, error } = await this.supabase
        .from('audit_logs')
        .delete()
        .lt('timestamp', cutoffDate.toISOString())
        .select('id');

      if (error) {
        console.error('Audit log cleanup error:', error);
        return 0;
      }

      return data?.length || 0;
    } catch (error) {
      console.error('Audit log cleanup error:', error);
      return 0;
    }
  }
}

// Create a global audit logger instance
const globalAuditLogger = new AuditLogger();

/**
 * Extract client information from request
 */
export function extractClientInfo(req: NextRequest): {
  ipAddress: string;
  userAgent: string;
} {
    const forwarded = req.headers.get("x-forwarded-for");
    const ipAddress = forwarded ? forwarded.split(",")[0] : "unknown";
    const userAgent = req.headers.get("user-agent") || "unknown";

  return { ipAddress, userAgent };
}

/**
 * Convenience functions for common audit logging scenarios
 */
export const auditLog = {
  /**
   * Log user authentication events
   */
  async logAuth(
    userId: string,
    organizationId: string,
    action: 'login' | 'logout' | 'register' | 'password_reset',
    req: NextRequest,
    success: boolean = true,
    details?: Record<string, unknown>
  ): Promise<boolean> {
    const { ipAddress, userAgent } = extractClientInfo(req);
    
    return globalAuditLogger.log({
      user_id: userId,
      organization_id: organizationId,
      action: `auth.${action}`,
      details: details ?? {},
      ip_address: ipAddress,
      user_agent: userAgent,
      outcome: success ? "success" : "failure",
    });
  },

  /**
   * Log data access events
   */
  async logDataAccess(
    userId: string,
    organizationId: string,
    action: 'create' | 'read' | 'update' | 'delete',
    resourceType: string,
    resourceId: string,
    req: NextRequest,
    success: boolean = true,
    details?: Record<string, unknown>
  ): Promise<boolean> {
    const { ipAddress, userAgent } = extractClientInfo(req);
    
    return globalAuditLogger.log({
      user_id: userId,
      organization_id: organizationId,
      action: `data.${action}`,
      resource_type: resourceType,
      resource_id: resourceId,
      details: details ?? {},
      ip_address: ipAddress,
      user_agent: userAgent,
      outcome: success ? "success" : "failure",
    });
  },

  /**
   * Log admin actions
   */
  async logAdminAction(
    userId: string,
    organizationId: string,
    action: string,
    req: NextRequest,
    success: boolean = true,
    details?: Record<string, unknown>
  ): Promise<boolean> {
    const { ipAddress, userAgent } = extractClientInfo(req);
    
    return globalAuditLogger.log({
      user_id: userId,
      organization_id: organizationId,
      action: `admin.${action}`,
      details: details ?? {},
      ip_address: ipAddress,
      user_agent: userAgent,
      outcome: success ? "success" : "failure",
    });
  },

  /**
   * Log security events
   */
  async logSecurityEvent(
    userId: string,
    organizationId: string,
    event: string,
    req: NextRequest,
    details?: Record<string, unknown>
  ): Promise<boolean> {
    const { ipAddress, userAgent } = extractClientInfo(req);
    
    return globalAuditLogger.log({
      user_id: userId,
      organization_id: organizationId,
      action: `security.${event}`,
      details: details ?? {},
      ip_address: ipAddress,
      user_agent: userAgent,
      outcome: "success",
    });
  },
};

// Export the global audit logger instance
export { globalAuditLogger as auditLogger };
