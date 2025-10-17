# Data Model Specification

## Core Entities

### Organizations
**Purpose:** Multi-tenant root entity for data isolation

```sql
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  domain TEXT, -- Optional custom domain
  branding_config JSONB, -- Logo, colors, theme settings
  theme_config JSONB, -- CSS variables, Tailwind tokens
  settings JSONB, -- Feature toggles, AI settings, etc.
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Validation Rules:**
- `name` must be 2-100 characters
- `slug` must be URL-safe, 3-50 characters, unique
- `domain` must be valid domain format if provided
- `branding_config` must contain valid logo URL and color hex codes

**State Transitions:**
- `active` → `suspended` (admin action)
- `suspended` → `active` (admin action)
- `active` → `archived` (permanent deletion)

### Users
**Purpose:** User accounts with role-based access control

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('super_admin', 'org_admin', 'mentor', 'learner')),
  profile_data JSONB, -- name, avatar, preferences
  points INTEGER DEFAULT 0,
  level INTEGER DEFAULT 1,
  last_active_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Validation Rules:**
- `email` must be valid email format
- `role` must be one of the defined roles
- `points` must be non-negative integer
- `level` must be between 1-10
- `profile_data` must contain `name` field

**State Transitions:**
- `invited` → `active` (email verification)
- `active` → `suspended` (admin action)
- `suspended` → `active` (admin action)
- `active` → `archived` (account deletion)

### Groups
**Purpose:** Organization-level user grouping for management

```sql
CREATE TABLE groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Validation Rules:**
- `name` must be 2-100 characters
- `description` must be less than 500 characters

### Courses
**Purpose:** Educational content containers

```sql
CREATE TABLE courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  content JSONB, -- Course structure, metadata
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Validation Rules:**
- `title` must be 3-200 characters
- `description` must be less than 1000 characters
- `content` must contain valid course structure
- `status` must be one of the defined statuses

**State Transitions:**
- `draft` → `published` (instructor action)
- `published` → `draft` (instructor action)
- `published` → `archived` (instructor action)
- `archived` → `draft` (instructor action)

### Lessons
**Purpose:** Individual learning units within courses

```sql
CREATE TABLE lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content JSONB, -- Lesson content, media, etc.
  order_index INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Validation Rules:**
- `title` must be 3-200 characters
- `order_index` must be positive integer
- `content` must contain valid lesson structure

### Quizzes
**Purpose:** Assessment tools for courses

```sql
CREATE TABLE quizzes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  questions JSONB, -- Quiz questions and answers
  passing_score INTEGER DEFAULT 70,
  time_limit INTEGER, -- Minutes, NULL for no limit
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Validation Rules:**
- `title` must be 3-200 characters
- `passing_score` must be 0-100
- `time_limit` must be positive integer if provided
- `questions` must contain valid quiz structure

### Enrollments
**Purpose:** User-course relationships and progress tracking

```sql
CREATE TABLE enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  enrolled_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  progress JSONB, -- Lesson completion, quiz scores, etc.
  UNIQUE(user_id, course_id)
);
```

**Validation Rules:**
- `progress` must contain valid progress structure
- `completed_at` must be after `enrolled_at` if provided

### Quiz Attempts
**Purpose:** Individual quiz attempts and scoring

```sql
CREATE TABLE quiz_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  quiz_id UUID REFERENCES quizzes(id) ON DELETE CASCADE,
  answers JSONB, -- User's answers
  score INTEGER,
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Validation Rules:**
- `score` must be 0-100 if provided
- `answers` must contain valid answer structure

### Invitations
**Purpose:** User invitation system for organizations

```sql
CREATE TABLE invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('org_admin', 'mentor', 'learner')),
  token TEXT UNIQUE NOT NULL,
  invited_by UUID REFERENCES users(id),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  accepted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Validation Rules:**
- `email` must be valid email format
- `role` must be one of the defined roles
- `token` must be unique and secure
- `expires_at` must be in the future

**State Transitions:**
- `pending` → `accepted` (user accepts invitation)
- `pending` → `expired` (token expires)
- `accepted` → `completed` (user completes registration)

## Relationships

### One-to-Many Relationships
- Organization → Users
- Organization → Groups
- Organization → Courses
- Course → Lessons
- Course → Quizzes
- User → Enrollments
- User → Quiz Attempts
- Organization → Invitations

### Many-to-Many Relationships
- Users ↔ Groups (through group_members table)
- Users ↔ Courses (through enrollments table)

## Row Level Security (RLS) Policies

### Organizations Table
```sql
-- Users can only see their organization
CREATE POLICY "Users can view their organization" ON organizations
  FOR SELECT USING (id = current_setting('app.current_organization_id')::UUID);

-- Super admins can see all organizations
CREATE POLICY "Super admins can view all organizations" ON organizations
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = current_setting('app.current_user_id')::UUID 
      AND role = 'super_admin'
    )
  );
```

### Users Table
```sql
-- Users can only see users in their organization
CREATE POLICY "Users can view organization users" ON users
  FOR SELECT USING (organization_id = current_setting('app.current_organization_id')::UUID);

-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (id = current_setting('app.current_user_id')::UUID);
```

### Courses Table
```sql
-- Users can only see courses in their organization
CREATE POLICY "Users can view organization courses" ON courses
  FOR SELECT USING (organization_id = current_setting('app.current_organization_id')::UUID);

-- Mentors and admins can create courses
CREATE POLICY "Mentors can create courses" ON courses
  FOR INSERT WITH CHECK (
    organization_id = current_setting('app.current_organization_id')::UUID
    AND EXISTS (
      SELECT 1 FROM users 
      WHERE id = current_setting('app.current_user_id')::UUID 
      AND role IN ('mentor', 'org_admin', 'super_admin')
    )
  );
```

## Indexes for Performance

```sql
-- Multi-tenant queries
CREATE INDEX idx_users_organization_id ON users(organization_id);
CREATE INDEX idx_courses_organization_id ON courses(organization_id);
CREATE INDEX idx_lessons_course_id ON lessons(course_id);
CREATE INDEX idx_quizzes_course_id ON quizzes(course_id);

-- User progress queries
CREATE INDEX idx_enrollments_user_id ON enrollments(user_id);
CREATE INDEX idx_enrollments_course_id ON enrollments(course_id);
CREATE INDEX idx_quiz_attempts_user_id ON quiz_attempts(user_id);

-- Time-based queries
CREATE INDEX idx_courses_created_at ON courses(created_at);
CREATE INDEX idx_users_last_active_at ON users(last_active_at);

-- Invitation queries
CREATE INDEX idx_invitations_token ON invitations(token);
CREATE INDEX idx_invitations_email ON invitations(email);
```

## Data Validation Rules

### Organization Validation
- Name: 2-100 characters, required
- Slug: 3-50 characters, URL-safe, unique, required
- Domain: Valid domain format, optional
- Branding config: Valid JSON with required fields

### User Validation
- Email: Valid email format, unique, required
- Role: Must be one of defined roles, required
- Points: Non-negative integer, default 0
- Level: 1-10, default 1
- Profile data: Must contain name field

### Course Validation
- Title: 3-200 characters, required
- Description: Max 1000 characters, optional
- Status: Must be one of defined statuses, default 'draft'
- Content: Valid JSON structure, required

### Quiz Validation
- Title: 3-200 characters, required
- Passing score: 0-100, default 70
- Time limit: Positive integer, optional
- Questions: Valid JSON structure, required

## Audit Trail

All tables include:
- `created_at`: Record creation timestamp
- `updated_at`: Last modification timestamp
- `created_by`: User who created the record (where applicable)

Additional audit logging for sensitive operations:
- User role changes
- Organization settings changes
- Course publication/archival
- Quiz score modifications
