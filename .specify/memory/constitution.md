<!--
Sync Impact Report:
Version change: N/A → 1.0.0
Modified principles: N/A (initial creation)
Added sections: All 10 principles + governance
Removed sections: N/A
Templates requiring updates: ✅ updated
  - .specify/templates/plan-template.md
  - .specify/templates/spec-template.md
  - .specify/templates/tasks-template.md
  - .specify/templates/commands/speckit.constitution.md
Follow-up TODOs: None
-->

# LogosLMS Project Constitution

**Version:** 1.0.0  
**Ratification Date:** 2025-10-19  
**Last Amended Date:** 2025-10-19

## Project Overview

**LogosLMS** is a multi-tenant, AI-augmented Learning Management System specifically designed for faith-based organizations. The platform provides comprehensive educational tools with built-in AI assistance while maintaining strict data isolation and security standards.

## Core Principles

### 1. Accessibility & User Experience

**MUST** achieve WCAG AA compliance across all user interfaces. All interactive elements MUST be keyboard navigable with clear focus indicators. Text MUST be scalable up to 200% without horizontal scrolling. Typography and color contrast MUST be optimized for elder-friendly usage with minimum 4.5:1 contrast ratios for normal text and 3:1 for large text.

**Rationale:** Faith-based organizations serve diverse age groups including elderly members who require enhanced accessibility features. Compliance ensures legal accessibility requirements and inclusive user experience.

### 2. Data Security & Privacy

**MUST** implement Supabase Auth with strict Row Level Security (RLS) policies. All data access MUST be privacy-by-default with explicit user consent. Admin actions MUST be fully auditable with immutable logs. Client secrets MUST never be exposed; all sensitive configuration MUST use `.env.local` for runtime variables.

**Rationale:** Faith-based organizations handle sensitive personal and spiritual data requiring the highest security standards. Multi-tenant architecture demands strict data isolation to prevent cross-tenant data leaks.

### 3. Architecture & Technology Stack

**MUST** use Next.js 15 with App Router, TypeScript in strict mode, and Tailwind CSS v4. UI components MUST use Shadcn UI with Zod for validation. State management MUST use React Hook Form with Zustand. Data tables MUST use TanStack Table. Tooling MUST include ESLint, Prettier, and Husky for code quality.

**Rationale:** This stack provides modern development experience, type safety, and proven scalability for multi-tenant applications while maintaining developer productivity.

### 4. Performance Standards

**MUST** achieve Lighthouse scores ≥ 90 for all public pages. Cross-tenant cache leaks MUST be prevented through strict cache key isolation. All database queries MUST be optimized with proper indexing and query patterns.

**Rationale:** Performance directly impacts user experience and SEO. Multi-tenant architecture requires careful cache management to prevent data leakage between organizations.

### 5. Multi-Tenancy Architecture

**MUST** include `organization_id` in all domain objects. JWT tokens MUST carry `organization_id` for request context. RLS policies MUST enforce strict tenant isolation. Users MUST be able to belong to multiple organizations with session-based active organization switching. Per-tenant branding (name/logo/theme) MUST be supported with required Organization Switcher component.

**Rationale:** Faith-based organizations often have multiple affiliated groups or need to collaborate across organizations while maintaining data separation.

### 6. AI Ethics & Safety

AI features MUST assist learners and instructors with human-in-the-loop validation for grading and content generation. All AI-generated content MUST be clearly labeled. AI features MUST be opt-in at the organization level with clear disclosure of capabilities and limitations.

**Rationale:** AI assistance can enhance learning but requires ethical oversight, especially in faith-based contexts where content accuracy and appropriateness are critical.

### 7. Gamification Fairness

Gamification MUST encourage mastery learning and positive streaks. Anti-gaming measures MUST include rate limiting, duplicate submission detection, and pattern analysis. Point systems MUST be transparent and fair across all user types.

**Rationale:** Gamification enhances engagement but must maintain educational integrity and prevent exploitation that could undermine learning objectives.

### 8. Onboarding & Account Management

**MUST** implement seeded super-admin for initial organization bootstrap and admin promotion. Organization admins MUST be able to invite members via email with role assignment (learner/mentor). All users except super-admin MUST manage their own profiles and passwords through self-service interfaces.

**Rationale:** Streamlined onboarding reduces friction for faith-based organizations while maintaining security through proper role management and self-service capabilities.

### 9. Documentation & Quality Assurance

**MUST** maintain current `spec.md`, `plan.md`, and `tasks.md` documentation. Each feature MUST have a Definition of Done including security and accessibility review. All code changes MUST undergo peer review with automated testing.

**Rationale:** Comprehensive documentation and QA processes ensure maintainability and quality in a complex multi-tenant system serving diverse organizations.

### 10. Scope Control (MVP)

**MUST** deliver core LMS functionality with multi-tenancy, AI Coach (learner + instructor assist v1), Gamification (points + 10-level badge system), basic Collaboration features, and complete Onboarding flow. Additional features MUST be deferred to post-MVP releases.

**Rationale:** Focused MVP ensures timely delivery of essential features while establishing foundation for future enhancements.

## Governance

### Amendment Procedure

Constitution amendments require:
1. Written proposal with rationale and impact analysis
2. 48-hour review period for team feedback
3. Approval by project lead and technical architect
4. Version bump according to semantic versioning rules
5. Update of all dependent templates and documentation

### Versioning Policy

- **MAJOR (X.0.0):** Backward incompatible governance changes, principle removals, or fundamental architecture shifts
- **MINOR (X.Y.0):** New principles, significant principle expansions, or new mandatory sections
- **PATCH (X.Y.Z):** Clarifications, wording improvements, typo fixes, or non-semantic refinements

### Compliance Review

All development work MUST be evaluated against these principles during:
- Feature planning and design review
- Code review and pull request approval
- Security and accessibility audits
- Performance testing and optimization
- Documentation updates and maintenance

### Enforcement

Violations of constitutional principles MUST be addressed through:
1. Immediate remediation when possible
2. Technical debt tracking for complex fixes
3. Process improvements to prevent recurrence
4. Team education and training as needed

---

*This constitution serves as the foundational governance document for LogosLMS development. All team members, contributors, and stakeholders are expected to understand and adhere to these principles in all project activities.*