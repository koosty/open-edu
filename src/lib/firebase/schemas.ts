/**
 * Centralized Firebase Schemas
 * All Zod validation schemas for Firestore collections
 * Single source of truth for data structure validation
 */

import { z } from 'zod'
import { COLLECTIONS } from './collections'

// Base schemas for reuse
export const timestampSchema = z.string().datetime()
export const idSchema = z.string().min(1)
export const urlSchema = z.string().url()

// User schema
export const userSchema = z.object({
	id: idSchema,
	email: z.string().email(),
	displayName: z.string(),
	role: z.enum(['student', 'instructor', 'admin']),
	enrolledCourses: z.array(idSchema),
	completedCourses: z.array(idSchema),
	achievements: z.array(z.string()),
	totalPoints: z.number().min(0),
	streakDays: z.number().min(0),
	emailVerified: z.boolean(),
	createdAt: timestampSchema,
	lastLoginAt: timestampSchema.optional(),
	preferences: z.object({
		emailNotifications: z.boolean(),
		language: z.string(),
	}),
})

// Course Progress schema
export const courseProgressSchema = z.object({
	id: idSchema,
	userId: idSchema,
	courseId: idSchema,
	completedLessons: z.array(idSchema),
	progressPercentage: z.number().min(0).max(100),
	totalTimeSpent: z.number().min(0),
	quizScores: z.record(z.string(), z.number()),
	quizAttempts: z.record(z.string(), z.number()),
	lastActiveDate: timestampSchema,
	startedAt: timestampSchema.optional(),
	completedAt: timestampSchema.optional(),
	sessionCount: z.number().min(0),
	achievements: z.array(z.string()),
	streakDays: z.number().min(0),
	createdAt: timestampSchema,
	updatedAt: timestampSchema,
})

// Enrollment schema
export const enrollmentSchema = z.object({
	id: idSchema,
	userId: idSchema,
	courseId: idSchema,
	status: z.enum(['active', 'completed', 'dropped', 'paused']),
	enrolledAt: timestampSchema,
	completedAt: timestampSchema.optional(),
	dropReason: z.string().optional(),
	certificateIssued: z.boolean(),
	createdAt: timestampSchema,
	updatedAt: timestampSchema,
})

// Quiz attempt schema
export const quizAttemptSchema = z.object({
	id: idSchema,
	userId: idSchema,
	courseId: idSchema,
	lessonId: idSchema,
	quizId: idSchema,
	score: z.number().min(0).max(100),
	answers: z.record(z.string(), z.union([z.string(), z.number()])),
	timeSpent: z.number().min(0),
	submittedAt: timestampSchema,
	passed: z.boolean(),
	attemptNumber: z.number().min(1),
})

// Achievement schema
export const achievementSchema = z.object({
	id: idSchema,
	userId: idSchema,
	type: z.enum(['course_completion', 'quiz_score', 'streak', 'participation']),
	title: z.string(),
	description: z.string(),
	icon: z.string(),
	earnedAt: timestampSchema,
	relatedCourseId: idSchema.optional(),
	points: z.number().min(0),
})

// Notification schema
export const notificationSchema = z.object({
	id: idSchema,
	userId: idSchema,
	type: z.enum(['course_update', 'achievement', 'reminder', 'system']),
	title: z.string(),
	message: z.string(),
	read: z.boolean(),
	actionUrl: z.string().optional(),
	relatedEntityId: idSchema.optional(),
	createdAt: timestampSchema,
	readAt: timestampSchema.optional(),
})

// Re-export course schemas from existing validation file
export {
	courseSchema,
	lessonSchema,
	quizSchema,
	quizQuestionSchema,
	chapterSchema,
	createCourseSchema,
	updateCourseSchema,
	createLessonSchema,
	updateLessonSchema,
} from '$lib/validation/course'

// Export all type definitions
export type User = z.infer<typeof userSchema>
export type CourseProgress = z.infer<typeof courseProgressSchema>
export type Enrollment = z.infer<typeof enrollmentSchema>
export type QuizAttempt = z.infer<typeof quizAttemptSchema>
export type Achievement = z.infer<typeof achievementSchema>
export type Notification = z.infer<typeof notificationSchema>

// Schema mapping for collections - used by validation scripts
export const COLLECTION_SCHEMAS = {
	[COLLECTIONS.USERS]: userSchema,
	[COLLECTIONS.COURSE_PROGRESS]: courseProgressSchema,
	[COLLECTIONS.ENROLLMENTS]: enrollmentSchema,
	[COLLECTIONS.QUIZ_ATTEMPTS]: quizAttemptSchema,
	[COLLECTIONS.ACHIEVEMENTS]: achievementSchema,
	[COLLECTIONS.NOTIFICATIONS]: notificationSchema,
	// Note: COURSES schema is complex and handled separately via course.ts
} as const

// Extract field names for rules generation
export const SCHEMA_FIELDS = {
	[COLLECTIONS.USERS]: Object.keys(userSchema.shape),
	[COLLECTIONS.COURSE_PROGRESS]: Object.keys(courseProgressSchema.shape),
	[COLLECTIONS.ENROLLMENTS]: Object.keys(enrollmentSchema.shape),
	[COLLECTIONS.QUIZ_ATTEMPTS]: Object.keys(quizAttemptSchema.shape),
	[COLLECTIONS.ACHIEVEMENTS]: Object.keys(achievementSchema.shape),
	[COLLECTIONS.NOTIFICATIONS]: Object.keys(notificationSchema.shape),
} as const

// Required field validation for rules
export const REQUIRED_FIELDS = {
	[COLLECTIONS.USERS]: ['id', 'email', 'role'],
	[COLLECTIONS.COURSE_PROGRESS]: ['userId', 'courseId', 'progressPercentage'],
	[COLLECTIONS.ENROLLMENTS]: ['userId', 'courseId', 'status'],
	[COLLECTIONS.QUIZ_ATTEMPTS]: ['userId', 'courseId', 'lessonId', 'score'],
	[COLLECTIONS.ACHIEVEMENTS]: ['userId', 'type', 'title'],
	[COLLECTIONS.NOTIFICATIONS]: ['userId', 'type', 'title', 'message'],
} as const