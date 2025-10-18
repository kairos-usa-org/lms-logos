import { supabase, supabaseAdmin, getOrganizationContext, createCacheKey } from './supabase';
import { Database } from './supabase';

// Type definitions for better type safety
export type Tables = Database['public']['Tables'];
export type TableName = keyof Tables;
export type TableRow<T extends TableName> = Tables[T]['Row'];
export type TableInsert<T extends TableName> = Tables[T]['Insert'];
export type TableUpdate<T extends TableName> = Tables[T]['Update'];

// Cache configuration
const CACHE_TTL = {
  SHORT: 5 * 60 * 1000, // 5 minutes
  MEDIUM: 30 * 60 * 1000, // 30 minutes
  LONG: 2 * 60 * 60 * 1000, // 2 hours
  VERY_LONG: 24 * 60 * 60 * 1000, // 24 hours
};

export class DatabaseUtils {
  /**
   * Get data from cache or database with organization isolation
   */
  static async getCachedData<T>(
    organizationId: string,
    resourceType: string,
    resourceId: string | null,
    fetcher: () => Promise<T>,
    ttl: number = CACHE_TTL.MEDIUM
  ): Promise<T> {
    const cacheKey = createCacheKey(organizationId, resourceType, resourceId);
    
    try {
      // Try to get from cache first
      const { data: cachedData, error: cacheError } = await supabase
        .from('cache')
        .select('value, expires_at')
        .eq('organization_id', organizationId)
        .eq('key', cacheKey)
        .single();

      if (!cacheError && cachedData) {
        const now = new Date();
        const expiresAt = new Date(cachedData.expires_at);
        
        if (expiresAt > now) {
          return cachedData.value as T;
        }
      }

      // Cache miss or expired, fetch from database
      const data = await fetcher();
      
      // Store in cache
      const expiresAt = new Date(Date.now() + ttl);
      await supabase
        .from('cache')
        .upsert({
          organization_id: organizationId,
          key: cacheKey,
          value: data,
          expires_at: expiresAt.toISOString()
        });

      return data;
    } catch (error) {
      console.error('Cache error, falling back to database:', error);
      return await fetcher();
    }
  }

  /**
   * Invalidate cache for a specific resource
   */
  static async invalidateCache(
    organizationId: string,
    resourceType: string,
    resourceId?: string
  ): Promise<void> {
    const cacheKey = createCacheKey(organizationId, resourceType, resourceId);
    
    await supabase
      .from('cache')
      .delete()
      .eq('organization_id', organizationId)
      .eq('key', cacheKey);
  }

  /**
   * Invalidate all cache for an organization
   */
  static async invalidateOrganizationCache(organizationId: string): Promise<void> {
    await supabase
      .from('cache')
      .delete()
      .eq('organization_id', organizationId);
  }

  /**
   * Get user with organization context
   */
  static async getUserWithContext(userId: string) {
    const { data: user, error } = await supabase
      .from('users')
      .select(`
        *,
        organization:organizations(*)
      `)
      .eq('id', userId)
      .single();

    if (error || !user) {
      throw new Error('User not found');
    }

    return user;
  }

  /**
   * Get organization by ID with proper RLS
   */
  static async getOrganization(organizationId: string) {
    const { data: organization, error } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', organizationId)
      .single();

    if (error || !organization) {
      throw new Error('Organization not found');
    }

    return organization;
  }

  /**
   * Get courses for an organization
   */
  static async getOrganizationCourses(
    organizationId: string,
    options: {
      status?: 'draft' | 'published' | 'archived';
      createdBy?: string;
      limit?: number;
      offset?: number;
    } = {}
  ) {
    let query = supabase
      .from('courses')
      .select(`
        *,
        creator:users!courses_created_by_fkey(email, profile_data),
        lessons:lessons(id, title, order_index),
        quizzes:quizzes(id, title, passing_score),
        enrollments:course_enrollments(count)
      `)
      .eq('organization_id', organizationId);

    if (options.status) {
      query = query.eq('status', options.status);
    }

    if (options.createdBy) {
      query = query.eq('created_by', options.createdBy);
    }

    if (options.limit) {
      query = query.limit(options.limit);
    }

    if (options.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
    }

    const { data: courses, error } = await query.order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Error fetching courses: ${error.message}`);
    }

    return courses || [];
  }

  /**
   * Get user enrollments with course details
   */
  static async getUserEnrollments(
    userId: string,
    options: {
      status?: 'enrolled' | 'completed';
      limit?: number;
      offset?: number;
    } = {}
  ) {
    let query = supabase
      .from('course_enrollments')
      .select(`
        *,
        course:courses(
          id,
          title,
          description,
          status,
          organization:organizations(name, slug)
        )
      `)
      .eq('user_id', userId);

    if (options.status === 'completed') {
      query = query.not('completed_at', 'is', null);
    } else if (options.status === 'enrolled') {
      query = query.is('completed_at', null);
    }

    if (options.limit) {
      query = query.limit(options.limit);
    }

    if (options.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
    }

    const { data: enrollments, error } = await query.order('enrolled_at', { ascending: false });

    if (error) {
      throw new Error(`Error fetching enrollments: ${error.message}`);
    }

    return enrollments || [];
  }

  /**
   * Enroll user in a course
   */
  static async enrollUserInCourse(userId: string, courseId: string) {
    // First, verify the course exists and is published
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('id, status, organization_id')
      .eq('id', courseId)
      .eq('status', 'published')
      .single();

    if (courseError || !course) {
      throw new Error('Course not found or not published');
    }

    // Check if user is already enrolled
    const { data: existingEnrollment } = await supabase
      .from('course_enrollments')
      .select('id')
      .eq('user_id', userId)
      .eq('course_id', courseId)
      .single();

    if (existingEnrollment) {
      throw new Error('User is already enrolled in this course');
    }

    // Create enrollment
    const { data: enrollment, error: enrollmentError } = await supabase
      .from('course_enrollments')
      .insert({
        user_id: userId,
        course_id: courseId,
        progress_percentage: 0
      })
      .select()
      .single();

    if (enrollmentError) {
      throw new Error(`Error creating enrollment: ${enrollmentError.message}`);
    }

    // Invalidate user's enrollment cache
    const userContext = await getOrganizationContext(userId);
    await this.invalidateCache(userContext.organizationId, 'enrollments', userId);

    return enrollment;
  }

  /**
   * Update course progress
   */
  static async updateCourseProgress(
    userId: string,
    courseId: string,
    progressPercentage: number
  ) {
    const { data: enrollment, error } = await supabase
      .from('course_enrollments')
      .update({
        progress_percentage: Math.min(100, Math.max(0, progressPercentage)),
        completed_at: progressPercentage >= 100 ? new Date().toISOString() : null
      })
      .eq('user_id', userId)
      .eq('course_id', courseId)
      .select()
      .single();

    if (error) {
      throw new Error(`Error updating progress: ${error.message}`);
    }

    // Invalidate cache
    const userContext = await getOrganizationContext(userId);
    await this.invalidateCache(userContext.organizationId, 'enrollments', userId);

    return enrollment;
  }

  /**
   * Get user badges and achievements
   */
  static async getUserBadges(userId: string) {
    const { data: badges, error } = await supabase
      .from('user_badges')
      .select(`
        *,
        badge:badges(*)
      `)
      .eq('user_id', userId)
      .order('earned_at', { ascending: false });

    if (error) {
      throw new Error(`Error fetching user badges: ${error.message}`);
    }

    return badges || [];
  }

  /**
   * Award badge to user
   */
  static async awardBadgeToUser(userId: string, badgeId: string) {
    // Check if user already has this badge
    const { data: existingBadge } = await supabase
      .from('user_badges')
      .select('id')
      .eq('user_id', userId)
      .eq('badge_id', badgeId)
      .single();

    if (existingBadge) {
      return null; // User already has this badge
    }

    // Award the badge
    const { data: userBadge, error } = await supabase
      .from('user_badges')
      .insert({
        user_id: userId,
        badge_id: badgeId
      })
      .select(`
        *,
        badge:badges(*)
      `)
      .single();

    if (error) {
      throw new Error(`Error awarding badge: ${error.message}`);
    }

    // Invalidate cache
    const userContext = await getOrganizationContext(userId);
    await this.invalidateCache(userContext.organizationId, 'user_badges', userId);

    return userBadge;
  }

  /**
   * Log audit event
   */
  static async logAuditEvent(
    userId: string | null,
    organizationId: string | null,
    action: string,
    resourceType: string | null,
    resourceId: string | null,
    details: any,
    outcome: 'success' | 'failure' | 'error',
    ipAddress?: string,
    userAgent?: string
  ) {
    const { error } = await supabaseAdmin
      .from('audit_logs')
      .insert({
        user_id: userId,
        organization_id: organizationId,
        action,
        resource_type: resourceType,
        resource_id: resourceId,
        details,
        outcome,
        ip_address: ipAddress,
        user_agent: userAgent
      });

    if (error) {
      console.error('Error logging audit event:', error);
    }
  }

  /**
   * Get audit logs for an organization
   */
  static async getAuditLogs(
    organizationId: string,
    options: {
      userId?: string;
      action?: string;
      limit?: number;
      offset?: number;
      startDate?: string;
      endDate?: string;
    } = {}
  ) {
    let query = supabase
      .from('audit_logs')
      .select(`
        *,
        user:users(email, profile_data)
      `)
      .eq('organization_id', organizationId);

    if (options.userId) {
      query = query.eq('user_id', options.userId);
    }

    if (options.action) {
      query = query.eq('action', options.action);
    }

    if (options.startDate) {
      query = query.gte('timestamp', options.startDate);
    }

    if (options.endDate) {
      query = query.lte('timestamp', options.endDate);
    }

    if (options.limit) {
      query = query.limit(options.limit);
    }

    if (options.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 50) - 1);
    }

    const { data: logs, error } = await query.order('timestamp', { ascending: false });

    if (error) {
      throw new Error(`Error fetching audit logs: ${error.message}`);
    }

    return logs || [];
  }

  /**
   * Clean up expired cache entries
   */
  static async cleanupExpiredCache() {
    const { error } = await supabaseAdmin
      .from('cache')
      .delete()
      .lt('expires_at', new Date().toISOString());

    if (error) {
      console.error('Error cleaning up expired cache:', error);
    }
  }

  /**
   * Get database statistics
   */
  static async getDatabaseStats(organizationId: string) {
    const [
      usersCount,
      coursesCount,
      enrollmentsCount,
      badgesCount
    ] = await Promise.all([
      supabase.from('users').select('id', { count: 'exact' }).eq('organization_id', organizationId),
      supabase.from('courses').select('id', { count: 'exact' }).eq('organization_id', organizationId),
      supabase.from('course_enrollments').select('id', { count: 'exact' }).eq('user_id', 
        supabase.from('users').select('id').eq('organization_id', organizationId)
      ),
      supabase.from('badges').select('id', { count: 'exact' }).eq('organization_id', organizationId)
    ]);

    return {
      users: usersCount.count || 0,
      courses: coursesCount.count || 0,
      enrollments: enrollmentsCount.count || 0,
      badges: badgesCount.count || 0
    };
  }
}

// Export commonly used types
export type UserWithOrganization = TableRow<'users'> & {
  organization: TableRow<'organizations'>;
};

export type CourseWithDetails = TableRow<'courses'> & {
  creator: Pick<TableRow<'users'>, 'email' | 'profile_data'>;
  lessons: Pick<TableRow<'lessons'>, 'id' | 'title' | 'order_index'>[];
  quizzes: Pick<TableRow<'quizzes'>, 'id' | 'title' | 'passing_score'>[];
  enrollments: { count: number }[];
};

export type EnrollmentWithCourse = TableRow<'course_enrollments'> & {
  course: TableRow<'courses'> & {
    organization: Pick<TableRow<'organizations'>, 'name' | 'slug'>;
  };
};

export type UserBadgeWithDetails = TableRow<'user_badges'> & {
  badge: TableRow<'badges'>;
};
