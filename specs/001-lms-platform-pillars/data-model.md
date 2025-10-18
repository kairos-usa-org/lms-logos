# Data Model Specification

## Overview

This document defines the data model for LogosLMS, a multi-tenant Learning Management System designed for Christian education organizations. All entities include `organization_id` for strict tenant isolation.

## Core Entities

### Organizations

**Purpose:** Root entity for multi-tenancy, represents a faith-based organization using the platform.

**Fields:**
- `id` (UUID, Primary Key): Unique identifier
- `name` (TEXT, NOT NULL): Organization display name
- `slug` (TEXT, UNIQUE, NOT NULL): URL-friendly identifier
- `branding_config` (JSONB): Logo, colors, custom CSS
- `theme_config` (JSONB): UI theme preferences
- `created_at` (TIMESTAMP WITH TIME ZONE): Creation timestamp
- `updated_at` (TIMESTAMP WITH TIME ZONE): Last modification timestamp

**Validation Rules:**
- Slug must be unique across all organizations
- Name cannot be empty or whitespace-only
- Branding config must be valid JSON

**State Transitions:**
- Created → Active (immediate)
- Active → Suspended (admin action)
- Suspended → Active (admin action)

### Users

**Purpose:** Represents all users in the system with role-based access control.

**Fields:**
- `id` (UUID, Primary Key): Unique identifier
- `email` (TEXT, UNIQUE, NOT NULL): User's email address
- `organization_id` (UUID, Foreign Key): Associated organization
- `role` (TEXT, NOT NULL): User role (super_admin, org_admin, mentor, learner)
- `profile_data` (JSONB): Name, avatar, preferences, bio
- `points` (INTEGER, DEFAULT 0): Motivation system points
- `level` (INTEGER, DEFAULT 1): Motivation system level (1-10)
- `created_at` (TIMESTAMP WITH TIME ZONE): Account creation
- `updated_at` (TIMESTAMP WITH TIME ZONE): Last profile update

**Validation Rules:**
- Email must be valid format and unique
- Role must be one of: super_admin, org_admin, mentor, learner
- Points must be non-negative
- Level must be between 1 and 10
- Super admin can only exist once globally

**State Transitions:**
- Invited → Pending (email sent)
- Pending → Active (email verification)
- Active → Suspended (admin action)
- Suspended → Active (admin action)

### Groups

**Purpose:** Organizational units within an organization for user management.

**Fields:**
- `id` (UUID, Primary Key): Unique identifier
- `organization_id` (UUID, Foreign Key): Parent organization
- `name` (TEXT, NOT NULL): Group display name
- `description` (TEXT): Optional group description
- `created_at` (TIMESTAMP WITH TIME ZONE): Creation timestamp

**Validation Rules:**
- Name cannot be empty
- Name must be unique within organization

### Courses

**Purpose:** Educational content containers with lessons and assessments.

**Fields:**
- `id` (UUID, Primary Key): Unique identifier
- `organization_id` (UUID, Foreign Key): Parent organization
- `title` (TEXT, NOT NULL): Course title
- `description` (TEXT): Course description
- `content` (JSONB): Course structure, lessons, quizzes
- `created_by` (UUID, Foreign Key): Course author
- `status` (TEXT, DEFAULT 'draft'): Course status (draft, published, archived)
- `created_at` (TIMESTAMP WITH TIME ZONE): Creation timestamp
- `updated_at` (TIMESTAMP WITH TIME ZONE): Last modification

**Validation Rules:**
- Title cannot be empty
- Status must be one of: draft, published, archived
- Content must be valid JSON structure

**State Transitions:**
- Draft → Published (author action)
- Published → Archived (author action)
- Archived → Published (author action)

### Lessons

**Purpose:** Individual learning units within courses.

**Fields:**
- `id` (UUID, Primary Key): Unique identifier
- `course_id` (UUID, Foreign Key): Parent course
- `organization_id` (UUID, Foreign Key): Parent organization (denormalized)
- `title` (TEXT, NOT NULL): Lesson title
- `content` (JSONB): Lesson content, media, instructions
- `order_index` (INTEGER): Display order within course
- `created_by` (UUID, Foreign Key): Lesson author
- `created_at` (TIMESTAMP WITH TIME ZONE): Creation timestamp
- `updated_at` (TIMESTAMP WITH TIME ZONE): Last modification

**Validation Rules:**
- Title cannot be empty
- Order index must be non-negative
- Content must be valid JSON

### Quizzes

**Purpose:** Assessments within courses for learner evaluation.

**Fields:**
- `id` (UUID, Primary Key): Unique identifier
- `course_id` (UUID, Foreign Key): Parent course
- `organization_id` (UUID, Foreign Key): Parent organization (denormalized)
- `title` (TEXT, NOT NULL): Quiz title
- `questions` (JSONB): Quiz questions and answers
- `passing_score` (INTEGER, DEFAULT 70): Required score to pass (percentage)
- `time_limit` (INTEGER): Time limit in minutes (optional)
- `created_by` (UUID, Foreign Key): Quiz author
- `created_at` (TIMESTAMP WITH TIME ZONE): Creation timestamp
- `updated_at` (TIMESTAMP WITH TIME ZONE): Last modification

**Validation Rules:**
- Title cannot be empty
- Passing score must be between 0 and 100
- Time limit must be positive if specified
- Questions must be valid JSON structure

### Enrollments

**Purpose:** Tracks learner enrollment in courses and progress.

**Fields:**
- `id` (UUID, Primary Key): Unique identifier
- `user_id` (UUID, Foreign Key): Enrolled learner
- `course_id` (UUID, Foreign Key): Enrolled course
- `organization_id` (UUID, Foreign Key): Parent organization (denormalized)
- `enrolled_at` (TIMESTAMP WITH TIME ZONE): Enrollment timestamp
- `completed_at` (TIMESTAMP WITH TIME ZONE): Completion timestamp (nullable)
- `progress` (JSONB): Lesson completion status, quiz scores
- `points_earned` (INTEGER, DEFAULT 0): Points earned from this course

**Validation Rules:**
- User and course must belong to same organization
- Progress must be valid JSON structure
- Points earned must be non-negative

### AI Content

**Purpose:** Tracks AI-generated content requiring human approval.

**Fields:**
- `id` (UUID, Primary Key): Unique identifier
- `organization_id` (UUID, Foreign Key): Parent organization
- `content_type` (TEXT, NOT NULL): Type of content (lesson, quiz, course_description)
- `content_data` (JSONB): Generated content
- `prompt_used` (TEXT): AI prompt that generated content
- `ai_provider` (TEXT): AI service used (openai, anthropic, local)
- `status` (TEXT, DEFAULT 'pending'): Approval status (pending, approved, rejected)
- `reviewed_by` (UUID, Foreign Key): Reviewer (nullable)
- `reviewed_at` (TIMESTAMP WITH TIME ZONE): Review timestamp (nullable)
- `created_by` (UUID, Foreign Key): Content requester
- `created_at` (TIMESTAMP WITH TIME ZONE): Creation timestamp

**Validation Rules:**
- Content type must be valid
- Status must be one of: pending, approved, rejected
- If approved/rejected, reviewed_by and reviewed_at must be set

**State Transitions:**
- Pending → Approved (reviewer action)
- Pending → Rejected (reviewer action)

### Badges

**Purpose:** Achievement system for motivation and recognition.

**Fields:**
- `id` (UUID, Primary Key): Unique identifier
- `organization_id` (UUID, Foreign Key): Parent organization
- `name` (TEXT, NOT NULL): Badge name
- `description` (TEXT): Badge description
- `icon_url` (TEXT): Badge icon URL
- `criteria` (JSONB): Requirements to earn badge
- `level` (INTEGER): Badge level (1-10)
- `created_at` (TIMESTAMP WITH TIME ZONE): Creation timestamp

**Validation Rules:**
- Name cannot be empty
- Level must be between 1 and 10
- Criteria must be valid JSON

### User Badges

**Purpose:** Tracks which users have earned which badges.

**Fields:**
- `id` (UUID, Primary Key): Unique identifier
- `user_id` (UUID, Foreign Key): User who earned badge
- `badge_id` (UUID, Foreign Key): Badge earned
- `organization_id` (UUID, Foreign Key): Parent organization (denormalized)
- `earned_at` (TIMESTAMP WITH TIME ZONE): When badge was earned
- `points_awarded` (INTEGER): Points awarded with badge

**Validation Rules:**
- User and badge must belong to same organization
- Points awarded must be non-negative

## Relationships

### One-to-Many
- Organization → Users
- Organization → Groups
- Organization → Courses
- Organization → Badges
- Course → Lessons
- Course → Quizzes
- User → Enrollments
- User → User Badges

### Many-to-Many
- Users ↔ Groups (through group_members table)
- Users ↔ Courses (through Enrollments)

## Multi-Tenancy Implementation

### Row Level Security (RLS)
All tables have RLS enabled with policies that filter by `organization_id`:

```sql
-- Example RLS policy
CREATE POLICY "Users can only see their organization's data" ON users
  FOR ALL USING (organization_id = current_setting('app.current_organization_id')::UUID);
```

### Cache Key Strategy
All cached data uses organization-specific keys:
```
{organization_id}:{resource_type}:{resource_id}
```

### JWT Context
JWT tokens include `organization_id` in custom claims for request context.

## Data Volume Assumptions

- Organizations: 10-100 (small to medium faith-based organizations)
- Users per organization: 50-500
- Courses per organization: 10-100
- Lessons per course: 5-20
- Quizzes per course: 2-10
- Total concurrent users: 1,000 per organization

## Indexing Strategy

### Primary Indexes
- All tables: `(organization_id, created_at)`
- Users: `(email)` (unique)
- Organizations: `(slug)` (unique)
- Enrollments: `(user_id, course_id)` (unique)

### Performance Indexes
- Courses: `(organization_id, status, created_at)`
- Lessons: `(course_id, order_index)`
- Quizzes: `(course_id, created_at)`
- AI Content: `(organization_id, status, created_at)`