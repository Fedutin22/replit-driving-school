import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated, requireRole } from "./replitAuth";
import Stripe from "stripe";
import { z } from "zod";
import { insertCourseSchema, insertTopicSchema, insertQuestionSchema, insertTestTemplateSchema, insertScheduleSchema } from "@shared/schema";
import express from "express";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Missing required Stripe secret: STRIPE_SECRET_KEY');
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2024-11-20.acacia",
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Dashboard stats
  app.get('/api/dashboard/stats', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const enrollments = await storage.getEnrollmentsByStudent(userId);
      const testResults = await storage.getTestInstancesByStudent(userId);
      const certificates = await storage.getCertificatesByStudent(userId);

      const stats = {
        enrolledCourses: enrollments.filter(e => e.isActive).length,
        completedCourses: enrollments.filter(e => e.completedAt).length,
        upcomingSessions: 0, // TODO: Calculate from schedules
        testsPassed: testResults.filter(t => t.passed).length,
        testsTotal: testResults.filter(t => t.submittedAt).length,
        certificates: certificates.filter(c => !c.revokedAt).length,
        recentActivity: [],
      };

      res.json(stats);
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      res.status(500).json({ message: "Failed to fetch stats" });
    }
  });

  // Courses routes
  app.get('/api/courses', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const courses = await storage.getCourses();
      const enrollments = await storage.getEnrollmentsByStudent(userId);
      const payments = await storage.getPaymentsByStudent(userId);

      const coursesWithDetails = courses.map(course => {
        const enrollment = enrollments.find(e => e.courseId === course.id);
        const payment = payments.find(p => p.courseId === course.id);
        return {
          ...course,
          enrollment,
          payment,
          progress: enrollment ? (enrollment.completedAt ? 100 : 50) : 0,
        };
      });

      res.json(coursesWithDetails);
    } catch (error) {
      console.error("Error fetching courses:", error);
      res.status(500).json({ message: "Failed to fetch courses" });
    }
  });

  app.post('/api/courses/:courseId/enroll', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { courseId } = req.params;

      const existing = await storage.getEnrollment(courseId, userId);
      if (existing) {
        return res.status(400).json({ message: "Already enrolled in this course" });
      }

      const enrollment = await storage.createEnrollment({
        courseId,
        studentId: userId,
      });

      res.json(enrollment);
    } catch (error) {
      console.error("Error enrolling in course:", error);
      res.status(500).json({ message: "Failed to enroll in course" });
    }
  });

  // Tests routes
  app.get('/api/tests/results', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const results = await storage.getTestInstancesByStudent(userId);
      res.json(results);
    } catch (error) {
      console.error("Error fetching test results:", error);
      res.status(500).json({ message: "Failed to fetch test results" });
    }
  });

  app.get('/api/tests/available', isAuthenticated, async (req: any, res) => {
    try {
      const templates = await storage.getTestTemplates();
      const available = templates.map(t => ({
        ...t,
        canTake: true,
      }));
      res.json(available);
    } catch (error) {
      console.error("Error fetching available tests:", error);
      res.status(500).json({ message: "Failed to fetch available tests" });
    }
  });

  // Schedules routes
  app.get('/api/schedules', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const schedules = await storage.getSchedules();

      const schedulesWithDetails = await Promise.all(
        schedules.map(async (schedule) => {
          const registeredCount = await storage.getSessionRegistrationCount(schedule.id);
          const isRegistered = await storage.isStudentRegistered(schedule.id, userId);
          const enrollment = schedule.courseId ? await storage.getEnrollment(schedule.courseId, userId) : null;

          return {
            ...schedule,
            registeredCount,
            isRegistered,
            canRegister: !!enrollment && enrollment.isActive,
          };
        })
      );

      res.json(schedulesWithDetails);
    } catch (error) {
      console.error("Error fetching schedules:", error);
      res.status(500).json({ message: "Failed to fetch schedules" });
    }
  });

  app.post('/api/schedules/:scheduleId/register', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { scheduleId } = req.params;

      const isRegistered = await storage.isStudentRegistered(scheduleId, userId);
      if (isRegistered) {
        return res.status(400).json({ message: "Already registered for this session" });
      }

      await storage.registerForSession(scheduleId, userId);
      res.json({ message: "Registered successfully" });
    } catch (error) {
      console.error("Error registering for session:", error);
      res.status(500).json({ message: "Failed to register for session" });
    }
  });

  app.delete('/api/schedules/:scheduleId/register', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { scheduleId } = req.params;

      await storage.unregisterFromSession(scheduleId, userId);
      res.json({ message: "Unregistered successfully" });
    } catch (error) {
      console.error("Error unregistering from session:", error);
      res.status(500).json({ message: "Failed to unregister from session" });
    }
  });

  // Payments routes
  app.get('/api/payments', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const payments = await storage.getPaymentsByStudent(userId);
      res.json(payments);
    } catch (error) {
      console.error("Error fetching payments:", error);
      res.status(500).json({ message: "Failed to fetch payments" });
    }
  });

  app.post("/api/create-payment-intent", isAuthenticated, async (req: any, res) => {
    try {
      const { courseId } = req.body;
      const userId = req.user.claims.sub;

      const course = await storage.getCourse(courseId);
      if (!course || !course.price) {
        return res.status(400).json({ message: "Invalid course or price not set" });
      }

      const amount = parseFloat(course.price);
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100),
        currency: "usd",
      });

      const payment = await storage.createPayment({
        courseId,
        studentId: userId,
        amount: course.price,
        currency: "usd",
        status: "pending",
        stripePaymentIntentId: paymentIntent.id,
        stripeClientSecret: paymentIntent.client_secret || undefined,
      });

      res.json({ clientSecret: paymentIntent.client_secret, paymentId: payment.id });
    } catch (error: any) {
      console.error("Error creating payment intent:", error);
      res.status(500).json({ message: "Error creating payment intent: " + error.message });
    }
  });

  // Certificates routes
  app.get('/api/certificates', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const certificates = await storage.getCertificatesByStudent(userId);
      res.json(certificates);
    } catch (error) {
      console.error("Error fetching certificates:", error);
      res.status(500).json({ message: "Failed to fetch certificates" });
    }
  });

  // Questions routes
  app.get('/api/questions', isAuthenticated, async (req: any, res) => {
    try {
      const questions = await storage.getQuestions();
      res.json(questions);
    } catch (error) {
      console.error("Error fetching questions:", error);
      res.status(500).json({ message: "Failed to fetch questions" });
    }
  });

  app.post('/api/questions', isAuthenticated, requireRole(['admin', 'instructor']), async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      const questionData = insertQuestionSchema.parse(req.body);
      const question = await storage.createQuestion(questionData);

      if (user) {
        await storage.createAuditLog({
          userId: user.id,
          action: "CREATE_QUESTION",
          entityType: "question",
          entityId: question.id,
        });
      }

      res.json(question);
    } catch (error) {
      console.error("Error creating question:", error);
      res.status(500).json({ message: "Failed to create question" });
    }
  });

  app.patch('/api/questions/:id', isAuthenticated, requireRole(['admin', 'instructor']), async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      const { id } = req.params;
      const question = await storage.updateQuestion(id, req.body);

      if (user) {
        await storage.createAuditLog({
          userId: user.id,
          action: "UPDATE_QUESTION",
          entityType: "question",
          entityId: id,
        });
      }

      res.json(question);
    } catch (error) {
      console.error("Error updating question:", error);
      res.status(500).json({ message: "Failed to update question" });
    }
  });

  app.delete('/api/questions/:id', isAuthenticated, requireRole(['admin', 'instructor']), async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      const { id } = req.params;
      await storage.deleteQuestion(id);

      if (user) {
        await storage.createAuditLog({
          userId: user.id,
          action: "DELETE_QUESTION",
          entityType: "question",
          entityId: id,
        });
      }

      res.json({ message: "Question deleted successfully" });
    } catch (error) {
      console.error("Error deleting question:", error);
      res.status(500).json({ message: "Failed to delete question" });
    }
  });

  // Admin routes
  app.get('/api/admin/stats', isAuthenticated, requireRole(['admin']), async (req: any, res) => {
    try {
      const users = await storage.getAllUsers();
      const courses = await storage.getCourses();

      const stats = {
        totalStudents: users.filter(u => u.role === 'student').length,
        activeStudents: users.filter(u => u.role === 'student' && u.isActive).length,
        totalInstructors: users.filter(u => u.role === 'instructor').length,
        totalCourses: courses.length,
        activeCourses: courses.filter(c => c.isActive).length,
        totalTests: 0,
        passedTests: 0,
        totalCertificates: 0,
        revenueTotal: 0,
        monthlyEnrollments: [],
        testPassRates: [],
      };

      res.json(stats);
    } catch (error) {
      console.error("Error fetching admin stats:", error);
      res.status(500).json({ message: "Failed to fetch admin stats" });
    }
  });

  app.get('/api/admin/users', isAuthenticated, requireRole(['admin']), async (req: any, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.patch('/api/admin/users/:id', isAuthenticated, requireRole(['admin']), async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      const { id } = req.params;
      const updatedUser = await storage.updateUser(id, req.body);

      if (user) {
        await storage.createAuditLog({
          userId: user.id,
          action: "UPDATE_USER",
          entityType: "user",
          entityId: id,
          details: req.body,
        });
      }

      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(500).json({ message: "Failed to update user" });
    }
  });

  app.get('/api/admin/courses', isAuthenticated, requireRole(['admin', 'instructor']), async (req: any, res) => {
    try {
      const courses = await storage.getCourses();
      res.json(courses);
    } catch (error) {
      console.error("Error fetching courses:", error);
      res.status(500).json({ message: "Failed to fetch courses" });
    }
  });

  app.post('/api/admin/courses', isAuthenticated, requireRole(['admin']), async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      const courseData = insertCourseSchema.parse(req.body);
      const course = await storage.createCourse(courseData);

      if (user) {
        await storage.createAuditLog({
          userId: user.id,
          action: "CREATE_COURSE",
          entityType: "course",
          entityId: course.id,
        });
      }

      res.json(course);
    } catch (error) {
      console.error("Error creating course:", error);
      res.status(500).json({ message: "Failed to create course" });
    }
  });

  app.get('/api/topics', isAuthenticated, async (req: any, res) => {
    try {
      const { courseId } = req.query;
      if (!courseId || typeof courseId !== 'string') {
        return res.status(400).json({ message: "Course ID required" });
      }

      const topics = await storage.getTopicsByCourse(courseId);
      res.json(topics);
    } catch (error) {
      console.error("Error fetching topics:", error);
      res.status(500).json({ message: "Failed to fetch topics" });
    }
  });

  // Stripe webhook handler
  app.post('/api/webhooks/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
    const sig = req.headers['stripe-signature'];
    
    if (!sig) {
      return res.status(400).send('Missing stripe signature');
    }

    try {
      const event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET || ''
      );

      if (event.type === 'payment_intent.succeeded') {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        
        const payments = await storage.getPaymentsByStudent('');
        const payment = payments.find(p => p.stripePaymentIntentId === paymentIntent.id);
        
        if (payment) {
          await storage.updatePayment(payment.id, {
            status: 'completed',
          });

          if (payment.courseId && payment.studentId) {
            const existing = await storage.getEnrollment(payment.courseId, payment.studentId);
            if (!existing) {
              await storage.createEnrollment({
                courseId: payment.courseId,
                studentId: payment.studentId,
              });
            }
          }
        }
      } else if (event.type === 'payment_intent.payment_failed') {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        
        const payments = await storage.getPaymentsByStudent('');
        const payment = payments.find(p => p.stripePaymentIntentId === paymentIntent.id);
        
        if (payment) {
          await storage.updatePayment(payment.id, {
            status: 'failed',
          });
        }
      }

      res.json({ received: true });
    } catch (err: any) {
      console.error('Webhook error:', err.message);
      res.status(400).send(`Webhook Error: ${err.message}`);
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
