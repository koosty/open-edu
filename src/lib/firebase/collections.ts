/**
 * Centralized Firebase Collection Names
 * Single source of truth for all Firestore collection names and paths
 */

export const COLLECTIONS = {
	// Core entities
	USERS: 'users',
	COURSES: 'courses',
	ENROLLMENTS: 'enrollments',
	COURSE_PROGRESS: 'courseProgress',
	
	// Learning content
	LESSONS: 'lessons', // if stored separately from courses
	QUIZ_ATTEMPTS: 'quiz-attempts',
	
	// System collections
	NOTIFICATIONS: 'notifications',
	ANALYTICS: 'analytics',
	ACHIEVEMENTS: 'achievements',
} as const

// Type for collection names - ensures type safety
export type CollectionName = typeof COLLECTIONS[keyof typeof COLLECTIONS]

// Helper paths for nested collections (if needed in future)
export const COLLECTION_PATHS = {
	userProgress: (userId: string) => `${COLLECTIONS.USERS}/${userId}/progress`,
	courseEnrollments: (courseId: string) => `${COLLECTIONS.COURSES}/${courseId}/enrollments`,
	lessonQuizzes: (courseId: string, lessonId: string) => 
		`${COLLECTIONS.COURSES}/${courseId}/lessons/${lessonId}/quizzes`,
} as const

// Validation helper to check if a string is a valid collection name
export function isValidCollectionName(name: string): name is CollectionName {
	return Object.values(COLLECTIONS).includes(name as CollectionName)
}

// Get all collection names as array (useful for validation scripts)
export const ALL_COLLECTIONS = Object.values(COLLECTIONS) as CollectionName[]