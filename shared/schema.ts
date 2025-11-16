import { sql } from 'drizzle-orm';
import { relations } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  text,
  integer,
  boolean,
  decimal,
  pgEnum,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table (required for Replit Auth)
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// Enums
export const roleEnum = pgEnum("role", ["student", "instructor", "admin"]);
export const questionTypeEnum = pgEnum("question_type", ["single_choice", "multiple_choice"]);
export const testModeEnum = pgEnum("test_mode", ["random", "manual"]);
export const paymentStatusEnum = pgEnum("payment_status", ["pending", "paid", "failed"]);
export const attendanceStatusEnum = pgEnum("attendance_status", ["present", "absent"]);

// Users table (supports both Replit Auth and local email/password auth)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  password: varchar("password"),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  role: roleEnum("role").notNull().default("student"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const usersRelations = relations(users, ({ many }) => ({
  courseEnrollments: many(courseEnrollments),
  testResults: many(testResults),
  sessionRegistrations: many(sessionRegistrations),
  attendance: many(attendance),
  payments: many(payments),
  certificates: many(certificates),
  instructorSchedules: many(schedules),
  auditLogs: many(auditLogs),
}));

// Courses table
export const courses = pgTable("courses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  category: varchar("category", { length: 100 }),
  price: decimal("price", { precision: 10, scale: 2 }),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const coursesRelations = relations(courses, ({ many }) => ({
  topics: many(topics),
  enrollments: many(courseEnrollments),
  completionTests: many(courseCompletionTests),
  schedules: many(schedules),
  payments: many(payments),
  certificates: many(certificates),
}));

// Topics table
export const topics = pgTable("topics", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  courseId: varchar("course_id").notNull().references(() => courses.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  type: varchar("type", { length: 20 }).notNull().default("theory"),
  orderIndex: integer("order_index").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const topicsRelations = relations(topics, ({ one, many }) => ({
  course: one(courses, {
    fields: [topics.courseId],
    references: [courses.id],
  }),
  schedules: many(schedules),
  posts: many(posts),
}));

// Posts table (course content within topics)
export const posts = pgTable("posts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  topicId: varchar("topic_id").notNull().references(() => topics.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 255 }).notNull(),
  content: text("content").notNull(), // HTML content
  orderIndex: integer("order_index").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const postsRelations = relations(posts, ({ one }) => ({
  topic: one(topics, {
    fields: [posts.topicId],
    references: [topics.id],
  }),
}));

// Questions table - Standalone question bank (not linked to courses or topics)
export const questions = pgTable("questions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  questionText: text("question_text").notNull(),
  explanation: text("explanation"),
  type: questionTypeEnum("type").notNull(),
  choices: jsonb("choices").notNull(), // Array of {label: string, isCorrect: boolean}
  tags: jsonb("tags"), // Array of strings for categorization
  isArchived: boolean("is_archived").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const questionsRelations = relations(questions, ({ many }) => ({
  testQuestions: many(testQuestions),
}));

// Test templates table - Reusable across multiple courses
export const testTemplates = pgTable("test_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  mode: testModeEnum("mode").notNull(),
  questionCount: integer("question_count"), // For random mode
  randomizeQuestions: boolean("randomize_questions").notNull().default(false), // Randomize question order
  passingPercentage: integer("passing_percentage").notNull().default(70),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const testTemplatesRelations = relations(testTemplates, ({ many }) => ({
  testQuestions: many(testQuestions),
  testInstances: many(testInstances),
  completionTests: many(courseCompletionTests),
}));

// Test questions (for manual mode - links questions to templates)
export const testQuestions = pgTable("test_questions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  testTemplateId: varchar("test_template_id").notNull().references(() => testTemplates.id, { onDelete: "cascade" }),
  questionId: varchar("question_id").notNull().references(() => questions.id, { onDelete: "cascade" }),
  orderIndex: integer("order_index").notNull().default(0),
});

export const testQuestionsRelations = relations(testQuestions, ({ one }) => ({
  testTemplate: one(testTemplates, {
    fields: [testQuestions.testTemplateId],
    references: [testTemplates.id],
  }),
  question: one(questions, {
    fields: [testQuestions.questionId],
    references: [questions.id],
  }),
}));

// Test instances (actual tests taken by students)
export const testInstances = pgTable("test_instances", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  testTemplateId: varchar("test_template_id").notNull().references(() => testTemplates.id, { onDelete: "restrict" }),
  studentId: varchar("student_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  questionsData: jsonb("questions_data").notNull(), // Snapshot of questions served
  answersData: jsonb("answers_data"), // Student's answers
  score: integer("score"),
  percentage: integer("percentage"),
  passed: boolean("passed"),
  startedAt: timestamp("started_at").defaultNow().notNull(),
  submittedAt: timestamp("submitted_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const testInstancesRelations = relations(testInstances, ({ one }) => ({
  testTemplate: one(testTemplates, {
    fields: [testInstances.testTemplateId],
    references: [testTemplates.id],
  }),
  student: one(users, {
    fields: [testInstances.studentId],
    references: [users.id],
  }),
}));

// Alias for test results (same as test instances, just a different view)
export const testResults = testInstances;

// Course enrollments
export const courseEnrollments = pgTable("course_enrollments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  courseId: varchar("course_id").notNull().references(() => courses.id, { onDelete: "cascade" }),
  studentId: varchar("student_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  enrolledAt: timestamp("enrolled_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
  isActive: boolean("is_active").notNull().default(true),
});

export const courseEnrollmentsRelations = relations(courseEnrollments, ({ one }) => ({
  course: one(courses, {
    fields: [courseEnrollments.courseId],
    references: [courses.id],
  }),
  student: one(users, {
    fields: [courseEnrollments.studentId],
    references: [users.id],
  }),
}));

// Course completion tests (required tests for course completion)
export const courseCompletionTests = pgTable("course_completion_tests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  courseId: varchar("course_id").notNull().references(() => courses.id, { onDelete: "cascade" }),
  testTemplateId: varchar("test_template_id").notNull().references(() => testTemplates.id, { onDelete: "cascade" }),
  minScore: integer("min_score"), // Optional minimum score override
});

export const courseCompletionTestsRelations = relations(courseCompletionTests, ({ one }) => ({
  course: one(courses, {
    fields: [courseCompletionTests.courseId],
    references: [courses.id],
  }),
  testTemplate: one(testTemplates, {
    fields: [courseCompletionTests.testTemplateId],
    references: [testTemplates.id],
  }),
}));

// Schedules
export const schedules = pgTable("schedules", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  courseId: varchar("course_id").notNull().references(() => courses.id, { onDelete: "cascade" }),
  topicId: varchar("topic_id").references(() => topics.id, { onDelete: "set null" }),
  instructorId: varchar("instructor_id").notNull().references(() => users.id, { onDelete: "restrict" }),
  title: varchar("title", { length: 255 }).notNull(),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time").notNull(),
  location: varchar("location", { length: 255 }),
  capacity: integer("capacity").notNull().default(20),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const schedulesRelations = relations(schedules, ({ one, many }) => ({
  course: one(courses, {
    fields: [schedules.courseId],
    references: [courses.id],
  }),
  topic: one(topics, {
    fields: [schedules.topicId],
    references: [topics.id],
  }),
  instructor: one(users, {
    fields: [schedules.instructorId],
    references: [users.id],
  }),
  registrations: many(sessionRegistrations),
  attendance: many(attendance),
}));

// Session registrations
export const sessionRegistrations = pgTable("session_registrations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  scheduleId: varchar("schedule_id").notNull().references(() => schedules.id, { onDelete: "cascade" }),
  studentId: varchar("student_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  registeredAt: timestamp("registered_at").defaultNow().notNull(),
});

export const sessionRegistrationsRelations = relations(sessionRegistrations, ({ one }) => ({
  schedule: one(schedules, {
    fields: [sessionRegistrations.scheduleId],
    references: [schedules.id],
  }),
  student: one(users, {
    fields: [sessionRegistrations.studentId],
    references: [users.id],
  }),
}));

// Attendance
export const attendance = pgTable("attendance", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  scheduleId: varchar("schedule_id").notNull().references(() => schedules.id, { onDelete: "cascade" }),
  studentId: varchar("student_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  status: attendanceStatusEnum("status").notNull(),
  markedAt: timestamp("marked_at").defaultNow().notNull(),
  markedBy: varchar("marked_by").references(() => users.id, { onDelete: "set null" }),
});

export const attendanceRelations = relations(attendance, ({ one }) => ({
  schedule: one(schedules, {
    fields: [attendance.scheduleId],
    references: [schedules.id],
  }),
  student: one(users, {
    fields: [attendance.studentId],
    references: [users.id],
  }),
}));

// Payments
export const payments = pgTable("payments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  courseId: varchar("course_id").notNull().references(() => courses.id, { onDelete: "restrict" }),
  studentId: varchar("student_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 3 }).notNull().default("usd"),
  status: paymentStatusEnum("status").notNull().default("pending"),
  stripePaymentIntentId: varchar("stripe_payment_intent_id"),
  stripeClientSecret: varchar("stripe_client_secret"),
  paidAt: timestamp("paid_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const paymentsRelations = relations(payments, ({ one }) => ({
  course: one(courses, {
    fields: [payments.courseId],
    references: [courses.id],
  }),
  student: one(users, {
    fields: [payments.studentId],
    references: [users.id],
  }),
}));

// Certificates
export const certificates = pgTable("certificates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  courseId: varchar("course_id").notNull().references(() => courses.id, { onDelete: "restrict" }),
  studentId: varchar("student_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  certificateNumber: varchar("certificate_number", { length: 100 }).notNull().unique(),
  issuedAt: timestamp("issued_at").defaultNow().notNull(),
  revokedAt: timestamp("revoked_at"),
  revokedReason: text("revoked_reason"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const certificatesRelations = relations(certificates, ({ one }) => ({
  course: one(courses, {
    fields: [certificates.courseId],
    references: [courses.id],
  }),
  student: one(users, {
    fields: [certificates.studentId],
    references: [users.id],
  }),
}));

// Audit logs
export const auditLogs = pgTable("audit_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: "set null" }),
  action: varchar("action", { length: 255 }).notNull(),
  entityType: varchar("entity_type", { length: 100 }),
  entityId: varchar("entity_id"),
  details: jsonb("details"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  user: one(users, {
    fields: [auditLogs.userId],
    references: [users.id],
  }),
}));

// Email templates
export const emailTemplates = pgTable("email_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 100 }).notNull().unique(),
  subject: varchar("subject", { length: 255 }).notNull(),
  body: text("body").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Type exports
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

export type InsertCourse = typeof courses.$inferInsert;
export type Course = typeof courses.$inferSelect;

export type InsertTopic = typeof topics.$inferInsert;
export type Topic = typeof topics.$inferSelect;

export type InsertPost = typeof posts.$inferInsert;
export type Post = typeof posts.$inferSelect;

export type InsertQuestion = typeof questions.$inferInsert;
export type Question = typeof questions.$inferSelect;

export type InsertTestTemplate = typeof testTemplates.$inferInsert;
export type TestTemplate = typeof testTemplates.$inferSelect;

export type InsertTestQuestion = typeof testQuestions.$inferInsert;
export type TestQuestion = typeof testQuestions.$inferSelect;

export type InsertTestInstance = typeof testInstances.$inferInsert;
export type TestInstance = typeof testInstances.$inferSelect;

export type InsertCourseEnrollment = typeof courseEnrollments.$inferInsert;
export type CourseEnrollment = typeof courseEnrollments.$inferSelect;

export type InsertCourseCompletionTest = typeof courseCompletionTests.$inferInsert;
export type CourseCompletionTest = typeof courseCompletionTests.$inferSelect;

export type InsertSchedule = typeof schedules.$inferInsert;
export type Schedule = typeof schedules.$inferSelect;

export type InsertSessionRegistration = typeof sessionRegistrations.$inferInsert;
export type SessionRegistration = typeof sessionRegistrations.$inferSelect;

export type InsertAttendance = typeof attendance.$inferInsert;
export type Attendance = typeof attendance.$inferSelect;

export type InsertPayment = typeof payments.$inferInsert;
export type Payment = typeof payments.$inferSelect;

export type InsertCertificate = typeof certificates.$inferInsert;
export type Certificate = typeof certificates.$inferSelect;

export type InsertAuditLog = typeof auditLogs.$inferInsert;
export type AuditLog = typeof auditLogs.$inferSelect;

export type InsertEmailTemplate = typeof emailTemplates.$inferInsert;
export type EmailTemplate = typeof emailTemplates.$inferSelect;

// Zod schemas
export const insertCourseSchema = createInsertSchema(courses).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTopicSchema = createInsertSchema(topics).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPostSchema = createInsertSchema(posts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertQuestionSchema = createInsertSchema(questions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTestTemplateSchema = createInsertSchema(testTemplates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertScheduleSchema = createInsertSchema(schedules).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPaymentSchema = createInsertSchema(payments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCertificateSchema = createInsertSchema(certificates).omit({
  id: true,
  createdAt: true,
});
