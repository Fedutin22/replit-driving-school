import {
  users,
  courses,
  topics,
  questions,
  testTemplates,
  testQuestions,
  testInstances,
  courseEnrollments,
  courseCompletionTests,
  schedules,
  sessionRegistrations,
  attendance,
  payments,
  certificates,
  auditLogs,
  emailTemplates,
  type User,
  type UpsertUser,
  type InsertCourse,
  type Course,
  type InsertTopic,
  type Topic,
  type InsertQuestion,
  type Question,
  type InsertTestTemplate,
  type TestTemplate,
  type InsertTestInstance,
  type TestInstance,
  type InsertCourseEnrollment,
  type CourseEnrollment,
  type InsertSchedule,
  type Schedule,
  type InsertPayment,
  type Payment,
  type InsertCertificate,
  type Certificate,
  type InsertAuditLog,
  type AuditLog,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, sql, inArray } from "drizzle-orm";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  getAllUsers(): Promise<User[]>;
  updateUser(id: string, data: Partial<User>): Promise<User>;
  
  // Course operations
  getCourses(): Promise<Course[]>;
  getCourse(id: string): Promise<Course | undefined>;
  createCourse(course: InsertCourse): Promise<Course>;
  updateCourse(id: string, data: Partial<Course>): Promise<Course>;
  
  // Topic operations
  getTopicsByCourse(courseId: string): Promise<Topic[]>;
  createTopic(topic: InsertTopic): Promise<Topic>;
  updateTopic(id: string, data: Partial<Topic>): Promise<Topic>;
  
  // Question operations
  getQuestions(): Promise<Question[]>;
  getQuestion(id: string): Promise<Question | undefined>;
  createQuestion(question: InsertQuestion): Promise<Question>;
  updateQuestion(id: string, data: Partial<Question>): Promise<Question>;
  deleteQuestion(id: string): Promise<void>;
  
  // Test template operations
  getTestTemplates(): Promise<TestTemplate[]>;
  getTestTemplate(id: string): Promise<TestTemplate | undefined>;
  createTestTemplate(template: InsertTestTemplate): Promise<TestTemplate>;
  updateTestTemplate(id: string, data: Partial<TestTemplate>): Promise<TestTemplate>;
  
  // Test instance operations
  createTestInstance(instance: InsertTestInstance): Promise<TestInstance>;
  getTestInstance(id: string): Promise<TestInstance | undefined>;
  updateTestInstance(id: string, data: Partial<TestInstance>): Promise<TestInstance>;
  getTestInstancesByStudent(studentId: string): Promise<TestInstance[]>;
  
  // Enrollment operations
  createEnrollment(enrollment: InsertCourseEnrollment): Promise<CourseEnrollment>;
  getEnrollmentsByStudent(studentId: string): Promise<CourseEnrollment[]>;
  getEnrollment(courseId: string, studentId: string): Promise<CourseEnrollment | undefined>;
  updateEnrollment(id: string, data: Partial<CourseEnrollment>): Promise<CourseEnrollment>;
  
  // Schedule operations
  getSchedules(): Promise<Schedule[]>;
  createSchedule(schedule: InsertSchedule): Promise<Schedule>;
  updateSchedule(id: string, data: Partial<Schedule>): Promise<Schedule>;
  registerForSession(scheduleId: string, studentId: string): Promise<void>;
  unregisterFromSession(scheduleId: string, studentId: string): Promise<void>;
  getSessionRegistrationCount(scheduleId: string): Promise<number>;
  isStudentRegistered(scheduleId: string, studentId: string): Promise<boolean>;
  
  // Payment operations
  createPayment(payment: InsertPayment): Promise<Payment>;
  getPaymentsByStudent(studentId: string): Promise<Payment[]>;
  getPayment(id: string): Promise<Payment | undefined>;
  updatePayment(id: string, data: Partial<Payment>): Promise<Payment>;
  
  // Certificate operations
  createCertificate(certificate: InsertCertificate): Promise<Certificate>;
  getCertificatesByStudent(studentId: string): Promise<Certificate[]>;
  getCertificate(id: string): Promise<Certificate | undefined>;
  updateCertificate(id: string, data: Partial<Certificate>): Promise<Certificate>;
  
  // Audit log operations
  createAuditLog(log: InsertAuditLog): Promise<AuditLog>;
  getAuditLogs(): Promise<AuditLog[]>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(desc(users.createdAt));
  }

  async updateUser(id: string, data: Partial<User>): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  // Course operations
  async getCourses(): Promise<Course[]> {
    return await db.select().from(courses).orderBy(desc(courses.createdAt));
  }

  async getCourse(id: string): Promise<Course | undefined> {
    const [course] = await db.select().from(courses).where(eq(courses.id, id));
    return course || undefined;
  }

  async createCourse(courseData: InsertCourse): Promise<Course> {
    const [course] = await db.insert(courses).values(courseData).returning();
    return course;
  }

  async updateCourse(id: string, data: Partial<Course>): Promise<Course> {
    const [course] = await db
      .update(courses)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(courses.id, id))
      .returning();
    return course;
  }

  // Topic operations
  async getTopicsByCourse(courseId: string): Promise<Topic[]> {
    return await db
      .select()
      .from(topics)
      .where(eq(topics.courseId, courseId))
      .orderBy(topics.orderIndex);
  }

  async createTopic(topicData: InsertTopic): Promise<Topic> {
    const [topic] = await db.insert(topics).values(topicData).returning();
    return topic;
  }

  async updateTopic(id: string, data: Partial<Topic>): Promise<Topic> {
    const [topic] = await db
      .update(topics)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(topics.id, id))
      .returning();
    return topic;
  }

  // Question operations
  async getQuestions(): Promise<Question[]> {
    return await db.select().from(questions).orderBy(desc(questions.createdAt));
  }

  async getQuestion(id: string): Promise<Question | undefined> {
    const [question] = await db.select().from(questions).where(eq(questions.id, id));
    return question || undefined;
  }

  async createQuestion(questionData: InsertQuestion): Promise<Question> {
    const [question] = await db.insert(questions).values(questionData).returning();
    return question;
  }

  async updateQuestion(id: string, data: Partial<Question>): Promise<Question> {
    const [question] = await db
      .update(questions)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(questions.id, id))
      .returning();
    return question;
  }

  async deleteQuestion(id: string): Promise<void> {
    await db.delete(questions).where(eq(questions.id, id));
  }

  // Test template operations
  async getTestTemplates(): Promise<TestTemplate[]> {
    return await db.select().from(testTemplates).orderBy(desc(testTemplates.createdAt));
  }

  async getTestTemplate(id: string): Promise<TestTemplate | undefined> {
    const [template] = await db.select().from(testTemplates).where(eq(testTemplates.id, id));
    return template || undefined;
  }

  async createTestTemplate(templateData: InsertTestTemplate): Promise<TestTemplate> {
    const [template] = await db.insert(testTemplates).values(templateData).returning();
    return template;
  }

  async updateTestTemplate(id: string, data: Partial<TestTemplate>): Promise<TestTemplate> {
    const [template] = await db
      .update(testTemplates)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(testTemplates.id, id))
      .returning();
    return template;
  }

  // Test instance operations
  async createTestInstance(instanceData: InsertTestInstance): Promise<TestInstance> {
    const [instance] = await db.insert(testInstances).values(instanceData).returning();
    return instance;
  }

  async getTestInstance(id: string): Promise<TestInstance | undefined> {
    const [instance] = await db.select().from(testInstances).where(eq(testInstances.id, id));
    return instance || undefined;
  }

  async updateTestInstance(id: string, data: Partial<TestInstance>): Promise<TestInstance> {
    const [instance] = await db
      .update(testInstances)
      .set(data)
      .where(eq(testInstances.id, id))
      .returning();
    return instance;
  }

  async getTestInstancesByStudent(studentId: string): Promise<TestInstance[]> {
    return await db
      .select()
      .from(testInstances)
      .where(eq(testInstances.studentId, studentId))
      .orderBy(desc(testInstances.createdAt));
  }

  // Enrollment operations
  async createEnrollment(enrollmentData: InsertCourseEnrollment): Promise<CourseEnrollment> {
    const [enrollment] = await db.insert(courseEnrollments).values(enrollmentData).returning();
    return enrollment;
  }

  async getEnrollmentsByStudent(studentId: string): Promise<CourseEnrollment[]> {
    return await db
      .select()
      .from(courseEnrollments)
      .where(eq(courseEnrollments.studentId, studentId))
      .orderBy(desc(courseEnrollments.enrolledAt));
  }

  async getEnrollment(courseId: string, studentId: string): Promise<CourseEnrollment | undefined> {
    const [enrollment] = await db
      .select()
      .from(courseEnrollments)
      .where(
        and(
          eq(courseEnrollments.courseId, courseId),
          eq(courseEnrollments.studentId, studentId)
        )
      );
    return enrollment || undefined;
  }

  async updateEnrollment(id: string, data: Partial<CourseEnrollment>): Promise<CourseEnrollment> {
    const [enrollment] = await db
      .update(courseEnrollments)
      .set(data)
      .where(eq(courseEnrollments.id, id))
      .returning();
    return enrollment;
  }

  // Schedule operations
  async getSchedules(): Promise<Schedule[]> {
    return await db.select().from(schedules).orderBy(schedules.startTime);
  }

  async createSchedule(scheduleData: InsertSchedule): Promise<Schedule> {
    const [schedule] = await db.insert(schedules).values(scheduleData).returning();
    return schedule;
  }

  async updateSchedule(id: string, data: Partial<Schedule>): Promise<Schedule> {
    const [schedule] = await db
      .update(schedules)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(schedules.id, id))
      .returning();
    return schedule;
  }

  async registerForSession(scheduleId: string, studentId: string): Promise<void> {
    await db.insert(sessionRegistrations).values({ scheduleId, studentId });
  }

  async unregisterFromSession(scheduleId: string, studentId: string): Promise<void> {
    await db
      .delete(sessionRegistrations)
      .where(
        and(
          eq(sessionRegistrations.scheduleId, scheduleId),
          eq(sessionRegistrations.studentId, studentId)
        )
      );
  }

  async getSessionRegistrationCount(scheduleId: string): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(sessionRegistrations)
      .where(eq(sessionRegistrations.scheduleId, scheduleId));
    return Number(result[0]?.count || 0);
  }

  async isStudentRegistered(scheduleId: string, studentId: string): Promise<boolean> {
    const [registration] = await db
      .select()
      .from(sessionRegistrations)
      .where(
        and(
          eq(sessionRegistrations.scheduleId, scheduleId),
          eq(sessionRegistrations.studentId, studentId)
        )
      );
    return !!registration;
  }

  // Payment operations
  async createPayment(paymentData: InsertPayment): Promise<Payment> {
    const [payment] = await db.insert(payments).values(paymentData).returning();
    return payment;
  }

  async getPaymentsByStudent(studentId: string): Promise<Payment[]> {
    return await db
      .select()
      .from(payments)
      .where(eq(payments.studentId, studentId))
      .orderBy(desc(payments.createdAt));
  }

  async getPayment(id: string): Promise<Payment | undefined> {
    const [payment] = await db.select().from(payments).where(eq(payments.id, id));
    return payment || undefined;
  }

  async updatePayment(id: string, data: Partial<Payment>): Promise<Payment> {
    const [payment] = await db
      .update(payments)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(payments.id, id))
      .returning();
    return payment;
  }

  // Certificate operations
  async createCertificate(certificateData: InsertCertificate): Promise<Certificate> {
    const [certificate] = await db.insert(certificates).values(certificateData).returning();
    return certificate;
  }

  async getCertificatesByStudent(studentId: string): Promise<Certificate[]> {
    return await db
      .select()
      .from(certificates)
      .where(eq(certificates.studentId, studentId))
      .orderBy(desc(certificates.issuedAt));
  }

  async getCertificate(id: string): Promise<Certificate | undefined> {
    const [certificate] = await db.select().from(certificates).where(eq(certificates.id, id));
    return certificate || undefined;
  }

  async updateCertificate(id: string, data: Partial<Certificate>): Promise<Certificate> {
    const [certificate] = await db
      .update(certificates)
      .set(data)
      .where(eq(certificates.id, id))
      .returning();
    return certificate;
  }

  // Audit log operations
  async createAuditLog(logData: InsertAuditLog): Promise<AuditLog> {
    const [log] = await db.insert(auditLogs).values(logData).returning();
    return log;
  }

  async getAuditLogs(): Promise<AuditLog[]> {
    return await db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt)).limit(100);
  }
}

export const storage = new DatabaseStorage();
