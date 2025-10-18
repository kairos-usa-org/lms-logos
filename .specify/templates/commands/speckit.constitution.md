# Constitution Command Template

## Command: speckit.constitution

**Description:** Create or update the project constitution from interactive or provided principle inputs, ensuring all dependent templates stay in sync.

## Usage

```bash
/speckit.constitution [PROJECT_DESCRIPTION]
```

## Parameters

- `PROJECT_DESCRIPTION` (optional): Brief description of the project to help derive appropriate principles

## Process Flow

1. **Load Constitution Template**
   - Read `.specify/memory/constitution.md`
   - Identify placeholder tokens `[ALL_CAPS_IDENTIFIER]`
   - Determine if user requires different number of principles

2. **Collect/Derive Values**
   - Use user input if provided
   - Infer from existing repo context (README, docs, prior versions)
   - Set governance dates (ratification, last amended)
   - Increment version according to semantic versioning

3. **Draft Updated Constitution**
   - Replace all placeholders with concrete text
   - Preserve heading hierarchy
   - Ensure principles are declarative and testable
   - Include rationale for each principle

4. **Consistency Propagation**
   - Update `.specify/templates/plan-template.md`
   - Update `.specify/templates/spec-template.md`
   - Update `.specify/templates/tasks-template.md`
   - Update command files in `.specify/templates/commands/`
   - Update runtime guidance docs

5. **Sync Impact Report**
   - Document version changes
   - List modified/added/removed sections
   - Track template update status
   - Note any deferred TODOs

6. **Validation**
   - No unexplained bracket tokens
   - Version consistency
   - ISO date format
   - Declarative language

7. **Write Constitution**
   - Overwrite `.specify/memory/constitution.md`
   - Include sync impact report as HTML comment

8. **Output Summary**
   - New version and bump rationale
   - Files flagged for manual follow-up
   - Suggested commit message

## Version Bump Rules

- **MAJOR (X.0.0):** Backward incompatible governance changes
- **MINOR (X.Y.0):** New principles or significant expansions
- **PATCH (X.Y.Z):** Clarifications, wording, typo fixes

## Template Dependencies

The constitution command MUST update these templates:

1. **plan-template.md** - Constitution check section
2. **spec-template.md** - Multi-tenancy and security requirements
3. **tasks-template.md** - Constitution-driven task categories
4. **Command templates** - Remove agent-specific references

## Constitution Principles Template

The constitution MUST include these core principles:

1. **Accessibility & UX** - WCAG AA compliance, keyboard navigation
2. **Data Security & Privacy** - Supabase Auth, RLS, audit logging
3. **Architecture & Tech Stack** - Next.js 15, TypeScript, Tailwind v4
4. **Performance Standards** - Lighthouse ≥ 90, cache isolation
5. **Multi-Tenancy** - organization_id, RLS, tenant isolation
6. **AI Ethics & Safety** - Human-in-the-loop, labeling, opt-in
7. **Gamification Fairness** - Anti-gaming measures, fair systems
8. **Onboarding & Accounts** - Super-admin, self-service, role management
9. **Documentation & QA** - Current docs, DoD, security reviews
10. **Scope Control** - MVP focus, feature prioritization

## Output Format

### Constitution File Structure

```markdown
<!-- Sync Impact Report -->

# [PROJECT_NAME] Project Constitution

**Version:** [X.Y.Z]
**Ratification Date:** [YYYY-MM-DD]
**Last Amended Date:** [YYYY-MM-DD]

## Project Overview

[Brief project description]

## Core Principles

### 1. [PRINCIPLE_NAME]

[Principle description with MUST/SHOULD requirements and rationale]

## Governance

[Amendment procedure, versioning policy, compliance review]
```

### Sync Impact Report Format

```html
<!--
Sync Impact Report:
Version change: [OLD] → [NEW]
Modified principles: [LIST]
Added sections: [LIST]
Removed sections: [LIST]
Templates requiring updates: ✅ updated / ⚠ pending
Follow-up TODOs: [LIST]
-->
```

## Error Handling

- Missing ratification date: Insert `TODO(RATIFICATION_DATE): explanation`
- Ambiguous version bump: Propose reasoning before finalizing
- Missing critical info: Include in deferred TODOs

## Quality Checks

- No remaining bracket tokens (except intentionally deferred)
- Version line matches report
- Dates in ISO format
- Principles are declarative and testable
- All templates updated consistently
