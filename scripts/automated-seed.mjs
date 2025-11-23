#!/usr/bin/env node

/**
 * Automated Firebase Seeding Script
 * Runs with temporarily open security rules
 * Uses environment variables for Firebase configuration
 * 
 * Environment Variables:
 * - PUBLIC_FIREBASE_* - Firebase project configuration
 * - ADMIN_USER_UID - Firebase Auth UID for admin user
 * - ADMIN_USER_EMAIL - Admin user email address
 * - ADMIN_USER_DISPLAY_NAME - Admin user display name (optional)
 * - FIREBASE_DATABASE_NAME - Custom Firestore database name (optional, defaults to "(default)")
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
  } catch {
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

// Get optional database name (defaults to "(default)" if not provided)
const databaseName = getEnv('FIREBASE_DATABASE_NAME') || '(default)';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = databaseName === '(default)' 
  ? getFirestore(app) 
  : getFirestore(app, databaseName);

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
console.log(`🗄️  Database: ${databaseName}`);
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

// No sample courses - admin can create courses via the UI

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

    console.log('🎉 Database seeding completed successfully!');
    console.log('');
    console.log('📝 Note: No sample courses created.');
    console.log('   You can create courses via the admin interface at /admin/courses/new');

  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
}

// Run the seeding
seedDatabase();