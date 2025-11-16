# Driving School Management Platform

## Overview

A comprehensive web-based platform for driving schools that digitizes the complete student lifecycle from registration through certification. The system manages courses, enrollments, theory and practice sessions, testing, certification, scheduling, and payments through a unified interface with role-based access control.

**Tech Stack:**
- Frontend: React with TypeScript, Vite, TailwindCSS, shadcn/ui components
- Backend: Express.js with TypeScript
- Database: PostgreSQL via Neon with Drizzle ORM
- Authentication: Dual authentication (Replit Auth SSO + Email/Password with passport-local)
- Payments: Stripe integration
- State Management: TanStack Query (React Query)

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Component Framework:**
- React 18 with TypeScript for type safety
- Vite as the build tool and development server
- Wouter for lightweight client-side routing
- TailwindCSS for utility-first styling with custom design tokens

**UI Component System:**
- shadcn/ui (New York style variant) - Radix UI primitives with custom styling
- Comprehensive component library including forms, dialogs, tables, cards, navigation
- Responsive sidebar navigation with mobile sheet menu
- Design inspired by Linear's clean typography and Notion's organized layouts

**State & Data Management:**
- TanStack Query for server state management and caching
- Custom query client with automatic retry handling and 401 error detection
- Optimistic updates for mutations
- Centralized API request utilities in `lib/queryClient.ts`

**Authentication Flow:**
- Client-side auth hook (`useAuth`) fetches current user from `/api/auth/user`
- Automatic redirect to login on 401 responses
- Role-based UI rendering (student/instructor/admin views)

**Path Aliases:**
- `@/` maps to `client/src/`
- `@shared/` maps to `shared/` (shared types and schemas)
- `@assets/` maps to `attached_assets/`

### Backend Architecture

**Server Framework:**
- Express.js with TypeScript using ES modules
- Custom middleware for request logging and JSON response capture
- Separation of concerns: routes, storage layer, authentication

**Authentication & Authorization:**
- Dual authentication system supports two methods:
  1. **Replit Auth (SSO)**: OpenID Connect via Passport.js Strategy with automatic token refresh
  2. **Email/Password (Local)**: passport-local strategy with bcrypt password hashing
- Session detection: Local auth users lack `access_token` field in session
- Logout endpoint: Detects auth method and uses appropriate logout flow (local redirect vs OIDC end-session)
- Session management with PostgreSQL store (`connect-pg-simple`)
- Role-based access control middleware (`requireRole`)
- Session cookie with 1-week TTL, HTTP-only, secure flags
- Indexed email lookups via `getUserByEmail` for performance

**Data Access Layer:**
- Storage interface pattern (`IStorage`) in `server/storage.ts`
- Drizzle ORM for type-safe database queries
- Repository-style methods for all entities (users, courses, enrollments, tests, etc.)
- Connection pooling via `@neondatabase/serverless`

**API Design:**
- RESTful endpoints under `/api/` prefix
- Role-specific endpoints (e.g., `/api/admin/*`, `/api/instructor/*`)
- Consistent error handling with HTTP status codes
- Request/response logging for API routes

**Payment Processing:**
- Stripe integration for payment handling
- Webhook support for async payment confirmations (raw body verification)
- Payment status tracking (pending/paid/failed)

**Schedule Management:**
- Admin/instructor schedule CRUD integrated into courses page
- Dialog-based UI pattern following course content manager design
- Storage methods: `getSchedulesByCourse`, `getSchedule`, `createSchedule`, `updateSchedule`, `deleteSchedule`, `getSchedulesWithDetails`, `getCoursesWithScheduleCount`
- API endpoints: GET/POST `/api/admin/courses/:courseId/schedules`, PATCH/DELETE `/api/admin/schedules/:id`, GET `/api/schedules`, GET `/api/courses` (includes schedule counts)
- Date handling: Frontend uses datetime-local inputs (ISO strings), backend schema coerces to Date objects
- **Course Management Statistics:**
  - Course management table (`/admin/courses`) displays comprehensive statistics for each course:
    - Topic count: Number of topics in the course
    - Post count: Total number of posts/lessons across all topics
    - Schedule count: Number of scheduled sessions
  - Optimized query using LEFT JOIN and COUNT DISTINCT aggregation (no N+1 queries)
  - Properly typed with extended Course type including count fields
  - Provides at-a-glance overview of course content and scheduling
- **Student Course Schedule Count:**
  - Student courses page (`/courses`) displays schedule count on both enrolled and available course cards
  - Shows "X session scheduled" (singular) or "X sessions scheduled" (plural) with Calendar icon
  - Helps students see how many sessions are available for each course
  - Backend endpoint `/api/courses` uses `getCoursesWithScheduleCount()` for efficiency
- **Schedule Calendar Feature:**
  - Weekly calendar view accessible via `/schedule` (students), `/instructor/schedule` (instructors), `/admin/schedule` (admins)
  - Role-based filtering: Students see only schedules for enrolled courses; instructors/admins see all schedules
  - Interactive calendar with 7-day weekly grid (Monday-Sunday), navigation buttons (Previous Week, Today, Next Week)
  - Schedule cards display: session title, course name, start/end time, instructor name, location, capacity/registration count
  - Student registration: Students can register/unregister for upcoming sessions directly from calendar
  - Capacity enforcement: Backend validates capacity limits and prevents duplicate registrations via `registerForSession`
  - Real-time status indicators: "Registered" badge for enrolled sessions, "Full" badge for at-capacity sessions
  - Current day highlighting with primary color for easy orientation

**Enrollment Tracking:**
- Admin-only enrollment overview and student progress tracking
- Storage methods: `getEnrollmentsWithCourseDetails(studentId)` fetches student enrollments with course details via join; `getAllEnrollmentsWithDetails()` fetches all enrollments with student and course information
- API endpoints: GET `/api/admin/users/:id/enrollments` (individual student), GET `/api/admin/enrollments` (all enrollments)
- Frontend features: Student progress dialog in User Management (`/admin/users`) and comprehensive enrollments overview page (`/admin/enrollments`) with search functionality
- TanStack Query pattern: Query keys use full path strings (e.g., `["/api/admin/enrollments"]`) for proper API routing

**Security:**
- `upsertUser` validates email uniqueness and rejects conflicts to prevent account takeover
- OIDC authentication preserves existing user roles during login instead of overwriting with default role
- **Account Unification:** When a user logs in via OIDC but already exists as local auth user (same email), the system merges the accounts by:
  - Checking for existing user by OIDC sub claim first
  - If not found, checking by email to find local auth users
  - Using the existing user's ID instead of creating a new account
  - Updating session claims.sub to match the unified user ID for consistency across both auth methods
  - This allows seamless switching between OIDC and local auth while preserving user data and role
- Role-based access control enforced on all admin-only endpoints
- Session registration capacity enforcement: `registerForSession` validates schedule exists, checks for duplicate registration, and verifies available capacity before allowing registration

### Database Schema

**Core Entities:**
- `users` - Authentication and profile data with role enum (student/instructor/admin), password field (nullable, only for local auth)
- `courses` - Course definitions with pricing, duration, requirements
- `topics` - Course content structure with type field (theory/practice), orderIndex for sequencing
- `posts` - Learning content within topics with HTML support, title, orderIndex for sequencing
- `questions` - Question bank with choices array containing text and isCorrect fields (single/multiple choice)
- `testTemplates` - Test configuration with questionCount, passingScore, mode (random/manual), randomizeQuestions flag
- `testInstances` - Student test attempts with answers and scoring
- `courseEnrollments` - Student-course relationships with progress tracking
- `schedules` - Theory/practice session scheduling
- `sessionRegistrations` - Student registration for scheduled sessions
- `attendance` - Attendance tracking (present/absent)
- `payments` - Payment records linked to courses/enrollments
- `certificates` - Digital certificates with verification codes
- `auditLogs` - System activity tracking
- `emailTemplates` - Configurable notification templates
- `sessions` - Session storage for Replit Auth

**Key Relationships:**
- Courses have many topics, enrollments, and completion tests
- Topics belong to courses and contain many posts (cascade delete)
- Posts belong to topics with HTML content field
- Questions have answer choices with correct/incorrect flags
- Tests reference templates and include multiple questions via testQuestions join table
- Manual test templates support custom question selection with reordering
- Schedules link courses, topics, and instructors
- Enrollments track student progress and completion
- Certificates tied to courses and students

**Schema Management:**
- Drizzle Kit for migrations (output: `./migrations`)
- Schema definition in `shared/schema.ts` for frontend/backend sharing
- Zod validation schemas auto-generated from Drizzle schemas

### External Dependencies

**Third-Party Services:**
- **Neon Database** - Serverless PostgreSQL hosting
- **Stripe** - Payment processing and subscription management
- **Replit Auth** - Authentication via OpenID Connect

**Key NPM Packages:**
- `drizzle-orm` & `drizzle-kit` - Database ORM and migrations
- `@neondatabase/serverless` - Neon database client with WebSocket support
- `passport` & `openid-client` - Authentication strategy
- `stripe` & `@stripe/stripe-js` - Payment integration
- `@tanstack/react-query` - Client data fetching/caching
- `react-hook-form` & `@hookform/resolvers` - Form management
- `zod` - Runtime type validation
- `date-fns` - Date manipulation
- `nanoid` - Unique ID generation

**Build & Development Tools:**
- `vite` - Build tool and dev server
- `tsx` - TypeScript execution for development
- `esbuild` - Production server bundling
- Replit-specific plugins for cartographer and dev banner

**Design System:**
- Google Fonts: Inter (primary), DM Sans, Geist Mono, JetBrains Mono
- Custom CSS variables for theming (light/dark mode support)
- Consistent spacing scale (2, 3, 4, 6, 8, 12, 16px units)
- Border radius: lg (9px), md (6px), sm (3px)

## Development Data

**Seed Script** (`server/seed.ts`):
- Run with: `npx tsx server/seed.ts`
- Populates database with comprehensive mock data for development and testing

**Seeded Data Includes:**
- **Admin** (1): Admin User (id: admin-user, email: admin@drivingschool.com, password: `password123`)
- **Instructors** (2): John Doe, Jane Smith (password: `password123`)
- **Courses** (3):
  - Beginner Driver Training ($1200, Beginner category)
  - Advanced Defensive Driving ($800, Advanced category)
  - Commercial License Preparation ($2500, Professional category)
- **Topics** (7): Mix of theory and practice topics across all courses
- **Posts** (5): Learning content with HTML formatting
- **Questions** (6): Single-choice questions with tags (traffic-signs, vehicle-control, defensive-driving, parking)
- **Test Templates** (2): Linked to Beginner and Advanced courses via courseCompletionTests
- **Schedules** (5): Upcoming sessions 1-3 weeks out with proper instructor assignments
- **Students** (6) - All at different progress stages:
  - Alice Johnson: Just started beginner course (10 days ago)
  - Bob Williams: Mid-way through beginner (30 days ago)
  - Carol Davis: Almost completed beginner (60 days ago)
  - David Miller: Completed beginner course (90 days enrolled, completed 5 days ago)
  - Emma Wilson: In advanced course (15 days ago)
  - Frank Moore: In commercial course (20 days ago)
- **Enrollments** (6): Matching student progress stages
- **Test Instances** (3): Carol (85%, passed), David (95%, passed), Bob (65%, failed)
- **Session Registrations** (4): Students registered for upcoming sessions

**Default Credentials:**
- All seeded users (instructors and students) use password: `password123`
- Emails follow pattern: firstname.lastname@domain.com