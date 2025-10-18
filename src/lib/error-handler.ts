import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { auditLog } from './audit-logger';

export interface AppError extends Error {
  statusCode: number;
  code: string;
  isOperational: boolean;
  organizationId?: string;
  userId?: string;
  details?: Record<string, any>;
}

export interface ErrorResponse {
  error: {
    code: string;
    message: string;
    statusCode: number;
    timestamp: string;
    requestId?: string;
    details?: Record<string, any>;
  };
}

export interface ErrorLogEntry {
  level: 'error' | 'warn' | 'info' | 'debug';
  message: string;
  error?: Error;
  context?: Record<string, any>;
  organizationId?: string;
  userId?: string;
  requestId?: string;
  timestamp: string;
}

/**
 * Custom error classes for different error types
 */
export class ValidationError extends Error implements AppError {
  statusCode = 400;
  code = 'VALIDATION_ERROR';
  isOperational = true;
  organizationId?: string;
  userId?: string;
  details?: Record<string, any>;

  constructor(message: string, details?: Record<string, any>) {
    super(message);
    this.name = 'ValidationError';
    this.details = details;
  }
}

export class AuthenticationError extends Error implements AppError {
  statusCode = 401;
  code = 'AUTHENTICATION_ERROR';
  isOperational = true;
  organizationId?: string;
  userId?: string;

  constructor(message: string = 'Authentication required') {
    super(message);
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends Error implements AppError {
  statusCode = 403;
  code = 'AUTHORIZATION_ERROR';
  isOperational = true;
  organizationId?: string;
  userId?: string;

  constructor(message: string = 'Insufficient permissions') {
    super(message);
    this.name = 'AuthorizationError';
  }
}

export class NotFoundError extends Error implements AppError {
  statusCode = 404;
  code = 'NOT_FOUND';
  isOperational = true;
  organizationId?: string;
  userId?: string;

  constructor(resource: string = 'Resource') {
    super(`${resource} not found`);
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends Error implements AppError {
  statusCode = 409;
  code = 'CONFLICT';
  isOperational = true;
  organizationId?: string;
  userId?: string;

  constructor(message: string) {
    super(message);
    this.name = 'ConflictError';
  }
}

export class RateLimitError extends Error implements AppError {
  statusCode = 429;
  code = 'RATE_LIMIT_EXCEEDED';
  isOperational = true;
  organizationId?: string;
  userId?: string;

  constructor(message: string = 'Rate limit exceeded') {
    super(message);
    this.name = 'RateLimitError';
  }
}

export class InternalServerError extends Error implements AppError {
  statusCode = 500;
  code = 'INTERNAL_SERVER_ERROR';
  isOperational = false;
  organizationId?: string;
  userId?: string;

  constructor(message: string = 'Internal server error') {
    super(message);
    this.name = 'InternalServerError';
  }
}

/**
 * Error handler class for centralized error management
 */
export class ErrorHandler {
  private static instance: ErrorHandler;
  private errorLogs: ErrorLogEntry[] = [];
  private maxLogs = 1000;

  private constructor() {}

  static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  /**
   * Log an error with context
   */
  log(entry: ErrorLogEntry): void {
    // Add to in-memory logs
    this.errorLogs.unshift(entry);
    
    // Keep only the most recent logs
    if (this.errorLogs.length > this.maxLogs) {
      this.errorLogs = this.errorLogs.slice(0, this.maxLogs);
    }

    // Log to console based on level
    const logMessage = `[${entry.level.toUpperCase()}] ${entry.message}`;
    const logContext = {
      ...entry.context,
      organizationId: entry.organizationId,
      userId: entry.userId,
      requestId: entry.requestId,
      timestamp: entry.timestamp,
    };

    switch (entry.level) {
      case 'error':
        console.error(logMessage, logContext, entry.error);
        break;
      case 'warn':
        console.warn(logMessage, logContext);
        break;
      case 'info':
        console.info(logMessage, logContext);
        break;
      case 'debug':
        console.debug(logMessage, logContext);
        break;
    }
  }

  /**
   * Create an error from various sources
   */
  createError(
    error: unknown,
    context?: {
      organizationId?: string;
      userId?: string;
      requestId?: string;
      additionalContext?: Record<string, any>;
    }
  ): AppError {
    if (error instanceof AppError) {
      return error;
    }

    if (error instanceof ZodError) {
      const validationError = new ValidationError(
        'Validation failed',
        {
          issues: error.issues.map(issue => ({
            field: issue.path.join('.'),
            message: issue.message,
            code: issue.code,
          })),
        }
      );
      validationError.organizationId = context?.organizationId;
      validationError.userId = context?.userId;
      return validationError;
    }

    if (error instanceof Error) {
      const appError = new InternalServerError(error.message);
      appError.organizationId = context?.organizationId;
      appError.userId = context?.userId;
      appError.details = context?.additionalContext;
      return appError;
    }

    const appError = new InternalServerError('Unknown error occurred');
    appError.organizationId = context?.organizationId;
    appError.userId = context?.userId;
    appError.details = context?.additionalContext;
    return appError;
  }

  /**
   * Handle API route errors
   */
  handleApiError(
    error: unknown,
    req: NextRequest,
    context?: {
      organizationId?: string;
      userId?: string;
      requestId?: string;
    }
  ): NextResponse<ErrorResponse> {
    const appError = this.createError(error, context);
    
    // Log the error
    this.log({
      level: 'error',
      message: appError.message,
      error: appError,
      context: {
        url: req.url,
        method: req.method,
        userAgent: req.headers.get('user-agent'),
        ip: req.headers.get('x-forwarded-for') || req.ip,
      },
      organizationId: appError.organizationId,
      userId: appError.userId,
      requestId: context?.requestId,
      timestamp: new Date().toISOString(),
    });

    // Audit log the error if we have user context
    if (appError.organizationId && appError.userId) {
      auditLog.logSecurityEvent(
        appError.userId,
        appError.organizationId,
        'api_error',
        req,
        {
          errorCode: appError.code,
          errorMessage: appError.message,
          statusCode: appError.statusCode,
        }
      );
    }

    // Return appropriate response
    const errorResponse: ErrorResponse = {
      error: {
        code: appError.code,
        message: appError.message,
        statusCode: appError.statusCode,
        timestamp: new Date().toISOString(),
        requestId: context?.requestId,
        details: appError.details,
      },
    };

    return NextResponse.json(errorResponse, { 
      status: appError.statusCode,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Handle client-side errors
   */
  handleClientError(
    error: unknown,
    context?: {
      organizationId?: string;
      userId?: string;
      component?: string;
      action?: string;
    }
  ): void {
    const appError = this.createError(error, context);
    
    this.log({
      level: 'error',
      message: `Client error: ${appError.message}`,
      error: appError,
      context: {
        component: context?.component,
        action: context?.action,
      },
      organizationId: appError.organizationId,
      userId: appError.userId,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Get recent error logs
   */
  getRecentLogs(limit: number = 50): ErrorLogEntry[] {
    return this.errorLogs.slice(0, limit);
  }

  /**
   * Get error statistics
   */
  getErrorStats(): {
    totalErrors: number;
    errorsByLevel: Record<string, number>;
    errorsByOrganization: Record<string, number>;
    recentErrors: ErrorLogEntry[];
  } {
    const totalErrors = this.errorLogs.length;
    const errorsByLevel: Record<string, number> = {};
    const errorsByOrganization: Record<string, number> = {};

    this.errorLogs.forEach(log => {
      errorsByLevel[log.level] = (errorsByLevel[log.level] || 0) + 1;
      if (log.organizationId) {
        errorsByOrganization[log.organizationId] = (errorsByOrganization[log.organizationId] || 0) + 1;
      }
    });

    return {
      totalErrors,
      errorsByLevel,
      errorsByOrganization,
      recentErrors: this.errorLogs.slice(0, 10),
    };
  }
}

// Global error handler instance
export const errorHandler = ErrorHandler.getInstance();

/**
 * Utility functions for common error scenarios
 */
export const errorUtils = {
  /**
   * Wrap async functions with error handling
   */
  async withErrorHandling<T>(
    fn: () => Promise<T>,
    context?: {
      organizationId?: string;
      userId?: string;
      requestId?: string;
    }
  ): Promise<T> {
    try {
      return await fn();
    } catch (error) {
      const appError = errorHandler.createError(error, context);
      throw appError;
    }
  },

  /**
   * Validate required fields
   */
  validateRequired(
    data: Record<string, any>,
    requiredFields: string[],
    context?: { organizationId?: string; userId?: string }
  ): void {
    const missingFields = requiredFields.filter(field => !data[field]);
    
    if (missingFields.length > 0) {
      throw new ValidationError(
        `Missing required fields: ${missingFields.join(', ')}`,
        { missingFields }
      );
    }
  },

  /**
   * Validate organization access
   */
  validateOrganizationAccess(
    userOrganizationId: string | undefined,
    targetOrganizationId: string,
    userRole?: string
  ): void {
    if (!userOrganizationId) {
      throw new AuthenticationError('User organization not found');
    }

    // Super admins can access all organizations
    if (userRole === 'super_admin') {
      return;
    }

    // Regular users can only access their own organization
    if (userOrganizationId !== targetOrganizationId) {
      throw new AuthorizationError('Access denied: insufficient permissions');
    }
  },

  /**
   * Create a standardized error response
   */
  createErrorResponse(
    error: AppError,
    requestId?: string
  ): ErrorResponse {
    return {
      error: {
        code: error.code,
        message: error.message,
        statusCode: error.statusCode,
        timestamp: new Date().toISOString(),
        requestId,
        details: error.details,
      },
    };
  },
};

/**
 * Error boundary component for React
 */
export function withErrorBoundary<T extends React.ComponentType<any>>(
  Component: T,
  fallback?: React.ComponentType<{ error: Error; resetError: () => void }>
): T {
  return Component;
}

/**
 * Global error handler for unhandled rejections
 */
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    errorHandler.log({
      level: 'error',
      message: 'Unhandled promise rejection',
      error: event.reason,
      context: { type: 'unhandledrejection' },
      timestamp: new Date().toISOString(),
    });
  });

  window.addEventListener('error', (event) => {
    errorHandler.log({
      level: 'error',
      message: 'Unhandled error',
      error: event.error,
      context: { 
        type: 'unhandlederror',
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      },
      timestamp: new Date().toISOString(),
    });
  });
}
