# Driving School Management Platform

## Overview

A comprehensive web-based platform for driving schools that digitizes the complete student lifecycle from registration through certification. The system manages courses, enrollments, theory and practice sessions, testing, certification, scheduling, and payments through a unified interface with role-based access control.

**Tech Stack:**
- Frontend: React with TypeScript, Vite, TailwindCSS, shadcn/ui components
- Backend: Express.js with TypeScript
- Database: PostgreSQL via Neon with Drizzle ORM
- Authentication: Replit Auth (OpenID Connect) with Passport.js
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
- Replit Auth integration using OpenID Connect (Passport.js Strategy)
- Session management with PostgreSQL store (`connect-pg-simple`)
- Role-based access control middleware (`requireRole`)
- Session cookie with 1-week TTL, HTTP-only, secure flags

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

### Database Schema

**Core Entities:**
- `users` - Authentication and profile data with role enum (student/instructor/admin)
- `courses` - Course definitions with pricing, duration, requirements
- `topics` - Course content structure (theory/practice)
- `questions` - Question bank for assessments (single/multiple choice)
- `testTemplates` - Test configuration (question count, passing score, mode)
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
- Tests reference templates and include multiple questions
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