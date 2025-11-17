export interface User {
	id: string
	email: string
	displayName: string | null
	photoURL: string | null
	emailVerified: boolean
	createdAt: string
	lastLoginAt: string
}

export interface Course {
	id: string
	title: string
	description: string
	instructor: string
	thumbnail: string
	category: string
	difficulty: 'Beginner' | 'Intermediate' | 'Advanced'
	duration: string
	enrolled: number
	rating: number
	lessons: Lesson[]
	createdAt: string
	updatedAt: string
}

export interface Lesson {
	id: string
	courseId: string
	title: string
	type: 'lesson' | 'quiz'
	content?: string
	quiz?: Quiz
	order: number
	duration?: string
	completed?: boolean
}

export interface Quiz {
	id: string
	title: string
	questions: QuizQuestion[]
	timeLimit?: number
	passingScore: number
}

export interface QuizQuestion {
	id: string
	type: 'multiple_choice' | 'true_false' | 'short_answer'
	question: string
	options?: string[]
	correctAnswer: string | string[]
	explanation?: string
}

export interface UserProgress {
	userId: string
	courseId: string
	completedLessons: string[]
	currentLesson: string | null
	progressPercentage: number
	lastAccessedAt: string
	startedAt: string
	completedAt?: string
}

export interface Enrollment {
	id: string
	userId: string
	courseId: string
	enrolledAt: string
	status: 'active' | 'completed' | 'dropped'
}