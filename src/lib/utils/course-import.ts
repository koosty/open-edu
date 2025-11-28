/**
 * Course Import Utilities
 * Parse and validate course data from JSON/YAML files
 * 
 * v1.6.0: Updated duration format to Xm/Xh
 */

import yaml from 'yaml'
import { courseImportSchema, type CourseImportData } from '$lib/validation/course-import'

export type ImportFormat = 'json' | 'yaml'

export interface ParseResult {
	data: CourseImportData
	format: ImportFormat
}

/**
 * Parse duration string to minutes
 * v1.6.0: New format - Xm (minutes) or Xh (hours)
 * 
 * @param duration - Duration string (e.g., "30m", "2h", "1.5h")
 * @returns Duration in minutes
 * 
 * @example
 * parseDurationToMinutes("30m") // 30
 * parseDurationToMinutes("2h")  // 120
 * parseDurationToMinutes("1.5h") // 90
 */
export function parseDurationToMinutes(duration: string): number {
	const cleaned = duration.toLowerCase().trim()
	
	// Match new format: Xm or Xh
	const match = cleaned.match(/^(\d+(?:\.\d+)?)([mh])$/)
	if (match) {
		const value = parseFloat(match[1])
		const unit = match[2]
		
		if (unit === 'h') {
			return Math.round(value * 60)
		}
		return Math.round(value)
	}
	
	// Fallback: try to extract just the number (assume minutes)
	const numMatch = cleaned.match(/(\d+(?:\.\d+)?)/)
	if (numMatch) {
		return Math.round(parseFloat(numMatch[1]))
	}
	
	// Default fallback
	return 10
}

/**
 * Format minutes to duration string
 * @param minutes - Duration in minutes
 * @returns Formatted duration string (e.g., "30m", "2h", "1.5h")
 */
export function formatDuration(minutes: number): string {
	if (minutes >= 60 && minutes % 60 === 0) {
		return `${minutes / 60}h`
	}
	if (minutes >= 60) {
		const hours = minutes / 60
		// Use hours if it's a clean decimal
		if (hours === Math.round(hours * 10) / 10) {
			return `${hours}h`
		}
	}
	return `${minutes}m`
}

/**
 * Parse course file (JSON or YAML)
 */
export async function parseCourseFile(file: File): Promise<ParseResult> {
	const content = await file.text()
	const extension = file.name.split('.').pop()?.toLowerCase()

	let data: unknown
	let format: ImportFormat

	try {
		if (extension === 'json') {
			data = JSON.parse(content)
			format = 'json'
		} else if (extension === 'yaml' || extension === 'yml') {
			data = yaml.parse(content)
			format = 'yaml'
		} else {
			throw new Error('Unsupported file format. Please use .json, .yaml, or .yml')
		}

		// Validate with Zod
		const validated = courseImportSchema.parse(data)
		return { data: validated, format }
	} catch (err) {
		if (err instanceof Error) {
			if (err.name === 'ZodError') {
				// Format Zod validation errors nicely
				const zodError = err as { errors?: Array<{ path: string[]; message: string }> }
				const firstError = zodError.errors?.[0]
				if (firstError) {
					throw new Error(`Validation error: ${firstError.path.join('.')}: ${firstError.message}`)
				}
			}
			throw new Error(`Failed to parse ${extension?.toUpperCase()}: ${err.message}`)
		}
		throw new Error('Unknown error parsing file')
	}
}

/**
 * Generate a template course structure in user-friendly format
 * v1.6.0: Uses flattened quiz structure and new duration format (Xm/Xh)
 */
export function generateCourseTemplate(format: ImportFormat): string {
	// Template that matches v1.6.0 flattened quiz schema
	const template = {
		title: 'Course Title',
		description: 'A comprehensive description of what students will learn in this course.',
		category: 'Programming',
		difficulty: 'Beginner',
		duration: '40h', // v1.6.0: New format - Xm or Xh
		thumbnail: 'https://placehold.co/400x225/6366f1/white?text=Course+Thumbnail',
		level: 'free',
		tags: ['tag1', 'tag2'],
		prerequisites: ['Basic computer skills'],
		learningOutcomes: ['Learn concept A', 'Master skill B'],
		isPublished: false,
		isFeatured: false,
		lessons: [
			{
				title: 'Introduction Lesson',
				type: 'lesson',
				duration: '10m', // v1.6.0: New format
				content: '# Lesson Content\n\nYour markdown content here...'
			},
			{
				// v1.6.0: Quiz fields are flattened directly on lesson (no wrapper)
				title: 'Assessment Quiz',
				type: 'quiz',
				duration: '15m', // v1.6.0: New format
				description: 'Test your understanding of the concepts',
				instructions: 'Read each question carefully before answering.',
				passingScore: 70,
				timeLimit: 900, // seconds
				allowMultipleAttempts: true,
				maxAttempts: 3,
				showCorrectAnswers: true,
				showExplanations: true,
				randomizeQuestions: false,
				randomizeOptions: false,
				allowReview: true,
				questions: [
					{
						id: 'q1',
						type: 'multiple-choice',
						question: 'What is the correct answer?',
						options: ['Option A', 'Option B', 'Option C'],
						correctAnswer: 1,
						points: 10,
						explanation: 'Explanation of the correct answer'
					},
					{
						id: 'q2',
						type: 'true-false',
						question: 'This is a true/false question',
						correctAnswer: true,
						points: 5,
						explanation: 'Explanation of the answer'
					},
					{
						id: 'q3',
						type: 'multiple-select',
						question: 'Select all that apply',
						options: ['A', 'B', 'C', 'D'],
						correctAnswers: [0, 2],
						points: 15,
						explanation: 'A and C are correct'
					},
					{
						id: 'q4',
						type: 'fill-blank',
						question: 'The answer is ___',
						correctAnswer: 'answer',
						caseSensitive: false,
						points: 10,
						explanation: 'The correct answer is "answer"'
					},
					{
						id: 'q5',
						type: 'ordering',
						question: 'Put these in order',
						items: ['First', 'Second', 'Third'],
						correctOrder: [0, 1, 2],
						points: 20,
						explanation: 'The correct order is First, Second, Third'
					},
					{
						id: 'q6',
						type: 'matching',
						question: 'Match the items',
						pairs: [
							{ left: 'A', right: '1' },
							{ left: 'B', right: '2' }
						],
						points: 20,
						explanation: 'A matches with 1, B matches with 2'
					}
				]
			}
		]
	}

	if (format === 'json') {
		return JSON.stringify(template, null, 2)
	} else {
		return yaml.stringify(template)
	}
}

/**
 * Download template file
 */
export function downloadTemplate(format: ImportFormat): void {
	const content = generateCourseTemplate(format)
	const blob = new Blob([content], { type: format === 'json' ? 'application/json' : 'text/yaml' })
	const url = URL.createObjectURL(blob)
	const a = document.createElement('a')
	a.href = url
	a.download = `course-template.${format === 'json' ? 'json' : 'yaml'}`
	document.body.appendChild(a)
	a.click()
	document.body.removeChild(a)
	URL.revokeObjectURL(url)
}

/**
 * Validate course data
 */
export function validateCourseData(data: unknown): CourseImportData {
	return courseImportSchema.parse(data)
}
