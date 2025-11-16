import { db } from './db';
import { users, courses, topics, posts, questions, testTemplates, courseCompletionTests, schedules, courseEnrollments, testInstances, sessionRegistrations, attendance } from '../shared/schema';
import { sql } from 'drizzle-orm';
import bcrypt from 'bcrypt';

async function seed() {
  console.log('Starting database seeding...');

  // Create instructors
  console.log('Creating instructors...');
  const instructor1Id = 'instructor-john-doe';
  const instructor2Id = 'instructor-jane-smith';
  
  await db.insert(users).values([
    {
      id: instructor1Id,
      email: 'john.doe@drivingschool.com',
      password: await bcrypt.hash('password123', 10),
      firstName: 'John',
      lastName: 'Doe',
      role: 'instructor',
      isActive: true,
    },
    {
      id: instructor2Id,
      email: 'jane.smith@drivingschool.com',
      password: await bcrypt.hash('password123', 10),
      firstName: 'Jane',
      lastName: 'Smith',
      role: 'instructor',
      isActive: true,
    },
  ]).onConflictDoNothing();

  // Create courses
  console.log('Creating courses...');
  const [course1] = await db.insert(courses).values({
    name: 'Beginner Driver Training',
    description: 'Complete beginner course covering all fundamentals of safe driving. Includes theory lessons and practical driving sessions.',
    category: 'Beginner',
    price: '1200.00',
    isActive: true,
  }).returning();

  const [course2] = await db.insert(courses).values({
    name: 'Advanced Defensive Driving',
    description: 'Advanced techniques for experienced drivers focusing on defensive driving, emergency maneuvers, and hazard perception.',
    category: 'Advanced',
    price: '800.00',
    isActive: true,
  }).returning();

  const [course3] = await db.insert(courses).values({
    name: 'Commercial License Preparation',
    description: 'Professional training for commercial driver license. Covers large vehicle operation, cargo handling, and DOT regulations.',
    category: 'Professional',
    price: '2500.00',
    isActive: true,
  }).returning();

  // Create topics for Beginner course
  console.log('Creating topics...');
  const [topic1] = await db.insert(topics).values({
    courseId: course1.id,
    name: 'Traffic Rules and Regulations',
    description: 'Understanding road signs, traffic laws, and right of way',
    type: 'theory',
    orderIndex: 1,
  }).returning();

  const [topic2] = await db.insert(topics).values({
    courseId: course1.id,
    name: 'Basic Vehicle Control',
    description: 'Learning to control the vehicle, steering, braking, and acceleration',
    type: 'practice',
    orderIndex: 2,
  }).returning();

  const [topic3] = await db.insert(topics).values({
    courseId: course1.id,
    name: 'Parking Techniques',
    description: 'Parallel parking, perpendicular parking, and angle parking',
    type: 'practice',
    orderIndex: 3,
  }).returning();

  // Topics for Advanced course
  const [topic4] = await db.insert(topics).values({
    courseId: course2.id,
    name: 'Defensive Driving Principles',
    description: 'Anticipating hazards and defensive driving strategies',
    type: 'theory',
    orderIndex: 1,
  }).returning();

  const [topic5] = await db.insert(topics).values({
    courseId: course2.id,
    name: 'Emergency Maneuvers',
    description: 'Handling emergency situations and evasive maneuvers',
    type: 'practice',
    orderIndex: 2,
  }).returning();

  // Topics for Commercial course
  const [topic6] = await db.insert(topics).values({
    courseId: course3.id,
    name: 'DOT Regulations',
    description: 'Understanding Department of Transportation regulations',
    type: 'theory',
    orderIndex: 1,
  }).returning();

  const [topic7] = await db.insert(topics).values({
    courseId: course3.id,
    name: 'Large Vehicle Operation',
    description: 'Operating commercial vehicles safely',
    type: 'practice',
    orderIndex: 2,
  }).returning();

  // Create posts
  console.log('Creating posts...');
  await db.insert(posts).values([
    {
      topicId: topic1.id,
      title: 'Understanding Stop Signs',
      content: '<h2>Stop Signs</h2><p>A stop sign requires you to come to a <strong>complete stop</strong> before the stop line, crosswalk, or intersection. You must yield to all pedestrians and vehicles before proceeding.</p><ul><li>Always stop completely</li><li>Look left, right, and left again</li><li>Proceed only when safe</li></ul>',
      orderIndex: 1,
    },
    {
      topicId: topic1.id,
      title: 'Yield Signs and Right of Way',
      content: '<h2>Yield Signs</h2><p>Yield signs indicate that you must <em>slow down</em> and be prepared to stop if necessary. You must give the right of way to vehicles and pedestrians in the intersection or roadway you are entering.</p>',
      orderIndex: 2,
    },
    {
      topicId: topic2.id,
      title: 'Proper Steering Techniques',
      content: '<h2>Steering</h2><p>Use the hand-over-hand or push-pull steering method. Keep both hands on the wheel at the 9 and 3 o\'clock positions for maximum control.</p>',
      orderIndex: 1,
    },
    {
      topicId: topic3.id,
      title: 'Parallel Parking Step by Step',
      content: '<h2>Parallel Parking</h2><ol><li>Pull up alongside the front car</li><li>Back up slowly while turning the wheel</li><li>Straighten the wheel when your car is at 45 degrees</li><li>Continue backing until parallel</li><li>Adjust as needed</li></ol>',
      orderIndex: 1,
    },
    {
      topicId: topic4.id,
      title: 'Scanning for Hazards',
      content: '<h2>Visual Scanning</h2><p>Continuously scan the road ahead, checking mirrors every 5-8 seconds. Look 12-15 seconds ahead to identify potential hazards early.</p>',
      orderIndex: 1,
    },
  ]);

  // Create questions
  console.log('Creating questions...');
  await db.insert(questions).values([
    {
      questionText: 'What does a red octagonal sign mean?',
      type: 'single_choice',
      choices: [
        { text: 'Stop', isCorrect: true },
        { text: 'Yield', isCorrect: false },
        { text: 'Caution', isCorrect: false },
        { text: 'No entry', isCorrect: false },
      ],
      tags: ['traffic-signs', 'easy'],
    },
    {
      questionText: 'What is the proper hand position on the steering wheel?',
      type: 'single_choice',
      choices: [
        { text: '10 and 2', isCorrect: false },
        { text: '9 and 3', isCorrect: true },
        { text: '8 and 4', isCorrect: false },
        { text: '12 and 6', isCorrect: false },
      ],
      tags: ['vehicle-control', 'easy'],
    },
    {
      questionText: 'When should you check your mirrors?',
      type: 'single_choice',
      choices: [
        { text: 'Only when changing lanes', isCorrect: false },
        { text: 'Every 5-8 seconds', isCorrect: true },
        { text: 'Once per minute', isCorrect: false },
        { text: 'Only when backing up', isCorrect: false },
      ],
      tags: ['defensive-driving', 'medium'],
    },
    {
      questionText: 'What should you do at a yellow traffic light?',
      type: 'single_choice',
      choices: [
        { text: 'Speed up to get through', isCorrect: false },
        { text: 'Stop if safe to do so', isCorrect: true },
        { text: 'Always stop immediately', isCorrect: false },
        { text: 'Honk your horn', isCorrect: false },
      ],
      tags: ['traffic-signs', 'medium'],
    },
    {
      questionText: 'What is the minimum following distance in good conditions?',
      type: 'single_choice',
      choices: [
        { text: '1 second', isCorrect: false },
        { text: '2 seconds', isCorrect: false },
        { text: '3 seconds', isCorrect: true },
        { text: '5 seconds', isCorrect: false },
      ],
      tags: ['defensive-driving', 'easy'],
    },
    {
      questionText: 'When parallel parking, you should be how far from the curb?',
      type: 'single_choice',
      choices: [
        { text: '6 inches', isCorrect: true },
        { text: '12 inches', isCorrect: false },
        { text: '18 inches', isCorrect: false },
        { text: '24 inches', isCorrect: false },
      ],
      tags: ['parking', 'medium'],
    },
  ]);

  // Create test templates
  console.log('Creating test templates...');
  const [testTemplate1] = await db.insert(testTemplates).values({
    name: 'Beginner Course Final Exam',
    description: 'Comprehensive test covering all topics in the beginner course',
    mode: 'random',
    questionCount: 6,
    passingPercentage: 80,
    randomizeQuestions: true,
  }).returning();

  const [testTemplate2] = await db.insert(testTemplates).values({
    name: 'Advanced Driving Final Exam',
    description: 'Test for advanced defensive driving techniques',
    mode: 'random',
    questionCount: 6,
    passingPercentage: 85,
    randomizeQuestions: true,
  }).returning();

  // Link tests to courses
  await db.insert(courseCompletionTests).values([
    {
      courseId: course1.id,
      testTemplateId: testTemplate1.id,
    },
    {
      courseId: course2.id,
      testTemplateId: testTemplate2.id,
    },
  ]);

  // Create schedules
  console.log('Creating schedules...');
  const now = new Date();
  const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const nextWeek2 = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const twoWeeks = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
  const twoWeeks2 = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
  const threeWeeks = new Date(now.getTime() + 21 * 24 * 60 * 60 * 1000);

  const [schedule1] = await db.insert(schedules).values({
    courseId: course1.id,
    topicId: topic1.id,
    instructorId: instructor1Id,
    title: 'Traffic Rules Theory Session',
    startTime: new Date(nextWeek.setHours(10, 0, 0, 0)),
    endTime: new Date(nextWeek.setHours(12, 0, 0, 0)),
    location: 'Classroom A',
    capacity: 15,
  }).returning();

  const [schedule2] = await db.insert(schedules).values({
    courseId: course1.id,
    topicId: topic2.id,
    instructorId: instructor1Id,
    title: 'Basic Control Practice',
    startTime: new Date(nextWeek2.setHours(14, 0, 0, 0)),
    endTime: new Date(nextWeek2.setHours(16, 0, 0, 0)),
    location: 'Practice Lot',
    capacity: 8,
  }).returning();

  const [schedule3] = await db.insert(schedules).values({
    courseId: course1.id,
    topicId: topic3.id,
    instructorId: instructor2Id,
    title: 'Parking Skills Workshop',
    startTime: new Date(twoWeeks.setHours(10, 0, 0, 0)),
    endTime: new Date(twoWeeks.setHours(12, 0, 0, 0)),
    location: 'Practice Lot',
    capacity: 8,
  }).returning();

  const [schedule4] = await db.insert(schedules).values({
    courseId: course2.id,
    topicId: topic4.id,
    instructorId: instructor2Id,
    title: 'Defensive Driving Theory',
    startTime: new Date(twoWeeks2.setHours(14, 0, 0, 0)),
    endTime: new Date(twoWeeks2.setHours(16, 0, 0, 0)),
    location: 'Classroom B',
    capacity: 12,
  }).returning();

  const [schedule5] = await db.insert(schedules).values({
    courseId: course2.id,
    topicId: topic5.id,
    instructorId: instructor1Id,
    title: 'Emergency Maneuvers Practice',
    startTime: new Date(threeWeeks.setHours(10, 0, 0, 0)),
    endTime: new Date(threeWeeks.setHours(13, 0, 0, 0)),
    location: 'Advanced Track',
    capacity: 6,
  }).returning();

  // Create student users at different progress stages
  console.log('Creating students...');
  const students = [
    {
      id: 'student-alice',
      email: 'alice.johnson@email.com',
      password: await bcrypt.hash('password123', 10),
      firstName: 'Alice',
      lastName: 'Johnson',
      role: 'student' as const,
      isActive: true,
    },
    {
      id: 'student-bob',
      email: 'bob.williams@email.com',
      password: await bcrypt.hash('password123', 10),
      firstName: 'Bob',
      lastName: 'Williams',
      role: 'student' as const,
      isActive: true,
    },
    {
      id: 'student-carol',
      email: 'carol.davis@email.com',
      password: await bcrypt.hash('password123', 10),
      firstName: 'Carol',
      lastName: 'Davis',
      role: 'student' as const,
      isActive: true,
    },
    {
      id: 'student-david',
      email: 'david.miller@email.com',
      password: await bcrypt.hash('password123', 10),
      firstName: 'David',
      lastName: 'Miller',
      role: 'student' as const,
      isActive: true,
    },
    {
      id: 'student-emma',
      email: 'emma.wilson@email.com',
      password: await bcrypt.hash('password123', 10),
      firstName: 'Emma',
      lastName: 'Wilson',
      role: 'student' as const,
      isActive: true,
    },
    {
      id: 'student-frank',
      email: 'frank.moore@email.com',
      password: await bcrypt.hash('password123', 10),
      firstName: 'Frank',
      lastName: 'Moore',
      role: 'student' as const,
      isActive: true,
    },
  ];

  await db.insert(users).values(students).onConflictDoNothing();

  // Create enrollments at different stages
  console.log('Creating enrollments...');
  
  // Alice - Just started beginner course
  await db.insert(courseEnrollments).values({
    studentId: 'student-alice',
    courseId: course1.id,
    isActive: true,
    enrolledAt: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000),
  });

  // Bob - Mid-way through beginner course
  await db.insert(courseEnrollments).values({
    studentId: 'student-bob',
    courseId: course1.id,
    isActive: true,
    enrolledAt: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
  });

  // Carol - Almost completed beginner course
  await db.insert(courseEnrollments).values({
    studentId: 'student-carol',
    courseId: course1.id,
    isActive: true,
    enrolledAt: new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000),
  });

  // David - Completed beginner course
  await db.insert(courseEnrollments).values({
    studentId: 'student-david',
    courseId: course1.id,
    isActive: false,
    enrolledAt: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000),
    completedAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
  });

  // Emma - Starting advanced course
  await db.insert(courseEnrollments).values({
    studentId: 'student-emma',
    courseId: course2.id,
    isActive: true,
    enrolledAt: new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000),
  });

  // Frank - Starting commercial course
  await db.insert(courseEnrollments).values({
    studentId: 'student-frank',
    courseId: course3.id,
    isActive: true,
    enrolledAt: new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000),
  });

  // Create test instances
  console.log('Creating test instances...');
  
  // Carol took the test and passed
  await db.insert(testInstances).values({
    studentId: 'student-carol',
    testTemplateId: testTemplate1.id,
    questionsData: [],
    answersData: {},
    score: 5,
    percentage: 85,
    passed: true,
    startedAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
    submittedAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000 + 25 * 60 * 1000),
  });

  // David took the test and passed
  await db.insert(testInstances).values({
    studentId: 'student-david',
    testTemplateId: testTemplate1.id,
    questionsData: [],
    answersData: {},
    score: 6,
    percentage: 95,
    passed: true,
    startedAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
    submittedAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000 + 22 * 60 * 1000),
  });

  // Bob took the test and failed
  await db.insert(testInstances).values({
    studentId: 'student-bob',
    testTemplateId: testTemplate1.id,
    questionsData: [],
    answersData: {},
    score: 4,
    percentage: 65,
    passed: false,
    startedAt: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
    submittedAt: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000 + 30 * 60 * 1000),
  });

  // Create session registrations
  console.log('Creating session registrations...');
  await db.insert(sessionRegistrations).values([
    {
      studentId: 'student-alice',
      scheduleId: schedule1.id,
    },
    {
      studentId: 'student-bob',
      scheduleId: schedule1.id,
    },
    {
      studentId: 'student-carol',
      scheduleId: schedule3.id,
    },
    {
      studentId: 'student-emma',
      scheduleId: schedule4.id,
    },
  ]);

  console.log('Database seeding completed successfully!');
  console.log('\nSummary:');
  console.log('- 2 Instructors');
  console.log('- 3 Courses (Beginner, Advanced, Commercial)');
  console.log('- 7 Topics');
  console.log('- 5 Posts');
  console.log('- 6 Questions');
  console.log('- 2 Test Templates');
  console.log('- 5 Schedules');
  console.log('- 6 Students at different progress stages');
  console.log('- 6 Course Enrollments');
  console.log('- 3 Test Instances');
  console.log('- 4 Session Registrations');
}

seed()
  .catch((error) => {
    console.error('Seeding failed:', error);
    process.exit(1);
  })
  .finally(() => {
    process.exit(0);
  });
