# Driving School Management Platform

## Overview

A comprehensive web-based platform for driving schools that digitizes the entire student lifecycle, from registration to certification. It offers a unified interface for managing courses, enrollments, theory and practice sessions, testing, certification, scheduling, and payments, all supported by role-based access control. The platform aims to streamline operations and enhance the learning experience for students.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend

The frontend uses React 18 with TypeScript, Vite, TailwindCSS, and shadcn/ui components for a responsive and modern user interface. Wouter handles client-side routing, and TanStack Query manages server state and caching, including optimistic updates and automatic retry handling. Authentication involves a client-side hook for user fetching and role-based UI rendering.

### Backend

The backend is built with Express.js and TypeScript, featuring a dual authentication system supporting Replit Auth (SSO) and email/password. It employs Passport.js for authentication strategies and `connect-pg-simple` for session management with PostgreSQL. Role-based access control is enforced through middleware. The data access layer uses Drizzle ORM with a storage interface pattern for type-safe database interactions and connection pooling via `@neondatabase/serverless`. RESTful APIs are designed with consistent error handling and role-specific endpoints. Stripe is integrated for payment processing, including webhook support.

**Key Features:**

*   **Schedule Management:** Admins and instructors can manage course schedules. The system stores schedules in UTC, with frontend conversions to the Riga timezone (UTC+2/3) using `date-fns-tz` to handle Daylight Saving Time. Calendar views are available for students, instructors, and admins, with role-based filtering and instructor filtering. Sessions are informational only - students cannot register. Attendance is managed manually by instructors and admins.
*   **Course Management Statistics:** The admin course management table displays comprehensive statistics for each course, including topic, post, and schedule counts, optimized with efficient database queries.
*   **Student Course Schedule Count:** Students can view the number of scheduled sessions for both enrolled and available courses.
*   **Enrollment Tracking:** Admin-only features for student enrollment overview and progress tracking, with detailed enrollment data and search functionality.
*   **Assessment Attempt Limits:** Configurable maximum attempts for both topic assessments and test templates (defaulting to 3). Attempt limits are enforced server-side before allowing students to start assessments/tests, with dedicated API endpoints providing attempt statistics. All attempts (started and completed) count toward the limit.
*   **Test Time Limits:** Configurable time limits for both test templates and topic assessments (optional, specified in minutes). When a student takes a timed test, a countdown timer is displayed in MM:SS format, turning red when less than 5 minutes remain. When time expires, the test automatically submits with all answers given up to that point, showing a "Time's Up!" notification. The backend validates submissions with a 5-second grace period to account for network latency. The timer implementation uses a single interval lifecycle with refs to prevent memory leaks and duplicate submissions.
*   **Linked Template Assessments:** Topic assessments support three modes: "random" (select random questions from question bank), "manual" (select specific questions), and "linked_template" (reference an existing test template). When an assessment uses linked_template mode, it references a test template via testTemplateId and uses the template's questions and randomization settings. The assessment maintains its own timeLimit (overriding the template's) and maxAttempts for independent configuration. The admin form conditionally displays a test template selector when linked_template mode is selected. Time limit validation accepts empty strings (no limit) or positive integers >= 1 minute.
*   **Attendance Tracking:** Instructors and admins can manage attendance for scheduled sessions. The UI provides session selection and student lists, allowing marking of present/absent status. Security ensures instructors can only access their assigned sessions. Students do not interact with the attendance system - they are passive participants whose attendance is marked by staff.
*   **Account Unification:** The system unifies user accounts when a user logs in via OIDC with an email matching an existing local auth user, preserving user data and roles across authentication methods.
*   **Hierarchical Question Bank:** The question bank uses a 3-level hierarchical structure (Category > Topic > Question) for better organization. Categories group related topics (e.g., "Traffic Laws & Regulations"), topics contain questions on specific subjects (e.g., "Speed Limits"), and questions are scoped to topics. The system includes three frontend pages with breadcrumb navigation for easy traversal between levels, full CRUD operations at each level, and sample data covering traffic laws, vehicle operation, and road signs.

### Database Schema

The database schema, defined using Drizzle ORM, includes core entities like `users`, `courses`, `topics`, `posts`, `questionCategories`, `questionTopics`, `questions`, `testTemplates`, `testInstances`, `courseEnrollments`, `schedules`, `sessionRegistrations`, `attendance`, `payments`, `certificates`, `auditLogs`, `emailTemplates`, and `sessions`. Key relationships exist between these entities, such as courses having multiple topics and enrollments, and question categories containing topics which contain questions. Drizzle Kit handles migrations, and Zod schemas are auto-generated for validation.

## External Dependencies

### Third-Party Services

*   **Neon Database:** Serverless PostgreSQL hosting.
*   **Stripe:** Payment processing and subscription management.
*   **Replit Auth:** Authentication via OpenID Connect.

### Key NPM Packages

*   `drizzle-orm` & `drizzle-kit`: Database ORM and migrations.
*   `@neondatabase/serverless`: Neon database client.
*   `passport` & `openid-client`: Authentication.
*   `stripe` & `@stripe/stripe-js`: Payment integration.
*   `@tanstack/react-query`: Client data fetching/caching.
*   `react-hook-form` & `@hookform/resolvers`: Form management.
*   `zod`: Runtime type validation.
*   `date-fns` & `date-fns-tz`: Date manipulation and timezone conversions.
*   `nanoid`: Unique ID generation.