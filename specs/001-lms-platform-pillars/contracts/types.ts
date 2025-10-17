// API Types for LogosLMS
// Generated from OpenAPI specification

export type UserRole = 'super_admin' | 'org_admin' | 'mentor' | 'learner';
export type CourseStatus = 'draft' | 'published' | 'archived';

// Authentication Types
export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: User;
  token: string;
  refreshToken: string;
}

// User Types
export interface User {
  id: string;
  email: string;
  organization_id: string;
  role: UserRole;
  profile_data: {
    name: string;
    avatar?: string;
  };
  points: number;
  level: number;
  created_at: string;
  updated_at: string;
}

export interface UpdateProfileRequest {
  name?: string;
  avatar?: string;
}

// Organization Types
export interface Organization {
  id: string;
  name: string;
  slug: string;
  domain?: string;
  branding_config?: {
    logo?: string;
    primary_color?: string;
    secondary_color?: string;
  };
  theme_config?: {
    css_variables?: Record<string, string>;
    tailwind_tokens?: Record<string, string>;
  };
  settings?: {
    ai_enabled?: boolean;
    gamification_enabled?: boolean;
    features?: string[];
  };
  created_at: string;
  updated_at: string;
}

export interface CreateOrganizationRequest {
  name: string;
  slug: string;
  domain?: string;
  branding_config?: Organization['branding_config'];
  theme_config?: Organization['theme_config'];
}

export interface UpdateOrganizationRequest {
  name?: string;
  branding_config?: Organization['branding_config'];
  theme_config?: Organization['theme_config'];
  settings?: Organization['settings'];
}

// Course Types
export interface Course {
  id: string;
  organization_id: string;
  title: string;
  description?: string;
  content: {
    lessons?: Lesson[];
    metadata?: Record<string, any>;
  };
  status: CourseStatus;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface Lesson {
  id: string;
  course_id: string;
  title: string;
  content: {
    type: 'text' | 'video' | 'quiz' | 'assignment';
    data: any;
  };
  order_index: number;
  created_at: string;
  updated_at: string;
}

export interface CreateCourseRequest {
  title: string;
  description?: string;
  content?: Course['content'];
}

export interface UpdateCourseRequest {
  title?: string;
  description?: string;
  content?: Course['content'];
  status?: CourseStatus;
}

// Enrollment Types
export interface Enrollment {
  id: string;
  user_id: string;
  course_id: string;
  enrolled_at: string;
  completed_at?: string;
  progress: {
    lessons_completed: number;
    total_lessons: number;
    quiz_scores: Record<string, number>;
    last_accessed_at: string;
  };
}

// Invitation Types
export interface InviteUserRequest {
  email: string;
  role: Exclude<UserRole, 'super_admin'>;
}

export interface Invitation {
  id: string;
  organization_id: string;
  email: string;
  role: Exclude<UserRole, 'super_admin'>;
  token: string;
  expires_at: string;
  created_at: string;
}

// AI Coaching Types
export interface AnalyzeProgressRequest {
  user_id: string;
  course_id?: string;
}

export interface ProgressAnalysis {
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  confidence_score: number;
}

export interface SuggestRequest {
  user_id: string;
  context?: string;
}

export interface LearningSuggestions {
  next_lessons: string[];
  study_techniques: string[];
  resources: string[];
}

// Gamification Types
export interface LeaderboardEntry {
  user_id: string;
  name: string;
  points: number;
  level: number;
  rank: number;
}

export interface Leaderboard {
  users: LeaderboardEntry[];
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  earned_at: string;
}

// API Response Types
export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface ApiError {
  error: string;
  message: string;
  details?: Record<string, any>;
}

// Pagination Types
export interface PaginationParams {
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}

// Multi-tenant Context
export interface TenantContext {
  organization_id: string;
  user_id: string;
  role: UserRole;
}

// Server Action Types (for Next.js server actions)
export interface ServerActionResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// Form Validation Types
export interface ValidationError {
  field: string;
  message: string;
}

export interface FormState<T> {
  data: T;
  errors: ValidationError[];
  isSubmitting: boolean;
  isValid: boolean;
}

// UI Component Props Types
export interface CourseCardProps {
  course: Course;
  onEnroll?: (courseId: string) => void;
  onView?: (courseId: string) => void;
}

export interface UserProfileProps {
  user: User;
  onUpdate?: (data: UpdateProfileRequest) => void;
}

export interface OrganizationSwitcherProps {
  organizations: Organization[];
  currentOrganization: Organization;
  onSwitch: (organizationId: string) => void;
}

// Hook Types
export interface UseAuthReturn {
  user: User | null;
  isLoading: boolean;
  login: (credentials: LoginRequest) => Promise<AuthResponse>;
  register: (data: RegisterRequest) => Promise<AuthResponse>;
  logout: () => Promise<void>;
  updateProfile: (data: UpdateProfileRequest) => Promise<User>;
}

export interface UseCoursesReturn {
  courses: Course[];
  isLoading: boolean;
  createCourse: (data: CreateCourseRequest) => Promise<Course>;
  updateCourse: (id: string, data: UpdateCourseRequest) => Promise<Course>;
  enrollInCourse: (courseId: string) => Promise<Enrollment>;
}

export interface UseGamificationReturn {
  points: number;
  level: number;
  badges: Badge[];
  leaderboard: Leaderboard;
  isLoading: boolean;
  refreshData: () => Promise<void>;
}

// Event Types (for real-time features)
export interface CourseProgressEvent {
  type: 'course_progress';
  user_id: string;
  course_id: string;
  lesson_id: string;
  progress: number;
  timestamp: string;
}

export interface QuizCompletedEvent {
  type: 'quiz_completed';
  user_id: string;
  quiz_id: string;
  score: number;
  timestamp: string;
}

export interface BadgeEarnedEvent {
  type: 'badge_earned';
  user_id: string;
  badge: Badge;
  timestamp: string;
}

export type RealtimeEvent = CourseProgressEvent | QuizCompletedEvent | BadgeEarnedEvent;
