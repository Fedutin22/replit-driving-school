import { db } from './db';
import { users, courses, topics, schedules } from '../shared/schema';
import { sql } from 'drizzle-orm';
import bcrypt from 'bcrypt';
import { fromZonedTime } from 'date-fns-tz';

async function seed() {
  console.log('Starting B-category courses database seeding...');

  // Step 1: Drop all tables
  console.log('Dropping all existing tables...');
  await db.execute(sql`DROP SCHEMA public CASCADE`);
  await db.execute(sql`CREATE SCHEMA public`);
  console.log('All tables dropped successfully.');

  console.log('Please run: npm run db:push --force');
  console.log('Then run this script again with the --skip-drop flag');
  console.log('Usage: npx tsx server/seed-b-category.ts --skip-drop');
}

async function seedData() {
  console.log('Seeding data...');

  // Create admin account
  console.log('Creating admin account...');
  const adminId = 'admin-user';
  await db.insert(users).values({
    id: adminId,
    email: 'admin@drivingschool.com',
    password: await bcrypt.hash('password123', 10),
    firstName: 'Admin',
    lastName: 'User',
    role: 'admin',
    isActive: true,
  }).onConflictDoNothing();

  // Create instructor accounts
  console.log('Creating instructor accounts...');
  const instructors = [
    { id: 'inst-balode-dace', firstName: 'Balode', lastName: 'Dace', email: 'balode.dace@drivingschool.com' },
    { id: 'inst-kulalajeva-jelena', firstName: 'Kulalajeva', lastName: 'Jeļena', email: 'kulalajeva.jelena@drivingschool.com' },
    { id: 'inst-klockovs-ivans', firstName: 'Kločkovs', lastName: 'Ivans', email: 'klockovs.ivans@drivingschool.com' },
    { id: 'inst-galuza-josifs', firstName: 'Galuza', lastName: 'Josifs', email: 'galuza.josifs@drivingschool.com' },
    { id: 'inst-lebedica-zanna', firstName: 'Lebediča', lastName: 'Žanna', email: 'lebedica.zanna@drivingschool.com' },
    { id: 'inst-gorbunova-jelena', firstName: 'Gorbunova', lastName: 'Jeļena', email: 'gorbunova.jelena@drivingschool.com' },
    { id: 'inst-leice-katerina', firstName: 'Leice', lastName: 'Katerina', email: 'leice.katerina@drivingschool.com' },
    { id: 'inst-drozda-jelena', firstName: 'Drozda', lastName: 'Jeļena', email: 'drozda.jelena@drivingschool.com' },
  ];

  for (const instructor of instructors) {
    await db.insert(users).values({
      id: instructor.id,
      email: instructor.email,
      password: await bcrypt.hash('password123', 10),
      firstName: instructor.firstName,
      lastName: instructor.lastName,
      role: 'instructor',
      isActive: true,
    }).onConflictDoNothing();
  }

  // Create 16 B-category courses
  console.log('Creating 16 B-category courses...');
  const courseData = [
    { instructor: 'inst-balode-dace', location: 'Rīga, Merķeļa iela 6 (1. stāvs, pagalmā)', schedule: 'Tue, Thu 17:20-21:25', startDate: '2025-11-20' },
    { instructor: 'inst-kulalajeva-jelena', location: 'Rīga, Merķeļa iela 6 (1. stāvs, pagalmā)', schedule: 'Sat, Sun 09:00-13:05', startDate: '2025-11-22' },
    { instructor: 'inst-klockovs-ivans', location: 'Rīga, Merķeļa iela 6 (1. stāvs, pagalmā)', schedule: 'Sat, Sun 14:00-18:05', startDate: '2025-11-22' },
    { instructor: 'inst-galuza-josifs', location: 'Rīga, Merķeļa iela 6 (1. stāvs, pagalmā)', schedule: 'Sat, Sun 09:00-13:05', startDate: '2025-11-22' },
    { instructor: 'inst-lebedica-zanna', location: 'Rīga, Merķeļa iela 6 (1. stāvs, pagalmā)', schedule: 'Mon, Wed 09:00-13:05', startDate: '2025-11-24' },
    { instructor: 'inst-galuza-josifs', location: 'Rīga, Merķeļa iela 6 (1. stāvs, pagalmā)', schedule: 'Mon, Wed 17:00-21:05', startDate: '2025-11-26' },
    { instructor: 'inst-lebedica-zanna', location: 'Rīga, Merķeļa iela 6 (1. stāvs, pagalmā)', schedule: 'Mon, Wed 17:40-21:45', startDate: '2025-11-26' },
    { instructor: 'inst-lebedica-zanna', location: 'Rīga, Merķeļa iela 6 (1. stāvs, pagalmā)', schedule: 'Tue, Thu 17:40-21:45', startDate: '2025-12-23' },
    { instructor: 'inst-kulalajeva-jelena', location: 'Rīga, Purvciema iela 38 (Klasiskā ģimnāzija)', schedule: 'Mon, Wed 18:00-22:05', startDate: '2025-12-01' },
    { instructor: 'inst-kulalajeva-jelena', location: 'Rīga, Ruses iela 22 (Zolitūdes ģimnāzija)', schedule: 'Tue, Thu 17:55-22:00', startDate: '2025-12-04' },
    { instructor: 'inst-gorbunova-jelena', location: 'Rīga, Brāļu Kaudzīšu iela 26', schedule: 'Tue, Thu 17:55-22:00', startDate: '2025-11-20' },
    { instructor: 'inst-klockovs-ivans', location: 'Rīga, Brāļu Kaudzīšu iela 26', schedule: 'Sat, Sun 14:00-18:05', startDate: '2025-11-22' },
    { instructor: 'inst-klockovs-ivans', location: 'Rīga, Brāļu Kaudzīšu iela 26', schedule: 'Sat, Sun 09:00-13:05', startDate: '2025-12-14' },
    { instructor: 'inst-leice-katerina', location: 'Daugavpils, Rīgas iela 24 (2. stāvs)', schedule: 'Tue, Thu 17:30-21:35', startDate: '2025-11-25' },
    { instructor: 'inst-drozda-jelena', location: 'Daugavpils, Rīgas iela 24 (2. stāvs)', schedule: 'Sat, Sun 09:00-13:05', startDate: '2025-11-29' },
    { instructor: 'inst-gorbunova-jelena', location: 'Rīga, On-line platforma Rīga', schedule: 'Tue, Thu 09:00-13:05', startDate: '2025-11-18' },
  ];

  const createdCourses = [];
  for (let i = 0; i < courseData.length; i++) {
    const data = courseData[i];
    const instructorData = instructors.find(inst => inst.id === data.instructor);
    const courseName = `B-Category ${instructorData?.firstName} ${instructorData?.lastName} - ${data.location} - ${data.schedule}`;
    
    const [course] = await db.insert(courses).values({
      name: courseName,
      description: `B-Category driving course with ${instructorData?.firstName} ${instructorData?.lastName}. Location: ${data.location}. Schedule: ${data.schedule}. Start date: ${data.startDate}.`,
      category: 'B-Category',
      price: '450.00',
      isActive: true,
    }).returning();
    
    createdCourses.push({ course, ...data });
  }

  // Create one shared topic for all courses
  console.log('Creating shared topic for all courses...');
  const createdTopics = [];
  for (const { course } of createdCourses) {
    const [topic] = await db.insert(topics).values({
      courseId: course.id,
      name: 'Theory Sessions',
      description: 'B-Category theory sessions covering traffic rules, road safety, and driving regulations.',
      type: 'theory',
      orderIndex: 1,
    }).returning();
    createdTopics.push(topic);
  }

  // Create schedules for each course (11 sessions each)
  console.log('Creating schedules (11 sessions per course = 176 total)...');
  
  const schedulesData = [
    // Course 1: Balode Dace - Tue, Thu 17:20-21:25
    { courseIdx: 0, dates: ['2025-11-20', '2025-11-25', '2025-11-27', '2025-12-02', '2025-12-04', '2025-12-09', '2025-12-11', '2025-12-16', '2025-12-18', '2025-12-23', '2025-12-25'], startTime: '17:20', endTime: '21:25' },
    
    // Course 2: Kulalajeva Jeļena - Sat, Sun 09:00-13:05
    { courseIdx: 1, dates: ['2025-11-22', '2025-11-23', '2025-11-29', '2025-11-30', '2025-12-06', '2025-12-07', '2025-12-13', '2025-12-14', '2025-12-20', '2025-12-21', '2025-12-27'], startTime: '09:00', endTime: '13:05' },
    
    // Course 3: Kločkovs Ivans - Sat, Sun 14:00-18:05
    { courseIdx: 2, dates: ['2025-11-22', '2025-11-23', '2025-11-29', '2025-11-30', '2025-12-06', '2025-12-07', '2025-12-13', '2025-12-14', '2025-12-20', '2025-12-21', '2025-12-27'], startTime: '14:00', endTime: '18:05' },
    
    // Course 4: Galuza Josifs - Sat, Sun 09:00-13:05
    { courseIdx: 3, dates: ['2025-11-22', '2025-11-23', '2025-11-29', '2025-11-30', '2025-12-06', '2025-12-07', '2025-12-13', '2025-12-14', '2025-12-20', '2025-12-21', '2025-12-27'], startTime: '09:00', endTime: '13:05' },
    
    // Course 5: Lebediča Žanna - Mon, Wed 09:00-13:05
    { courseIdx: 4, dates: ['2025-11-24', '2025-11-26', '2025-12-01', '2025-12-03', '2025-12-08', '2025-12-10', '2025-12-15', '2025-12-17', '2025-12-22', '2025-12-24', '2025-12-29'], startTime: '09:00', endTime: '13:05' },
    
    // Course 6: Galuza Josifs - Mon, Wed 17:00-21:05
    { courseIdx: 5, dates: ['2025-11-26', '2025-12-01', '2025-12-03', '2025-12-08', '2025-12-10', '2025-12-15', '2025-12-17', '2025-12-22', '2025-12-24', '2025-12-29', '2025-12-31'], startTime: '17:00', endTime: '21:05' },
    
    // Course 7: Lebediča Žanna - Mon, Wed 17:40-21:45
    { courseIdx: 6, dates: ['2025-11-26', '2025-12-01', '2025-12-03', '2025-12-08', '2025-12-10', '2025-12-15', '2025-12-17', '2025-12-22', '2025-12-24', '2025-12-29', '2025-12-31'], startTime: '17:40', endTime: '21:45' },
    
    // Course 8: Lebediča Žanna - Tue, Thu 17:40-21:45
    { courseIdx: 7, dates: ['2025-12-23', '2025-12-25', '2025-12-30', '2026-01-01', '2026-01-06', '2026-01-08', '2026-01-13', '2026-01-15', '2026-01-20', '2026-01-22', '2026-01-27'], startTime: '17:40', endTime: '21:45' },
    
    // Course 9: Kulalajeva Jeļena - Mon, Wed 18:00-22:05
    { courseIdx: 8, dates: ['2025-12-01', '2025-12-03', '2025-12-08', '2025-12-10', '2025-12-15', '2025-12-17', '2025-12-22', '2025-12-24', '2025-12-29', '2025-12-31', '2026-01-05'], startTime: '18:00', endTime: '22:05' },
    
    // Course 10: Kulalajeva Jeļena - Tue, Thu 17:55-22:00
    { courseIdx: 9, dates: ['2025-12-04', '2025-12-09', '2025-12-11', '2025-12-16', '2025-12-18', '2025-12-23', '2025-12-25', '2025-12-30', '2026-01-01', '2026-01-06', '2026-01-08'], startTime: '17:55', endTime: '22:00' },
    
    // Course 11: Gorbunova Jeļena - Tue, Thu 17:55-22:00
    { courseIdx: 10, dates: ['2025-11-20', '2025-11-25', '2025-11-27', '2025-12-02', '2025-12-04', '2025-12-09', '2025-12-11', '2025-12-16', '2025-12-18', '2025-12-23', '2025-12-25'], startTime: '17:55', endTime: '22:00' },
    
    // Course 12: Kločkovs Ivans - Sat, Sun 14:00-18:05
    { courseIdx: 11, dates: ['2025-11-22', '2025-11-23', '2025-11-29', '2025-11-30', '2025-12-06', '2025-12-07', '2025-12-13', '2025-12-14', '2025-12-20', '2025-12-21', '2025-12-27'], startTime: '14:00', endTime: '18:05' },
    
    // Course 13: Kločkovs Ivans - Sat, Sun 09:00-13:05
    { courseIdx: 12, dates: ['2025-12-14', '2025-12-20', '2025-12-21', '2025-12-27', '2025-12-28', '2026-01-03', '2026-01-04', '2026-01-10', '2026-01-11', '2026-01-17', '2026-01-18'], startTime: '09:00', endTime: '13:05' },
    
    // Course 14: Leice Katerina - Tue, Thu 17:30-21:35
    { courseIdx: 13, dates: ['2025-11-25', '2025-11-27', '2025-12-02', '2025-12-04', '2025-12-09', '2025-12-11', '2025-12-16', '2025-12-18', '2025-12-23', '2025-12-25', '2025-12-30'], startTime: '17:30', endTime: '21:35' },
    
    // Course 15: Drozda Jeļena - Sat, Sun 09:00-13:05
    { courseIdx: 14, dates: ['2025-11-29', '2025-11-30', '2025-12-06', '2025-12-07', '2025-12-13', '2025-12-14', '2025-12-20', '2025-12-21', '2025-12-27', '2025-12-28', '2026-01-03'], startTime: '09:00', endTime: '13:05' },
    
    // Course 16: Gorbunova Jeļena - Tue, Thu 09:00-13:05
    { courseIdx: 15, dates: ['2025-11-18', '2025-11-20', '2025-11-25', '2025-11-27', '2025-12-02', '2025-12-04', '2025-12-09', '2025-12-11', '2025-12-16', '2025-12-18', '2025-12-23'], startTime: '09:00', endTime: '13:05' },
  ];

  let scheduleCount = 0;
  for (const schedData of schedulesData) {
    const { course, instructor, location } = createdCourses[schedData.courseIdx];
    const topic = createdTopics[schedData.courseIdx];
    
    for (let i = 0; i < schedData.dates.length; i++) {
      const date = schedData.dates[i];
      // Create dates in Europe/Riga timezone, respecting DST (UTC+2/+3)
      // fromZonedTime converts local Riga time to UTC, automatically handling DST
      const startDateTime = fromZonedTime(`${date} ${schedData.startTime}`, 'Europe/Riga');
      const endDateTime = fromZonedTime(`${date} ${schedData.endTime}`, 'Europe/Riga');
      
      await db.insert(schedules).values({
        courseId: course.id,
        topicId: topic.id,
        instructorId: instructor,
        title: `Session ${i + 1}`,
        startTime: startDateTime,
        endTime: endDateTime,
        location: location,
        capacity: 30,
      });
      scheduleCount++;
    }
  }

  console.log(`✓ Created ${scheduleCount} schedules successfully!`);
  console.log('\n=== Seeding Complete ===');
  console.log('Summary:');
  console.log('- 1 admin account');
  console.log('- 8 instructor accounts');
  console.log('- 16 B-category courses');
  console.log('- 16 topics (one per course)');
  console.log(`- ${scheduleCount} schedules (11 per course)`);
  console.log('\nDefault password for all accounts: password123');
  console.log('Admin email: admin@drivingschool.com');
}

// Main execution
const args = process.argv.slice(2);
const skipDrop = args.includes('--skip-drop');

if (skipDrop) {
  seedData().catch((error) => {
    console.error('Error seeding data:', error);
    process.exit(1);
  });
} else {
  seed().catch((error) => {
    console.error('Error dropping tables:', error);
    process.exit(1);
  });
}
