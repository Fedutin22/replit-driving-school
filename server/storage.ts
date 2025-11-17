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
  topicAssessments,
  topicAssessmentQuestions,
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
  type InsertTopicAssessment,
  type TopicAssessment,
  type InsertTopicAssessmentQuestion,
  type TopicAssessmentQuestion,
  type InsertSchedule,
  type Schedule,
  type Attendance,
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
  getCourseWithContent(id: string, publishedOnly?: boolean): Promise<{ course: Course; topics: Array<Topic & { posts: Post[]; assessments: TopicAssessment[] }>; tests: TestTemplate[] } | undefined>;
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
  searchQuestions(params: { searchTerm?: string; tag?: string; limit: number }): Promise<Question[]>;
  createQuestion(question: InsertQuestion): Promise<Question>;
  updateQuestion(id: string, data: Partial<Question>): Promise<Question>;
  deleteQuestion(id: string): Promise<void>;
  
  // Test template operations (legacy)
  getTestTemplates(): Promise<TestTemplate[]>;
  getTestTemplate(id: string): Promise<TestTemplate | undefined>;
  getTestTemplatesByCourse(courseId: string): Promise<TestTemplate[]>;
  createTestTemplate(template: InsertTestTemplate): Promise<TestTemplate>;
  updateTestTemplate(id: string, data: Partial<TestTemplate>): Promise<TestTemplate>;
  getTestQuestions(testTemplateId: string): Promise<Array<{ id: string; testTemplateId: string; questionId: string; orderIndex: number; question: Question }>>;
  addQuestionToTest(testTemplateId: string, questionId: string, orderIndex: number): Promise<any>;
  removeQuestionFromTest(testTemplateId: string, questionId: string): Promise<void>;
  reorderTestQuestions(testTemplateId: string, questionOrders: Array<{questionId: string, orderIndex: number}>): Promise<void>;
  
  // Topic assessment operations
  getTopicAssessments(topicId: string, publishedOnly?: boolean): Promise<TopicAssessment[]>;
  getTopicAssessment(id: string): Promise<TopicAssessment | undefined>;
  createTopicAssessment(assessment: InsertTopicAssessment): Promise<TopicAssessment>;
  updateTopicAssessment(id: string, data: Partial<TopicAssessment>): Promise<TopicAssessment>;
  deleteTopicAssessment(id: string): Promise<void>;
  getAssessmentQuestions(assessmentId: string): Promise<Array<{ id: string; assessmentId: string; questionId: string; orderIndex: number; question: Question }>>;
  addQuestionToAssessment(assessmentId: string, questionId: string, orderIndex: number): Promise<any>;
  removeQuestionFromAssessment(assessmentId: string, questionId: string): Promise<void>;
  reorderAssessmentQuestions(assessmentId: string, questionOrders: Array<{questionId: string, orderIndex: number}>): Promise<void>;
  
  // Test instance operations
  createTestInstance(instance: InsertTestInstance): Promise<TestInstance>;
  getTestInstance(id: string): Promise<TestInstance | undefined>;
  updateTestInstance(id: string, data: Partial<TestInstance>): Promise<TestInstance>;
  getTestInstancesByStudent(studentId: string): Promise<TestInstance[]>;
  getAssessmentAttemptCount(assessmentId: string, studentId: string): Promise<number>;
  getTestAttemptCount(testTemplateId: string, studentId: string): Promise<number>;
  startTest(testTemplateId: string, studentId: string): Promise<{ testInstance: TestInstance; questions: any[] }>; // Legacy
  startAssessment(assessmentId: string, studentId: string): Promise<{ testInstance: TestInstance; questions: any[] }>;
  submitTest(testInstanceId: string, answers: Record<string, any>): Promise<TestInstance>;
  
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
  getSchedulesWithDetails(studentId?: string): Promise<Array<Schedule & { course: Course; topic: Topic | null; instructor: User; registeredStudentsCount: number; isRegistered?: boolean }>>;
  createSchedule(schedule: InsertSchedule): Promise<Schedule>;
  updateSchedule(id: string, data: Partial<Schedule>): Promise<Schedule>;
  deleteSchedule(id: string): Promise<void>;
  registerForSession(scheduleId: string, studentId: string): Promise<void>;
  unregisterFromSession(scheduleId: string, studentId: string): Promise<void>;
  getSessionRegistrationCount(scheduleId: string): Promise<number>;
  isStudentRegistered(scheduleId: string, studentId: string): Promise<boolean>;
  
  // Attendance operations
  markAttendance(scheduleId: string, studentId: string, status: 'present' | 'absent', markedBy: string): Promise<void>;
  getSessionAttendance(scheduleId: string): Promise<Array<Attendance & { student: User }>>;
  getStudentsWithAttendance(scheduleId: string): Promise<Array<{ studentId: string; student: User; status: 'present' | 'absent' | null; markedAt: Date | null }>>;
  
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

  async getCoursesWithScheduleCount(): Promise<Array<Course & { scheduleCount: number; topicCount: number; postCount: number }>> {
    const result = await db
      .select({
        course: courses,
        scheduleCount: sql<number>`CAST(COUNT(DISTINCT ${schedules.id}) AS INTEGER)`,
        topicCount: sql<number>`CAST(COUNT(DISTINCT ${topics.id}) AS INTEGER)`,
        postCount: sql<number>`CAST(COUNT(DISTINCT ${posts.id}) AS INTEGER)`,
      })
      .from(courses)
      .leftJoin(schedules, eq(courses.id, schedules.courseId))
      .leftJoin(topics, eq(courses.id, topics.courseId))
      .leftJoin(posts, eq(topics.id, posts.topicId))
      .groupBy(courses.id)
      .orderBy(desc(courses.createdAt));
    
    return result.map(row => ({
      ...row.course,
      scheduleCount: row.scheduleCount,
      topicCount: row.topicCount,
      postCount: row.postCount,
    }));
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

  async getCourseWithContent(id: string, publishedOnly: boolean = false): Promise<{ course: Course; topics: Array<Topic & { posts: Post[]; assessments: TopicAssessment[] }>; tests: TestTemplate[] } | undefined> {
    const course = await this.getCourse(id);
    if (!course) return undefined;

    // Get topics with posts and assessments
    const topicsData = await this.getTopicsByCourse(id);
    const topicsWithContent = await Promise.all(
      topicsData.map(async (topic) => {
        const posts = await this.getPostsByTopic(topic.id);
        let assessments = await this.getTopicAssessments(topic.id, publishedOnly);
        
        // If filtering for published only, also filter out assessments with no questions
        if (publishedOnly) {
          const assessmentsWithQuestions = await Promise.all(
            assessments.map(async (assessment) => {
              const questions = await this.getAssessmentQuestions(assessment.id);
              return { assessment, hasQuestions: questions.length > 0 };
            })
          );
          assessments = assessmentsWithQuestions
            .filter(({ hasQuestions }) => hasQuestions)
            .map(({ assessment }) => assessment);
        }
        
        return { ...topic, posts, assessments };
      })
    );

    // Get test templates for this course (legacy)
    const tests = await this.getTestTemplatesByCourse(id);

    return { course, topics: topicsWithContent, tests };
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

  async searchQuestions(params: { searchTerm?: string; tag?: string; limit: number }): Promise<Question[]> {
    const { searchTerm, tag, limit } = params;
    
    let query = db.select().from(questions);
    
    const conditions = [];
    
    // Add search term filter (case-insensitive)
    if (searchTerm && searchTerm.trim()) {
      conditions.push(sql`LOWER(${questions.questionText}) LIKE LOWER(${'%' + searchTerm + '%'})`);
    }
    
    // Add tag filter
    if (tag && tag.trim()) {
      conditions.push(sql`${tag} = ANY(${questions.tags})`);
    }
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }
    
    query = query.orderBy(desc(questions.createdAt)).limit(limit) as any;
    
    return await query;
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
    // Deprecated: Tests are now linked to topics via topic_assessments
    // This method is kept for backward compatibility only
    return [];
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

  // Topic assessment operations
  async getTopicAssessments(topicId: string, publishedOnly: boolean = false): Promise<TopicAssessment[]> {
    const conditions = [eq(topicAssessments.topicId, topicId)];
    
    if (publishedOnly) {
      conditions.push(eq(topicAssessments.status, 'published'));
    }
    
    return await db
      .select()
      .from(topicAssessments)
      .where(and(...conditions))
      .orderBy(topicAssessments.orderIndex);
  }

  async getTopicAssessment(id: string): Promise<TopicAssessment | undefined> {
    const [assessment] = await db
      .select()
      .from(topicAssessments)
      .where(eq(topicAssessments.id, id));
    return assessment || undefined;
  }

  async createTopicAssessment(assessmentData: InsertTopicAssessment & { questionIds?: string[] }): Promise<TopicAssessment> {
    const { questionIds, ...assessmentFields } = assessmentData as any;
    const [assessment] = await db.insert(topicAssessments).values(assessmentFields).returning();
    
    // If manual mode and questionIds provided, save them
    if (questionIds && Array.isArray(questionIds) && questionIds.length > 0) {
      await db.insert(topicAssessmentQuestions).values(
        questionIds.map((questionId, index) => ({
          assessmentId: assessment.id,
          questionId,
          orderIndex: index,
        }))
      );
    }
    
    return assessment;
  }

  async updateTopicAssessment(id: string, data: Partial<TopicAssessment> & { questionIds?: string[] }): Promise<TopicAssessment> {
    const { questionIds, ...assessmentFields } = data as any;
    const [assessment] = await db
      .update(topicAssessments)
      .set({ ...assessmentFields, updatedAt: new Date() })
      .where(eq(topicAssessments.id, id))
      .returning();
    
    // If questionIds provided, replace existing question assignments
    if (questionIds !== undefined && Array.isArray(questionIds)) {
      // Delete existing questions
      await db.delete(topicAssessmentQuestions).where(eq(topicAssessmentQuestions.assessmentId, id));
      
      // Insert new questions if any
      if (questionIds.length > 0) {
        await db.insert(topicAssessmentQuestions).values(
          questionIds.map((questionId, index) => ({
            assessmentId: id,
            questionId,
            orderIndex: index,
          }))
        );
      }
    }
    
    return assessment;
  }

  async deleteTopicAssessment(id: string): Promise<void> {
    await db.delete(topicAssessments).where(eq(topicAssessments.id, id));
  }

  async getAssessmentQuestions(assessmentId: string): Promise<Array<{ id: string; assessmentId: string; questionId: string; orderIndex: number; question: Question }>> {
    const assessmentQuestionsData = await db
      .select()
      .from(topicAssessmentQuestions)
      .where(eq(topicAssessmentQuestions.assessmentId, assessmentId))
      .orderBy(topicAssessmentQuestions.orderIndex);

    const questionsList = await Promise.all(
      assessmentQuestionsData.map(async (aq) => {
        const [question] = await db
          .select()
          .from(questions)
          .where(eq(questions.id, aq.questionId));
        return {
          id: aq.id,
          assessmentId: aq.assessmentId,
          questionId: aq.questionId,
          orderIndex: aq.orderIndex,
          question,
        };
      })
    );

    return questionsList;
  }

  async addQuestionToAssessment(assessmentId: string, questionId: string, orderIndex: number): Promise<any> {
    const [assessmentQuestion] = await db
      .insert(topicAssessmentQuestions)
      .values({
        assessmentId,
        questionId,
        orderIndex,
      })
      .returning();
    return assessmentQuestion;
  }

  async removeQuestionFromAssessment(assessmentId: string, questionId: string): Promise<void> {
    await db
      .delete(topicAssessmentQuestions)
      .where(
        and(
          eq(topicAssessmentQuestions.assessmentId, assessmentId),
          eq(topicAssessmentQuestions.questionId, questionId)
        )
      );
  }

  async reorderAssessmentQuestions(assessmentId: string, questionOrders: Array<{questionId: string, orderIndex: number}>): Promise<void> {
    await Promise.all(
      questionOrders.map(({ questionId, orderIndex }) =>
        db
          .update(topicAssessmentQuestions)
          .set({ orderIndex })
          .where(
            and(
              eq(topicAssessmentQuestions.assessmentId, assessmentId),
              eq(topicAssessmentQuestions.questionId, questionId)
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

  async checkAndUpdateCourseCompletion(studentId: string, courseId: string): Promise<void> {
    // Get enrollment
    const enrollments = await db
      .select()
      .from(courseEnrollments)
      .where(
        and(
          eq(courseEnrollments.studentId, studentId),
          eq(courseEnrollments.courseId, courseId)
        )
      );

    if (enrollments.length === 0) {
      return; // No enrollment found
    }

    const enrollment = enrollments[0];

    // If already completed, no need to check
    if (enrollment.completedAt) {
      return;
    }

    // Get all topics for this course
    const topicsData = await db
      .select()
      .from(topics)
      .where(eq(topics.courseId, courseId));

    // Get all required assessments for this course
    const requiredAssessments = await db
      .select()
      .from(topicAssessments)
      .where(
        and(
          inArray(topicAssessments.topicId, topicsData.map(t => t.id)),
          eq(topicAssessments.isRequired, true)
        )
      );

    if (requiredAssessments.length === 0) {
      // No required assessments, mark as complete
      await db
        .update(courseEnrollments)
        .set({ completedAt: new Date() })
        .where(eq(courseEnrollments.id, enrollment.id));
      return;
    }

    // Check if all required assessments have a passing test instance
    for (const assessment of requiredAssessments) {
      const passingInstances = await db
        .select()
        .from(testInstances)
        .where(
          and(
            eq(testInstances.studentId, studentId),
            eq(testInstances.topicAssessmentId, assessment.id),
            eq(testInstances.passed, true)
          )
        );

      if (passingInstances.length === 0) {
        // At least one required assessment not passed
        return;
      }
    }

    // All required assessments passed, mark course as complete
    await db
      .update(courseEnrollments)
      .set({ completedAt: new Date() })
      .where(eq(courseEnrollments.id, enrollment.id));
  }

  async getTestInstancesByStudent(studentId: string): Promise<TestInstance[]> {
    return await db
      .select()
      .from(testInstances)
      .where(eq(testInstances.studentId, studentId))
      .orderBy(desc(testInstances.createdAt));
  }

  async getAssessmentAttemptCount(assessmentId: string, studentId: string): Promise<number> {
    const attempts = await db
      .select()
      .from(testInstances)
      .where(
        and(
          eq(testInstances.topicAssessmentId, assessmentId),
          eq(testInstances.studentId, studentId)
        )
      );
    return attempts.length;
  }

  async getTestAttemptCount(testTemplateId: string, studentId: string): Promise<number> {
    const attempts = await db
      .select()
      .from(testInstances)
      .where(
        and(
          eq(testInstances.testTemplateId, testTemplateId),
          eq(testInstances.studentId, studentId)
        )
      );
    return attempts.length;
  }

  async startTest(testTemplateId: string, studentId: string): Promise<{ testInstance: TestInstance; questions: any[] }> {
    const template = await this.getTestTemplate(testTemplateId);
    if (!template) {
      throw new Error('Test template not found');
    }

    // Check if student has exceeded max attempts
    const attemptCount = await this.getTestAttemptCount(testTemplateId, studentId);
    if (attemptCount >= (template.maxAttempts || 3)) {
      throw new Error(`Maximum attempts (${template.maxAttempts || 3}) exceeded for this test`);
    }

    let questionsToServe: any[] = [];

    if (template.mode === 'manual') {
      // Get manually selected questions
      const testQuestionsData = await this.getTestQuestions(testTemplateId);
      questionsToServe = testQuestionsData.map(tq => ({
        id: tq.question.id,
        questionText: tq.question.questionText,
        type: tq.question.type,
        choices: tq.question.choices, // Keep full choices for server-side storage
        orderIndex: tq.orderIndex,
      }));
    } else if (template.mode === 'random') {
      // Get random questions from question bank
      const allQuestions = await this.getQuestions();
      const activeQuestions = allQuestions.filter(q => !q.isArchived);
      
      // Shuffle and take questionCount questions
      const shuffled = activeQuestions.sort(() => Math.random() - 0.5);
      const count = Math.min(template.questionCount || 10, shuffled.length);
      questionsToServe = shuffled.slice(0, count).map((q, index) => ({
        id: q.id,
        questionText: q.questionText,
        type: q.type,
        choices: q.choices, // Keep full choices for server-side storage
        orderIndex: index,
      }));
    }

    // Randomize question order if template specifies
    if (template.randomizeQuestions) {
      questionsToServe.sort(() => Math.random() - 0.5);
      questionsToServe.forEach((q, index) => {
        q.orderIndex = index;
      });
    }

    // Create test instance with questions snapshot (including correct answers for server-side validation)
    const testInstance = await this.createTestInstance({
      testTemplateId,
      studentId,
      questionsData: questionsToServe,
      answersData: null,
      score: null,
      percentage: null,
      passed: null,
      submittedAt: null,
    });

    // Strip correct answer flags from questions before sending to client
    const questionsForClient = questionsToServe.map(q => ({
      id: q.id,
      questionText: q.questionText,
      type: q.type,
      choices: (q.choices as any[]).map((c: any) => ({ label: c.label })), // Remove isCorrect flag
      orderIndex: q.orderIndex,
    }));

    return { testInstance, questions: questionsForClient };
  }

  async startAssessment(assessmentId: string, studentId: string): Promise<{ testInstance: TestInstance; questions: any[] }> {
    const assessment = await this.getTopicAssessment(assessmentId);
    if (!assessment) {
      throw new Error('Topic assessment not found');
    }

    // Check if student has exceeded max attempts
    const attemptCount = await this.getAssessmentAttemptCount(assessmentId, studentId);
    if (attemptCount >= (assessment.maxAttempts || 3)) {
      throw new Error(`Maximum attempts (${assessment.maxAttempts || 3}) exceeded for this assessment`);
    }

    let questionsToServe: any[] = [];

    if (assessment.mode === 'manual') {
      // Get manually selected questions
      const assessmentQuestionsData = await this.getAssessmentQuestions(assessmentId);
      questionsToServe = assessmentQuestionsData.map(aq => ({
        id: aq.question.id,
        questionText: aq.question.questionText,
        type: aq.question.type,
        choices: aq.question.choices, // Keep full choices for server-side storage
        orderIndex: aq.orderIndex,
      }));
    } else if (assessment.mode === 'random') {
      // Get random questions from question bank
      const allQuestions = await this.getQuestions();
      const activeQuestions = allQuestions.filter(q => !q.isArchived);
      
      // Shuffle and take questionCount questions
      const shuffled = activeQuestions.sort(() => Math.random() - 0.5);
      const count = Math.min(assessment.questionCount || 10, shuffled.length);
      questionsToServe = shuffled.slice(0, count).map((q, index) => ({
        id: q.id,
        questionText: q.questionText,
        type: q.type,
        choices: q.choices, // Keep full choices for server-side storage
        orderIndex: index,
      }));
    }

    // Randomize question order if assessment specifies
    if (assessment.randomizeQuestions) {
      questionsToServe.sort(() => Math.random() - 0.5);
      questionsToServe.forEach((q, index) => {
        q.orderIndex = index;
      });
    }

    // Create test instance with questions snapshot (including correct answers for server-side validation)
    const testInstance = await this.createTestInstance({
      topicAssessmentId: assessmentId,
      testTemplateId: null,
      studentId,
      questionsData: questionsToServe,
      answersData: null,
      score: null,
      percentage: null,
      passed: null,
      submittedAt: null,
    });

    // Strip correct answer flags from questions before sending to client
    const questionsForClient = questionsToServe.map(q => ({
      id: q.id,
      questionText: q.questionText,
      type: q.type,
      choices: (q.choices as any[]).map((c: any) => ({ label: c.label })), // Remove isCorrect flag
      orderIndex: q.orderIndex,
    }));

    return { testInstance, questions: questionsForClient };
  }

  async submitTest(testInstanceId: string, answers: Record<string, any>): Promise<TestInstance> {
    const instance = await this.getTestInstance(testInstanceId);
    if (!instance) {
      throw new Error('Test instance not found');
    }

    // Determine if this is a legacy test or topic assessment
    let passingPercentage = 70; // Default
    
    if (instance.topicAssessmentId) {
      const assessment = await this.getTopicAssessment(instance.topicAssessmentId);
      if (assessment) {
        passingPercentage = assessment.passingPercentage;
      }
    } else if (instance.testTemplateId) {
      const template = await this.getTestTemplate(instance.testTemplateId);
      if (template) {
        passingPercentage = template.passingPercentage;
      }
    }

    const questions = instance.questionsData as any[];
    let correctCount = 0;
    let totalQuestions = questions.length;

    // Calculate score
    for (const question of questions) {
      const studentAnswer = answers[question.id];
      const choices = question.choices as any[];
      const correctChoices = choices.filter((c: any) => c.isCorrect).map((c: any) => c.label);

      if (question.type === 'single_choice') {
        if (studentAnswer && correctChoices.includes(studentAnswer)) {
          correctCount++;
        }
      } else if (question.type === 'multiple_choice') {
        const studentChoices = studentAnswer || [];
        const isCorrect = correctChoices.length === studentChoices.length &&
          correctChoices.every((c: string) => studentChoices.includes(c));
        if (isCorrect) {
          correctCount++;
        }
      }
    }

    const percentage = Math.round((correctCount / totalQuestions) * 100);
    const passed = percentage >= passingPercentage;

    // Update test instance
    const updatedInstance = await this.updateTestInstance(testInstanceId, {
      answersData: answers,
      score: correctCount,
      percentage,
      passed,
      submittedAt: new Date(),
    });

    // Check if course should be marked as complete
    if (passed && updatedInstance.topicAssessmentId) {
      // Get the topic and course for this assessment
      const assessment = await this.getTopicAssessment(updatedInstance.topicAssessmentId);
      if (assessment) {
        const topic = await this.getTopic(assessment.topicId);
        if (topic) {
          await this.checkAndUpdateCourseCompletion(instance.studentId, topic.courseId);
        }
      }
    }

    return updatedInstance;
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

  async getSchedulesWithDetails(studentId?: string): Promise<Array<Schedule & { course: Course; topic: Topic | null; instructor: User; registeredStudentsCount: number; isRegistered?: boolean }>> {
    let schedulesData;

    if (studentId) {
      const studentEnrollments = await db
        .select({ courseId: courseEnrollments.courseId })
        .from(courseEnrollments)
        .where(
          and(
            eq(courseEnrollments.studentId, studentId),
            eq(courseEnrollments.isActive, true)
          )
        );
      
      const enrolledCourseIds = studentEnrollments.map(e => e.courseId);
      
      if (enrolledCourseIds.length === 0) {
        return [];
      }
      
      schedulesData = await db
        .select({
          schedule: schedules,
          course: courses,
          topic: topics,
          instructor: users,
        })
        .from(schedules)
        .innerJoin(courses, eq(schedules.courseId, courses.id))
        .leftJoin(topics, eq(schedules.topicId, topics.id))
        .innerJoin(users, eq(schedules.instructorId, users.id))
        .where(inArray(schedules.courseId, enrolledCourseIds))
        .orderBy(schedules.startTime);
    } else {
      schedulesData = await db
        .select({
          schedule: schedules,
          course: courses,
          topic: topics,
          instructor: users,
        })
        .from(schedules)
        .innerJoin(courses, eq(schedules.courseId, courses.id))
        .leftJoin(topics, eq(schedules.topicId, topics.id))
        .innerJoin(users, eq(schedules.instructorId, users.id))
        .orderBy(schedules.startTime);
    }

    const result = await Promise.all(
      schedulesData.map(async (row) => {
        const registrationCount = await this.getSessionRegistrationCount(row.schedule.id);
        const isRegistered = studentId
          ? await this.isStudentRegistered(row.schedule.id, studentId)
          : undefined;

        return {
          ...row.schedule,
          course: row.course,
          topic: row.topic,
          instructor: row.instructor,
          registeredStudentsCount: registrationCount,
          isRegistered,
        };
      })
    );

    return result;
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
    // Check if already registered
    const alreadyRegistered = await this.isStudentRegistered(scheduleId, studentId);
    if (alreadyRegistered) {
      throw new Error("Already registered for this session");
    }

    // Check capacity
    const schedule = await this.getSchedule(scheduleId);
    if (!schedule) {
      throw new Error("Schedule not found");
    }

    const currentCount = await this.getSessionRegistrationCount(scheduleId);
    if (currentCount >= schedule.capacity) {
      throw new Error("Session is full");
    }

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

  // Attendance operations
  async markAttendance(scheduleId: string, studentId: string, status: 'present' | 'absent', markedBy: string): Promise<void> {
    // Check if attendance already exists
    const [existing] = await db
      .select()
      .from(attendance)
      .where(
        and(
          eq(attendance.scheduleId, scheduleId),
          eq(attendance.studentId, studentId)
        )
      );

    if (existing) {
      // Update existing attendance
      await db
        .update(attendance)
        .set({ status, markedBy, markedAt: new Date() })
        .where(
          and(
            eq(attendance.scheduleId, scheduleId),
            eq(attendance.studentId, studentId)
          )
        );
    } else {
      // Create new attendance record
      await db.insert(attendance).values({
        scheduleId,
        studentId,
        status,
        markedBy,
      });
    }
  }

  async getSessionAttendance(scheduleId: string): Promise<Array<Attendance & { student: User }>> {
    const attendanceRecords = await db
      .select()
      .from(attendance)
      .leftJoin(users, eq(attendance.studentId, users.id))
      .where(eq(attendance.scheduleId, scheduleId));

    return attendanceRecords.map(record => ({
      ...record.attendance,
      student: record.users!,
    }));
  }

  async getStudentsWithAttendance(scheduleId: string): Promise<Array<{ studentId: string; student: User; status: 'present' | 'absent' | null; markedAt: Date | null }>> {
    // Get registered students (filter for students only)
    const registrations = await db
      .select()
      .from(sessionRegistrations)
      .leftJoin(users, eq(sessionRegistrations.studentId, users.id))
      .where(eq(sessionRegistrations.scheduleId, scheduleId));

    // Get attendance records
    const attendanceRecords = await db
      .select()
      .from(attendance)
      .where(eq(attendance.scheduleId, scheduleId));

    // Combine data, filtering for students only
    return registrations
      .filter(reg => reg.users?.role === 'student')
      .map(reg => {
        const attendanceRecord = attendanceRecords.find(a => a.studentId === reg.session_registrations.studentId);
        return {
          studentId: reg.session_registrations.studentId,
          student: reg.users!,
          status: attendanceRecord?.status || null,
          markedAt: attendanceRecord?.markedAt || null,
        };
      });
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
