/**
 * Firebase collection names for seeding script
 * 
 * ⚠️ IMPORTANT: These values MUST match the centralized collections
 * defined in src/lib/firebase/collections.ts
 * 
 * Any changes to collection names must be updated in both files!
 * 
 * Environment Variables Required for automated-seed.mjs:
 * - ADMIN_USER_UID: Firebase Auth UID for the admin user
 * - ADMIN_USER_EMAIL: Email address for the admin user  
 * - ADMIN_USER_DISPLAY_NAME: Display name for the admin user (optional, defaults to 'Admin User')
 */

export const COLLECTIONS = {
	USERS: 'users',
	COURSES: 'courses', 
	ENROLLMENTS: 'enrollments',
	COURSE_PROGRESS: 'courseProgress',
	LESSONS: 'lessons',
	QUIZ_ATTEMPTS: 'quiz-attempts',
	NOTIFICATIONS: 'notifications',
	ANALYTICS: 'analytics',
	ACHIEVEMENTS: 'achievements',
	CERTIFICATES: 'certificates'
}

// Legacy aliases for backward compatibility during migration
export const LEGACY_COLLECTIONS = {
	users: COLLECTIONS.USERS,
	courses: COLLECTIONS.COURSES,
	enrollments: COLLECTIONS.ENROLLMENTS,
	progress: COLLECTIONS.COURSE_PROGRESS
}