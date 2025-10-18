# LogosLMS Database Setup Guide

This guide explains how to set up and manage the LogosLMS database schema with multi-tenant support and Row Level Security (RLS).

## Overview

The LogosLMS database is built on Supabase (PostgreSQL) with the following key features:

- **Multi-tenant Architecture**: Complete data isolation using `organization_id`
- **Row Level Security (RLS)**: Database-level access control
- **Caching System**: Multi-tenant cache with organization isolation
- **Audit Logging**: Comprehensive audit trail for compliance
- **Performance Optimization**: Strategic indexing for fast queries

## Database Schema

### Core Tables

1. **organizations** - Root tenant entity
2. **users** - User accounts with role-based access
3. **groups** - Organization-level user grouping
4. **courses** - Educational content containers
5. **lessons** - Individual learning units
6. **quizzes** - Assessment tools
7. **course_enrollments** - User enrollment tracking
8. **badges** - Achievement recognition system
9. **user_badges** - User badge achievements
10. **audit_logs** - System audit trail
11. **cache** - Multi-tenant caching system

### Key Features

- **Multi-tenant Isolation**: Every table includes `organization_id` for data separation
- **RLS Policies**: Automatic enforcement of tenant boundaries
- **Audit Trail**: Complete logging of all admin actions
- **Caching**: Organization-isolated cache with TTL support
- **Performance**: Optimized indexes for common query patterns

## Quick Start

### 1. Environment Setup

Ensure your `.env.local` file contains the required Supabase credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### 2. Run Database Setup

Execute the complete database setup:

```bash
npm run db:setup
```

This command will:
- Create all database tables
- Set up RLS policies
- Create performance indexes
- Seed initial data
- Create super admin user
- Create sample organization

### 3. Verify Setup

Check the migration status:

```bash
npm run db:status
```

## Manual Setup

If you prefer to run steps individually:

### 1. Run Migrations

```bash
npm run db:migrate
```

### 2. Seed Initial Data

```bash
npm run db:seed
```

## Database Management

### Migration Commands

```bash
# Run all pending migrations
npm run db:migrate

# Check migration status
npm run db:status

# Rollback last migration (if supported)
ts-node src/lib/migration-runner.ts rollback
```

### Seeding Commands

```bash
# Seed complete database
npm run db:seed

# Create super admin only
ts-node src/lib/seed-data.ts super-admin admin@example.com password123
```

## Database Utilities

The `DatabaseUtils` class provides convenient methods for common operations:

```typescript
import { DatabaseUtils } from '@/lib/db-utils';

// Get cached data with organization isolation
const courses = await DatabaseUtils.getCachedData(
  organizationId,
  'courses',
  null,
  () => fetchCoursesFromDB(),
  CACHE_TTL.MEDIUM
);

// Enroll user in course
await DatabaseUtils.enrollUserInCourse(userId, courseId);

// Update course progress
await DatabaseUtils.updateCourseProgress(userId, courseId, 75);

// Award badge to user
await DatabaseUtils.awardBadgeToUser(userId, badgeId);

// Log audit event
await DatabaseUtils.logAuditEvent(
  userId,
  organizationId,
  'course_enrolled',
  'course',
  courseId,
  { course_title: 'Advanced Learning' },
  'success'
);
```

## Security Features

### Row Level Security (RLS)

All tables have RLS enabled with policies that ensure:

- Users can only access data from their organization
- Super admins can access all organizations
- Organization admins can only access their organization
- Cross-tenant data access is prevented

### Cache Isolation

Cache keys are automatically prefixed with organization ID:

```
{organization_id}:{resource_type}:{resource_id}
```

Example: `123e4567-e89b-12d3-a456-426614174000:courses:456e7890-e89b-12d3-a456-426614174001`

### Audit Logging

All admin actions are automatically logged with:

- User and organization context
- Action performed
- Resource affected
- Timestamp and IP address
- Success/failure outcome

## Performance Optimization

### Indexes

Strategic indexes are created for common query patterns:

- Organization-based queries
- User role queries
- Course enrollment queries
- Audit log queries
- Cache lookups

### Caching Strategy

- **Short TTL (5 min)**: Frequently changing data
- **Medium TTL (30 min)**: User-specific data
- **Long TTL (2 hours)**: Course content
- **Very Long TTL (24 hours)**: Static reference data

## Monitoring and Maintenance

### Cache Cleanup

Expired cache entries are automatically cleaned up, but you can manually trigger cleanup:

```typescript
await DatabaseUtils.cleanupExpiredCache();
```

### Database Statistics

Get organization-specific statistics:

```typescript
const stats = await DatabaseUtils.getDatabaseStats(organizationId);
console.log(stats);
// { users: 25, courses: 12, enrollments: 150, badges: 8 }
```

### Audit Logs

Query audit logs for compliance:

```typescript
const logs = await DatabaseUtils.getAuditLogs(organizationId, {
  userId: 'user-id',
  action: 'course_enrolled',
  limit: 50,
  startDate: '2025-01-01',
  endDate: '2025-01-31'
});
```

## Troubleshooting

### Common Issues

1. **RLS Policy Errors**: Ensure user has proper organization context
2. **Cache Misses**: Check cache key format and TTL settings
3. **Migration Failures**: Verify Supabase service role key permissions
4. **Audit Log Errors**: Check if audit_logs table exists and has proper permissions

### Debug Mode

Enable debug logging by setting:

```env
DEBUG=database:*
```

### Health Check

Verify database connectivity and RLS policies:

```typescript
import { supabase } from '@/lib/supabase';

// Test basic connectivity
const { data, error } = await supabase.from('organizations').select('count');
console.log('Database connection:', error ? 'Failed' : 'OK');

// Test RLS policies
const { data: userData } = await supabase.from('users').select('*');
console.log('RLS policies:', userData ? 'Working' : 'Failed');
```

## Production Considerations

### Security

- Regularly audit RLS policies
- Monitor audit logs for suspicious activity
- Use strong service role keys
- Implement rate limiting

### Performance

- Monitor query performance
- Adjust cache TTL based on usage patterns
- Consider read replicas for heavy read workloads
- Regular index maintenance

### Backup

- Enable automated Supabase backups
- Test restore procedures regularly
- Keep migration scripts in version control
- Document rollback procedures

## Support

For database-related issues:

1. Check the audit logs for error details
2. Verify RLS policies are correctly configured
3. Test with a fresh migration
4. Contact the development team with specific error messages

## Schema Evolution

When making schema changes:

1. Create a new migration file: `migrations/002_add_new_feature.sql`
2. Test the migration on a development database
3. Update TypeScript types in `src/lib/supabase.ts`
4. Update any affected application code
5. Deploy migration to production

Example migration file:

```sql
-- migrations/002_add_new_feature.sql
-- Add new column to existing table
ALTER TABLE courses ADD COLUMN difficulty_level TEXT DEFAULT 'beginner';

-- Create new table
CREATE TABLE course_ratings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    review TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add RLS policy
ALTER TABLE course_ratings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can only see ratings from their organization" ON course_ratings
    FOR ALL USING (
        course_id IN (
            SELECT id FROM courses
            WHERE organization_id = (
                SELECT organization_id FROM users
                WHERE users.id = auth.uid()
            )
        )
    );
```
