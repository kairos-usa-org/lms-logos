# LogosLMS Platform Quickstart Guide

**Version:** 1.0  
**Generated:** 2025-10-18  
**Updated:** 2025-10-18  
**Project Start:** November 1, 2025  
**Purpose:** Get started with LogosLMS development and deployment

## Prerequisites

- Node.js 18+ and npm/yarn
- Supabase account (project ref: sdxiwingetjnbxrkfpbg)
- Resend account for email services
- Git
- Code editor (VS Code recommended)

## Development Setup

### 1. Clone and Install

```bash
# Clone the repository
git clone https://github.com/your-org/logoslms.git
cd logoslms

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env.local
```

### 2. Environment Configuration

Create `.env.local` with the following variables:

```env
# Supabase (Project: sdxiwingetjnbxrkfpbg)
NEXT_PUBLIC_SUPABASE_URL="https://sdxiwingetjnbxrkfpbg.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"

# AI Services
OPENAI_API_KEY="your-openai-key"
ANTHROPIC_API_KEY="your-anthropic-key"

# App Configuration
NEXTAUTH_SECRET="your-nextauth-secret"
NEXTAUTH_URL="http://localhost:3000"

# Resend Email Service
RESEND_API_KEY="re_your-resend-api-key"
RESEND_FROM_EMAIL="noreply@yourdomain.com"
```

### 3. Database Setup

```bash
# Run Supabase migrations
npx supabase db push

# Seed initial data (creates super-admin)
npm run db:seed

# Verify Supabase connection
npx supabase status
```

### 4. Start Development Server

```bash
# Start the development server
npm run dev

# Open http://localhost:3000
```

## Initial Setup

### 1. Create Super-Admin Account

The database seeding creates a super-admin account:

- **Email:** admin@logoslms.com
- **Password:** admin123 (change immediately)

### 2. Create First Organization

1. Login as super-admin
2. Navigate to Organizations
3. Click "Create Organization"
4. Fill in organization details:
   - Name: Your Organization
   - Slug: your-org
   - Branding: Upload logo, set colors
   - Theme: Choose theme preferences

### 3. Invite Organization Admin

1. Go to Users section
2. Click "Invite User"
3. Enter admin email and select "org_admin" role
4. User receives invitation email

### 4. Organization Admin Setup

1. Click invitation link in email
2. Set password and complete profile
3. Configure organization settings
4. Start inviting mentors and learners

## API Usage

### Authentication

```typescript
// Login
const response = await fetch('/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'password123',
  }),
});

const { user, token, organizationId } = await response.json();
```

### Organization Management

```typescript
// Create organization (super-admin only)
const org = await fetch('/api/organizations', {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${token}`,
    'X-Organization-ID': organizationId,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    name: 'New Organization',
    slug: 'new-org',
  }),
});
```

### Course Management

```typescript
// Create course
const course = await fetch('/api/courses', {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${token}`,
    'X-Organization-ID': organizationId,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    title: 'Introduction to Faith',
    description: 'Basic course on Christian faith',
    content: {
      lessons: [],
      quizzes: [],
      metadata: {
        estimatedDuration: 120,
        learningObjectives: ['Understand basic concepts'],
      },
    },
  }),
});
```

### AI Integration

```typescript
// Generate AI content
const aiContent = await fetch('/api/ai/content/generate', {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${token}`,
    'X-Organization-ID': organizationId,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    type: 'lesson',
    topic: 'The Trinity',
    difficulty: 'beginner',
    context: 'Christian education course',
  }),
});
```

## Development Workflow

### 1. Feature Development

```bash
# Create feature branch
git checkout -b feature/new-feature

# Make changes
# ... implement feature ...

# Run tests
npm run test

# Run linting
npm run lint

# Commit changes
git add .
git commit -m "feat: add new feature"
git push origin feature/new-feature
```

### 2. Database Changes

```bash
# Create Supabase migration
npx supabase migration new add_new_table

# Edit migration file
# ... add SQL ...

# Apply migration
npx supabase db push

# Generate TypeScript types
npx supabase gen types typescript --project-id sdxiwingetjnbxrkfpbg > types/supabase.ts
```

### 3. Testing

```bash
# Run all tests
npm run test

# Run specific test suite
npm run test:unit
npm run test:integration
npm run test:e2e

# Run with coverage
npm run test:coverage
```

## Deployment

### 1. Production Build

```bash
# Build for production
npm run build

# Start production server
npm start
```

### 2. Environment Variables

Set the following production environment variables:

```env
# Production Supabase (Project: sdxiwingetjnbxrkfpbg)
NEXT_PUBLIC_SUPABASE_URL="https://sdxiwingetjnbxrkfpbg.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="prod-anon-key"
SUPABASE_SERVICE_ROLE_KEY="prod-service-role-key"

# Production Resend
RESEND_API_KEY="re_prod-resend-api-key"
RESEND_FROM_EMAIL="noreply@yourdomain.com"

# Production URLs
NEXTAUTH_URL="https://your-domain.com"
```

### 3. Database Migration

```bash
# Run production Supabase migrations
npx supabase db push --project-ref sdxiwingetjnbxrkfpbg

# Verify migration status
npx supabase migration list --project-ref sdxiwingetjnbxrkfpbg
```

## Monitoring and Maintenance

### 1. Health Checks

```bash
# Check application health
curl https://your-domain.com/api/health

# Check database connectivity
curl https://your-domain.com/api/health/db
```

### 2. Logs

```bash
# View application logs
npm run logs

# View specific service logs
npm run logs:api
npm run logs:db
```

### 3. Performance Monitoring

- Lighthouse scores: Run `npm run lighthouse`
- Database performance: Check slow query logs
- API response times: Monitor via `/api/metrics`

## Troubleshooting

### Common Issues

**Database Connection Failed**

```bash
# Check database status
npm run db:status

# Reset database
npm run db:reset
```

**Authentication Issues**

```bash
# Check JWT token
npm run auth:verify-token

# Reset user sessions
npm run auth:reset-sessions
```

**AI Service Errors**

```bash
# Test AI connectivity
npm run ai:test-connection

# Check API keys
npm run ai:check-keys
```

### Debug Mode

```bash
# Enable debug logging
DEBUG=logoslms:* npm run dev

# Enable database query logging
DEBUG=logoslms:db npm run dev
```

## Support

- **Documentation:** [docs.logoslms.com](https://docs.logoslms.com)
- **Issues:** [GitHub Issues](https://github.com/your-org/logoslms/issues)
- **Discord:** [Community Server](https://discord.gg/logoslms)
- **Email:** support@logoslms.com

## Next Steps

1. **Read the full documentation** in `/docs`
2. **Explore the API** using the OpenAPI spec in `/contracts`
3. **Check the data model** in `data-model.md`
4. **Review the implementation plan** in `plan.md`
5. **Start with Phase 1 tasks** in `tasks.md`

Happy coding! 🚀
