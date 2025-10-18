export interface JWTPayload {
  sub: string; // user ID
  organization_id: string;
  role: 'super_admin' | 'org_admin' | 'mentor' | 'learner';
  iat: number; // issued at
  exp: number; // expires at
}

export interface OrganizationContext {
  userId: string;
  organizationId: string;
  role: string;
}

// Create JWT token with organization context
export const createOrganizationJWT = (
  userId: string,
  organizationId: string,
  role: 'super_admin' | 'org_admin' | 'mentor' | 'learner',
  expiresIn: number = 24 * 60 * 60 // 24 hours default
): string => {
  const payload: JWTPayload = {
    sub: userId,
    organization_id: organizationId,
    role,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + expiresIn,
  };

  // In a production environment, you would use a proper JWT library like jsonwebtoken
  // For now, we'll create a base64 encoded string for development
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payloadEncoded = btoa(JSON.stringify(payload));
  const signature = btoa(`signature-${userId}-${organizationId}`); // Mock signature

  return `${header}.${payloadEncoded}.${signature}`;
};

// Validate JWT token and extract organization context
export const validateOrganizationJWT = (token: string): OrganizationContext => {
  try {
    const parts = token.split('.');

    if (parts.length !== 3) {
      throw new Error('Invalid token format');
    }

    const payload = JSON.parse(atob(parts[1])) as JWTPayload;

    // Check if token is expired
    if (payload.exp < Math.floor(Date.now() / 1000)) {
      throw new Error('Token expired');
    }

    // Validate required fields
    if (!payload.sub || !payload.organization_id) {
      throw new Error('Invalid token payload');
    }

    return {
      userId: payload.sub,
      organizationId: payload.organization_id,
      role: payload.role,
    };
  } catch (error) {
    throw new Error(
      `Invalid token: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
};

// Extract organization context from request headers
export const getOrganizationContextFromRequest = (
  request: Request
): OrganizationContext | null => {
  try {
    const authHeader = request.headers.get('authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    return validateOrganizationJWT(token);
  } catch (error) {
    console.error('Failed to extract organization context:', error);
    return null;
  }
};

// Create cache key with organization isolation
export const createOrganizationCacheKey = (
  organizationId: string,
  resourceType: string,
  resourceId?: string
): string => {
  const baseKey = `${organizationId}:${resourceType}`;
  return resourceId ? `${baseKey}:${resourceId}` : baseKey;
};

// Validate organization access for a user
export const validateOrganizationAccess = (
  userOrganizationId: string,
  requestedOrganizationId: string,
  userRole: string
): boolean => {
  // Super admins can access any organization
  if (userRole === 'super_admin') {
    return true;
  }

  // Other users can only access their own organization
  return userOrganizationId === requestedOrganizationId;
};

// Create organization-scoped database query
export const createOrganizationQuery = (
  baseQuery: Record<string, unknown>,
  organizationId: string,
  userRole: string
) => {
  // Super admins can query across organizations
  if (userRole === 'super_admin') {
    return baseQuery;
  }

  // Other users are restricted to their organization
  return (baseQuery as { eq: (key: string, value: string) => unknown }).eq(
    'organization_id',
    organizationId
  );
};

// Middleware for JWT validation
export const withJWTValidation = (
  handler: (req: Request, context: OrganizationContext) => Promise<Response>
) => {
  return async (req: Request) => {
    try {
      const context = getOrganizationContextFromRequest(req);

      if (!context) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      return handler(req, context);
    } catch (error) {
      return new Response(
        JSON.stringify({
          error: 'Invalid token',
          details: error instanceof Error ? error.message : 'Unknown error',
        }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
  };
};

// Helper function to check admin permissions
const hasAdminPermissions = (userRole: string): boolean => {
  return userRole === 'org_admin' || userRole === 'super_admin';
};

// Helper function to check mentor permissions
const hasMentorPermissions = (userRole: string): boolean => {
  return userRole === 'mentor' || hasAdminPermissions(userRole);
};

// Helper function to check learner permissions
const hasLearnerPermissions = (userRole: string): boolean => {
  return userRole === 'learner' || hasAdminPermissions(userRole);
};

// Utility to check if user can perform action in organization
export const canPerformAction = (
  userRole: string,
  targetOrganizationId: string,
  userOrganizationId: string,
  action: string
): boolean => {
  // Super admins can perform any action
  if (userRole === 'super_admin') {
    return true;
  }

  // Users can only perform actions in their own organization
  if (userOrganizationId !== targetOrganizationId) {
    return false;
  }

  // Role-based action permissions
  switch (action) {
    case 'create_organization':
      return userRole === 'super_admin';

    case 'manage_users':
      return hasAdminPermissions(userRole);

    case 'create_courses':
      return hasMentorPermissions(userRole);

    case 'enroll_courses':
      return hasLearnerPermissions(userRole);

    case 'view_analytics':
      return hasAdminPermissions(userRole);

    default:
      return false;
  }
};

// Token refresh utility
export const refreshOrganizationJWT = (
  currentToken: string,
  newExpiresIn: number = 24 * 60 * 60
): string => {
  const context = validateOrganizationJWT(currentToken);
  return createOrganizationJWT(
    context.userId,
    context.organizationId,
    context.role as 'super_admin' | 'org_admin' | 'mentor' | 'learner',
    newExpiresIn
  );
};
