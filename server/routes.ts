import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated, requireRole } from "./replitAuth";
import Stripe from "stripe";
import { z } from "zod";
import { insertCourseSchema, insertTopicSchema, insertPostSchema, insertQuestionSchema, insertTestTemplateSchema, insertScheduleSchema } from "@shared/schema";
import express from "express";
import PDFDocument from "pdfkit";
import bcrypt from "bcrypt";
import passport from "passport";

// CSV helper to escape fields
function csvEscape(value: string | number | boolean | null | undefined): string {
  if (value === null || value === undefined) return '""';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Missing required Stripe secret: STRIPE_SECRET_KEY');
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-10-29.clover",
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Registration endpoint for email/password auth
  app.post('/api/register', async (req, res) => {
    try {
      const { email, password, firstName, lastName, role } = req.body;
      
      // Validate input
      if (!email || !password || !firstName || !lastName) {
        return res.status(400).json({ message: "Missing required fields" });
      }
      
      // Check if user already exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: "Email already registered" });
      }
      
      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);
      
      // Create user
      const user = await storage.upsertUser({
        email,
        password: hashedPassword,
        firstName,
        lastName,
        role: role || 'student', // Default to student role
      });
      
      res.json({ message: "Registration successful", userId: user.id });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ message: "Registration failed" });
    }
  });

  // Login endpoint for email/password auth
  app.post('/api/local-login', (req, res, next) => {
    passport.authenticate('local', (err: any, user: any, info: any) => {
      if (err) {
        return res.status(500).json({ message: "Login error" });
      }
      if (!user) {
        return res.status(401).json({ message: info?.message || "Invalid credentials" });
      }
      
      req.logIn(user, (err) => {
        if (err) {
          return res.status(500).json({ message: "Session error" });
        }
        res.json({ message: "Login successful" });
      });
    })(req, res, next);
  });

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

  app.post('/api/tests/:templateId/start', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { templateId } = req.params;

      const template = await storage.getTestTemplate(templateId);
      if (!template) {
        return res.status(404).json({ message: "Test template not found" });
      }

      let questions;
      if (template.mode === 'random') {
        // For random mode, pull from all active questions in the question bank
        const allQuestions = await storage.getQuestions();
        const activeQuestions = allQuestions.filter(q => !q.isArchived);
        questions = activeQuestions
          .sort(() => Math.random() - 0.5)
          .slice(0, template.questionCount || 10);
      } else {
        // For manual mode, use the specific questions linked to this template
        const testQuestions = await storage.getTestQuestions(templateId);
        questions = testQuestions.map(tq => tq.question);
      }

      const instance = await storage.createTestInstance({
        testTemplateId: templateId,
        studentId: userId,
        questionsData: questions,
      });

      res.json(instance);
    } catch (error) {
      console.error("Error starting test:", error);
      res.status(500).json({ message: "Failed to start test" });
    }
  });

  app.post('/api/tests/:instanceId/submit', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { instanceId } = req.params;
      const { answers } = req.body;

      const instance = await storage.getTestInstance(instanceId);
      if (!instance) {
        return res.status(404).json({ message: "Test instance not found" });
      }

      if (instance.studentId !== userId) {
        return res.status(403).json({ message: "Not authorized to submit this test" });
      }

      if (instance.submittedAt) {
        return res.status(400).json({ message: "Test already submitted" });
      }

      const questions = instance.questionsData as any[];
      let correctCount = 0;

      questions.forEach((question, index) => {
        const studentAnswer = answers[question.id];
        if (!studentAnswer) return;

        if (question.type === 'single_choice') {
          const correctChoice = question.choices.find((c: any) => c.isCorrect);
          if (correctChoice && studentAnswer === correctChoice.label) {
            correctCount++;
          }
        } else if (question.type === 'multiple_choice') {
          const correctChoices = question.choices
            .filter((c: any) => c.isCorrect)
            .map((c: any) => c.label)
            .sort();
          const studentChoices = Array.isArray(studentAnswer) 
            ? studentAnswer.sort() 
            : [];
          if (JSON.stringify(correctChoices) === JSON.stringify(studentChoices)) {
            correctCount++;
          }
        }
      });

      const score = correctCount;
      const totalQuestions = questions.length;
      const percentage = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;
      
      const template = await storage.getTestTemplate(instance.testTemplateId);
      const passed = percentage >= (template?.passingPercentage || 70);

      const updatedInstance = await storage.updateTestInstance(instanceId, {
        answersData: answers,
        score,
        percentage,
        passed,
        submittedAt: new Date(),
      });

      res.json(updatedInstance);
    } catch (error) {
      console.error("Error submitting test:", error);
      res.status(500).json({ message: "Failed to submit test" });
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

  app.get('/api/certificates/:id/download', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { id } = req.params;

      const certificate = await storage.getCertificate(id);
      if (!certificate) {
        return res.status(404).json({ message: "Certificate not found" });
      }

      if (certificate.studentId !== userId) {
        const user = await storage.getUser(userId);
        if (user?.role !== 'admin' && user?.role !== 'instructor') {
          return res.status(403).json({ message: "Not authorized to download this certificate" });
        }
      }

      const student = await storage.getUser(certificate.studentId);
      const course = await storage.getCourse(certificate.courseId);

      const doc = new PDFDocument({ size: 'A4', layout: 'landscape' });
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=certificate-${certificate.certificateNumber}.pdf`);
      
      doc.pipe(res);

      // Certificate border
      doc.rect(40, 40, doc.page.width - 80, doc.page.height - 80)
        .lineWidth(2)
        .stroke('#2563eb');

      // Title
      doc.fontSize(36)
        .font('Helvetica-Bold')
        .fillColor('#1e40af')
        .text('CERTIFICATE OF COMPLETION', 0, 120, { align: 'center' });

      // Presented to
      doc.fontSize(16)
        .font('Helvetica')
        .fillColor('#64748b')
        .text('This is to certify that', 0, 200, { align: 'center' });

      // Student name
      const studentName = student ? `${student.firstName || ''} ${student.lastName || ''}`.trim() : 'Student';
      doc.fontSize(32)
        .font('Helvetica-Bold')
        .fillColor('#0f172a')
        .text(studentName, 0, 240, { align: 'center' });

      // Course completion text
      doc.fontSize(16)
        .font('Helvetica')
        .fillColor('#64748b')
        .text('has successfully completed the course', 0, 300, { align: 'center' });

      // Course name
      doc.fontSize(24)
        .font('Helvetica-Bold')
        .fillColor('#1e40af')
        .text(course?.name || 'Course', 0, 340, { align: 'center' });

      // Issue date
      const issueDate = certificate.issuedAt.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
      doc.fontSize(14)
        .font('Helvetica')
        .fillColor('#64748b')
        .text(`Issued on ${issueDate}`, 0, 420, { align: 'center' });

      // Certificate number
      doc.fontSize(10)
        .fillColor('#94a3b8')
        .text(`Certificate No: ${certificate.certificateNumber}`, 0, 480, { align: 'center' });

      // School name at bottom
      doc.fontSize(12)
        .font('Helvetica-Bold')
        .fillColor('#2563eb')
        .text('Driving School Academy', 0, doc.page.height - 100, { align: 'center' });

      doc.end();
    } catch (error) {
      console.error("Error generating certificate PDF:", error);
      res.status(500).json({ message: "Failed to generate certificate" });
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
      const questionData = insertQuestionSchema.partial().parse(req.body);
      const question = await storage.updateQuestion(id, questionData);

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
      
      // Get all test instances
      const allTestInstances = await Promise.all(
        users.filter(u => u.role === 'student').map(u => storage.getTestInstancesByStudent(u.id))
      );
      const testInstances = allTestInstances.flat();
      
      // Get all certificates
      const allCertificates = await Promise.all(
        users.filter(u => u.role === 'student').map(u => storage.getCertificatesByStudent(u.id))
      );
      const certificates = allCertificates.flat();
      
      // Get all payments
      const allPayments = await Promise.all(
        users.filter(u => u.role === 'student').map(u => storage.getPaymentsByStudent(u.id))
      );
      const payments = allPayments.flat();
      
      // Get all enrollments
      const allEnrollments = await Promise.all(
        users.filter(u => u.role === 'student').map(u => storage.getEnrollmentsByStudent(u.id))
      );
      const enrollments = allEnrollments.flat();
      
      // Calculate revenue
      const revenue = payments
        .filter(p => p.status === 'paid')
        .reduce((sum, p) => sum + parseFloat(p.amount), 0);
      
      // Monthly enrollments (last 12 months)
      const monthlyEnrollments = [];
      const now = new Date();
      for (let i = 11; i >= 0; i--) {
        const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthName = monthDate.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
        const count = enrollments.filter(e => {
          const enrollDate = new Date(e.enrolledAt);
          return enrollDate.getMonth() === monthDate.getMonth() && 
                 enrollDate.getFullYear() === monthDate.getFullYear();
        }).length;
        monthlyEnrollments.push({ month: monthName, count });
      }
      
      // Test pass rates by course
      const testPassRatesData = await Promise.all(
        courses.slice(0, 5).map(async (course) => {
          // Get templates linked to this course via courseCompletionTests
          const courseTemplates = await storage.getTestTemplatesByCourse(course.id);
          const templateIds = courseTemplates.map(t => t.id);
          
          // Filter test instances for this course's templates
          const courseTests = testInstances.filter(t => 
            templateIds.includes(t.testTemplateId) && t.submittedAt !== null
          );
          
          const passed = courseTests.filter(t => t.passed).length;
          const total = courseTests.length;
          const rate = total > 0 ? Math.round((passed / total) * 100) : 0;
          return {
            course: course.name.substring(0, 15),
            rate
          };
        })
      );

      const stats = {
        totalStudents: users.filter(u => u.role === 'student').length,
        activeStudents: users.filter(u => u.role === 'student' && u.isActive).length,
        totalInstructors: users.filter(u => u.role === 'instructor').length,
        totalCourses: courses.length,
        activeCourses: courses.filter(c => c.isActive).length,
        totalTests: testInstances.filter(t => t.submittedAt).length,
        passedTests: testInstances.filter(t => t.passed).length,
        totalCertificates: certificates.length,
        revenueTotal: revenue,
        monthlyEnrollments,
        testPassRates: testPassRatesData,
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

  app.get('/api/admin/export/students', isAuthenticated, requireRole(['admin']), async (req: any, res) => {
    try {
      const users = await storage.getAllUsers();
      const students = users.filter(u => u.role === 'student');
      
      const csv = [
        ['ID', 'First Name', 'Last Name', 'Email', 'Role', 'Active', 'Created At'].map(csvEscape).join(','),
        ...students.map(s => [
          csvEscape(s.id),
          csvEscape(s.firstName || ''),
          csvEscape(s.lastName || ''),
          csvEscape(s.email || ''),
          csvEscape(s.role),
          csvEscape(s.isActive ? 'Yes' : 'No'),
          csvEscape(new Date(s.createdAt).toLocaleDateString())
        ].join(','))
      ].join('\n');
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=students.csv');
      res.send(csv);
    } catch (error) {
      console.error("Error exporting students:", error);
      res.status(500).json({ message: "Failed to export students" });
    }
  });

  app.get('/api/admin/export/test-results', isAuthenticated, requireRole(['admin']), async (req: any, res) => {
    try {
      const users = await storage.getAllUsers();
      const allTests = await Promise.all(
        users.filter(u => u.role === 'student').map(u => storage.getTestInstancesByStudent(u.id))
      );
      const tests = allTests.flat().filter(t => t.submittedAt);
      
      const csv = [
        ['Student ID', 'Test Template ID', 'Score', 'Percentage', 'Passed', 'Submitted At'].map(csvEscape).join(','),
        ...tests.map(t => [
          csvEscape(t.studentId),
          csvEscape(t.testTemplateId),
          csvEscape(t.score || 0),
          csvEscape(t.percentage || 0),
          csvEscape(t.passed ? 'Yes' : 'No'),
          csvEscape(t.submittedAt ? new Date(t.submittedAt).toLocaleDateString() : '')
        ].join(','))
      ].join('\n');
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=test-results.csv');
      res.send(csv);
    } catch (error) {
      console.error("Error exporting test results:", error);
      res.status(500).json({ message: "Failed to export test results" });
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

  app.post('/api/admin/topics', isAuthenticated, requireRole(['admin', 'instructor']), async (req: any, res) => {
    try {
      const topicData = insertTopicSchema.parse(req.body);
      const topic = await storage.createTopic(topicData);
      res.json(topic);
    } catch (error) {
      console.error("Error creating topic:", error);
      res.status(500).json({ message: "Failed to create topic" });
    }
  });

  app.patch('/api/admin/topics/:id', isAuthenticated, requireRole(['admin', 'instructor']), async (req: any, res) => {
    try {
      const { id } = req.params;
      const topicData = insertTopicSchema.partial().parse(req.body);
      const topic = await storage.updateTopic(id, topicData);
      res.json(topic);
    } catch (error) {
      console.error("Error updating topic:", error);
      res.status(500).json({ message: "Failed to update topic" });
    }
  });

  app.delete('/api/admin/topics/:id', isAuthenticated, requireRole(['admin', 'instructor']), async (req: any, res) => {
    try {
      const { id } = req.params;
      await storage.deleteTopic(id);
      res.json({ message: "Topic deleted successfully" });
    } catch (error) {
      console.error("Error deleting topic:", error);
      res.status(500).json({ message: "Failed to delete topic" });
    }
  });

  app.get('/api/posts', isAuthenticated, async (req: any, res) => {
    try {
      const { topicId } = req.query;
      if (!topicId || typeof topicId !== 'string') {
        return res.status(400).json({ message: "Topic ID required" });
      }

      const posts = await storage.getPostsByTopic(topicId);
      res.json(posts);
    } catch (error) {
      console.error("Error fetching posts:", error);
      res.status(500).json({ message: "Failed to fetch posts" });
    }
  });

  app.post('/api/admin/posts', isAuthenticated, requireRole(['admin', 'instructor']), async (req: any, res) => {
    try {
      const postData = insertPostSchema.parse(req.body);
      const post = await storage.createPost(postData);
      res.json(post);
    } catch (error) {
      console.error("Error creating post:", error);
      res.status(500).json({ message: "Failed to create post" });
    }
  });

  app.patch('/api/admin/posts/:id', isAuthenticated, requireRole(['admin', 'instructor']), async (req: any, res) => {
    try {
      const { id } = req.params;
      const postData = insertPostSchema.partial().parse(req.body);
      const post = await storage.updatePost(id, postData);
      res.json(post);
    } catch (error) {
      console.error("Error updating post:", error);
      res.status(500).json({ message: "Failed to update post" });
    }
  });

  app.delete('/api/admin/posts/:id', isAuthenticated, requireRole(['admin', 'instructor']), async (req: any, res) => {
    try {
      const { id } = req.params;
      await storage.deletePost(id);
      res.json({ message: "Post deleted successfully" });
    } catch (error) {
      console.error("Error deleting post:", error);
      res.status(500).json({ message: "Failed to delete post" });
    }
  });

  // Admin test template routes
  app.get('/api/admin/test-templates', isAuthenticated, requireRole(['admin', 'instructor']), async (req: any, res) => {
    try {
      const templates = await storage.getTestTemplates();
      res.json(templates);
    } catch (error) {
      console.error("Error fetching test templates:", error);
      res.status(500).json({ message: "Failed to fetch test templates" });
    }
  });

  app.post('/api/admin/test-templates', isAuthenticated, requireRole(['admin']), async (req: any, res) => {
    try {
      const templateData = insertTestTemplateSchema.parse(req.body);
      const template = await storage.createTestTemplate(templateData);
      res.json(template);
    } catch (error) {
      console.error("Error creating test template:", error);
      res.status(500).json({ message: "Failed to create test template" });
    }
  });

  app.patch('/api/admin/test-templates/:id', isAuthenticated, requireRole(['admin']), async (req: any, res) => {
    try {
      const { id } = req.params;
      const template = await storage.updateTestTemplate(id, req.body);
      res.json(template);
    } catch (error) {
      console.error("Error updating test template:", error);
      res.status(500).json({ message: "Failed to update test template" });
    }
  });

  app.get('/api/admin/test-templates/:id/questions', isAuthenticated, requireRole(['admin', 'instructor']), async (req: any, res) => {
    try {
      const { id } = req.params;
      const questions = await storage.getTestQuestions(id);
      res.json(questions);
    } catch (error) {
      console.error("Error fetching test questions:", error);
      res.status(500).json({ message: "Failed to fetch test questions" });
    }
  });

  app.post('/api/admin/test-templates/:id/questions', isAuthenticated, requireRole(['admin']), async (req: any, res) => {
    try {
      const { id } = req.params;
      const { questionId, orderIndex } = req.body;
      
      if (!questionId) {
        return res.status(400).json({ message: "Question ID required" });
      }
      
      const testQuestion = await storage.addQuestionToTest(id, questionId, orderIndex || 0);
      res.json(testQuestion);
    } catch (error) {
      console.error("Error adding question to test:", error);
      res.status(500).json({ message: "Failed to add question to test" });
    }
  });

  app.delete('/api/admin/test-templates/:id/questions/:questionId', isAuthenticated, requireRole(['admin']), async (req: any, res) => {
    try {
      const { id, questionId } = req.params;
      await storage.removeQuestionFromTest(id, questionId);
      res.json({ message: "Question removed successfully" });
    } catch (error) {
      console.error("Error removing question from test:", error);
      res.status(500).json({ message: "Failed to remove question from test" });
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
            status: 'paid',
            paidAt: new Date(),
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
