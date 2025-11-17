/**
 * Firebase Mocking Utilities for Testing
 * Provides mock implementations of Firestore functions and data factories
 */

import { vi } from 'vitest'
import type { Course, User, Enrollment, UserProgress } from '$lib/types'

// Mock Firestore Timestamp
export const mockTimestamp = {
	toDate: () => new Date('2024-01-01T00:00:00.000Z'),
	toJSON: () => '2024-01-01T00:00:00.000Z',
	seconds: 1704067200,
	nanoseconds: 0
}

// Mock Firestore Document Reference
export const mockDocRef = {
	id: 'mock-doc-id',
	path: 'collection/mock-doc-id',
	parent: { id: 'collection' }
}

// Mock Firestore Document Snapshot
export const createMockDocSnap = (data: any, id = 'mock-id', exists = true) => ({
	id,
	exists: () => exists,
	data: () => exists ? { ...data, id } : undefined,
	get: (field: string) => exists ? data[field] : undefined,
	ref: { ...mockDocRef, id }
})

// Mock Firestore Query Snapshot
export const createMockQuerySnap = (docs: any[], empty = false) => ({
	empty,
	size: docs.length,
	docs: docs.map((data, index) => createMockDocSnap(data, `doc-${index}`)),
	forEach: (callback: (doc: any) => void) => docs.forEach((data, index) => 
		callback(createMockDocSnap(data, `doc-${index}`))
	)
})

// Mock Firestore Functions
export const mockFirestore = {
	collection: vi.fn(),
	doc: vi.fn(),
	getDoc: vi.fn(),
	getDocs: vi.fn(),
	addDoc: vi.fn(),
	updateDoc: vi.fn(),
	deleteDoc: vi.fn(),
	query: vi.fn(),
	where: vi.fn(),
	orderBy: vi.fn(),
	limit: vi.fn(),
	startAfter: vi.fn(),
	serverTimestamp: vi.fn(() => mockTimestamp),
	increment: vi.fn((n) => ({ __increment: n })),
	arrayUnion: vi.fn((items) => ({ __arrayUnion: items })),
	arrayRemove: vi.fn((items) => ({ __arrayRemove: items }))
}

// Data Factories for Test Objects

export const createMockUser = (overrides: Partial<User> = {}): User => ({
	id: 'user-123',
	email: 'test@example.com',
	displayName: 'Test User',
	photoURL: null,
	emailVerified: true,
	createdAt: '2024-01-01T00:00:00.000Z',
	lastLoginAt: '2024-01-01T00:00:00.000Z',
	role: 'student',
	enrolledCourses: [],
	completedCourses: [],
	achievements: [],
	totalPoints: 0,
	streakDays: 0,
	preferences: {
		notifications: true,
		theme: 'system',
		language: 'en'
	},
	...overrides
})

export const createMockCourse = (overrides: Partial<Course> = {}): Course => ({
	id: 'course-123',
	title: 'Test Course',
	description: 'A test course for learning',
	instructor: 'Test Instructor',
	instructorId: 'instructor-123',
	thumbnail: 'https://example.com/thumb.jpg',
	category: 'Programming',
	difficulty: 'Beginner',
	duration: '4 weeks',
	enrolled: 0,
	rating: 0,
	ratingCount: 0,
	lessons: [],
	tags: ['test', 'programming'],
	isPublished: true,
	isFeatured: false,
	level: 'free',
	prerequisites: [],
	learningOutcomes: ['Learn testing', 'Understand mocks'],
	createdAt: '2024-01-01T00:00:00.000Z',
	updatedAt: '2024-01-01T00:00:00.000Z',
	publishedAt: '2024-01-01T00:00:00.000Z',
	...overrides
})

export const createMockEnrollment = (overrides: Partial<Enrollment> = {}): Enrollment => ({
	id: 'enrollment-123',
	userId: 'user-123',
	courseId: 'course-123',
	enrolledAt: '2024-01-01T00:00:00.000Z',
	status: 'enrolled',
	completedAt: undefined,
	certificateIssued: false,
	certificateUrl: undefined,
	enrollmentSource: 'direct',
	paymentStatus: undefined,
	notes: undefined,
	...overrides
})

export const createMockProgress = (overrides: Partial<UserProgress> = {}): UserProgress => ({
	id: 'progress-123',
	userId: 'user-123',
	courseId: 'course-123',
	enrolledAt: '2024-01-01T00:00:00.000Z',
	startedAt: '2024-01-01T00:00:00.000Z',
	completedAt: undefined,
	lastAccessedAt: '2024-01-01T00:00:00.000Z',
	completedLessons: [],
	currentChapter: undefined,
	currentLesson: undefined,
	progressPercentage: 0,
	totalTimeSpent: 0,
	sessionCount: 1,
	averageSessionTime: 0,
	quizScores: {},
	quizAttempts: {},
	averageQuizScore: 0,
	achievements: [],
	totalPoints: 0,
	streakDays: 0,
	lastActiveDate: '2024-01-01',
	...overrides
})

// Helper to reset all Firebase mocks
export const resetFirebaseMocks = () => {
	Object.values(mockFirestore).forEach(mock => {
		if (typeof mock === 'function' && 'mockReset' in mock) {
			mock.mockReset()
		}
	})
}

// Helper to setup successful Firebase operations
export const setupSuccessfulFirestoreOperations = () => {
	mockFirestore.addDoc.mockResolvedValue(mockDocRef)
	mockFirestore.updateDoc.mockResolvedValue(undefined)
	mockFirestore.deleteDoc.mockResolvedValue(undefined)
	mockFirestore.getDoc.mockResolvedValue(createMockDocSnap({}, 'test-id', true))
	mockFirestore.getDocs.mockResolvedValue(createMockQuerySnap([]))
}

// Helper to setup Firebase error scenarios
export const setupFirestoreError = (operation: keyof typeof mockFirestore, error: Error) => {
	const mock = mockFirestore[operation]
	if (typeof mock === 'function' && 'mockRejectedValue' in mock) {
		mock.mockRejectedValue(error)
	}
}