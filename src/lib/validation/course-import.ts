/**
 * Course Import Validation Schema
 * Validates course data from JSON/YAML files for bulk import
 * 
 * v1.6.0: Flattened quiz structure - quiz fields directly on lesson, no wrapper
 * Duration format: Xm (minutes) or Xh (hours) - e.g., "30m", "2h", "1.5h"
 */

import { z } from 'zod'

// Duration regex pattern: Xm or Xh (with optional decimal)
// Valid: 30m, 2h, 1.5h, 90m
// Invalid: 30, 2 hours, 30 min
const durationPattern = /^\d+(\.\d+)?[mh]$/i
const durationSchema = z.string().regex(durationPattern, 'Duration must be in format: Xm or Xh (e.g., "30m", "2h", "1.5h")')

// Matching pair schema
const matchingPairSchema = z.object({
	left: z.string(),
	right: z.string()
})

// Quiz Question schema for import - user-friendly format
const quizQuestionImportSchema = z.discriminatedUnion('type', [
	// Multiple choice
	z.object({
		id: z.string(),
		type: z.literal('multiple-choice'),
		question: z.string().min(1, 'Question is required'),
		options: z.array(z.string()).min(2, 'Must have at least 2 options'),
		correctAnswer: z.number().min(0, 'Correct answer index must be non-negative'),
		explanation: z.string(),
		points: z.number().min(0, 'Points must be non-negative')
	}),
	// True/False
	z.object({
		id: z.string(),
		type: z.literal('true-false'),
		question: z.string().min(1, 'Question is required'),
		correctAnswer: z.boolean(),
		explanation: z.string(),
		points: z.number().min(0, 'Points must be non-negative')
	}),
	// Multiple select
	z.object({
		id: z.string(),
		type: z.literal('multiple-select'),
		question: z.string().min(1, 'Question is required'),
		options: z.array(z.string()).min(2, 'Must have at least 2 options'),
		correctAnswers: z.array(z.number()).min(1, 'Must have at least one correct answer'),
		explanation: z.string(),
		points: z.number().min(0, 'Points must be non-negative')
	}),
	// Fill in the blank
	z.object({
		id: z.string(),
		type: z.literal('fill-blank'),
		question: z.string().min(1, 'Question is required'),
		correctAnswer: z.string().min(1, 'Correct answer is required'),
		caseSensitive: z.boolean().optional(),
		explanation: z.string(),
		points: z.number().min(0, 'Points must be non-negative')
	}),
	// Ordering
	z.object({
		id: z.string(),
		type: z.literal('ordering'),
		question: z.string().min(1, 'Question is required'),
		items: z.array(z.string()).min(2, 'Must have at least 2 items'),
		correctOrder: z.array(z.number()).min(2, 'Must specify correct order'),
		explanation: z.string(),
		points: z.number().min(0, 'Points must be non-negative')
	}),
	// Matching
	z.object({
		id: z.string(),
		type: z.literal('matching'),
		question: z.string().min(1, 'Question is required'),
		pairs: z.array(matchingPairSchema).min(2, 'Must have at least 2 pairs'),
		explanation: z.string(),
		points: z.number().min(0, 'Points must be non-negative')
	})
])

// Lesson type enum - matches JSON schema
const lessonTypeSchema = z.enum(['lesson', 'quiz'])

// Lesson schema for import - user-friendly format
// v1.6.0: Quiz fields are flattened directly onto lesson (no wrapper)
const lessonImportSchema = z
	.object({
		title: z.string().min(1, 'Lesson title is required').max(200, 'Title cannot exceed 200 characters'),
		description: z.string().max(500, 'Description cannot exceed 500 characters').optional(),
		type: lessonTypeSchema.optional(), // Optional - inferred from content/questions
		duration: durationSchema, // Format: "30m", "2h", "1.5h"
		
		// Lesson-specific fields
		content: z.string().optional(),
		videoUrl: z.string().url('Valid video URL required').optional(),
		
		// Quiz-specific fields (flattened - no wrapper)
		questions: z.array(quizQuestionImportSchema).optional(),
		instructions: z.string().optional(),
		timeLimit: z.number().positive('Time limit must be positive').optional(),
		passingScore: z.number().min(0).max(100).default(70),
		allowMultipleAttempts: z.boolean().default(true),
		maxAttempts: z.number().positive().optional(),
		showCorrectAnswers: z.boolean().default(true),
		showExplanations: z.boolean().default(true),
		randomizeQuestions: z.boolean().default(false),
		randomizeOptions: z.boolean().default(false),
		allowReview: z.boolean().default(true)
	})
	.refine(
		(data) => {
			// Can't have both content AND questions
			if (data.questions && data.content) {
				return false
			}
			return true
		},
		{
			message: 'Lesson cannot have both content and questions',
			path: ['content']
		}
	)
	.refine(
		(data) => {
			// If type is 'quiz', must have questions
			if (data.type === 'quiz' && (!data.questions || data.questions.length === 0)) {
				return false
			}
			return true
		},
		{
			message: 'Quiz lessons must have at least one question',
			path: ['questions']
		}
	)

// Main course import schema - user-friendly format
export const courseImportSchema = z
	.object({
		// Basic information
		title: z.string().min(1, 'Course title is required').max(200, 'Title cannot exceed 200 characters'),
		description: z
			.string()
			.min(10, 'Description must be at least 10 characters')
			.max(2000, 'Description cannot exceed 2000 characters'),
		category: z.string().min(1, 'Category is required'),
		difficulty: z.enum(['Beginner', 'Intermediate', 'Advanced']),
		duration: durationSchema, // Format: "40h", "2h"
		thumbnail: z.string().url('Valid thumbnail URL required').optional(),

		// Settings
		level: z.enum(['free', 'premium']),
		price: z.number().min(0, 'Price cannot be negative').optional(),
		currency: z.string().length(3, 'Currency must be 3 characters (ISO code)').default('USD'),
		isPublished: z.boolean().default(false),
		isFeatured: z.boolean().default(false),

		// Metadata
		tags: z.array(z.string().min(1)).max(10, 'Cannot have more than 10 tags').default([]),
		prerequisites: z.array(z.string()).default([]),
		learningOutcomes: z.array(z.string().min(1)).max(10, 'Cannot have more than 10 learning outcomes').default([]),

		// Lessons (nested)
		lessons: z.array(lessonImportSchema).min(1, 'Course must have at least one lesson')
	})
	.refine(
		(data) => {
			// Validate premium courses have price
			if (data.level === 'premium') {
				return data.price !== undefined && data.price > 0
			}
			return true
		},
		{
			message: 'Premium courses must have a positive price',
			path: ['price']
		}
	)
	.refine(
		(data) => {
			// Validate currency is set for paid courses
			if (data.price && data.price > 0) {
				return data.currency !== undefined
			}
			return true
		},
		{
			message: 'Paid courses must specify currency',
			path: ['currency']
		}
	)

// Type exports
export type CourseImportData = z.infer<typeof courseImportSchema>
export type LessonImportData = z.infer<typeof lessonImportSchema>
export type QuizQuestionImportData = z.infer<typeof quizQuestionImportSchema>

// Duration validation helper for UI
export const DURATION_PATTERN = durationPattern
export const DURATION_ERROR_MESSAGE = 'Duration must be in format: Xm or Xh (e.g., "30m", "2h", "1.5h")'

/**
 * Validate duration format
 * @param duration - Duration string to validate
 * @returns true if valid, false otherwise
 */
export function isValidDuration(duration: string): boolean {
	return durationPattern.test(duration)
}
