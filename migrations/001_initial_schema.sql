-- LogosLMS Platform Database Schema Migration
-- Version: 1.0
-- Created: 2025-01-27
-- Purpose: Create initial database schema with multi-tenant support and RLS policies

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create organizations table
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    branding_config JSONB,
    theme_config JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('super_admin', 'org_admin', 'mentor', 'learner')),
    profile_data JSONB,
    points INTEGER DEFAULT 0 CHECK (points >= 0),
    level INTEGER DEFAULT 1 CHECK (level >= 1 AND level <= 10),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create groups table
CREATE TABLE groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create group_memberships table (many-to-many relationship)
CREATE TABLE group_memberships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(group_id, user_id)
);

-- Create courses table
CREATE TABLE courses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    content JSONB,
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create lessons table
CREATE TABLE lessons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content JSONB,
    order_index INTEGER NOT NULL CHECK (order_index >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create quizzes table
CREATE TABLE quizzes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    questions JSONB,
    passing_score INTEGER DEFAULT 70 CHECK (passing_score >= 0 AND passing_score <= 100),
    time_limit INTEGER CHECK (time_limit > 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create course_enrollments table
CREATE TABLE course_enrollments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    enrolled_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
    UNIQUE(user_id, course_id),
    CHECK (completed_at IS NULL OR completed_at >= enrolled_at)
);

-- Create badges table
CREATE TABLE badges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    icon_url TEXT,
    points_required INTEGER DEFAULT 0 CHECK (points_required >= 0),
    level INTEGER DEFAULT 1 CHECK (level >= 1 AND level <= 10),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user_badges table
CREATE TABLE user_badges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    badge_id UUID NOT NULL REFERENCES badges(id) ON DELETE CASCADE,
    earned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, badge_id)
);

-- Create audit_logs table
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    resource_type TEXT,
    resource_id UUID,
    details JSONB,
    ip_address TEXT,
    user_agent TEXT,
    outcome TEXT NOT NULL CHECK (outcome IN ('success', 'failure', 'error'))
);

-- Create cache table for multi-tenant caching
CREATE TABLE cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    key TEXT NOT NULL,
    value JSONB NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(organization_id, key)
);

-- Create indexes for performance optimization
CREATE INDEX idx_users_organization_id ON users(organization_id);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_organization_role ON users(organization_id, role);
CREATE INDEX idx_users_email ON users(email);

CREATE INDEX idx_groups_organization_id ON groups(organization_id);
CREATE INDEX idx_group_memberships_group_id ON group_memberships(group_id);
CREATE INDEX idx_group_memberships_user_id ON group_memberships(user_id);

CREATE INDEX idx_courses_organization_id ON courses(organization_id);
CREATE INDEX idx_courses_created_by ON courses(created_by);
CREATE INDEX idx_courses_status ON courses(status);

CREATE INDEX idx_lessons_course_id ON lessons(course_id);
CREATE INDEX idx_lessons_order_index ON lessons(course_id, order_index);

CREATE INDEX idx_quizzes_course_id ON quizzes(course_id);

CREATE INDEX idx_enrollments_user_id ON course_enrollments(user_id);
CREATE INDEX idx_enrollments_course_id ON course_enrollments(course_id);
CREATE INDEX idx_enrollments_progress ON course_enrollments(progress_percentage);

CREATE INDEX idx_badges_organization_id ON badges(organization_id);
CREATE INDEX idx_badges_level ON badges(level);

CREATE INDEX idx_user_badges_user_id ON user_badges(user_id);
CREATE INDEX idx_user_badges_badge_id ON user_badges(badge_id);

CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_organization_id ON audit_logs(organization_id);
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);

CREATE INDEX idx_cache_organization_id ON cache(organization_id);
CREATE INDEX idx_cache_key ON cache(organization_id, key);
CREATE INDEX idx_cache_expires_at ON cache(expires_at);

-- Enable Row Level Security (RLS) on all tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE cache ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for organizations
CREATE POLICY "Super admins can see all organizations" ON organizations
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role = 'super_admin'
        )
    );

CREATE POLICY "Organization admins can see their organization" ON organizations
    FOR ALL USING (
        id IN (
            SELECT organization_id FROM users
            WHERE users.id = auth.uid()
            AND users.role = 'org_admin'
        )
    );

-- Create RLS policies for users
CREATE POLICY "Users can only see their organization's users" ON users
    FOR ALL USING (
        organization_id = (
            SELECT organization_id FROM users
            WHERE users.id = auth.uid()
        )
    );

-- Create RLS policies for groups
CREATE POLICY "Users can only see their organization's groups" ON groups
    FOR ALL USING (
        organization_id = (
            SELECT organization_id FROM users
            WHERE users.id = auth.uid()
        )
    );

-- Create RLS policies for group_memberships
CREATE POLICY "Users can only see memberships in their organization" ON group_memberships
    FOR ALL USING (
        group_id IN (
            SELECT id FROM groups
            WHERE organization_id = (
                SELECT organization_id FROM users
                WHERE users.id = auth.uid()
            )
        )
    );

-- Create RLS policies for courses
CREATE POLICY "Users can only see their organization's courses" ON courses
    FOR ALL USING (
        organization_id = (
            SELECT organization_id FROM users
            WHERE users.id = auth.uid()
        )
    );

-- Create RLS policies for lessons
CREATE POLICY "Users can only see lessons from their organization's courses" ON lessons
    FOR ALL USING (
        course_id IN (
            SELECT id FROM courses
            WHERE organization_id = (
                SELECT organization_id FROM users
                WHERE users.id = auth.uid()
            )
        )
    );

-- Create RLS policies for quizzes
CREATE POLICY "Users can only see quizzes from their organization's courses" ON quizzes
    FOR ALL USING (
        course_id IN (
            SELECT id FROM courses
            WHERE organization_id = (
                SELECT organization_id FROM users
                WHERE users.id = auth.uid()
            )
        )
    );

-- Create RLS policies for course_enrollments
CREATE POLICY "Users can only see enrollments in their organization" ON course_enrollments
    FOR ALL USING (
        user_id IN (
            SELECT id FROM users
            WHERE organization_id = (
                SELECT organization_id FROM users
                WHERE users.id = auth.uid()
            )
        )
    );

-- Create RLS policies for badges
CREATE POLICY "Users can only see their organization's badges" ON badges
    FOR ALL USING (
        organization_id = (
            SELECT organization_id FROM users
            WHERE users.id = auth.uid()
        )
    );

-- Create RLS policies for user_badges
CREATE POLICY "Users can only see badges from their organization" ON user_badges
    FOR ALL USING (
        user_id IN (
            SELECT id FROM users
            WHERE organization_id = (
                SELECT organization_id FROM users
                WHERE users.id = auth.uid()
            )
        )
    );

-- Create RLS policies for audit_logs
CREATE POLICY "Users can only see audit logs from their organization" ON audit_logs
    FOR ALL USING (
        organization_id = (
            SELECT organization_id FROM users
            WHERE users.id = auth.uid()
        )
    );

-- Create RLS policies for cache
CREATE POLICY "Users can only access their organization's cache" ON cache
    FOR ALL USING (
        organization_id = (
            SELECT organization_id FROM users
            WHERE users.id = auth.uid()
        )
    );

-- Create functions for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at columns
CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_courses_updated_at BEFORE UPDATE ON courses
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_lessons_updated_at BEFORE UPDATE ON lessons
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_quizzes_updated_at BEFORE UPDATE ON quizzes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cache_updated_at BEFORE UPDATE ON cache
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create function to clean up expired cache entries
CREATE OR REPLACE FUNCTION cleanup_expired_cache()
RETURNS void AS $$
BEGIN
    DELETE FROM cache WHERE expires_at IS NOT NULL AND expires_at < NOW();
END;
$$ language 'plpgsql';

-- Create function to get user organization context
CREATE OR REPLACE FUNCTION get_user_organization_context(user_uuid UUID)
RETURNS TABLE(organization_id UUID, role TEXT) AS $$
BEGIN
    RETURN QUERY
    SELECT u.organization_id, u.role
    FROM users u
    WHERE u.id = user_uuid;
END;
$$ language 'plpgsql' SECURITY DEFINER;

-- Create function to create cache key with organization isolation
CREATE OR REPLACE FUNCTION create_cache_key(
    org_id UUID,
    resource_type TEXT,
    resource_id UUID DEFAULT NULL
)
RETURNS TEXT AS $$
BEGIN
    IF resource_id IS NULL THEN
        RETURN org_id::TEXT || ':' || resource_type;
    ELSE
        RETURN org_id::TEXT || ':' || resource_type || ':' || resource_id::TEXT;
    END IF;
END;
$$ language 'plpgsql' IMMUTABLE;

-- Insert initial system data
INSERT INTO organizations (id, name, slug, branding_config, theme_config) VALUES
    ('00000000-0000-0000-0000-000000000000', 'System', 'system', '{}', '{}');

-- Create default system badges
INSERT INTO badges (organization_id, name, description, points_required, level) VALUES
    ('00000000-0000-0000-0000-000000000000', 'First Course', 'Completed your first course', 100, 1),
    ('00000000-0000-0000-0000-000000000000', 'Quiz Master', 'Scored 100% on a quiz', 50, 1),
    ('00000000-0000-0000-0000-000000000000', 'Learning Streak', 'Completed 5 courses in a row', 500, 2),
    ('00000000-0000-0000-0000-000000000000', 'Knowledge Seeker', 'Completed 10 courses', 1000, 3),
    ('00000000-0000-0000-0000-000000000000', 'Expert Learner', 'Completed 25 courses', 2500, 5),
    ('00000000-0000-0000-0000-000000000000', 'Learning Legend', 'Completed 50 courses', 5000, 10);

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- Create a view for user progress summary
CREATE VIEW user_progress_summary AS
SELECT 
    u.id as user_id,
    u.organization_id,
    u.email,
    u.role,
    u.points,
    u.level,
    COUNT(DISTINCT ce.course_id) as total_enrollments,
    COUNT(DISTINCT CASE WHEN ce.completed_at IS NOT NULL THEN ce.course_id END) as completed_courses,
    COUNT(DISTINCT ub.badge_id) as badges_earned,
    AVG(ce.progress_percentage) as average_progress
FROM users u
LEFT JOIN course_enrollments ce ON u.id = ce.user_id
LEFT JOIN user_badges ub ON u.id = ub.user_id
GROUP BY u.id, u.organization_id, u.email, u.role, u.points, u.level;

-- Grant access to the view
GRANT SELECT ON user_progress_summary TO authenticated;

-- Create a view for course statistics
CREATE VIEW course_statistics AS
SELECT 
    c.id as course_id,
    c.organization_id,
    c.title,
    c.status,
    c.created_by,
    COUNT(DISTINCT ce.user_id) as total_enrollments,
    COUNT(DISTINCT CASE WHEN ce.completed_at IS NOT NULL THEN ce.user_id END) as completed_enrollments,
    AVG(ce.progress_percentage) as average_progress,
    COUNT(DISTINCT l.id) as total_lessons,
    COUNT(DISTINCT q.id) as total_quizzes
FROM courses c
LEFT JOIN course_enrollments ce ON c.id = ce.course_id
LEFT JOIN lessons l ON c.id = l.course_id
LEFT JOIN quizzes q ON c.id = q.course_id
GROUP BY c.id, c.organization_id, c.title, c.status, c.created_by;

-- Grant access to the view
GRANT SELECT ON course_statistics TO authenticated;
