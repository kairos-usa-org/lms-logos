import { NextRequest, NextResponse } from 'next/server';
import { ZodSchema, ZodError } from 'zod';
import { errorHandler, AppError, ValidationError } from './error-handler';
import { getOrganizationContext } from '../middleware/auth-middleware';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, any>;
  };
  meta?: {
    timestamp: string;
    requestId?: string;
    organizationId?: string;
    userId?: string;
    pagination?: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  meta: {
    timestamp: string;
    requestId?: string;
    organizationId?: string;
    userId?: string;
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
}

/**
 * Generate a request ID for tracking
 */
export function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Extract pagination parameters from request
 */
export function extractPaginationParams(req: NextRequest): PaginationParams {
  const { searchParams } = req.nextUrl;
  
  return {
    page: Math.max(1, parseInt(searchParams.get('page') || '1')),
    limit: Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20'))),
    sortBy: searchParams.get('sortBy') || undefined,
    sortOrder: (searchParams.get('sortOrder') as 'asc' | 'desc') || 'desc',
  };
}

/**
 * Create a successful API response
 */
export function createSuccessResponse<T>(
  data: T,
  options: {
    requestId?: string;
    organizationId?: string;
    userId?: string;
    pagination?: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  } = {}
): NextResponse<ApiResponse<T>> {
  const response: ApiResponse<T> = {
    success: true,
    data,
    meta: {
      timestamp: new Date().toISOString(),
      requestId: options.requestId,
      organizationId: options.organizationId,
      userId: options.userId,
      pagination: options.pagination,
    },
  };

  return NextResponse.json(response, {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
    },
  });
}

/**
 * Create a paginated API response
 */
export function createPaginatedResponse<T>(
  data: T[],
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  },
  options: {
    requestId?: string;
    organizationId?: string;
    userId?: string;
  } = {}
): NextResponse<PaginatedResponse<T>> {
  const response: PaginatedResponse<T> = {
    success: true,
    data,
    meta: {
      timestamp: new Date().toISOString(),
      requestId: options.requestId,
      organizationId: options.organizationId,
      userId: options.userId,
      pagination,
    },
  };

  return NextResponse.json(response, {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
    },
  });
}

/**
 * Create an error API response
 */
export function createErrorResponse(
  error: AppError,
  options: {
    requestId?: string;
    organizationId?: string;
    userId?: string;
  } = {}
): NextResponse<ApiResponse> {
  const response: ApiResponse = {
    success: false,
    error: {
      code: error.code,
      message: error.message,
      details: error.details,
    },
    meta: {
      timestamp: new Date().toISOString(),
      requestId: options.requestId,
      organizationId: options.organizationId,
      userId: options.userId,
    },
  };

  return NextResponse.json(response, {
    status: error.statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
    },
  });
}

/**
 * Validate request body against a Zod schema
 */
export function validateRequestBody<T>(
  body: unknown,
  schema: ZodSchema<T>,
  context?: { organizationId?: string; userId?: string }
): T {
  try {
    return schema.parse(body);
  } catch (error) {
    if (error instanceof ZodError) {
      throw new ValidationError('Request validation failed', {
        issues: error.issues.map(issue => ({
          field: issue.path.join('.'),
          message: issue.message,
          code: issue.code,
        })),
      });
    }
    throw error;
  }
}

/**
 * Extract organization context from request
 */
export function extractOrganizationContext(req: NextRequest): {
  organizationId: string;
  userId: string;
  role: string;
} | null {
  const context = getOrganizationContext(req);
  return context;
}

/**
 * Validate organization access
 */
export function validateOrganizationAccess(
  req: NextRequest,
  targetOrganizationId: string
): void {
  const context = extractOrganizationContext(req);
  
  if (!context) {
    throw new AppError('Authentication required', 401, 'AUTHENTICATION_ERROR');
  }

  // Super admins can access all organizations
  if (context.role === 'super_admin') {
    return;
  }

  // Regular users can only access their own organization
  if (context.organizationId !== targetOrganizationId) {
    throw new AppError('Access denied', 403, 'AUTHORIZATION_ERROR');
  }
}

/**
 * API route wrapper with error handling and organization context
 */
export function withApiHandler<T = any>(
  handler: (req: NextRequest, context: {
    organizationId: string;
    userId: string;
    role: string;
    requestId: string;
  }) => Promise<NextResponse<ApiResponse<T>>>
) {
  return async (req: NextRequest): Promise<NextResponse<ApiResponse<T>>> => {
    const requestId = generateRequestId();
    
    try {
      // Extract organization context
      const context = extractOrganizationContext(req);
      
      if (!context) {
        return createErrorResponse(
          new AppError('Authentication required', 401, 'AUTHENTICATION_ERROR'),
          { requestId }
        );
      }

      // Call the handler with context
      return await handler(req, { ...context, requestId });
      
    } catch (error) {
      return errorHandler.handleApiError(error, req, {
        requestId,
        organizationId: context?.organizationId,
        userId: context?.userId,
      });
    }
  };
}

/**
 * API route wrapper for organization-specific endpoints
 */
export function withOrganizationHandler<T = any>(
  handler: (req: NextRequest, context: {
    organizationId: string;
    userId: string;
    role: string;
    requestId: string;
  }) => Promise<NextResponse<ApiResponse<T>>>
) {
  return withApiHandler(async (req, context) => {
    // Extract organization ID from URL params
    const url = new URL(req.url);
    const pathParts = url.pathname.split('/');
    const orgIndex = pathParts.indexOf('organizations');
    
    if (orgIndex === -1 || !pathParts[orgIndex + 1]) {
      throw new AppError('Organization ID required', 400, 'VALIDATION_ERROR');
    }
    
    const targetOrganizationId = pathParts[orgIndex + 1];
    
    // Validate organization access
    validateOrganizationAccess(req, targetOrganizationId);
    
    return handler(req, context);
  });
}

/**
 * API route wrapper for admin-only endpoints
 */
export function withAdminHandler<T = any>(
  handler: (req: NextRequest, context: {
    organizationId: string;
    userId: string;
    role: string;
    requestId: string;
  }) => Promise<NextResponse<ApiResponse<T>>>
) {
  return withApiHandler(async (req, context) => {
    // Check if user has admin privileges
    if (!['super_admin', 'org_admin'].includes(context.role)) {
      throw new AppError('Admin privileges required', 403, 'AUTHORIZATION_ERROR');
    }
    
    return handler(req, context);
  });
}

/**
 * API route wrapper for super admin only endpoints
 */
export function withSuperAdminHandler<T = any>(
  handler: (req: NextRequest, context: {
    organizationId: string;
    userId: string;
    role: string;
    requestId: string;
  }) => Promise<NextResponse<ApiResponse<T>>>
) {
  return withApiHandler(async (req, context) => {
    // Check if user has super admin privileges
    if (context.role !== 'super_admin') {
      throw new AppError('Super admin privileges required', 403, 'AUTHORIZATION_ERROR');
    }
    
    return handler(req, context);
  });
}

/**
 * Utility functions for common API operations
 */
export const apiUtils = {
  /**
   * Parse JSON body safely
   */
  async parseJsonBody(req: NextRequest): Promise<unknown> {
    try {
      return await req.json();
    } catch (error) {
      throw new ValidationError('Invalid JSON body');
    }
  },

  /**
   * Get query parameters as object
   */
  getQueryParams(req: NextRequest): Record<string, string> {
    const { searchParams } = req.nextUrl;
    const params: Record<string, string> = {};
    
    searchParams.forEach((value, key) => {
      params[key] = value;
    });
    
    return params;
  },

  /**
   * Calculate pagination info
   */
  calculatePagination(
    page: number,
    limit: number,
    total: number
  ): {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    offset: number;
  } {
    const totalPages = Math.ceil(total / limit);
    const offset = (page - 1) * limit;
    
    return {
      page,
      limit,
      total,
      totalPages,
      offset,
    };
  },

  /**
   * Create a standardized error response for validation errors
   */
  createValidationErrorResponse(
    errors: Array<{ field: string; message: string; code: string }>,
    requestId?: string
  ): NextResponse<ApiResponse> {
    const response: ApiResponse = {
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details: { errors },
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId,
      },
    };

    return NextResponse.json(response, {
      status: 400,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  },

  /**
   * Create a not found response
   */
  createNotFoundResponse(
    resource: string = 'Resource',
    requestId?: string
  ): NextResponse<ApiResponse> {
    const response: ApiResponse = {
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: `${resource} not found`,
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId,
      },
    };

    return NextResponse.json(response, {
      status: 404,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  },
};

/**
 * Common HTTP status codes
 */
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
} as const;

/**
 * Common error codes
 */
export const ERROR_CODES = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  AUTHENTICATION_ERROR: 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR: 'AUTHORIZATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
} as const;
