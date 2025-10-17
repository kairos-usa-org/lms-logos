# LogosLMS Quickstart Guide

## Overview

This guide will help you set up and extend the LogosLMS platform from the current Next.js 15 dashboard implementation. The platform is designed as a multi-tenant Learning Management System with AI coaching and gamification features.

## Prerequisites

- Node.js 18+ and npm/yarn
- Git
- Supabase account (for database and authentication)
- Basic knowledge of Next.js, TypeScript, and React

## Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── (main)/            # Main application routes
│   │   ├── auth/          # Authentication pages
│   │   ├── dashboard/     # Dashboard pages
│   │   └── unauthorized/  # Unauthorized access page
│   └── (external)/        # External/public pages
├── components/            # Reusable UI components
│   ├── ui/               # Shadcn UI components
│   └── data-table/       # Data table components
├── config/               # Application configuration
├── data/                 # Static data and mock data
├── hooks/                # Custom React hooks
├── lib/                  # Utility functions
├── middleware/           # Next.js middleware
├── navigation/           # Navigation configuration
├── server/               # Server actions
├── stores/               # Zustand stores
└── types/                # TypeScript type definitions
```

## Setup Instructions

### 1. Environment Setup

Create a `.env.local` file in the project root:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Application Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
JWT_SECRET=your_jwt_secret

# AI Configuration (Optional)
OPENAI_API_KEY=your_openai_api_key
ANTHROPIC_API_KEY=your_anthropic_api_key
```

### 2. Database Setup

1. Create a new Supabase project
2. Run the database migrations from `data-model.md`
3. Set up Row Level Security (RLS) policies
4. Create the initial super-admin user

```sql
-- Create super-admin user
INSERT INTO users (email, role, organization_id, profile_data)
VALUES ('admin@logoslms.com', 'super_admin', NULL, '{"name": "Super Admin"}');
```

### 3. Install Dependencies

```bash
npm install
# or
yarn install
```

### 4. Development Server

```bash
npm run dev
# or
yarn dev
```

Visit `http://localhost:3000` to see the application.

## Current Implementation

### Dashboard Pages

The current implementation includes several dashboard pages that serve as starting points:

- **Default Dashboard** (`/dashboard/default`): Analytics dashboard with charts and data tables
- **CRM Dashboard** (`/dashboard/crm`): Customer relationship management interface
- **Finance Dashboard** (`/dashboard/finance`): Financial overview and account management

### Authentication

The auth system includes:
- Login/Register forms with validation
- Social authentication (Google)
- Multiple layout options (v1, v2)
- Form handling with React Hook Form + Zod

### UI Components

Comprehensive component library based on Shadcn UI:
- Forms, tables, cards, dialogs
- Sidebar navigation
- Data tables with TanStack Table
- Responsive design with Tailwind CSS

## Extending to LMS Features

### Phase 1: Multi-Tenancy Foundation

1. **Set up Supabase integration**
   ```typescript
   // lib/supabase.ts
   import { createClient } from '@supabase/supabase-js'
   
   export const supabase = createClient(
     process.env.NEXT_PUBLIC_SUPABASE_URL!,
     process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
   )
   ```

2. **Implement organization context**
   ```typescript
   // stores/organization.ts
   import { create } from 'zustand'
   
   interface OrganizationState {
     currentOrganization: Organization | null
     organizations: Organization[]
     setCurrentOrganization: (org: Organization) => void
   }
   ```

3. **Create super-admin console**
   - Organization creation interface
   - User invitation system
   - Platform-wide analytics

### Phase 2: Core LMS Components

1. **Course Management**
   ```typescript
   // components/course/course-card.tsx
   export function CourseCard({ course }: CourseCardProps) {
     return (
       <Card>
         <CardHeader>
           <CardTitle>{course.title}</CardTitle>
           <CardDescription>{course.description}</CardDescription>
         </CardHeader>
         <CardContent>
           <Button onClick={() => onEnroll(course.id)}>
             Enroll
           </Button>
         </CardContent>
       </Card>
     )
   }
   ```

2. **User Profile Management**
   - Profile editing interface
   - Password change functionality
   - Avatar upload

3. **Organization Branding**
   - Theme customization
   - Logo upload
   - Color scheme management

### Phase 3: AI & Gamification

1. **AI Coaching Interface**
   ```typescript
   // components/ai/coach-panel.tsx
   export function CoachPanel({ userId }: { userId: string }) {
     const { suggestions, isLoading } = useAICoaching(userId)
     
     return (
       <Card>
         <CardHeader>
           <CardTitle>AI Learning Coach</CardTitle>
         </CardHeader>
         <CardContent>
           {isLoading ? <Spinner /> : <SuggestionsList suggestions={suggestions} />}
         </CardContent>
       </Card>
     )
   }
   ```

2. **Gamification System**
   - Points tracking
   - Badge system
   - Leaderboards
   - Progress visualization

## Key Development Patterns

### Multi-Tenant Data Access

Always include organization context in data queries:

```typescript
// server/actions/courses.ts
export async function getCourses(organizationId: string) {
  const { data, error } = await supabase
    .from('courses')
    .select('*')
    .eq('organization_id', organizationId)
  
  if (error) throw error
  return data
}
```

### Server Actions

Use server actions for sensitive operations:

```typescript
// server/actions/auth.ts
'use server'

export async function createUser(userData: CreateUserRequest) {
  // Server-side validation and user creation
  const { data, error } = await supabase.auth.admin.createUser({
    email: userData.email,
    password: userData.password,
    user_metadata: {
      organization_id: userData.organizationId,
      role: userData.role
    }
  })
  
  if (error) throw error
  return data
}
```

### State Management

Use Zustand for client-side state:

```typescript
// stores/user.ts
export const useUserStore = create<UserState>((set) => ({
  user: null,
  isLoading: false,
  setUser: (user) => set({ user }),
  setLoading: (isLoading) => set({ isLoading })
}))
```

## Testing

### Unit Tests

```bash
npm run test
```

### Integration Tests

```bash
npm run test:integration
```

### E2E Tests

```bash
npm run test:e2e
```

## Deployment

### Vercel (Recommended)

1. Connect your GitHub repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

### Other Platforms

The application can be deployed to any platform that supports Next.js:
- Netlify
- AWS Amplify
- Railway
- DigitalOcean App Platform

## Troubleshooting

### Common Issues

1. **Supabase Connection Issues**
   - Verify environment variables
   - Check Supabase project status
   - Ensure RLS policies are correctly configured

2. **Authentication Problems**
   - Verify JWT secret configuration
   - Check user role assignments
   - Ensure proper organization context

3. **Performance Issues**
   - Check database query optimization
   - Verify caching strategies
   - Monitor bundle size

### Getting Help

- Check the [documentation](./spec.md)
- Review the [data model](./data-model.md)
- Consult the [API contracts](./contracts/)
- Open an issue in the repository

## Next Steps

1. Review the [project plan](./plan.md) for detailed implementation phases
2. Set up your development environment
3. Start with Phase 1: Multi-tenancy foundation
4. Gradually implement LMS-specific features
5. Add AI and gamification features

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## License

This project is licensed under the MIT License - see the [LICENSE](../../LICENSE) file for details.
