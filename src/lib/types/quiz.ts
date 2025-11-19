/**
 * Quiz System Types for Open-EDU v1.3.0
 * Comprehensive quiz and assessment types
 */

// ============================================
// Core Quiz Types
// ============================================

export interface Quiz {
	id: string
	lessonId: string
	courseId: string
	title: string
	description?: string
	instructions?: string
	questions: QuizQuestion[]
	
	// Settings
	timeLimit?: number // Time limit in minutes
	passingScore: number // Percentage required to pass (0-100)
	allowMultipleAttempts: boolean
	maxAttempts?: number // Max attempts allowed, undefined = unlimited
	showCorrectAnswers: boolean // Show correct answers after submission
	showExplanations: boolean // Show explanations after submission
	randomizeQuestions: boolean // Randomize question order
	randomizeOptions: boolean // Randomize option order
	allowReview: boolean // Allow reviewing quiz after completion
	
	// Metadata
	isPublished: boolean
	createdBy: string // Instructor user ID
	createdAt: string
	updatedAt: string
	publishedAt?: string
}

// ============================================
// Question Types
// ============================================

export type QuestionType = 
	| 'multiple_choice' 
	| 'multiple_select' 
	| 'true_false' 
	| 'short_answer'
	| 'essay'
	| 'fill_blank'

export interface QuizQuestion {
	id: string
	type: QuestionType
	question: string // Question text (markdown supported)
	options?: QuestionOption[] // For multiple choice/select
	correctAnswer: string | number | string[] // Varies by question type
	explanation?: string // Explanation shown after answering
	points: number // Points awarded for correct answer
	order: number
	
	// Optional enhancements
	image?: string // Optional image URL for question
	hint?: string // Hint text (can be revealed by student)
	tags?: string[] // For question categorization
	difficulty?: 'easy' | 'medium' | 'hard'
	
	// For short answer/essay
	caseSensitive?: boolean // For short answer comparison
	acceptableAnswers?: string[] // Alternative correct answers
	maxLength?: number // Max characters for essay
	minLength?: number // Min characters for essay
}

export interface QuestionOption {
	id: string
	text: string
	isCorrect: boolean
	explanation?: string // Optional explanation for this specific option
}

// ============================================
// Quiz Attempt Types
// ============================================

export interface QuizAttempt {
	id: string
	quizId: string
	lessonId: string
	courseId: string
	userId: string
	
	// Attempt details
	attemptNumber: number // Which attempt is this (1, 2, 3, etc.)
	startedAt: string
	submittedAt?: string
	timeSpent: number // Time spent in seconds
	
	// Answers and scoring
	answers: QuizAnswer[]
	score: number // Percentage score (0-100)
	pointsEarned: number // Total points earned
	totalPoints: number // Total points possible
	
	// Status
	status: 'in_progress' | 'submitted' | 'graded' | 'abandoned'
	isPassed: boolean
	
	// Auto-save support
	lastSavedAt?: string
	lastQuestionIndex?: number // For resuming quiz
}

export interface QuizAnswer {
	questionId: string
	questionType: QuestionType
	answer: string | number | string[] | null // User's answer
	isCorrect: boolean
	pointsEarned: number
	pointsPossible: number
	answeredAt: string
	timeSpent?: number // Time spent on this question in seconds
}

// ============================================
// Quiz Results & Analytics
// ============================================

export interface QuizResults {
	attempt: QuizAttempt
	quiz: Quiz
	questions: QuizQuestion[]
	
	// Calculated metrics
	correctCount: number
	incorrectCount: number
	unansweredCount: number
	accuracy: number // Percentage
	
	// Performance breakdown
	questionResults: QuestionResult[]
	
	// Comparison data
	averageScore?: number // Average score for this quiz
	highestScore?: number // Highest score achieved
	attemptsCount: number // Total attempts for this user
}

export interface QuestionResult {
	question: QuizQuestion
	answer: QuizAnswer
	isCorrect: boolean
	showCorrectAnswer: boolean
	showExplanation: boolean
}

// ============================================
// Quiz Statistics (for instructors)
// ============================================

export interface QuizStatistics {
	quizId: string
	totalAttempts: number
	uniqueUsers: number
	averageScore: number
	highestScore: number
	lowestScore: number
	passRate: number // Percentage of attempts that passed
	averageTimeSpent: number // Average time in minutes
	
	// Question-level stats
	questionStats: QuestionStatistics[]
	
	// Difficulty assessment
	estimatedDifficulty: 'easy' | 'medium' | 'hard'
	
	// Last updated
	lastUpdated: string
}

export interface QuestionStatistics {
	questionId: string
	questionText: string
	totalResponses: number
	correctResponses: number
	incorrectResponses: number
	accuracy: number // Percentage
	averageTimeSpent: number // Seconds
	
	// For multiple choice - which options were selected
	optionStats?: {
		optionId: string
		optionText: string
		selectedCount: number
		percentage: number
	}[]
}

// ============================================
// Quiz Builder Types (for admin/instructor)
// ============================================

export interface QuizDraft {
	id?: string
	lessonId: string
	courseId: string
	title: string
	description?: string
	instructions?: string
	questions: QuizQuestionDraft[]
	settings: QuizSettings
	isDraft: boolean
	lastSavedAt?: string
}

export interface QuizQuestionDraft extends Omit<QuizQuestion, 'id' | 'order'> {
	id?: string // Optional for new questions
	order?: number // Auto-assigned
	tempId?: string // Temporary ID for unsaved questions
}

export interface QuizSettings {
	timeLimit?: number
	passingScore: number
	allowMultipleAttempts: boolean
	maxAttempts?: number
	showCorrectAnswers: boolean
	showExplanations: boolean
	randomizeQuestions: boolean
	randomizeOptions: boolean
	allowReview: boolean
}

// ============================================
// Validation Types
// ============================================

export interface QuizValidation {
	isValid: boolean
	errors: ValidationError[]
	warnings: ValidationWarning[]
}

export interface ValidationError {
	field: string
	message: string
	severity: 'error'
}

export interface ValidationWarning {
	field: string
	message: string
	severity: 'warning'
}

// ============================================
// Helper Types
// ============================================

export type QuizFilterOptions = {
	courseId?: string
	lessonId?: string
	createdBy?: string
	isPublished?: boolean
	difficulty?: 'easy' | 'medium' | 'hard'
}

export type QuizSortOption = 
	| 'title-asc'
	| 'title-desc'
	| 'created-asc'
	| 'created-desc'
	| 'difficulty-asc'
	| 'difficulty-desc'

export type AttemptStatus = QuizAttempt['status']
