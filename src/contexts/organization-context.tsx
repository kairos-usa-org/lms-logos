"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";

import { createClientComponentClient } from "@supabase/ssr";
import { User } from "@supabase/supabase-js";

export interface OrganizationContext {
  organizationId: string | null;
  userId: string | null;
  role: string | null;
  isAuthenticated: boolean;
  isSuperAdmin: boolean;
  isOrgAdmin: boolean;
  isMentor: boolean;
  isLearner: boolean;
  user: User | null;
  loading: boolean;
}

export interface OrganizationProviderProps {
  children: ReactNode;
}

const OrganizationContext = createContext<OrganizationContext | undefined>(
  undefined,
);

/**
 * Organization context provider that manages multi-tenant state
 * and provides organization context throughout the application
 */
export function OrganizationProvider({ children }: OrganizationProviderProps) {
  const [context, setContext] = useState<OrganizationContext>({
    organizationId: null,
    userId: null,
    role: null,
    isAuthenticated: false,
    isSuperAdmin: false,
    isOrgAdmin: false,
    isMentor: false,
    isLearner: false,
    user: null,
    loading: true,
  });

  const supabase = createClientComponentClient();

  useEffect(() => {
    let mounted = true;

    // Get initial session
    const getInitialSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error getting session:', error);
          if (mounted) {
            setContext(prev => ({ ...prev, loading: false }));
          }
          return;
        }

        if (session?.user) {
          updateContextFromUser(session.user);
        } else {
          if (mounted) {
            setContext(prev => ({
              ...prev,
              organizationId: null,
              userId: null,
              role: null,
              isAuthenticated: false,
              isSuperAdmin: false,
              isOrgAdmin: false,
              isMentor: false,
              isLearner: false,
              user: null,
              loading: false,
            }));
          }
        }
      } catch (error) {
        console.error('Error in getInitialSession:', error);
        if (mounted) {
          setContext(prev => ({ ...prev, loading: false }));
        }
      }
    };

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      async (event: string, session: any) => {
        if (!mounted) return;

        if (event === "SIGNED_IN" && session?.user) {
          updateContextFromUser(session.user);
        } else if (event === "SIGNED_OUT") {
          setContext((prev) => ({
            ...prev,
            organizationId: null,
            userId: null,
            role: null,
            isAuthenticated: false,
            isSuperAdmin: false,
            isOrgAdmin: false,
            isMentor: false,
            isLearner: false,
            user: null,
            loading: false,
          }));
        }
      }
    );

    getInitialSession();

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [supabase.auth]);

  const updateContextFromUser = (user: User) => {
    const organizationId = user.user_metadata?.organization_id || null;
    const role = user.user_metadata?.role || 'learner';

    setContext({
      organizationId,
      userId: user.id,
      role,
      isAuthenticated: true,
      isSuperAdmin: role === 'super_admin',
      isOrgAdmin: role === 'org_admin',
      isMentor: role === 'mentor',
      isLearner: role === 'learner',
      user,
      loading: false,
    });
  };

  return (
    <OrganizationContext.Provider value={context}>
      {children}
    </OrganizationContext.Provider>
  );
}

/**
 * Hook to access organization context
 * Must be used within OrganizationProvider
 */
export function useOrganization(): OrganizationContext {
  const context = useContext(OrganizationContext);
  
  if (context === undefined) {
    throw new Error('useOrganization must be used within an OrganizationProvider');
  }
  
  return context;
}

/**
 * Hook to check if user has specific role
 */
export function useRole(requiredRole: string): boolean {
  const { role } = useOrganization();
  return role === requiredRole;
}

/**
 * Hook to check if user has any of the specified roles
 */
export function useAnyRole(requiredRoles: string[]): boolean {
  const { role } = useOrganization();
  return role ? requiredRoles.includes(role) : false;
}

/**
 * Hook to check if user can access organization
 */
export function useCanAccessOrganization(targetOrganizationId: string): boolean {
  const { organizationId, role } = useOrganization();
  
  if (!organizationId) return false;
  
  // Super admins can access all organizations
  if (role === 'super_admin') return true;
  
  // Regular users can only access their own organization
  return organizationId === targetOrganizationId;
}

/**
 * Hook to get organization-specific cache key
 */
export function useCacheKey(resourceType: string, resourceId: string): string {
  const { organizationId } = useOrganization();
  
  if (!organizationId) {
    throw new Error('Cannot create cache key without organization context');
  }
  
  return `${organizationId}:${resourceType}:${resourceId}`;
}

/**
 * Hook to get user's organization context for API calls
 */
export function useOrganizationHeaders(): Record<string, string> {
  const { organizationId, userId, role } = useOrganization();
  
  if (!organizationId || !userId || !role) {
    return {};
  }
  
  return {
    'x-organization-id': organizationId,
    'x-user-id': userId,
    'x-user-role': role,
  };
}
