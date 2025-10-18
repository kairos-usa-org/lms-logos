/**
 * LogosLMS Platform TypeScript Types
 * Generated: 2025-10-18
 * Purpose: Type definitions for API contracts and data models
 */

// Base types
export type UUID = string;
export type Timestamp = string; // ISO 8601 format

// User roles
export type UserRole = "super_admin" | "org_admin" | "mentor" | "learner";

// Course status
export type CourseStatus = "draft" | "published" | "archived";

// AI content types
export type ContentType = "lesson" | "quiz" | "assignment" | "explanation";
export type DifficultyLevel = "beginner" | "intermediate" | "advanced";
export type LearningStyle = "visual" | "auditory" | "kinesthetic" | "reading";

// Audit log outcomes
export type AuditOutcome = "success" | "failure" | "error";

// API response types
export interface ApiResponse<T> {
  data: T;
  message?: string;
  success: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// User types
export interface User {
  id: UUID;
  email: string;
  role: UserRole;
  organizationId: UUID;
  profileData: UserProfileData;
  points: number;
  level: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface UserProfileData {
  firstName?: string;
  lastName?: string;
  avatar?: string;
  preferences?: UserPreferences;
}

export interface UserPreferences {
  theme?: "light" | "dark" | "auto";
  notifications?: NotificationSettings;
  accessibility?: AccessibilitySettings;
}

export interface NotificationSettings {
  email: boolean;
  push: boolean;
  courseUpdates: boolean;
  aiCoaching: boolean;
  achievements: boolean;
}

export interface AccessibilitySettings {
  highContrast: boolean;
  largeText: boolean;
  screenReader: boolean;
  keyboardNavigation: boolean;
}

// Organization types
export interface Organization {
  id: UUID;
  name: string;
  slug: string;
  brandingConfig: BrandingConfig;
  themeConfig: ThemeConfig;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface BrandingConfig {
  logo?: string;
  primaryColor?: string;
  secondaryColor?: string;
  customCss?: string;
}

export interface ThemeConfig {
  name: string;
  variables: Record<string, string>;
}

// Group types
export interface Group {
  id: UUID;
  organizationId: UUID;
  name: string;
  description?: string;
  createdAt: Timestamp;
}

// Course types
export interface Course {
  id: UUID;
  organizationId: UUID;
  title: string;
  description?: string;
  content: CourseContent;
  status: CourseStatus;
  createdBy: UUID;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface CourseContent {
  lessons: Lesson[];
  quizzes: Quiz[];
  metadata: CourseMetadata;
}

export interface CourseMetadata {
  estimatedDuration?: number; // in minutes
  prerequisites?: string[];
  learningObjectives?: string[];
  tags?: string[];
}

// Lesson types
export interface Lesson {
  id: UUID;
  courseId: UUID;
  title: string;
  content: LessonContent;
  orderIndex: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface LessonContent {
  type: "text" | "video" | "interactive" | "document";
  data: Record<string, unknown>;
  resources?: Resource[];
}

export interface Resource {
  id: string;
  type: "file" | "link" | "video" | "image";
  url: string;
  title: string;
  description?: string;
}

// Quiz types
export interface Quiz {
  id: UUID;
  courseId: UUID;
  title: string;
  questions: QuizQuestion[];
  passingScore: number;
  timeLimit?: number; // in minutes
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface QuizQuestion {
  id: string;
  type: "multiple_choice" | "true_false" | "short_answer" | "essay";
  question: string;
  options?: string[]; // for multiple choice
  correctAnswer?: string | string[];
  points: number;
  explanation?: string;
}

// Enrollment types
export interface CourseEnrollment {
  id: UUID;
  userId: UUID;
  courseId: UUID;
  enrolledAt: Timestamp;
  completedAt?: Timestamp;
  progressPercentage: number;
}

// Badge types
export interface Badge {
  id: UUID;
  organizationId: UUID;
  name: string;
  description: string;
  iconUrl: string;
  pointsRequired: number;
  level: number;
  createdAt: Timestamp;
}

export interface UserBadge {
  id: UUID;
  userId: UUID;
  badgeId: UUID;
  earnedAt: Timestamp;
}

// Audit log types
export interface AuditLog {
  id: UUID;
  timestamp: Timestamp;
  userId: UUID;
  organizationId: UUID;
  action: string;
  resourceType: string;
  resourceId?: UUID;
  details: Record<string, unknown>;
  ipAddress: string;
  userAgent: string;
  outcome: AuditOutcome;
}

// API request/response types
export interface RegisterRequest {
  email: string;
  password: string;
  organizationId: UUID;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  user: User;
  token: string;
  organizationId: UUID;
}

export interface CreateOrganizationRequest {
  name: string;
  slug: string;
  brandingConfig?: BrandingConfig;
  themeConfig?: ThemeConfig;
}

export interface UpdateOrganizationRequest {
  name?: string;
  brandingConfig?: BrandingConfig;
  themeConfig?: ThemeConfig;
}

export interface InviteUserRequest {
  email: string;
  role: UserRole;
}

export interface InvitationResponse {
  id: UUID;
  email: string;
  role: UserRole;
  status: "pending" | "accepted" | "expired";
}

export interface UpdateProfileRequest {
  profileData: Partial<UserProfileData>;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface CreateCourseRequest {
  title: string;
  description?: string;
  content?: CourseContent;
}

export interface UpdateCourseRequest {
  title?: string;
  description?: string;
  content?: CourseContent;
  status?: CourseStatus;
}

// AI coaching types
export interface CoachingAnalysisRequest {
  userId: UUID;
  courseId: UUID;
}

export interface CoachingAnalysisResponse {
  progress: number;
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
}

export interface CoachingSuggestionRequest {
  userId: UUID;
  courseId: UUID;
  question: string;
  learningStyle?: LearningStyle;
}

export interface CoachingSuggestionResponse {
  suggestions: string[];
  resources: string[];
}

// AI content types
export interface ContentGenerationRequest {
  type: ContentType;
  topic: string;
  difficulty: DifficultyLevel;
  context?: string;
}

export interface ContentGenerationResponse {
  id: UUID;
  content: Record<string, unknown>;
  status: "pending" | "approved" | "rejected";
}

export interface RejectContentRequest {
  reason: string;
}

// Motivation types
export interface LeaderboardResponse {
  users: LeaderboardUser[];
}

export interface LeaderboardUser {
  userId: UUID;
  name: string;
  points: number;
  level: number;
}

export interface AwardPointsRequest {
  userId: UUID;
  points: number;
  reason: string;
}

// Error types
export interface ApiError {
  error: string;
  message: string;
  code: string;
  details?: Record<string, unknown>;
}

// Cache key types
export interface CacheKey {
  organizationId: UUID;
  resourceType: string;
  resourceId: UUID;
}

export function createCacheKey(
  organizationId: UUID,
  resourceType: string,
  resourceId: UUID
): string {
  return `${organizationId}:${resourceType}:${resourceId}`;
}

// JWT payload types
export interface JWTPayload {
  sub: UUID; // user id
  email: string;
  role: UserRole;
  organizationId: UUID;
  iat: number;
  exp: number;
}

// Form validation types
export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface FormState<T> {
  data: T;
  errors: ValidationError[];
  isValid: boolean;
  isSubmitting: boolean;
}

// UI component prop types
export interface OrganizationData {
  name: string;
  slug: string;
  brandingConfig?: BrandingConfig;
  themeConfig?: ThemeConfig;
}

export interface InvitationData {
  email: string;
  role: UserRole;
}

export interface ProfileData {
  firstName?: string;
  lastName?: string;
  avatar?: string;
  preferences?: UserPreferences;
}

export interface CourseData {
  title: string;
  description?: string;
  content: CourseContent;
  status: CourseStatus;
}

export interface CoachingRequest {
  userId: UUID;
  courseId: UUID;
  question: string;
  learningStyle?: LearningStyle;
}

export interface CoachingResponse {
  suggestions: string[];
  resources: string[];
  analysis?: CoachingAnalysisResponse;
}

export interface ContentData {
  id: UUID;
  type: ContentType;
  content: Record<string, unknown>;
  status: "pending" | "approved" | "rejected";
}

// Utility types
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;
export type PartialExcept<T, K extends keyof T> = Partial<T> & Pick<T, K>;

// Resend email types
export interface ResendEmailRequest {
  to: string;
  subject: string;
  html: string;
  from?: string;
  replyTo?: string;
}

export interface ResendEmailResponse {
  id: string;
  from: string;
  to: string[];
  created_at: string;
}

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  html: string;
  variables: string[];
}

// Supabase project configuration
export const SUPABASE_CONFIG = {
  projectRef: "sdxiwingetjnbxrkfpbg",
  url: "https://sdxiwingetjnbxrkfpbg.supabase.co",
} as const;

// API endpoint types
export type ApiEndpoint =
  | "POST /auth/register"
  | "POST /auth/login"
  | "POST /auth/logout"
  | "GET /auth/me"
  | "GET /organizations"
  | "POST /organizations"
  | "GET /organizations/{id}"
  | "PUT /organizations/{id}"
  | "POST /organizations/{id}/invite"
  | "GET /organizations/{id}/users"
  | "PUT /users/{id}/profile"
  | "PUT /users/{id}/password"
  | "GET /courses"
  | "POST /courses"
  | "GET /courses/{id}"
  | "PUT /courses/{id}"
  | "DELETE /courses/{id}"
  | "POST /ai/coach/analyze"
  | "POST /ai/coach/suggest"
  | "POST /ai/content/generate"
  | "POST /ai/content/{id}/approve"
  | "POST /ai/content/{id}/reject"
  | "GET /motivation/leaderboard"
  | "GET /motivation/badges"
  | "POST /motivation/points";