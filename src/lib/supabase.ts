import { createClient } from '@supabase/supabase-js';
import { createBrowserClient } from '@supabase/ssr';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Client-side Supabase client
export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);

// Server-side Supabase client with service role key
export const supabaseAdmin = createClient(
  supabaseUrl,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

// Database types (will be generated from Supabase)
export type Database = {
  public: {
    Tables: {
      organizations: {
        Row: {
          id: string;
          name: string;
          slug: string;
          branding_config: any;
          theme_config: any;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          branding_config?: any;
          theme_config?: any;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          branding_config?: any;
          theme_config?: any;
          created_at?: string;
          updated_at?: string;
        };
      };
      users: {
        Row: {
          id: string;
          email: string;
          organization_id: string;
          role: 'super_admin' | 'org_admin' | 'mentor' | 'learner';
          profile_data: any;
          points: number;
          level: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          email: string;
          organization_id: string;
          role: 'super_admin' | 'org_admin' | 'mentor' | 'learner';
          profile_data?: any;
          points?: number;
          level?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          organization_id?: string;
          role?: 'super_admin' | 'org_admin' | 'mentor' | 'learner';
          profile_data?: any;
          points?: number;
          level?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      groups: {
        Row: {
          id: string;
          organization_id: string;
          name: string;
          description: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          name: string;
          description?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          name?: string;
          description?: string | null;
          created_at?: string;
        };
      };
      courses: {
        Row: {
          id: string;
          organization_id: string;
          title: string;
          description: string | null;
          content: any;
          created_by: string;
          status: 'draft' | 'published' | 'archived';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          title: string;
          description?: string | null;
          content?: any;
          created_by: string;
          status?: 'draft' | 'published' | 'archived';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          title?: string;
          description?: string | null;
          content?: any;
          created_by?: string;
          status?: 'draft' | 'published' | 'archived';
          created_at?: string;
          updated_at?: string;
        };
      };
      lessons: {
        Row: {
          id: string;
          course_id: string;
          title: string;
          content: any;
          order_index: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          course_id: string;
          title: string;
          content?: any;
          order_index: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          course_id?: string;
          title?: string;
          content?: any;
          order_index?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      quizzes: {
        Row: {
          id: string;
          course_id: string;
          title: string;
          questions: any;
          passing_score: number;
          time_limit: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          course_id: string;
          title: string;
          questions?: any;
          passing_score?: number;
          time_limit?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          course_id?: string;
          title?: string;
          questions?: any;
          passing_score?: number;
          time_limit?: number | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      course_enrollments: {
        Row: {
          id: string;
          user_id: string;
          course_id: string;
          enrolled_at: string;
          completed_at: string | null;
          progress_percentage: number;
        };
        Insert: {
          id?: string;
          user_id: string;
          course_id: string;
          enrolled_at?: string;
          completed_at?: string | null;
          progress_percentage?: number;
        };
        Update: {
          id?: string;
          user_id?: string;
          course_id?: string;
          enrolled_at?: string;
          completed_at?: string | null;
          progress_percentage?: number;
        };
      };
      badges: {
        Row: {
          id: string;
          organization_id: string;
          name: string;
          description: string | null;
          icon_url: string | null;
          points_required: number;
          level: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          name: string;
          description?: string | null;
          icon_url?: string | null;
          points_required?: number;
          level?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          name?: string;
          description?: string | null;
          icon_url?: string | null;
          points_required?: number;
          level?: number;
          created_at?: string;
        };
      };
      user_badges: {
        Row: {
          id: string;
          user_id: string;
          badge_id: string;
          earned_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          badge_id: string;
          earned_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          badge_id?: string;
          earned_at?: string;
        };
      };
      audit_logs: {
        Row: {
          id: string;
          timestamp: string;
          user_id: string | null;
          organization_id: string | null;
          action: string;
          resource_type: string | null;
          resource_id: string | null;
          details: any;
          ip_address: string | null;
          user_agent: string | null;
          outcome: 'success' | 'failure' | 'error';
        };
        Insert: {
          id?: string;
          timestamp?: string;
          user_id?: string | null;
          organization_id?: string | null;
          action: string;
          resource_type?: string | null;
          resource_id?: string | null;
          details?: any;
          ip_address?: string | null;
          user_agent?: string | null;
          outcome: 'success' | 'failure' | 'error';
        };
        Update: {
          id?: string;
          timestamp?: string;
          user_id?: string | null;
          organization_id?: string | null;
          action?: string;
          resource_type?: string | null;
          resource_id?: string | null;
          details?: any;
          ip_address?: string | null;
          user_agent?: string | null;
          outcome?: 'success' | 'failure' | 'error';
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

// Helper function to get organization context from user
export const getOrganizationContext = async (userId: string) => {
  const { data: user, error } = await supabase
    .from('users')
    .select('organization_id, role')
    .eq('id', userId)
    .single();

  if (error || !user) {
    throw new Error('User not found or not authenticated');
  }

  return {
    organizationId: user.organization_id,
    role: user.role,
  };
};

// Helper function to create cache key with organization isolation
export const createCacheKey = (
  organizationId: string,
  resourceType: string,
  resourceId?: string
) => {
  return resourceId
    ? `${organizationId}:${resourceType}:${resourceId}`
    : `${organizationId}:${resourceType}`;
};
