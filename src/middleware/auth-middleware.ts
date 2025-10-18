import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";

import { createServerClient } from "@supabase/ssr";

export interface OrganizationContext {
  organizationId: string;
  userId: string;
  role: string;
}

export interface AuthContext extends OrganizationContext {
  isAuthenticated: boolean;
  isSuperAdmin: boolean;
  isOrgAdmin: boolean;
  isMentor: boolean;
  isLearner: boolean;
}

/**
 * Multi-tenant middleware that extracts organization context from JWT tokens
 * and enforces tenant isolation for all requests
 */
export async function authMiddleware(req: NextRequest): Promise<NextResponse> {
  const { pathname } = req.nextUrl;
  
  try {
    // Create Supabase client for server-side operations
    const cookieStore = await cookies();
    const supabase = createServerClient(
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

    // Get the current user session
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      // No authenticated user - redirect to login for protected routes
      if (pathname.startsWith('/dashboard') || pathname.startsWith('/api/')) {
        return NextResponse.redirect(new URL('/auth/login', req.url));
      }
      return NextResponse.next();
    }

    // Extract organization context from user metadata
    const organizationId = user.user_metadata?.organization_id;
    const role = user.user_metadata?.role || 'learner';

    if (!organizationId) {
      // User has no organization context - this is an error state
      console.error('User has no organization context:', user.id);
      return NextResponse.redirect(new URL('/unauthorized', req.url));
    }

    // Create organization context
    const orgContext: OrganizationContext = {
      organizationId,
      userId: user.id,
      role,
    };

    // Create auth context with role flags
    const authContext: AuthContext = {
      ...orgContext,
      isAuthenticated: true,
      isSuperAdmin: role === 'super_admin',
      isOrgAdmin: role === 'org_admin',
      isMentor: role === 'mentor',
      isLearner: role === 'learner',
    };

    // Add organization context to request headers for downstream processing
    const requestHeaders = new Headers(req.headers);
    requestHeaders.set('x-organization-id', organizationId);
    requestHeaders.set('x-user-id', user.id);
    requestHeaders.set('x-user-role', role);

    // Handle role-based route protection
    if (pathname.startsWith('/admin') && !authContext.isSuperAdmin && !authContext.isOrgAdmin) {
      return NextResponse.redirect(new URL('/unauthorized', req.url));
    }

    if (pathname.startsWith('/mentor') && !authContext.isMentor && !authContext.isOrgAdmin && !authContext.isSuperAdmin) {
      return NextResponse.redirect(new URL('/unauthorized', req.url));
    }

    // Redirect authenticated users away from auth pages
    if (pathname === '/auth/login' || pathname === '/auth/register') {
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }

    // Continue with the request, adding organization context
    const response = NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });

    // Add organization context to response headers for client-side access
    response.headers.set('x-organization-id', organizationId);
    response.headers.set('x-user-role', role);

    return response;

  } catch (error) {
    console.error('Auth middleware error:', error);
    
    // On error, redirect to login for protected routes
    if (pathname.startsWith('/dashboard') || pathname.startsWith('/api/')) {
      return NextResponse.redirect(new URL('/auth/login', req.url));
    }
    
    return NextResponse.next();
  }
}

/**
 * Extract organization context from request headers
 * Used by API routes and server components
 */
export function getOrganizationContext(req: NextRequest): OrganizationContext | null {
  const organizationId = req.headers.get('x-organization-id');
  const userId = req.headers.get('x-user-id');
  const role = req.headers.get('x-user-role');

  if (!organizationId || !userId || !role) {
    return null;
  }

  return {
    organizationId,
    userId,
    role,
  };
}

/**
 * Validate that a user has access to a specific organization
 */
export function validateOrganizationAccess(
  context: OrganizationContext | null,
  targetOrganizationId: string
): boolean {
  if (!context) {
    return false;
  }

  // Super admins can access all organizations
  if (context.role === 'super_admin') {
    return true;
  }

  // Regular users can only access their own organization
  return context.organizationId === targetOrganizationId;
}
