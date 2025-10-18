# LogosLMS Data Model

**Generated:** 2025-10-18  
**Updated:** 2025-10-18  
**Purpose:** Define database schema, entities, relationships, and validation rules for LogosLMS platform  
**Database:** Supabase PostgreSQL (Project: sdxiwingetjnbxrkfpbg)

## Core Entities

### Organizations

**Purpose:** Multi-tenant root entity for data isolation

| Field           | Type      | Constraints                            | Description                             |
| --------------- | --------- | -------------------------------------- | --------------------------------------- |
| id              | UUID      | PRIMARY KEY, DEFAULT gen_random_uuid() | Unique organization identifier          |
| name            | TEXT      | NOT NULL                               | Organization display name               |
| slug            | TEXT      | UNIQUE, NOT NULL                       | URL-friendly organization identifier    |
| branding_config | JSONB     |                                        | Logo, colors, custom branding settings  |
| theme_config    | JSONB     |                                        | UI theme preferences and customizations |
| created_at      | TIMESTAMP | DEFAULT NOW()                          | Organization creation timestamp         |
| updated_at      | TIMESTAMP | DEFAULT NOW()                          | Last modification timestamp             |

**Relationships:**

- One-to-many with Users
- One-to-many with Groups
- One-to-many with Courses
- One-to-many with Badges

### Users

**Purpose:** User accounts with role-based access control

| Field           | Type      | Constraints                            | Description                                        |
| --------------- | --------- | -------------------------------------- | -------------------------------------------------- |
| id              | UUID      | PRIMARY KEY, DEFAULT gen_random_uuid() | Unique user identifier                             |
| email           | TEXT      | UNIQUE, NOT NULL                       | User email address                                 |
| organization_id | UUID      | FOREIGN KEY, NOT NULL                  | Parent organization                                |
| role            | TEXT      | CHECK constraint                       | User role: super_admin, org_admin, mentor, learner |
| profile_data    | JSONB     |                                        | User profile information                           |
| points          | INTEGER   | DEFAULT 0                              | Gamification points                                |
| level           | INTEGER   | DEFAULT 1                              | User level (1-10)                                  |
| created_at      | TIMESTAMP | DEFAULT NOW()                          | Account creation timestamp                         |
| updated_at      | TIMESTAMP | DEFAULT NOW()                          | Last modification timestamp                        |

**Validation Rules:**

- Email format validation
- Role must be one of: super_admin, org_admin, mentor, learner
- Points must be non-negative
- Level must be between 1 and 10

**Relationships:**

- Many-to-one with Organizations
- One-to-many with CourseEnrollments
- One-to-many with UserBadges
- One-to-many with Courses (as creator)

### Groups

**Purpose:** Organization-level user grouping for management

| Field           | Type      | Constraints                            | Description              |
| --------------- | --------- | -------------------------------------- | ------------------------ |
| id              | UUID      | PRIMARY KEY, DEFAULT gen_random_uuid() | Unique group identifier  |
| organization_id | UUID      | FOREIGN KEY, NOT NULL                  | Parent organization      |
| name            | TEXT      | NOT NULL                               | Group display name       |
| description     | TEXT      |                                        | Group description        |
| created_at      | TIMESTAMP | DEFAULT NOW()                          | Group creation timestamp |

**Relationships:**

- Many-to-one with Organizations
- Many-to-many with Users (through GroupMemberships)

### Courses

**Purpose:** Educational content containers

| Field           | Type      | Constraints                            | Description                               |
| --------------- | --------- | -------------------------------------- | ----------------------------------------- |
| id              | UUID      | PRIMARY KEY, DEFAULT gen_random_uuid() | Unique course identifier                  |
| organization_id | UUID      | FOREIGN KEY, NOT NULL                  | Parent organization                       |
| title           | TEXT      | NOT NULL                               | Course title                              |
| description     | TEXT      |                                        | Course description                        |
| content         | JSONB     |                                        | Course structure and content              |
| created_by      | UUID      | FOREIGN KEY, NOT NULL                  | Course creator                            |
| status          | TEXT      | DEFAULT 'draft'                        | Course status: draft, published, archived |
| created_at      | TIMESTAMP | DEFAULT NOW()                          | Course creation timestamp                 |
| updated_at      | TIMESTAMP | DEFAULT NOW()                          | Last modification timestamp               |

**Validation Rules:**

- Title must not be empty
- Status must be one of: draft, published, archived
- Content must be valid JSON structure

**Relationships:**

- Many-to-one with Organizations
- Many-to-one with Users (as creator)
- One-to-many with Lessons
- One-to-many with Quizzes
- One-to-many with CourseEnrollments

### Lessons

**Purpose:** Individual learning units within courses

| Field       | Type      | Constraints                            | Description                  |
| ----------- | --------- | -------------------------------------- | ---------------------------- |
| id          | UUID      | PRIMARY KEY, DEFAULT gen_random_uuid() | Unique lesson identifier     |
| course_id   | UUID      | FOREIGN KEY, NOT NULL                  | Parent course                |
| title       | TEXT      | NOT NULL                               | Lesson title                 |
| content     | JSONB     |                                        | Lesson content and structure |
| order_index | INTEGER   | NOT NULL                               | Display order within course  |
| created_at  | TIMESTAMP | DEFAULT NOW()                          | Lesson creation timestamp    |
| updated_at  | TIMESTAMP | DEFAULT NOW()                          | Last modification timestamp  |

**Validation Rules:**

- Title must not be empty
- Order index must be non-negative
- Content must be valid JSON structure

**Relationships:**

- Many-to-one with Courses
- One-to-many with LessonProgress

### Quizzes

**Purpose:** Assessment tools within courses

| Field         | Type      | Constraints                            | Description                        |
| ------------- | --------- | -------------------------------------- | ---------------------------------- |
| id            | UUID      | PRIMARY KEY, DEFAULT gen_random_uuid() | Unique quiz identifier             |
| course_id     | UUID      | FOREIGN KEY, NOT NULL                  | Parent course                      |
| title         | TEXT      | NOT NULL                               | Quiz title                         |
| questions     | JSONB     |                                        | Quiz questions and answers         |
| passing_score | INTEGER   | DEFAULT 70                             | Minimum score to pass (percentage) |
| time_limit    | INTEGER   |                                        | Time limit in minutes (optional)   |
| created_at    | TIMESTAMP | DEFAULT NOW()                          | Quiz creation timestamp            |
| updated_at    | TIMESTAMP | DEFAULT NOW()                          | Last modification timestamp        |

**Validation Rules:**

- Title must not be empty
- Passing score must be between 0 and 100
- Time limit must be positive if specified
- Questions must be valid JSON structure

**Relationships:**

- Many-to-one with Courses
- One-to-many with QuizSubmissions

### CourseEnrollments

**Purpose:** User enrollment tracking in courses

| Field               | Type      | Constraints                            | Description                                  |
| ------------------- | --------- | -------------------------------------- | -------------------------------------------- |
| id                  | UUID      | PRIMARY KEY, DEFAULT gen_random_uuid() | Unique enrollment identifier                 |
| user_id             | UUID      | FOREIGN KEY, NOT NULL                  | Enrolled user                                |
| course_id           | UUID      | FOREIGN KEY, NOT NULL                  | Enrolled course                              |
| enrolled_at         | TIMESTAMP | DEFAULT NOW()                          | Enrollment timestamp                         |
| completed_at        | TIMESTAMP |                                        | Completion timestamp (null if not completed) |
| progress_percentage | INTEGER   | DEFAULT 0                              | Completion percentage (0-100)                |

**Validation Rules:**

- Progress percentage must be between 0 and 100
- Completed_at must be after enrolled_at if not null
- Unique constraint on (user_id, course_id)

**Relationships:**

- Many-to-one with Users
- Many-to-one with Courses

### Badges

**Purpose:** Achievement recognition system

| Field           | Type      | Constraints                            | Description                   |
| --------------- | --------- | -------------------------------------- | ----------------------------- |
| id              | UUID      | PRIMARY KEY, DEFAULT gen_random_uuid() | Unique badge identifier       |
| organization_id | UUID      | FOREIGN KEY, NOT NULL                  | Parent organization           |
| name            | TEXT      | NOT NULL                               | Badge name                    |
| description     | TEXT      |                                        | Badge description             |
| icon_url        | TEXT      |                                        | Badge icon URL                |
| points_required | INTEGER   | DEFAULT 0                              | Points required to earn badge |
| level           | INTEGER   | DEFAULT 1                              | Badge level (1-10)            |
| created_at      | TIMESTAMP | DEFAULT NOW()                          | Badge creation timestamp      |

**Validation Rules:**

- Name must not be empty
- Points required must be non-negative
- Level must be between 1 and 10

**Relationships:**

- Many-to-one with Organizations
- Many-to-many with Users (through UserBadges)

### UserBadges

**Purpose:** User badge achievements

| Field     | Type      | Constraints                            | Description                   |
| --------- | --------- | -------------------------------------- | ----------------------------- |
| id        | UUID      | PRIMARY KEY, DEFAULT gen_random_uuid() | Unique achievement identifier |
| user_id   | UUID      | FOREIGN KEY, NOT NULL                  | User who earned badge         |
| badge_id  | UUID      | FOREIGN KEY, NOT NULL                  | Earned badge                  |
| earned_at | TIMESTAMP | DEFAULT NOW()                          | Achievement timestamp         |

**Validation Rules:**

- Unique constraint on (user_id, badge_id)

**Relationships:**

- Many-to-one with Users
- Many-to-one with Badges

### AuditLogs

**Purpose:** System audit trail for compliance and security

| Field           | Type      | Constraints                            | Description                             |
| --------------- | --------- | -------------------------------------- | --------------------------------------- |
| id              | UUID      | PRIMARY KEY, DEFAULT gen_random_uuid() | Unique log identifier                   |
| timestamp       | TIMESTAMP | DEFAULT NOW()                          | Event timestamp                         |
| user_id         | UUID      | FOREIGN KEY                            | User who performed action               |
| organization_id | UUID      | FOREIGN KEY                            | Organization context                    |
| action          | TEXT      | NOT NULL                               | Action performed                        |
| resource_type   | TEXT      |                                        | Type of resource affected               |
| resource_id     | UUID      |                                        | ID of resource affected                 |
| details         | JSONB     |                                        | Additional event details                |
| ip_address      | TEXT      |                                        | User IP address                         |
| user_agent      | TEXT      |                                        | User agent string                       |
| outcome         | TEXT      | NOT NULL                               | Action outcome: success, failure, error |

**Validation Rules:**

- Action must not be empty
- Outcome must be one of: success, failure, error
- Details must be valid JSON structure

**Relationships:**

- Many-to-one with Users
- Many-to-one with Organizations

## Row Level Security (RLS) Policies

### Organizations

```sql
-- Super-admins can see all organizations
CREATE POLICY "Super admins can see all organizations" ON organizations
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'super_admin'
    )
  );

-- Organization admins can see their organization
CREATE POLICY "Organization admins can see their organization" ON organizations
  FOR ALL USING (
    id IN (
      SELECT organization_id FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'org_admin'
    )
  );
```

### Users

```sql
-- Users can only see users in their organization
CREATE POLICY "Users can only see their organization's users" ON users
  FOR ALL USING (
    organization_id = (
      SELECT organization_id FROM users
      WHERE users.id = auth.uid()
    )
  );
```

### Courses

```sql
-- Users can only see courses in their organization
CREATE POLICY "Users can only see their organization's courses" ON courses
  FOR ALL USING (
    organization_id = (
      SELECT organization_id FROM users
      WHERE users.id = auth.uid()
    )
  );
```

## Indexes

### Performance Indexes

```sql
-- Organization-based queries
CREATE INDEX idx_users_organization_id ON users(organization_id);
CREATE INDEX idx_courses_organization_id ON courses(organization_id);
CREATE INDEX idx_groups_organization_id ON groups(organization_id);

-- User role queries
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_organization_role ON users(organization_id, role);

-- Course enrollment queries
CREATE INDEX idx_enrollments_user_id ON course_enrollments(user_id);
CREATE INDEX idx_enrollments_course_id ON course_enrollments(course_id);

-- Audit log queries
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_organization_id ON audit_logs(organization_id);
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp);
```

## Data Validation Rules

### Application-Level Validation

- Email format validation using regex
- Password strength requirements (8+ characters, mixed case, numbers)
- Organization slug format (lowercase, alphanumeric, hyphens only)
- JSON content validation for structured fields
- File upload size and type restrictions

### Database-Level Validation

- CHECK constraints on enum-like fields
- FOREIGN KEY constraints for referential integrity
- UNIQUE constraints for business rules
- NOT NULL constraints for required fields

## State Transitions

### Course Status

- draft → published (by course creator)
- published → archived (by course creator or org admin)
- archived → published (by course creator or org admin)

### User Enrollment

- enrolled → in_progress (automatic on first lesson access)
- in_progress → completed (when all lessons completed and quizzes passed)

### Badge Achievement

- available → earned (when user meets requirements)
- earned → permanent (cannot be revoked)

## Data Migration Strategy

### Initial Data

- Super-admin user creation
- Default organization setup
- System badges creation
- Audit log table initialization

### Future Migrations

- Schema versioning in migration files
- Backward compatibility for API changes
- Data transformation scripts for breaking changes
- Rollback procedures for failed migrations
