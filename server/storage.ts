import {
  users,
  courses,
  topics,
  posts,
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
  type InsertPost,
  type Post,
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
import { eq, and, desc, asc, lt, gt, sql, inArray } from "drizzle-orm";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
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
  getTopic(id: string): Promise<Topic | undefined>;
  createTopic(topic: InsertTopic): Promise<Topic>;
  updateTopic(id: string, data: Partial<Topic>): Promise<Topic>;
  deleteTopic(id: string): Promise<void>;
  reorderTopic(id: string, direction: 'up' | 'down'): Promise<void>;
  
  // Post operations
  getPostsByTopic(topicId: string): Promise<Post[]>;
  createPost(post: InsertPost): Promise<Post>;
  updatePost(id: string, data: Partial<Post>): Promise<Post>;
  deletePost(id: string): Promise<void>;
  reorderPost(id: string, direction: 'up' | 'down'): Promise<void>;
  
  // Question operations
  getQuestions(): Promise<Question[]>;
  getQuestion(id: string): Promise<Question | undefined>;
  createQuestion(question: InsertQuestion): Promise<Question>;
  updateQuestion(id: string, data: Partial<Question>): Promise<Question>;
  deleteQuestion(id: string): Promise<void>;
  
  // Test template operations
  getTestTemplates(): Promise<TestTemplate[]>;
  getTestTemplate(id: string): Promise<TestTemplate | undefined>;
  getTestTemplatesByCourse(courseId: string): Promise<TestTemplate[]>;
  createTestTemplate(template: InsertTestTemplate): Promise<TestTemplate>;
  updateTestTemplate(id: string, data: Partial<TestTemplate>): Promise<TestTemplate>;
  getTestQuestions(testTemplateId: string): Promise<Array<{ id: string; testTemplateId: string; questionId: string; orderIndex: number; question: Question }>>;
  addQuestionToTest(testTemplateId: string, questionId: string, orderIndex: number): Promise<any>;
  removeQuestionFromTest(testTemplateId: string, questionId: string): Promise<void>;
  reorderTestQuestions(testTemplateId: string, questionOrders: Array<{questionId: string, orderIndex: number}>): Promise<void>;
  
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
  getEnrollmentsWithCourseDetails(studentId: string): Promise<Array<CourseEnrollment & { course: Course }>>;
  getAllEnrollmentsWithDetails(): Promise<Array<CourseEnrollment & { course: Course; student: User }>>;
  
  // Schedule operations
  getSchedules(): Promise<Schedule[]>;
  getSchedulesByCourse(courseId: string): Promise<Schedule[]>;
  getSchedule(id: string): Promise<Schedule | undefined>;
  createSchedule(schedule: InsertSchedule): Promise<Schedule>;
  updateSchedule(id: string, data: Partial<Schedule>): Promise<Schedule>;
  deleteSchedule(id: string): Promise<void>;
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

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    // Check for email conflict with a different user ID
    if (userData.email) {
      const existingByEmail = await this.getUserByEmail(userData.email);
      if (existingByEmail && existingByEmail.id !== userData.id) {
        throw new Error(`Email ${userData.email} is already registered to a different user`);
      }
    }

    // Normal upsert by ID
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

  async getTopic(id: string): Promise<Topic | undefined> {
    const [topic] = await db.select().from(topics).where(eq(topics.id, id));
    return topic || undefined;
  }

  async createTopic(topicData: InsertTopic): Promise<Topic> {
    // Calculate the next orderIndex server-side in a transaction with advisory lock
    return await db.transaction(async (tx) => {
      // Use hashCode to create a stable numeric lock ID from courseId
      const hashCode = (str: string): number => {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
          const char = str.charCodeAt(i);
          hash = ((hash << 5) - hash) + char;
          hash = hash & hash; // Convert to 32bit integer
        }
        return Math.abs(hash);
      };
      
      const lockId = hashCode(`topic_create_${topicData.courseId}`);
      await tx.execute(sql`SELECT pg_advisory_xact_lock(${lockId})`);
      
      const existingTopics = await tx
        .select()
        .from(topics)
        .where(eq(topics.courseId, topicData.courseId))
        .orderBy(desc(topics.orderIndex))
        .limit(1);
      
      const maxOrderIndex = existingTopics.length > 0
        ? existingTopics[0].orderIndex
        : -1;
      
      const [topic] = await tx.insert(topics).values({
        ...topicData,
        orderIndex: maxOrderIndex + 1,
      }).returning();
      return topic;
    });
  }

  async updateTopic(id: string, data: Partial<Topic>): Promise<Topic> {
    const [topic] = await db
      .update(topics)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(topics.id, id))
      .returning();
    return topic;
  }

  async deleteTopic(id: string): Promise<void> {
    await db.delete(topics).where(eq(topics.id, id));
  }

  async reorderTopic(id: string, direction: 'up' | 'down'): Promise<void> {
    const topic = await db.select().from(topics).where(eq(topics.id, id)).limit(1);
    if (!topic[0]) throw new Error("Topic not found");

    const currentIndex = topic[0].orderIndex;

    // Find the nearest neighbor in the specified direction
    const targetTopic = await db
      .select()
      .from(topics)
      .where(and(
        eq(topics.courseId, topic[0].courseId),
        direction === 'up'
          ? lt(topics.orderIndex, currentIndex)
          : gt(topics.orderIndex, currentIndex)
      ))
      .orderBy(direction === 'up' ? desc(topics.orderIndex) : asc(topics.orderIndex))
      .limit(1);

    if (!targetTopic[0]) {
      throw new Error(`Cannot move ${direction} - already at ${direction === 'up' ? 'top' : 'bottom'}`);
    }

    // Swap order indices in a transaction
    await db.transaction(async (tx) => {
      await tx.update(topics).set({ orderIndex: targetTopic[0].orderIndex }).where(eq(topics.id, id));
      await tx.update(topics).set({ orderIndex: currentIndex }).where(eq(topics.id, targetTopic[0].id));
    });
  }

  // Post operations
  async getPostsByTopic(topicId: string): Promise<Post[]> {
    return await db
      .select()
      .from(posts)
      .where(eq(posts.topicId, topicId))
      .orderBy(posts.orderIndex);
  }

  async createPost(postData: InsertPost): Promise<Post> {
    // Calculate the next orderIndex server-side in a transaction with advisory lock
    return await db.transaction(async (tx) => {
      // Use hashCode to create a stable numeric lock ID from topicId
      const hashCode = (str: string): number => {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
          const char = str.charCodeAt(i);
          hash = ((hash << 5) - hash) + char;
          hash = hash & hash; // Convert to 32bit integer
        }
        return Math.abs(hash);
      };
      
      const lockId = hashCode(`post_create_${postData.topicId}`);
      await tx.execute(sql`SELECT pg_advisory_xact_lock(${lockId})`);
      
      const existingPosts = await tx
        .select()
        .from(posts)
        .where(eq(posts.topicId, postData.topicId))
        .orderBy(desc(posts.orderIndex))
        .limit(1);
      
      const maxOrderIndex = existingPosts.length > 0
        ? existingPosts[0].orderIndex
        : -1;
      
      const [post] = await tx.insert(posts).values({
        ...postData,
        orderIndex: maxOrderIndex + 1,
      }).returning();
      return post;
    });
  }

  async updatePost(id: string, data: Partial<Post>): Promise<Post> {
    const [post] = await db
      .update(posts)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(posts.id, id))
      .returning();
    return post;
  }

  async deletePost(id: string): Promise<void> {
    await db.delete(posts).where(eq(posts.id, id));
  }

  async reorderPost(id: string, direction: 'up' | 'down'): Promise<void> {
    const post = await db.select().from(posts).where(eq(posts.id, id)).limit(1);
    if (!post[0]) throw new Error("Post not found");

    const currentIndex = post[0].orderIndex;

    // Find the nearest neighbor in the specified direction
    const targetPost = await db
      .select()
      .from(posts)
      .where(and(
        eq(posts.topicId, post[0].topicId),
        direction === 'up'
          ? lt(posts.orderIndex, currentIndex)
          : gt(posts.orderIndex, currentIndex)
      ))
      .orderBy(direction === 'up' ? desc(posts.orderIndex) : asc(posts.orderIndex))
      .limit(1);

    if (!targetPost[0]) {
      throw new Error(`Cannot move ${direction} - already at ${direction === 'up' ? 'top' : 'bottom'}`);
    }

    // Swap order indices in a transaction
    await db.transaction(async (tx) => {
      await tx.update(posts).set({ orderIndex: targetPost[0].orderIndex }).where(eq(posts.id, id));
      await tx.update(posts).set({ orderIndex: currentIndex }).where(eq(posts.id, targetPost[0].id));
    });
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

  async getTestTemplatesByCourse(courseId: string): Promise<TestTemplate[]> {
    // Get test templates linked to this course via courseCompletionTests
    const completionTests = await db
      .select()
      .from(courseCompletionTests)
      .where(eq(courseCompletionTests.courseId, courseId));
    
    if (completionTests.length === 0) {
      return [];
    }
    
    const templateIds = completionTests.map(ct => ct.testTemplateId);
    return await db
      .select()
      .from(testTemplates)
      .where(inArray(testTemplates.id, templateIds));
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

  async getTestQuestions(testTemplateId: string): Promise<Array<{ id: string; testTemplateId: string; questionId: string; orderIndex: number; question: Question }>> {
    const testQuestionsData = await db
      .select()
      .from(testQuestions)
      .where(eq(testQuestions.testTemplateId, testTemplateId))
      .orderBy(testQuestions.orderIndex);

    const questionsList = await Promise.all(
      testQuestionsData.map(async (tq) => {
        const [question] = await db
          .select()
          .from(questions)
          .where(eq(questions.id, tq.questionId));
        return {
          id: tq.id,
          testTemplateId: tq.testTemplateId,
          questionId: tq.questionId,
          orderIndex: tq.orderIndex,
          question: question as Question,
        };
      })
    );

    return questionsList;
  }

  async addQuestionToTest(testTemplateId: string, questionId: string, orderIndex: number): Promise<any> {
    const [testQuestion] = await db
      .insert(testQuestions)
      .values({
        testTemplateId,
        questionId,
        orderIndex,
      })
      .returning();
    return testQuestion;
  }

  async removeQuestionFromTest(testTemplateId: string, questionId: string): Promise<void> {
    await db
      .delete(testQuestions)
      .where(
        and(
          eq(testQuestions.testTemplateId, testTemplateId),
          eq(testQuestions.questionId, questionId)
        )
      );
  }

  async reorderTestQuestions(testTemplateId: string, questionOrders: Array<{questionId: string, orderIndex: number}>): Promise<void> {
    await Promise.all(
      questionOrders.map(({ questionId, orderIndex }) =>
        db
          .update(testQuestions)
          .set({ orderIndex })
          .where(
            and(
              eq(testQuestions.testTemplateId, testTemplateId),
              eq(testQuestions.questionId, questionId)
            )
          )
      )
    );
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

  async getEnrollmentsWithCourseDetails(studentId: string): Promise<Array<CourseEnrollment & { course: Course }>> {
    const enrollmentsData = await db
      .select({
        enrollment: courseEnrollments,
        course: courses,
      })
      .from(courseEnrollments)
      .innerJoin(courses, eq(courseEnrollments.courseId, courses.id))
      .where(eq(courseEnrollments.studentId, studentId))
      .orderBy(desc(courseEnrollments.enrolledAt));

    return enrollmentsData.map(row => ({
      ...row.enrollment,
      course: row.course,
    }));
  }

  async getAllEnrollmentsWithDetails(): Promise<Array<CourseEnrollment & { course: Course; student: User }>> {
    const enrollmentsData = await db
      .select({
        enrollment: courseEnrollments,
        course: courses,
        student: users,
      })
      .from(courseEnrollments)
      .innerJoin(courses, eq(courseEnrollments.courseId, courses.id))
      .innerJoin(users, eq(courseEnrollments.studentId, users.id))
      .orderBy(desc(courseEnrollments.enrolledAt));

    return enrollmentsData.map(row => ({
      ...row.enrollment,
      course: row.course,
      student: row.student,
    }));
  }

  // Schedule operations
  async getSchedules(): Promise<Schedule[]> {
    return await db.select().from(schedules).orderBy(schedules.startTime);
  }

  async getSchedulesByCourse(courseId: string): Promise<Schedule[]> {
    return await db
      .select()
      .from(schedules)
      .where(eq(schedules.courseId, courseId))
      .orderBy(schedules.startTime);
  }

  async getSchedule(id: string): Promise<Schedule | undefined> {
    const [schedule] = await db.select().from(schedules).where(eq(schedules.id, id));
    return schedule || undefined;
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

  async deleteSchedule(id: string): Promise<void> {
    await db.delete(schedules).where(eq(schedules.id, id));
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
