# Driving School Management Platform

A comprehensive web-based platform for driving schools that digitizes the entire student lifecycle, from registration to certification. The platform offers a unified interface for managing courses, enrollments, theory and practice sessions, testing, certification, scheduling, and payments, all supported by role-based access control.

## Features

- **Dual Authentication System**: Replit Auth (SSO) and email/password authentication
- **Role-Based Access Control**: Student, Instructor, and Administrator roles with specific permissions
- **Course Management**: Hierarchical structure with topics, assessments, and posts
- **3-Level Question Bank**: Organized by Category > Topic > Question for better organization
- **Flexible Assessments**: Random, manual, and linked template modes with configurable limits
- **Schedule Management**: DST-aware scheduling with calendar view and timezone support (Riga UTC+2/3)
- **Attendance Tracking**: Manual attendance marking by instructors and admins
- **Payment Integration**: Stripe integration for secure payment processing
- **Certificate Generation**: Automated certificate generation upon course completion
- **Email Notifications**: Automated email notifications for various events
- **Admin Dashboard**: Comprehensive analytics and reporting

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v18 or higher)
- **npm** (v9 or higher)
- **PostgreSQL** database (v14 or higher)
- **Stripe Account** (for payment processing)

## Installation

### 1. Clone the Repository

```bash
git clone <repository-url>
cd driving-school-platform
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Set Up Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
# Database Configuration
DATABASE_URL=postgresql://username:password@localhost:5432/driving_school_db
PGHOST=localhost
PGPORT=5432
PGDATABASE=driving_school_db
PGUSER=your_username
PGPASSWORD=your_password

# Session Configuration
SESSION_SECRET=your-super-secret-session-key-change-this-in-production

# Stripe Configuration (Development)
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
VITE_STRIPE_PUBLIC_KEY=pk_test_your_stripe_public_key

# Stripe Configuration (Testing - Optional)
TESTING_STRIPE_SECRET_KEY=sk_test_your_testing_key
TESTING_VITE_STRIPE_PUBLIC_KEY=pk_test_your_testing_public_key

# Application Environment
NODE_ENV=development
```

**Important Notes:**
- Replace all placeholder values with your actual credentials
- Never commit the `.env` file to version control
- For `SESSION_SECRET`, generate a random string (at least 32 characters)
- Get Stripe keys from your [Stripe Dashboard](https://dashboard.stripe.com/apikeys)

### 4. Set Up the Database

#### Create the Database

```bash
# Using psql
createdb driving_school_db

# Or using SQL
psql -U postgres
CREATE DATABASE driving_school_db;
```

#### Run Database Migrations

```bash
npm run db:push
```

This command will:
- Create all necessary tables
- Set up relationships and indexes
- Prepare the database for use

### 5. Start the Development Server

```bash
npm run dev
```

The application will be available at:
- **Frontend & Backend**: http://localhost:5000

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server with hot reload |
| `npm run build` | Build production bundle (frontend + backend) |
| `npm start` | Start production server |
| `npm run check` | Run TypeScript type checking |
| `npm run db:push` | Push database schema changes |

## Project Structure

```
driving-school-platform/
├── client/                 # Frontend React application
│   ├── src/
│   │   ├── components/    # Reusable UI components (shadcn/ui)
│   │   ├── pages/         # Page components
│   │   │   ├── admin/     # Admin-specific pages
│   │   │   ├── student/   # Student-specific pages
│   │   │   └── instructor/# Instructor-specific pages
│   │   ├── lib/           # Utilities and helpers
│   │   └── hooks/         # Custom React hooks
├── server/                # Backend Express application
│   ├── routes.ts          # API route definitions
│   ├── storage.ts         # Database operations layer
│   ├── auth.ts            # Authentication strategies
│   └── index.ts           # Server entry point
├── shared/                # Shared code between frontend and backend
│   └── schema.ts          # Database schema and Zod types
├── migrations/            # Database migration files
└── package.json           # Project dependencies and scripts
```

## Technology Stack

### Frontend
- **React 18** - UI library
- **TypeScript** - Type-safe JavaScript
- **Vite** - Build tool and dev server
- **TailwindCSS** - Utility-first CSS framework
- **shadcn/ui** - High-quality UI components
- **TanStack Query** - Server state management
- **Wouter** - Lightweight routing
- **React Hook Form** - Form management
- **Tiptap** - Rich text editor
- **date-fns** & **date-fns-tz** - Date manipulation and timezone handling

### Backend
- **Express.js** - Web framework
- **TypeScript** - Type-safe JavaScript
- **Passport.js** - Authentication middleware
- **Drizzle ORM** - Type-safe database ORM
- **PostgreSQL** - Relational database
- **Neon** - Serverless PostgreSQL hosting
- **Stripe** - Payment processing
- **bcrypt** - Password hashing
- **express-session** - Session management

## User Roles and Permissions

### Administrator
- Full access to all features
- User management
- Course creation and management
- Question bank management
- Test template management
- Schedule management
- Payment management
- Certificate management
- System reports and audit logs

### Instructor
- Access to assigned courses only
- Course content management (topics, posts, assessments)
- Question bank management
- Test template management
- Schedule viewing and management
- Attendance tracking for assigned sessions
- Payment viewing
- Certificate viewing
- **Cannot**: Create new courses, manage users, access system reports

### Student
- View enrolled courses
- Access course curriculum
- Take assessments and tests
- View schedule calendar
- Track attendance
- View payments and receipts
- Download certificates

## Default Credentials

After setting up the database, you can create initial users through the registration interface or manually insert them into the database.

**Note**: For security, there are no default credentials. Create your first admin user through the application or database.

## Database Schema

The platform uses the following main entities:

- **Users**: User accounts with roles
- **Courses**: Main course entities
- **Topics**: Course sections containing content
- **Posts**: Learning materials within topics
- **Question Categories**: Top-level question organization
- **Question Topics**: Mid-level question organization
- **Questions**: Individual test questions
- **Test Templates**: Reusable test configurations
- **Topic Assessments**: Topic-specific tests
- **Test Instances**: Student test attempts
- **Course Enrollments**: Student course registrations
- **Schedules**: Course sessions
- **Attendance**: Session attendance records
- **Payments**: Payment transactions
- **Certificates**: Course completion certificates
- **Audit Logs**: System activity tracking

## Features in Detail

### Hierarchical Question Bank
The system uses a 3-level structure for organizing questions:
1. **Categories** (e.g., "Traffic Laws & Regulations")
2. **Topics** (e.g., "Speed Limits")
3. **Questions** (scoped to topics)

### Assessment System
Three assessment modes:
- **Random**: Randomly select questions from question bank
- **Manual**: Hand-pick specific questions
- **Linked Template**: Reference an existing test template

Configurable features:
- Maximum attempts
- Time limits
- Passing percentage
- Question randomization
- Auto-submission when time expires

### Schedule Management
- Timezone-aware (Riga UTC+2/3 with DST support)
- Calendar view for students, instructors, and admins
- Role-based filtering
- Instructor filtering
- Sessions are informational only (no student registration)

### Attendance System
- Manual tracking by instructors and admins
- Students cannot register for sessions
- Attendance pulled from course enrollments
- Track present/absent status with timestamps

## Troubleshooting

### Database Connection Issues
```bash
# Check if PostgreSQL is running
sudo systemctl status postgresql

# Verify database exists
psql -U postgres -l
```

### Port Already in Use
If port 5000 is already in use:
```bash
# Find and kill the process using port 5000
lsof -ti:5000 | xargs kill -9
```

### Environment Variables Not Loading
Make sure:
1. `.env` file is in the root directory
2. All required variables are set
3. Restart the development server after changes

### Stripe Webhook Issues
For local development, use Stripe CLI:
```bash
stripe listen --forward-to localhost:5000/api/stripe/webhook
```

## Production Deployment

### Build the Application
```bash
npm run build
```

### Set Production Environment Variables
Ensure all environment variables are set with production values:
- Use production Stripe keys
- Use a strong `SESSION_SECRET`
- Set `NODE_ENV=production`

### Start the Production Server
```bash
npm start
```

## Contributing

1. Create a feature branch
2. Make your changes
3. Test thoroughly
4. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

For issues and questions, please create an issue in the repository or contact the development team.

## Acknowledgments

- Built with [Replit](https://replit.com)
- UI components from [shadcn/ui](https://ui.shadcn.com)
- Database hosted on [Neon](https://neon.tech)
- Payments powered by [Stripe](https://stripe.com)
