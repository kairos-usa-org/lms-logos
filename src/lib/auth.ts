import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

import { createServerClient } from '@supabase/ssr';

import type { Database } from './supabase';

export type User = Database['public']['Tables']['users']['Row'];
export type UserRole = User['role'];

// Server-side Supabase client for authentication
export const createServerSupabaseClient = async () => {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: Record<string, unknown>) {
          cookieStore.set({ name, value, ...options });
        },
        remove(name: string, options: Record<string, unknown>) {
          cookieStore.set({ name, value: '', ...options });
        },
      },
    }
  );
};

// Get current user with organization context
export const getCurrentUser = async (): Promise<User | null> => {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user: authUser },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !authUser) {
    return null;
  }

  const { data: user, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', authUser.id)
    .single();

  if (error || !user) {
    return null;
  }

  return user;
};

// Check if user has specific role
export const hasRole = (user: User | null, role: UserRole): boolean => {
  if (!user) return false;
  return user.role === role;
};

// Check if user has any of the specified roles
export const hasAnyRole = (user: User | null, roles: UserRole[]): boolean => {
  if (!user) return false;
  return roles.includes(user.role);
};

// Check if user is super admin
export const isSuperAdmin = (user: User | null): boolean => {
  return hasRole(user, 'super_admin');
};

// Check if user is organization admin
export const isOrgAdmin = (user: User | null): boolean => {
  return hasRole(user, 'org_admin');
};

// Check if user is mentor
export const isMentor = (user: User | null): boolean => {
  return hasRole(user, 'mentor');
};

// Check if user is learner
export const isLearner = (user: User | null): boolean => {
  return hasRole(user, 'learner');
};

// Check if user can access organization
export const canAccessOrganization = (
  user: User | null,
  organizationId: string
): boolean => {
  if (!user) return false;
  if (isSuperAdmin(user)) return true;
  return user.organization_id === organizationId;
};

// Middleware for protecting routes
export const withAuth = (
  handler: (req: NextRequest, user: User) => Promise<NextResponse>
) => {
  return async (req: NextRequest) => {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return handler(req, user);
  };
};

// Middleware for role-based access control
export const withRole = (roles: UserRole[]) => {
  return (handler: (req: NextRequest, user: User) => Promise<NextResponse>) => {
    return async (req: NextRequest) => {
      const user = await getCurrentUser();

      if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      if (!hasAnyRole(user, roles)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }

      return handler(req, user);
    };
  };
};

// Middleware for organization access control
export const withOrganizationAccess = (
  handler: (req: NextRequest, user: User) => Promise<NextResponse>
) => {
  return async (req: NextRequest) => {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Extract organization ID from URL or request
    const url = new URL(req.url);
    const organizationId =
      url.searchParams.get('organization_id') ?? url.pathname.split('/')[2]; // Assuming /api/organizations/{id}/...

    if (organizationId && !canAccessOrganization(user, organizationId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return handler(req, user);
  };
};

// JWT utilities for organization context
export const createJWTWithOrganization = (
  userId: string,
  organizationId: string,
  role: UserRole
) => {
  // This would typically use a JWT library like jsonwebtoken
  // For now, we'll return a simple object that can be used for testing
  return {
    sub: userId,
    organization_id: organizationId,
    role: role,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 24 * 60 * 60, // 24 hours
  };
};

// Validate JWT and extract organization context
export const validateJWT = (token: string) => {
  try {
    // In a real implementation, this would verify the JWT signature
    // For now, we'll return a mock validation
    const payload = JSON.parse(atob(token.split('.')[1]));

    if (payload.exp < Math.floor(Date.now() / 1000)) {
      throw new Error('Token expired');
    }

    return {
      userId: payload.sub,
      organizationId: payload.organization_id,
      role: payload.role,
    };
  } catch {
    throw new Error('Invalid token');
  }
};

// Session management
export const createSession = async () => {
  const supabase = await createServerSupabaseClient();

  // Create a session with organization context
  const { data } = await supabase.auth.admin.createUser({
    email_confirm: true,
  });

  return data;
};

// Logout and clear session
export const logout = async () => {
  const supabase = await createServerSupabaseClient();

  const { error } = await supabase.auth.signOut();

  if (error) {
    throw new Error('Failed to logout');
  }
};
