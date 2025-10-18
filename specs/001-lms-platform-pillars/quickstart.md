# LogosLMS Quickstart Guide

## Overview

This guide provides step-by-step instructions for setting up and using LogosLMS, a multi-tenant Learning Management System designed for Christian education organizations.

## Prerequisites

- Node.js 18+ and npm
- Supabase account and project
- Git

## Initial Setup

### 1. Clone and Install

```bash
git clone <repository-url>
cd LMS
npm install
```

### 2. Environment Configuration

Create `.env.local` file:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Application Configuration
NEXTAUTH_SECRET=your_nextauth_secret
NEXTAUTH_URL=http://localhost:3000
```

### 3. Database Setup

Run the database migrations:

```bash
# Apply the schema
npx supabase db push

# Seed initial data (creates super-admin)
npm run db:seed
```

### 4. Start Development Server

```bash
npm run dev
```

Visit `http://localhost:3000` to see the application.

## User Onboarding Flow

### Step 1: Super-Admin Setup

1. **Initial Login**: Use the seeded super-admin credentials
2. **Create Organization**: 
   - Navigate to Organizations
   - Click "Create Organization"
   - Fill in organization details (name, slug, branding)
   - Save organization

3. **Assign Organization Admin**:
   - Go to the new organization
   - Click "Invite Users"
   - Enter email and select "org_admin" role
   - Send invitation

### Step 2: Organization Admin Setup

1. **Receive Invitation**: Check email for invitation link
2. **Complete Registration**:
   - Click invitation link
   - Set password and complete profile
   - Verify email address

3. **Configure Organization**:
   - Upload organization logo
   - Set brand colors and theme
   - Configure organization settings

4. **Invite Users**:
   - Invite mentors and learners
   - Create groups for organization
   - Assign users to groups

### Step 3: Mentor Setup

1. **Receive Invitation**: Check email for invitation link
2. **Complete Registration**: Set password and profile
3. **Create Courses**:
   - Navigate to "My Courses"
   - Click "Create Course"
   - Add course title and description
   - Create lessons and quizzes

4. **Use AI Assistance** (optional):
   - Enable AI features in organization settings
   - Use AI to generate course content
   - Review and approve AI-generated content

### Step 4: Learner Setup

1. **Receive Invitation**: Check email for invitation link
2. **Complete Registration**: Set password and profile
3. **Browse Courses**:
   - View available courses
   - Enroll in courses of interest
   - Start learning

4. **Track Progress**:
   - View motivation dashboard
   - Earn points and badges
   - See leaderboard position

## Key Features

### Multi-Tenancy

- **Organization Isolation**: Each organization's data is completely isolated
- **Organization Switching**: Users can belong to multiple organizations
- **Custom Branding**: Each organization can customize their appearance

### AI Integration

- **Content Generation**: AI helps create courses, lessons, and quizzes
- **Human Approval**: All AI content requires instructor approval
- **Coaching**: AI provides personalized learning suggestions

### Motivation System

- **Points**: Earn points for course enrollment, lesson completion, quiz passes
- **Badges**: 10-level badge system with clear criteria
- **Leaderboards**: See how you rank within your organization

### Accessibility

- **WCAG AA Compliance**: Full keyboard navigation and screen reader support
- **Elder-Friendly Design**: Large fonts, clear buttons, high contrast
- **Scalable Text**: Text scales up to 200% without horizontal scrolling

## API Usage

### Authentication

All API requests require a Bearer token in the Authorization header:

```bash
curl -H "Authorization: Bearer your_jwt_token" \
     https://api.logoslms.com/v1/auth/me
```

### Creating a Course

```bash
curl -X POST \
     -H "Authorization: Bearer your_jwt_token" \
     -H "Content-Type: application/json" \
     -d '{"title": "Introduction to Faith", "description": "Basic course on Christian faith"}' \
     https://api.logoslms.com/v1/courses
```

### Generating AI Content

```bash
curl -X POST \
     -H "Authorization: Bearer your_jwt_token" \
     -H "Content-Type: application/json" \
     -d '{"content_type": "lesson", "prompt": "Create a lesson about prayer"}' \
     https://api.logoslms.com/v1/ai/content/generate
```

## Development Workflow

### Adding New Features

1. **Update Specification**: Modify `spec.md` with new requirements
2. **Update Data Model**: Add entities to `data-model.md`
3. **Update API Contracts**: Modify `contracts/openapi.yaml`
4. **Implement Feature**: Follow the implementation plan
5. **Test**: Ensure all tests pass
6. **Document**: Update this quickstart guide

### Database Changes

1. **Create Migration**: Add new migration file
2. **Update Schema**: Modify database schema
3. **Update RLS Policies**: Ensure tenant isolation
4. **Test**: Verify multi-tenant isolation

### AI Integration

1. **Choose Provider**: Select AI service (OpenAI, Anthropic, local)
2. **Implement Interface**: Use abstract AI service interface
3. **Add Approval Workflow**: Ensure human validation
4. **Test**: Verify content quality and safety

## Troubleshooting

### Common Issues

**Database Connection Failed**
- Check Supabase credentials in `.env.local`
- Verify Supabase project is active
- Ensure database migrations are applied

**Authentication Errors**
- Verify JWT token is valid and not expired
- Check organization_id is present in token
- Ensure user has proper role permissions

**Multi-Tenant Data Leaks**
- Verify RLS policies are enabled
- Check cache keys include organization_id
- Test with multiple organizations

**AI Content Not Generating**
- Check AI provider credentials
- Verify organization has AI features enabled
- Ensure content is pending approval

### Getting Help

- Check the API documentation at `/api/docs`
- Review the data model in `data-model.md`
- Contact support at support@logoslms.com

## Security Considerations

### Data Protection

- All data is encrypted at rest using Supabase encryption
- RLS policies prevent cross-tenant data access
- Audit logs track all admin actions
- GDPR compliance for data handling

### Best Practices

- Use strong passwords (minimum 8 characters)
- Enable two-factor authentication when available
- Regularly review user permissions
- Monitor audit logs for suspicious activity

## Performance Optimization

### Caching

- Organization-specific cache keys prevent data leaks
- Cache frequently accessed data
- Use CDN for static assets

### Database

- Proper indexing on organization_id and created_at
- Optimize queries for multi-tenant access
- Regular performance monitoring

### Frontend

- Code splitting by user role
- Lazy loading for non-critical components
- Image optimization with Next.js Image component