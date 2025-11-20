/**
 * Tests for AnalyticsService
 * Comprehensive test coverage for analytics aggregation and calculations
 */

import { describe, test, expect, beforeEach, vi } from 'vitest'
import { COLLECTIONS } from '$lib/firebase/collections'
import {
	createMockDocSnap,
	createMockQuerySnap,
	mockDocRef,
	mockTimestamp,
	createMockCourse,
	createMockProgress
} from '$lib/test-utils/firebase-mocks'

// Mock Firebase functions
const mockFirestore = {
	collection: vi.fn(),
	doc: vi.fn(),
	getDoc: vi.fn(),
	getDocs: vi.fn(),
	query: vi.fn(),
	where: vi.fn(),
	orderBy: vi.fn(),
	Timestamp: mockTimestamp
}

// Mock Firebase before importing service
vi.mock('firebase/firestore', () => mockFirestore)
vi.mock('$lib/firebase', () => ({ db: 'mock-db-instance' }))

// Now import the service after mocks are set up
const { AnalyticsService } = await import('$lib/services/analytics')

describe('AnalyticsService', () => {
	beforeEach(() => {
		// Reset all mocks
		Object.values(mockFirestore).forEach((mock) => {
			if (typeof mock === 'function' && 'mockReset' in mock) {
				mock.mockReset()
			}
		})

		// Setup defaults
		mockFirestore.query.mockImplementation((...args) => args)
		mockFirestore.where.mockImplementation((...args) => ({ _where: args }))
		mockFirestore.orderBy.mockImplementation((...args) => ({ _orderBy: args }))
	})

	describe('getLessonAnalytics', () => {
		test('should return analytics for a lesson with student data', async () => {
			const mockCourse = createMockCourse({
				id: 'course-123',
				lessons: [
					{
						id: 'lesson-1',
						title: 'Test Lesson',
						description: 'A test lesson',
						type: 'lesson',
						order: 1,
						duration: 30,
						isRequired: true,
						courseId: 'course-123',
						createdAt: '2024-01-01T00:00:00.000Z',
						updatedAt: '2024-01-01T00:00:00.000Z'
					}
				]
			})

			const mockProgress = [
				createMockProgress({
					userId: 'user-1',
					courseId: 'course-123',
					completedLessons: ['lesson-1']
				}),
				createMockProgress({
					userId: 'user-2',
					courseId: 'course-123',
					completedLessons: ['lesson-1']
				})
			]

			const mockReadingPositions = [
				{
					userId: 'user-1',
					lessonId: 'lesson-1',
					timeSpent: 600, // 10 minutes
					scrollPercentage: 100
				},
				{
					userId: 'user-2',
					lessonId: 'lesson-1',
					timeSpent: 300, // 5 minutes
					scrollPercentage: 75
				}
			]

			const mockNotes = [{ userId: 'user-1', lessonId: 'lesson-1' }]
			const mockBookmarks = [
				{ userId: 'user-1', lessonId: 'lesson-1' },
				{ userId: 'user-2', lessonId: 'lesson-1' }
			]

			// Setup mock responses
			mockFirestore.doc.mockReturnValue(mockDocRef)
			mockFirestore.getDoc.mockResolvedValue(createMockDocSnap(mockCourse, 'course-123'))
			mockFirestore.collection.mockReturnValue({ _collection: 'mock' })

			// Mock getDocs to return different data based on collection
			let callCount = 0
			mockFirestore.getDocs.mockImplementation(() => {
				callCount++
				if (callCount === 1) {
					// Progress query
					return Promise.resolve(createMockQuerySnap(mockProgress))
				} else if (callCount === 2) {
					// Reading positions query
					return Promise.resolve(createMockQuerySnap(mockReadingPositions))
				} else if (callCount === 3) {
					// Notes query
					return Promise.resolve(createMockQuerySnap(mockNotes))
				} else {
					// Bookmarks query
					return Promise.resolve(createMockQuerySnap(mockBookmarks))
				}
			})

			const result = await AnalyticsService.getLessonAnalytics('course-123', 'lesson-1')

			expect(result).toMatchObject({
				lessonId: 'lesson-1',
				lessonTitle: 'Test Lesson',
				courseId: 'course-123',
				uniqueStudents: 2,
				completionRate: 100,
				totalNotes: 1,
				totalBookmarks: 2
			})
			expect(result.averageTimeSpent).toBeGreaterThan(0)
			expect(result.averageScrollDepth).toBeGreaterThan(0)
		})

		test('should handle lesson with no student data', async () => {
			const mockCourse = createMockCourse({
				id: 'course-123',
				lessons: [
					{
						id: 'lesson-1',
						title: 'Empty Lesson',
						description: '',
						type: 'lesson',
						order: 1,
						duration: 30,
						isRequired: true,
						courseId: 'course-123',
						createdAt: '2024-01-01T00:00:00.000Z',
						updatedAt: '2024-01-01T00:00:00.000Z'
					}
				]
			})

			mockFirestore.doc.mockReturnValue(mockDocRef)
			mockFirestore.getDoc.mockResolvedValue(createMockDocSnap(mockCourse, 'course-123'))
			mockFirestore.collection.mockReturnValue({ _collection: 'mock' })
			mockFirestore.getDocs.mockResolvedValue(createMockQuerySnap([]))

			const result = await AnalyticsService.getLessonAnalytics('course-123', 'lesson-1')

			expect(result).toMatchObject({
				lessonId: 'lesson-1',
				lessonTitle: 'Empty Lesson',
				courseId: 'course-123',
				totalViews: 0,
				uniqueStudents: 0,
				completionRate: 0,
				averageTimeSpent: 0,
				medianTimeSpent: 0,
				averageScrollDepth: 0,
				totalNotes: 0,
				totalBookmarks: 0,
				averageNotesPerStudent: 0
			})
		})

		test('should throw error when course not found', async () => {
			mockFirestore.doc.mockReturnValue(mockDocRef)
			mockFirestore.getDoc.mockResolvedValue(createMockDocSnap({}, 'course-123', false))

			await expect(
				AnalyticsService.getLessonAnalytics('course-123', 'lesson-1')
			).rejects.toThrow('Course not found')
		})

		test('should throw error when lesson not found', async () => {
			const mockCourse = createMockCourse({
				id: 'course-123',
				lessons: []
			})

			mockFirestore.doc.mockReturnValue(mockDocRef)
			mockFirestore.getDoc.mockResolvedValue(createMockDocSnap(mockCourse, 'course-123'))

			await expect(
				AnalyticsService.getLessonAnalytics('course-123', 'lesson-1')
			).rejects.toThrow('Lesson not found')
		})
	})

	describe('getCourseAnalytics', () => {
		test('should return comprehensive course analytics', async () => {
			const eightDaysAgo = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString()
			const mockCourse = createMockCourse({
				id: 'course-123',
				lessons: [
					{
						id: 'lesson-1',
						title: 'Lesson 1',
						description: '',
						type: 'lesson',
						order: 1,
						duration: 30,
						isRequired: true,
						courseId: 'course-123',
						createdAt: '2024-01-01T00:00:00.000Z',
						updatedAt: '2024-01-01T00:00:00.000Z'
					}
				]
			})

			const mockProgress = [
				createMockProgress({
					userId: 'user-1',
					courseId: 'course-123',
					progressPercentage: 100,
					completedAt: new Date().toISOString(),
					lastAccessedAt: eightDaysAgo, // >7 days ago, not active
					totalTimeSpent: 120, // minutes
					averageSessionTime: 30
				}),
				createMockProgress({
					userId: 'user-2',
					courseId: 'course-123',
					progressPercentage: 50,
					lastAccessedAt: new Date().toISOString(), // Recent, active
					totalTimeSpent: 60,
					averageSessionTime: 20
				})
			]

			const mockEnrollments = [
				{ userId: 'user-1', courseId: 'course-123' },
				{ userId: 'user-2', courseId: 'course-123' },
				{ userId: 'user-3', courseId: 'course-123' }
			]

			mockFirestore.doc.mockReturnValue(mockDocRef)
			mockFirestore.getDoc.mockResolvedValue(createMockDocSnap(mockCourse, 'course-123'))
			mockFirestore.collection.mockReturnValue({ _collection: 'mock' })

			// Mock sequential getDocs calls
			let callCount = 0
			mockFirestore.getDocs.mockImplementation(() => {
				callCount++
				if (callCount === 1) return Promise.resolve(createMockQuerySnap(mockProgress))
				if (callCount === 2) return Promise.resolve(createMockQuerySnap(mockEnrollments))
				// Remaining calls for lesson analytics
				return Promise.resolve(createMockQuerySnap([]))
			})

			const result = await AnalyticsService.getCourseAnalytics('course-123')

			expect(result).toMatchObject({
				courseId: 'course-123',
				courseTitle: 'Test Course',
				totalEnrolled: 3,
				activeStudents: 1 // Only user-2 is active (last 7 days)
			})
			expect(result.completionRate).toBeGreaterThanOrEqual(0)
			expect(result.averageCourseProgress).toBeGreaterThan(0)
			expect(result.averageCourseTime).toBeGreaterThan(0)
			expect(result.lessonsAnalytics).toHaveLength(1)
		})

		test('should handle course with no enrollments', async () => {
			const mockCourse = createMockCourse({
				id: 'course-123',
				lessons: []
			})

			mockFirestore.doc.mockReturnValue(mockDocRef)
			mockFirestore.getDoc.mockResolvedValue(createMockDocSnap(mockCourse, 'course-123'))
			mockFirestore.collection.mockReturnValue({ _collection: 'mock' })
			mockFirestore.getDocs.mockResolvedValue(createMockQuerySnap([]))

			const result = await AnalyticsService.getCourseAnalytics('course-123')

			expect(result).toMatchObject({
				courseId: 'course-123',
				totalEnrolled: 0,
				activeStudents: 0,
				completionRate: 0,
				averageCourseProgress: 0,
				averageCourseTime: 0,
				medianCourseTime: 0,
				averageSessionDuration: 0,
				lessonsAnalytics: [],
				mostPopularLessons: [],
				leastEngagingLessons: []
			})
		})

		test('should throw error when course not found', async () => {
			mockFirestore.doc.mockReturnValue(mockDocRef)
			mockFirestore.getDoc.mockResolvedValue(createMockDocSnap({}, 'course-123', false))

			await expect(AnalyticsService.getCourseAnalytics('course-123')).rejects.toThrow(
				'Course not found'
			)
		})
	})

	describe('getStudentEngagement', () => {
		test('should return engagement summaries for all students', async () => {
			const mockCourse = createMockCourse({
				id: 'course-123',
				lessons: [
					{
						id: 'lesson-1',
						title: 'Lesson 1',
						description: '',
						type: 'lesson',
						order: 1,
						duration: 30,
						isRequired: true,
						courseId: 'course-123',
						createdAt: '2024-01-01T00:00:00.000Z',
						updatedAt: '2024-01-01T00:00:00.000Z'
					},
					{
						id: 'lesson-2',
						title: 'Lesson 2',
						description: '',
						type: 'lesson',
						order: 2,
						duration: 30,
						isRequired: true,
						courseId: 'course-123',
						createdAt: '2024-01-01T00:00:00.000Z',
						updatedAt: '2024-01-01T00:00:00.000Z'
					}
				]
			})

			const recentDate = new Date().toISOString()
			const oldDate = new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString()

			const mockProgress = [
				createMockProgress({
					userId: 'user-1',
					courseId: 'course-123',
					progressPercentage: 75,
					completedLessons: ['lesson-1'],
					totalTimeSpent: 120,
					lastAccessedAt: recentDate
				}),
				createMockProgress({
					userId: 'user-2',
					courseId: 'course-123',
					progressPercentage: 25,
					completedLessons: [],
					totalTimeSpent: 30,
					lastAccessedAt: oldDate
				})
			]

			const mockUsers = [
				{ id: 'user-1', displayName: 'Alice', email: 'alice@example.com' },
				{ id: 'user-2', displayName: 'Bob', email: 'bob@example.com' }
			]

			mockFirestore.doc.mockImplementation((db, coll, id) => {
				if (coll === COLLECTIONS.COURSES) {
					return { _ref: 'course', id }
				}
				return { _ref: 'user', id }
			})

			let courseGetDocCalled = false
			mockFirestore.getDoc.mockImplementation((ref) => {
				if (ref._ref === 'course') {
					return Promise.resolve(createMockDocSnap(mockCourse, 'course-123'))
				}
				// User docs
				if (!courseGetDocCalled) {
					courseGetDocCalled = true
					return Promise.resolve(createMockDocSnap(mockUsers[0], 'user-1'))
				}
				return Promise.resolve(createMockDocSnap(mockUsers[1], 'user-2'))
			})

			mockFirestore.collection.mockReturnValue({ _collection: 'mock' })

			// Mock getDocs for different queries
			let callCount = 0
			mockFirestore.getDocs.mockImplementation(() => {
				callCount++
				if (callCount === 1) return Promise.resolve(createMockQuerySnap(mockProgress))
				// Subsequent calls for reading positions, notes, bookmarks per student
				return Promise.resolve(createMockQuerySnap([]))
			})

			const result = await AnalyticsService.getStudentEngagement('course-123')

			expect(result).toHaveLength(2)
			expect(result[0].progressPercentage).toBeGreaterThanOrEqual(result[1].progressPercentage) // Sorted by progress
			expect(result[0]).toMatchObject({
				userId: 'user-1',
				userName: 'Alice',
				courseId: 'course-123',
				progressPercentage: 75,
				completedLessons: 1,
				totalLessons: 2,
				activityLevel: 'high'
			})
			expect(result[1]).toMatchObject({
				userId: 'user-2',
				progressPercentage: 25,
				atRisk: true // Old last access + low progress
			})
		})

		test('should handle course with no students', async () => {
			const mockCourse = createMockCourse({
				id: 'course-123',
				lessons: []
			})

			mockFirestore.doc.mockReturnValue(mockDocRef)
			mockFirestore.getDoc.mockResolvedValue(createMockDocSnap(mockCourse, 'course-123'))
			mockFirestore.collection.mockReturnValue({ _collection: 'mock' })
			mockFirestore.getDocs.mockResolvedValue(createMockQuerySnap([]))

			const result = await AnalyticsService.getStudentEngagement('course-123')

			expect(result).toEqual([])
		})
	})

	describe('getAtRiskStudents', () => {
		test('should filter and return only at-risk students', async () => {
			const mockCourse = createMockCourse({
				id: 'course-123',
				lessons: [
					{
						id: 'lesson-1',
						title: 'Lesson 1',
						description: '',
						type: 'lesson',
						order: 1,
						duration: 30,
						isRequired: true,
						courseId: 'course-123',
						createdAt: '2024-01-01T00:00:00.000Z',
						updatedAt: '2024-01-01T00:00:00.000Z'
					}
				]
			})

			const oldDate = new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString()
			const recentDate = new Date().toISOString()

			const mockProgress = [
				createMockProgress({
					userId: 'user-1',
					courseId: 'course-123',
					progressPercentage: 30, // At risk: >5%, <50%
					lastAccessedAt: oldDate // >14 days ago
				}),
				createMockProgress({
					userId: 'user-2',
					courseId: 'course-123',
					progressPercentage: 80, // Not at risk: high progress
					lastAccessedAt: recentDate
				})
			]

			mockFirestore.doc.mockReturnValue(mockDocRef)
			mockFirestore.getDoc.mockResolvedValue(createMockDocSnap(mockCourse, 'course-123'))
			mockFirestore.collection.mockReturnValue({ _collection: 'mock' })
			mockFirestore.getDocs.mockResolvedValue(createMockQuerySnap(mockProgress))

			const result = await AnalyticsService.getAtRiskStudents('course-123')

			expect(result).toHaveLength(1)
			expect(result[0].userId).toBe('user-1')
			expect(result[0].atRisk).toBe(true)
		})
	})

	describe('getActiveStudents', () => {
		test('should return students active within specified days', async () => {
			const mockCourse = createMockCourse({
				id: 'course-123',
				lessons: []
			})

			const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
			const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString()

			const mockProgress = [
				createMockProgress({
					userId: 'user-1',
					courseId: 'course-123',
					lastAccessedAt: threeDaysAgo
				}),
				createMockProgress({
					userId: 'user-2',
					courseId: 'course-123',
					lastAccessedAt: tenDaysAgo
				})
			]

			mockFirestore.doc.mockReturnValue(mockDocRef)
			mockFirestore.getDoc.mockResolvedValue(createMockDocSnap(mockCourse, 'course-123'))
			mockFirestore.collection.mockReturnValue({ _collection: 'mock' })
			mockFirestore.getDocs.mockResolvedValue(createMockQuerySnap(mockProgress))

			const result = await AnalyticsService.getActiveStudents('course-123', 7)

			expect(result).toHaveLength(1)
			expect(result[0].userId).toBe('user-1')
			expect(result[0].daysSinceLastActive).toBeLessThanOrEqual(7)
		})

		test('should default to 7 days when not specified', async () => {
			const mockCourse = createMockCourse({ id: 'course-123', lessons: [] })
			mockFirestore.doc.mockReturnValue(mockDocRef)
			mockFirestore.getDoc.mockResolvedValue(createMockDocSnap(mockCourse, 'course-123'))
			mockFirestore.collection.mockReturnValue({ _collection: 'mock' })
			mockFirestore.getDocs.mockResolvedValue(createMockQuerySnap([]))

			const result = await AnalyticsService.getActiveStudents('course-123')

			expect(result).toEqual([])
		})
	})
})
