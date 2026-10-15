const mongoose = require('mongoose');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');

dotenv.config({ path: '../.env' });
if (!process.env.MONGODB_URI) dotenv.config();

const User = require('../models/User');
const Counselor = require('../models/Counselor');
const Resource = require('../models/Resource');
const Badge = require('../models/Badge');

const seedData = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/mental_wellness');
    console.log('Connected to MongoDB for seeding...');

    // Clear existing data
    await Promise.all([
      User.deleteMany(),
      Counselor.deleteMany(),
      Resource.deleteMany(),
      Badge.deleteMany(),
    ]);

    // Create admin user
    const admin = await User.create({
      name: 'Admin User',
      email: 'admin@mentalwellness.com',
      password: 'Admin123',
      role: 'admin',
    });

    // Create demo user
    const demoUser = await User.create({
      name: 'Alex Johnson',
      email: 'alex@university.edu',
      password: 'Demo123',
      role: 'user',
      institution: 'State University',
    });

    console.log('✅ Users seeded');

    // Create counselors
    const counselors = await Counselor.insertMany([
      {
        name: 'Dr. Sarah Mitchell',
        specialization: 'anxiety',
        bio: 'Licensed clinical psychologist with 12 years of experience specializing in anxiety disorders and cognitive-behavioral therapy. Passionate about helping young adults navigate academic stress and social anxiety.',
        experience: 12,
        rating: 4.8,
        availableSlots: [
          { day: 'monday', startTime: '09:00', endTime: '17:00' },
          { day: 'wednesday', startTime: '09:00', endTime: '17:00' },
          { day: 'friday', startTime: '10:00', endTime: '15:00' },
        ],
        isActive: true,
      },
      {
        name: 'Dr. James Walker',
        specialization: 'depression',
        bio: 'Board-certified psychiatrist with expertise in mood disorders and medication management. Combines evidence-based treatments with mindfulness approaches for holistic care.',
        experience: 15,
        rating: 4.9,
        availableSlots: [
          { day: 'tuesday', startTime: '10:00', endTime: '18:00' },
          { day: 'thursday', startTime: '10:00', endTime: '18:00' },
        ],
        isActive: true,
      },
      {
        name: 'Dr. Priya Sharma',
        specialization: 'stress',
        bio: 'Certified counseling psychologist focusing on stress management, burnout prevention, and work-life balance. Special interest in supporting international students.',
        experience: 8,
        rating: 4.7,
        availableSlots: [
          { day: 'monday', startTime: '11:00', endTime: '19:00' },
          { day: 'tuesday', startTime: '11:00', endTime: '19:00' },
          { day: 'thursday', startTime: '11:00', endTime: '17:00' },
        ],
        isActive: true,
      },
      {
        name: 'Dr. Michael Chen',
        specialization: 'relationships',
        bio: 'Family and relationship therapist with a focus on communication skills, conflict resolution, and attachment styles. Experienced in both individual and couples counseling.',
        experience: 10,
        rating: 4.6,
        availableSlots: [
          { day: 'wednesday', startTime: '09:00', endTime: '16:00' },
          { day: 'friday', startTime: '09:00', endTime: '16:00' },
          { day: 'saturday', startTime: '10:00', endTime: '14:00' },
        ],
        isActive: true,
      },
      {
        name: 'Dr. Emma Rodriguez',
        specialization: 'mindfulness',
        bio: 'Integrative psychotherapist combining mindfulness-based cognitive therapy with traditional approaches. Certified meditation instructor with a warm, supportive style.',
        experience: 7,
        rating: 4.8,
        availableSlots: [
          { day: 'monday', startTime: '08:00', endTime: '14:00' },
          { day: 'wednesday', startTime: '08:00', endTime: '14:00' },
          { day: 'friday', startTime: '08:00', endTime: '14:00' },
        ],
        isActive: true,
      },
    ]);

    console.log('✅ Counselors seeded');

    // Create resources
    // The resource library is the same 60-item reviewed corpus used by the NLP recommender.
    const corpus = JSON.parse(
      require('fs').readFileSync(require('path').join(__dirname, '..', '..', 'nlp-service', 'data', 'corpus.json'), 'utf8')
    );
    await Resource.insertMany(
      corpus.map((r) => ({
        corpusId: r.id,
        title: r.title,
        description: r.description.slice(0, 500),
        category: r.category,
        subtopic: r.subtopic,
        type: r.type,
        readTime: r.duration_min,
        tags: r.tags,
      }))
    );

    console.log('✅ Resources seeded');

    // Create badges
    await Badge.insertMany([
      {
        name: 'First Step',
        description: 'Log your first mood entry',
        icon: '🌱',
        criteria: { type: 'mood_logs', threshold: 1 },
        points: 10,
      },
      {
        name: 'Mood Tracker',
        description: 'Log 7 mood entries',
        icon: '📊',
        criteria: { type: 'mood_logs', threshold: 7 },
        points: 25,
      },
      {
        name: 'Mood Master',
        description: 'Log 30 mood entries',
        icon: '🏆',
        criteria: { type: 'mood_logs', threshold: 30 },
        points: 50,
      },
      {
        name: '3-Day Streak',
        description: 'Login for 3 consecutive days',
        icon: '🔥',
        criteria: { type: 'streak', threshold: 3 },
        points: 15,
      },
      {
        name: 'Week Warrior',
        description: 'Login for 7 consecutive days',
        icon: '⚡',
        criteria: { type: 'streak', threshold: 7 },
        points: 30,
      },
      {
        name: 'Grateful Heart',
        description: 'Write 5 gratitude entries',
        icon: '💜',
        criteria: { type: 'gratitude_entries', threshold: 5 },
        points: 20,
      },
      {
        name: 'Community Voice',
        description: 'Create your first forum post',
        icon: '💬',
        criteria: { type: 'forum_posts', threshold: 1 },
        points: 15,
      },
      {
        name: 'Active Contributor',
        description: 'Create 10 forum posts',
        icon: '🌟',
        criteria: { type: 'forum_posts', threshold: 10 },
        points: 40,
      },
    ]);

    console.log('✅ Badges seeded');
    console.log('\n🎉 All seed data inserted successfully!');
    console.log('\nDemo Credentials:');
    console.log('  Admin: admin@mentalwellness.com / Admin123');
    console.log('  User:  alex@university.edu / Demo123');

    process.exit(0);
  } catch (error) {
    console.error('Seed error:', error);
    process.exit(1);
  }
};

seedData();
