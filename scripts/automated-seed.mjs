#!/usr/bin/env node

/**
 * Automated Firebase Seeding Script
 * Runs with temporarily open security rules
 * Uses environment variables for Firebase configuration
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, collection, getDocs, deleteDoc } from 'firebase/firestore';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { COLLECTIONS } from './firebase-collections.mjs';

// Load environment variables from .env.local
function loadEnvFile() {
  try {
    const envPath = resolve('.env.local');
    const envFile = readFileSync(envPath, 'utf8');
    const envVars = {};
    
    envFile.split('\n').forEach(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=');
        if (key && valueParts.length > 0) {
          envVars[key.trim()] = valueParts.join('=').trim();
        }
      }
    });
    
    return envVars;
  } catch (error) {
    console.warn('⚠️  Could not load .env.local file, using environment variables');
    return {};
  }
}

const envVars = loadEnvFile();

// Get environment variable with fallback
function getEnv(key, fallback = '') {
  return process.env[key] || envVars[key] || fallback;
}

// Firebase config from environment variables
const firebaseConfig = {
  apiKey: getEnv('PUBLIC_FIREBASE_API_KEY'),
  authDomain: getEnv('PUBLIC_FIREBASE_AUTH_DOMAIN'),
  projectId: getEnv('PUBLIC_FIREBASE_PROJECT_ID'),
  storageBucket: getEnv('PUBLIC_FIREBASE_STORAGE_BUCKET'),
  messagingSenderId: getEnv('PUBLIC_FIREBASE_MESSAGING_SENDER_ID'),
  appId: getEnv('PUBLIC_FIREBASE_APP_ID')
};

// Validate required config
const requiredKeys = ['apiKey', 'authDomain', 'projectId', 'storageBucket', 'messagingSenderId', 'appId'];
const missingKeys = requiredKeys.filter(key => !firebaseConfig[key]);

if (missingKeys.length > 0) {
  console.error('❌ Missing required Firebase configuration:');
  missingKeys.forEach(key => console.error(`  - ${key.toUpperCase()}`));
  console.error('');
  console.error('Please ensure your .env.local file contains all PUBLIC_FIREBASE_* variables.');
  process.exit(1);
}

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Get admin user UID from environment variable
const USER_UID = getEnv('ADMIN_USER_UID');

if (!USER_UID) {
  console.error('❌ Missing ADMIN_USER_UID environment variable.');
  console.error('Please set ADMIN_USER_UID in your .env.local file.');
  process.exit(1);
}

// Get admin user email from environment variable  
const USER_EMAIL = getEnv('ADMIN_USER_EMAIL');

if (!USER_EMAIL) {
  console.error('❌ Missing ADMIN_USER_EMAIL environment variable.');
  console.error('Please set ADMIN_USER_EMAIL in your .env.local file.');
  process.exit(1);
}

// Get admin user display name from environment variable
const USER_DISPLAY_NAME = getEnv('ADMIN_USER_DISPLAY_NAME') || 'Admin User';

console.log('🌱 Starting automated database seeding...');
console.log(`📊 Project: ${firebaseConfig.projectId}`);
console.log(`👤 Admin: ${USER_DISPLAY_NAME} (${USER_EMAIL}) [UID: ${USER_UID}]`);

// Admin user data
const adminUser = {
  id: USER_UID,
  email: USER_EMAIL,
  displayName: USER_DISPLAY_NAME,
  role: 'admin',
  enrolledCourses: [],
  completedCourses: [],
  achievements: ['admin_access', 'platform_creator'],
  totalPoints: 1000,
  streakDays: 7,
  emailVerified: true,
  createdAt: new Date().toISOString(),
  lastLoginAt: new Date().toISOString(),
  preferences: {
    emailNotifications: true,
    language: 'en'
  }
};

// Sample course data
const sampleCourse = {
  id: 'js-fundamentals-001',
  title: 'Complete JavaScript Fundamentals',
  description: 'Master JavaScript from basics to advanced concepts. Learn variables, functions, objects, DOM manipulation, and modern ES6+ features.',
  instructor: USER_DISPLAY_NAME,
  instructorId: USER_UID,
  thumbnail: 'https://images.unsplash.com/photo-1627398242454-45a1465c2479?w=800&h=600&fit=crop&crop=entropy&auto=format&q=80',
  category: 'Programming',
  difficulty: 'Beginner',
  duration: '12 weeks',
  level: 'free',
  isPublished: true,
  isFeatured: true,
  enrolled: 15,
  rating: 4.8,
  ratingCount: 32,
  tags: ['JavaScript', 'Programming', 'Web Development'],
  prerequisites: [],
  learningOutcomes: [
    'Understand JavaScript syntax and fundamentals',
    'Work with DOM elements and events',
    'Build interactive web applications',
    'Use modern ES6+ features effectively'
  ],
  lessons: [
    {
      id: 'js-basics',
      courseId: 'js-fundamentals-001',
      title: 'JavaScript Basics',
      type: 'lesson',
      order: 1,
      duration: 30,
      content: 'Introduction to JavaScript syntax, variables, and data types.',
      videoUrl: 'https://www.youtube.com/watch?v=W6NZfCO5SIk',
      isRequired: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'js-quiz-1',
      courseId: 'js-fundamentals-001',
      title: 'JavaScript Knowledge Check',
      type: 'quiz',
      order: 2,
      duration: 15,
      isRequired: true,
      quiz: {
        id: 'js-quiz-1',
        title: 'JavaScript Fundamentals Quiz',
        description: 'Test your understanding of JavaScript basics',
        questions: [
          {
            id: 'q1',
            type: 'multiple_choice',
            question: 'Which of the following is used to declare a variable in JavaScript?',
            options: ['var', 'let', 'const', 'All of the above'],
            correctAnswer: 3,
            explanation: 'JavaScript has three ways to declare variables: var, let, and const.',
            points: 10,
            order: 0
          },
          {
            id: 'q2',
            type: 'true_false',
            question: 'JavaScript is a strongly typed language.',
            options: ['True', 'False'],
            correctAnswer: 1,
            explanation: 'JavaScript is a dynamically typed language, not strongly typed.',
            points: 10,
            order: 1
          }
        ],
        passingScore: 70,
        allowMultipleAttempts: true,
        showCorrectAnswers: true,
        randomizeQuestions: false,
        randomizeOptions: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ],
  chapters: [],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
};

// Additional sample course
const reactCourse = {
  id: 'react-beginners-001',
  title: 'React for Beginners',
  description: 'Build modern web applications with React. Learn components, hooks, state management, and more.',
  instructor: USER_DISPLAY_NAME,
  instructorId: USER_UID,
  thumbnail: 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=800&h=600&fit=crop&crop=entropy&auto=format&q=80',
  category: 'Web Development',
  difficulty: 'Intermediate',
  duration: '8 weeks',
  level: 'free',
  isPublished: true,
  isFeatured: true,
  enrolled: 8,
  rating: 4.9,
  ratingCount: 18,
  tags: ['React', 'JavaScript', 'Frontend', 'Components'],
  prerequisites: ['Basic JavaScript knowledge'],
  learningOutcomes: [
    'Build React components effectively',
    'Manage state with hooks',
    'Create single-page applications',
    'Handle events and user interactions'
  ],
  lessons: [
    {
      id: 'react-intro',
      courseId: 'react-beginners-001', 
      title: 'Introduction to React',
      type: 'lesson',
      order: 1,
      duration: 40,
      content: 'What is React and why use it for building user interfaces.',
      videoUrl: 'https://www.youtube.com/watch?v=Ke90Tje7VS0',
      isRequired: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ],
  chapters: [],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
};

async function cleanupExistingData() {
  try {
    console.log('🧹 Cleaning up existing course data...');
    
    // Get all existing courses
    const coursesSnapshot = await getDocs(collection(db, COLLECTIONS.COURSES));
    
    if (coursesSnapshot.empty) {
      console.log('✅ No existing courses to cleanup');
      return;
    }
    
    console.log(`🗑️ Removing ${coursesSnapshot.size} existing course(s)...`);
    
    // Delete all existing courses
    const deletePromises = coursesSnapshot.docs.map(doc => deleteDoc(doc.ref));
    await Promise.all(deletePromises);
    
    console.log('✅ Existing courses cleaned up successfully');
  } catch (error) {
    console.warn('⚠️ Warning: Could not cleanup existing data:', error.message);
    // Don't fail the seeding process for cleanup issues
  }
}

async function seedDatabase() {
  try {
    // Clean up any existing problematic data first
    await cleanupExistingData();
    
    // Create admin user
    console.log('👤 Creating admin user...');
    await setDoc(doc(db, COLLECTIONS.USERS, USER_UID), adminUser);
    console.log('✅ Admin user created successfully');

    // Create sample courses
    console.log('📚 Creating JavaScript course...');
    await setDoc(doc(db, COLLECTIONS.COURSES, 'js-fundamentals-001'), sampleCourse);
    console.log('✅ JavaScript course created successfully');

    console.log('⚛️ Creating React course...');
    await setDoc(doc(db, COLLECTIONS.COURSES, 'react-beginners-001'), reactCourse);
    console.log('✅ React course created successfully');

    console.log('🎉 Database seeding completed successfully!');

  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
}

// Run the seeding
seedDatabase();