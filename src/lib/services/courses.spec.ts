/**
 * Tests for CourseService
 * Comprehensive test coverage for all course CRUD operations and queries
 */

import { describe, test, expect, beforeEach, vi } from 'vitest'
import { COLLECTIONS } from '$lib/firebase/collections'
import {
	createMockCourse,
	createMockDocSnap,
	createMockQuerySnap,
	mockDocRef,
	mockTimestamp,
	resetFirebaseMocks,
	setupSuccessfulFirestoreOperations,
	setupFirestoreError
} from '$lib/test-utils/firebase-mocks'

// Mock Firebase functions before importing service
const mockFirestore = {
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

// Mock Firebase before importing service
vi.mock('firebase/firestore', () => mockFirestore)
vi.mock('$lib/firebase', () => ({ db: 'mock-db-instance' }))

// Mock validation schemas
vi.mock('$lib/validation/course', () => ({
	courseSchema: { parse: vi.fn((data) => data) },
	createCourseSchema: { parse: vi.fn((data) => data) },
	updateCourseSchema: { parse: vi.fn((data) => data) }
}))

// Now import the service after mocks are set up
const { CourseService } = await import('$lib/services/courses')

describe('CourseService', () => {
	beforeEach(() => {
		// Reset all mocks
		Object.values(mockFirestore).forEach(mock => {
			if (typeof mock === 'function' && 'mockReset' in mock) {
				mock.mockReset()
			}
		})
		
		// Setup default successful operations
		mockFirestore.addDoc.mockResolvedValue(mockDocRef)
		mockFirestore.updateDoc.mockResolvedValue(undefined)
		mockFirestore.deleteDoc.mockResolvedValue(undefined)
		mockFirestore.getDoc.mockResolvedValue(createMockDocSnap({}, 'test-id', true))
		mockFirestore.getDocs.mockResolvedValue(createMockQuerySnap([]))
	})

	describe('getCourse', () => {
		test('should return course when it exists', async () => {
			const mockCourse = createMockCourse({ id: 'course-123' })
			const mockSnap = createMockDocSnap(mockCourse, 'course-123', true)
			
			mockFirestore.doc.mockReturnValue(mockDocRef)
			mockFirestore.getDoc.mockResolvedValue(mockSnap)

			const result = await CourseService.getCourse('course-123')

			expect(mockFirestore.doc).toHaveBeenCalledWith('mock-db-instance', COLLECTIONS.COURSES, 'course-123')
			expect(mockFirestore.getDoc).toHaveBeenCalledWith(mockDocRef)
			expect(result).toEqual(expect.objectContaining({
				id: 'course-123',
				title: 'Test Course'
			}))
		})

		test('should return null when course does not exist', async () => {
			const mockSnap = createMockDocSnap({}, 'course-123', false)
			
			mockFirestore.doc.mockReturnValue(mockDocRef)
			mockFirestore.getDoc.mockResolvedValue(mockSnap)

			const result = await CourseService.getCourse('course-123')

			expect(result).toBeNull()
		})

		test('should handle errors gracefully', async () => {
			const error = new Error('Database connection failed')
			mockFirestore.getDoc.mockRejectedValue(error)

			await expect(CourseService.getCourse('course-123')).rejects.toThrow('Database connection failed')
		})

		test('should convert Firestore timestamps', async () => {
			const courseWithTimestamp = {
				...createMockCourse(),
				createdAt: mockTimestamp,
				updatedAt: mockTimestamp
			}
			const mockSnap = createMockDocSnap(courseWithTimestamp, 'course-123', true)
			
			mockFirestore.doc.mockReturnValue(mockDocRef)
			mockFirestore.getDoc.mockResolvedValue(mockSnap)

			const result = await CourseService.getCourse('course-123')

			expect(result?.createdAt).toBe('2024-01-01T00:00:00.000Z')
			expect(result?.updatedAt).toBe('2024-01-01T00:00:00.000Z')
		})
	})

	describe('getCourses', () => {
		test('should return courses with default parameters', async () => {
			const mockCourses = [
				createMockCourse({ id: 'course-1' }),
				createMockCourse({ id: 'course-2' })
			]
			const mockSnap = createMockQuerySnap(mockCourses)
			
			mockFirestore.collection.mockReturnValue('mock-collection')
			mockFirestore.query.mockReturnValue('mock-query')
			mockFirestore.getDocs.mockResolvedValue(mockSnap)

			const result = await CourseService.getCourses()

			expect(result.courses).toHaveLength(2)
			expect(result.total).toBe(2)
			expect(result.hasMore).toBe(false)
		})

		test('should apply category filter', async () => {
			const mockCourses = [createMockCourse({ category: 'Programming' })]
			const mockSnap = createMockQuerySnap(mockCourses)
			
			mockFirestore.collection.mockReturnValue('mock-collection')
			mockFirestore.query.mockReturnValue('mock-query')
			mockFirestore.getDocs.mockResolvedValue(mockSnap)
			mockFirestore.where.mockReturnValue('mock-where')

			await CourseService.getCourses({ category: 'Programming' })

			expect(mockFirestore.where).toHaveBeenCalledWith('category', '==', 'Programming')
		})

		test('should apply difficulty filter', async () => {
			const mockCourses = [createMockCourse({ difficulty: 'Beginner' })]
			const mockSnap = createMockQuerySnap(mockCourses)
			
			mockFirestore.collection.mockReturnValue('mock-collection')
			mockFirestore.query.mockReturnValue('mock-query')
			mockFirestore.getDocs.mockResolvedValue(mockSnap)
			mockFirestore.where.mockReturnValue('mock-where')

			await CourseService.getCourses({ difficulty: 'Beginner' })

			expect(mockFirestore.where).toHaveBeenCalledWith('difficulty', '==', 'Beginner')
		})

		test('should apply level filter', async () => {
			const mockCourses = [createMockCourse({ level: 'free' })]
			const mockSnap = createMockQuerySnap(mockCourses)
			
			mockFirestore.collection.mockReturnValue('mock-collection')
			mockFirestore.query.mockReturnValue('mock-query')
			mockFirestore.getDocs.mockResolvedValue(mockSnap)
			mockFirestore.where.mockReturnValue('mock-where')

			await CourseService.getCourses({ level: 'free' })

			expect(mockFirestore.where).toHaveBeenCalledWith('level', '==', 'free')
		})

		test('should apply isPublished filter', async () => {
			const mockCourses = [createMockCourse({ isPublished: true })]
			const mockSnap = createMockQuerySnap(mockCourses)
			
			mockFirestore.collection.mockReturnValue('mock-collection')
			mockFirestore.query.mockReturnValue('mock-query')
			mockFirestore.getDocs.mockResolvedValue(mockSnap)
			mockFirestore.where.mockReturnValue('mock-where')

			await CourseService.getCourses({ isPublished: true })

			expect(mockFirestore.where).toHaveBeenCalledWith('isPublished', '==', true)
		})

		test('should handle pagination', async () => {
			const mockCourses = Array.from({ length: 5 }, (_, i) => 
				createMockCourse({ id: `course-${i}` })
			)
			const mockSnap = createMockQuerySnap(mockCourses)
			
			mockFirestore.collection.mockReturnValue('mock-collection')
			mockFirestore.query.mockReturnValue('mock-query')
			mockFirestore.getDocs.mockResolvedValue(mockSnap)
			mockFirestore.limit.mockReturnValue('mock-limit')

			await CourseService.getCourses({}, { field: 'createdAt', direction: 'desc' }, { page: 1, limit: 5 })

			// CourseService adds +1 to check for hasMore
			expect(mockFirestore.limit).toHaveBeenCalledWith(6)
		})

		test('should handle sorting', async () => {
			const mockCourses = [createMockCourse()]
			const mockSnap = createMockQuerySnap(mockCourses)
			
			mockFirestore.collection.mockReturnValue('mock-collection')
			mockFirestore.query.mockReturnValue('mock-query')
			mockFirestore.getDocs.mockResolvedValue(mockSnap)
			mockFirestore.orderBy.mockReturnValue('mock-orderBy')

			await CourseService.getCourses({}, { field: 'title', direction: 'asc' })

			expect(mockFirestore.orderBy).toHaveBeenCalledWith('title', 'asc')
		})
	})

	describe('createCourse', () => {
		test('should create a new course successfully', async () => {
			const newCourseData = {
				title: 'New Course',
				description: 'A new course',
				category: 'Programming'
			}
			
			mockFirestore.collection.mockReturnValue('mock-collection')
			mockFirestore.addDoc.mockResolvedValue({ ...mockDocRef, id: 'new-course-id' })
			mockFirestore.serverTimestamp.mockReturnValue(mockTimestamp)

			const result = await CourseService.createCourse(newCourseData, 'instructor-123')

			expect(mockFirestore.addDoc).toHaveBeenCalled()
			expect(result).toBe('new-course-id')
		})

		test('should include instructor information in course data', async () => {
			const newCourseData = { title: 'New Course' }
			
			mockFirestore.collection.mockReturnValue('mock-collection')
			mockFirestore.addDoc.mockResolvedValue(mockDocRef)
			mockFirestore.serverTimestamp.mockReturnValue(mockTimestamp)

			await CourseService.createCourse(newCourseData, 'instructor-123')

			const addDocCall = mockFirestore.addDoc.mock.calls[0]
			const courseData = addDocCall[1]

			expect(courseData).toMatchObject({
				instructorId: 'instructor-123',
				enrolled: 0,
				rating: 0,
				ratingCount: 0,
				lessons: [],
				chapters: []
			})
		})

		test('should handle creation errors', async () => {
			const error = new Error('Failed to create course')
			mockFirestore.addDoc.mockRejectedValue(error)

			await expect(
				CourseService.createCourse({ title: 'Test' }, 'instructor-123')
			).rejects.toThrow('Failed to create course')
		})
	})

	describe('updateCourse', () => {
		test('should update course successfully', async () => {
			const updates = { title: 'Updated Course', description: 'Updated description' }
			
			mockFirestore.doc.mockReturnValue(mockDocRef)
			mockFirestore.serverTimestamp.mockReturnValue(mockTimestamp)

			await CourseService.updateCourse('course-123', updates)

			expect(mockFirestore.updateDoc).toHaveBeenCalledWith(
				mockDocRef,
				expect.objectContaining({
					title: 'Updated Course',
					description: 'Updated description',
					updatedAt: mockTimestamp
				})
			)
		})

		test('should handle update errors', async () => {
			const error = new Error('Failed to update course')
			mockFirestore.updateDoc.mockRejectedValue(error)

			await expect(
				CourseService.updateCourse('course-123', { title: 'Updated' })
			).rejects.toThrow('Failed to update course')
		})
	})

	describe('deleteCourse', () => {
		test('should delete course successfully', async () => {
			mockFirestore.doc.mockReturnValue(mockDocRef)

			await CourseService.deleteCourse('course-123')

			expect(mockFirestore.doc).toHaveBeenCalledWith('mock-db-instance', COLLECTIONS.COURSES, 'course-123')
			expect(mockFirestore.deleteDoc).toHaveBeenCalledWith(mockDocRef)
		})

		test('should handle deletion errors', async () => {
			const error = new Error('Failed to delete course')
			mockFirestore.deleteDoc.mockRejectedValue(error)

			await expect(
				CourseService.deleteCourse('course-123')
			).rejects.toThrow('Failed to delete course')
		})
	})

	describe('togglePublishStatus', () => {
		test('should toggle publish status to true', async () => {
			mockFirestore.doc.mockReturnValue(mockDocRef)
			mockFirestore.serverTimestamp.mockReturnValue(mockTimestamp)

			await CourseService.togglePublishStatus('course-123', true)

			expect(mockFirestore.updateDoc).toHaveBeenCalledWith(
				mockDocRef,
				expect.objectContaining({
					isPublished: true,
					publishedAt: mockTimestamp,
					updatedAt: mockTimestamp
				})
			)
		})

		test('should toggle publish status to false', async () => {
			mockFirestore.doc.mockReturnValue(mockDocRef)
			mockFirestore.serverTimestamp.mockReturnValue(mockTimestamp)

			await CourseService.togglePublishStatus('course-123', false)

			expect(mockFirestore.updateDoc).toHaveBeenCalledWith(
				mockDocRef,
				expect.objectContaining({
					isPublished: false,
					updatedAt: mockTimestamp
				})
			)
		})
	})

	describe('getCoursesByInstructor', () => {
		test('should return courses by instructor', async () => {
			const instructorCourses = [
				createMockCourse({ instructorId: 'instructor-123' }),
				createMockCourse({ instructorId: 'instructor-123' })
			]
			const mockSnap = createMockQuerySnap(instructorCourses)
			
			mockFirestore.collection.mockReturnValue('mock-collection')
			mockFirestore.query.mockReturnValue('mock-query')
			mockFirestore.where.mockReturnValue('mock-where')
			mockFirestore.orderBy.mockReturnValue('mock-orderBy')
			mockFirestore.getDocs.mockResolvedValue(mockSnap)

			const result = await CourseService.getCoursesByInstructor('instructor-123')

			expect(mockFirestore.where).toHaveBeenCalledWith('instructorId', '==', 'instructor-123')
			expect(result).toHaveLength(2)
		})
	})

	describe('getFeaturedCourses', () => {
		test('should return featured courses', async () => {
			const featuredCourses = [
				createMockCourse({ isFeatured: true }),
				createMockCourse({ isFeatured: true })
			]
			const mockSnap = createMockQuerySnap(featuredCourses)
			
			mockFirestore.collection.mockReturnValue('mock-collection')
			mockFirestore.query.mockReturnValue('mock-query')
			mockFirestore.where.mockReturnValue('mock-where')
			mockFirestore.orderBy.mockReturnValue('mock-orderBy')
			mockFirestore.limit.mockReturnValue('mock-limit')
			mockFirestore.getDocs.mockResolvedValue(mockSnap)

			const result = await CourseService.getFeaturedCourses(6)

			expect(mockFirestore.where).toHaveBeenCalledWith('isFeatured', '==', true)
			expect(mockFirestore.limit).toHaveBeenCalledWith(6)
			expect(result).toHaveLength(2)
		})
	})

	describe('searchCourses', () => {
		test('should search courses by title and description', async () => {
			const searchResults = [createMockCourse({ title: 'JavaScript Basics' })]
			const mockSnap = createMockQuerySnap(searchResults)
			
			mockFirestore.collection.mockReturnValue('mock-collection')
			mockFirestore.query.mockReturnValue('mock-query')
			mockFirestore.where.mockReturnValue('mock-where')
			mockFirestore.orderBy.mockReturnValue('mock-orderBy')
			mockFirestore.limit.mockReturnValue('mock-limit')
			mockFirestore.getDocs.mockResolvedValue(mockSnap)

			const result = await CourseService.searchCourses('JavaScript', 20)

			// searchCourses uses a fixed limit of 100 for Firestore, then slices client-side
			expect(mockFirestore.limit).toHaveBeenCalledWith(100)
			expect(result).toHaveLength(1)
		})
	})

	describe('getCourseStats', () => {
		test('should return course statistics', async () => {
			// Mock course retrieval with lessons
			const mockCourseWithLessons = createMockCourse({
				id: 'course-123',
				lessons: [
					{
						id: 'lesson-1',
						courseId: 'course-123',
						title: 'Lesson 1',
						type: 'lesson',
						order: 1,
						isRequired: true,
						createdAt: '2024-01-01T00:00:00.000Z',
						updatedAt: '2024-01-01T00:00:00.000Z'
					},
					{
						id: 'lesson-2',
						courseId: 'course-123',
						title: 'Lesson 2',
						type: 'lesson',
						order: 2,
						isRequired: true,
						createdAt: '2024-01-01T00:00:00.000Z',
						updatedAt: '2024-01-01T00:00:00.000Z'
					}
				]
			})
			const courseSnap = createMockDocSnap(mockCourseWithLessons, 'course-123', true)
			
			// Mock enrollments query (for enrollmentCount)
			const mockEnrollments = [
				{ status: 'enrolled' },
				{ status: 'enrolled' }
			]
			const enrollmentSnap = createMockQuerySnap(mockEnrollments)
			
			// Mock progress query (for completion stats)
			const mockProgress = [
				{ progressPercentage: 100 }, // completed
				{ progressPercentage: 50 },  // in progress
				{ progressPercentage: 25 }   // in progress
			]
			const progressSnap = createMockQuerySnap(mockProgress)
			
			mockFirestore.doc.mockReturnValue(mockDocRef)
			mockFirestore.getDoc.mockResolvedValue(courseSnap)
			mockFirestore.collection.mockReturnValue('mock-collection')
			mockFirestore.query.mockReturnValue('mock-query')
			mockFirestore.where.mockReturnValue('mock-where')
			
			// First call for enrollments, second call for progress
			mockFirestore.getDocs
				.mockResolvedValueOnce(enrollmentSnap)
				.mockResolvedValueOnce(progressSnap)

			const result = await CourseService.getCourseStats('course-123')

			expect(result).toMatchObject({
				enrollmentCount: 2,
				completionRate: expect.any(Number),
				averageProgress: expect.any(Number),
				totalLessons: 2
			})
		})
	})

	describe('updateCourseRating', () => {
		test('should update course rating successfully', async () => {
			mockFirestore.doc.mockReturnValue(mockDocRef)

			await CourseService.updateCourseRating('course-123', 4.5)

			expect(mockFirestore.updateDoc).toHaveBeenCalledWith(
				mockDocRef,
				expect.objectContaining({
					rating: 4.5
				})
			)
		})

		test('should handle rating update errors', async () => {
			const error = new Error('Failed to update rating')
			mockFirestore.updateDoc.mockRejectedValue(error)

			await expect(
				CourseService.updateCourseRating('course-123', 4.5)
			).rejects.toThrow('Failed to update rating')
		})
	})
})