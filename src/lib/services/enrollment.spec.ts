/**
 * Tests for EnrollmentService
 * Comprehensive test coverage for enrollment operations and user access management
 */

import { describe, test, expect, beforeEach, vi } from 'vitest'
import {
	createMockEnrollment,
	createMockCourse,
	createMockDocSnap,
	createMockQuerySnap,
	mockDocRef,
	mockTimestamp
} from '$lib/test-utils/firebase-mocks'

// Mock Firebase functions
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
	serverTimestamp: vi.fn(() => mockTimestamp)
}

// Mock Firebase before importing service
vi.mock('firebase/firestore', () => mockFirestore)
vi.mock('$lib/firebase', () => ({ db: 'mock-db-instance' }))

// Mock validation schemas
vi.mock('$lib/firebase/schemas', () => ({
	enrollmentSchema: { parse: vi.fn((data) => data) },
	courseProgressSchema: { parse: vi.fn((data) => data) }
}))

// Import service after mocks
const { EnrollmentService } = await import('$lib/services/enrollment')

describe('EnrollmentService', () => {
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

	describe('enrollUser', () => {
		test('should enroll user successfully when course is published and user not enrolled', async () => {
			// Mock no existing enrollment
			const emptySnap = createMockQuerySnap([], true)
			
			// Mock published course
			const publishedCourse = createMockCourse({ isPublished: true })
			const courseSnap = createMockDocSnap(publishedCourse, 'course-123', true)
			
			mockFirestore.query.mockReturnValue('mock-query')
			mockFirestore.getDocs.mockResolvedValueOnce(emptySnap) // getEnrollment returns null
			mockFirestore.doc.mockReturnValue(mockDocRef)
			mockFirestore.getDoc.mockResolvedValue(courseSnap)
			mockFirestore.collection.mockReturnValue('mock-collection')
			mockFirestore.addDoc.mockResolvedValue({ ...mockDocRef, id: 'enrollment-123' })

			const result = await EnrollmentService.enrollUser('user-123', 'course-123')

			expect(mockFirestore.addDoc).toHaveBeenCalled()
			expect(result).toBe('enrollment-123')
		})

		test('should throw error if user is already enrolled', async () => {
			// Mock existing enrollment
			const existingEnrollment = createMockEnrollment()
			const enrollmentSnap = createMockQuerySnap([existingEnrollment])
			
			mockFirestore.query.mockReturnValue('mock-query')
			mockFirestore.getDocs.mockResolvedValue(enrollmentSnap)

			await expect(
				EnrollmentService.enrollUser('user-123', 'course-123')
			).rejects.toThrow('User is already enrolled in this course')
		})

		test('should throw error if course does not exist', async () => {
			// Mock no existing enrollment
			const emptySnap = createMockQuerySnap([], true)
			
			// Mock course not found
			const courseSnap = createMockDocSnap({}, 'course-123', false)
			
			mockFirestore.query.mockReturnValue('mock-query')
			mockFirestore.getDocs.mockResolvedValue(emptySnap)
			mockFirestore.doc.mockReturnValue(mockDocRef)
			mockFirestore.getDoc.mockResolvedValue(courseSnap)

			await expect(
				EnrollmentService.enrollUser('user-123', 'course-123')
			).rejects.toThrow('Course not found')
		})

		test('should throw error if course is not published', async () => {
			// Mock no existing enrollment
			const emptySnap = createMockQuerySnap([], true)
			
			// Mock unpublished course
			const unpublishedCourse = createMockCourse({ isPublished: false })
			const courseSnap = createMockDocSnap(unpublishedCourse, 'course-123', true)
			
			mockFirestore.query.mockReturnValue('mock-query')
			mockFirestore.getDocs.mockResolvedValue(emptySnap)
			mockFirestore.doc.mockReturnValue(mockDocRef)
			mockFirestore.getDoc.mockResolvedValue(courseSnap)

			await expect(
				EnrollmentService.enrollUser('user-123', 'course-123')
			).rejects.toThrow('Course is not published')
		})

		test('should include enrollment source and timestamps', async () => {
			const emptySnap = createMockQuerySnap([], true)
			const publishedCourse = createMockCourse({ isPublished: true })
			const courseSnap = createMockDocSnap(publishedCourse, 'course-123', true)
			
			mockFirestore.query.mockReturnValue('mock-query')
			mockFirestore.getDocs.mockResolvedValue(emptySnap)
			mockFirestore.doc.mockReturnValue(mockDocRef)
			mockFirestore.getDoc.mockResolvedValue(courseSnap)
			mockFirestore.collection.mockReturnValue('mock-collection')
			mockFirestore.addDoc.mockResolvedValue(mockDocRef)

			await EnrollmentService.enrollUser('user-123', 'course-123')

			const addDocCall = mockFirestore.addDoc.mock.calls[0]
			const enrollmentData = addDocCall[1]

			expect(enrollmentData).toMatchObject({
				userId: 'user-123',
				courseId: 'course-123',
				status: 'enrolled',
				enrollmentSource: 'direct',
				certificateIssued: false
			})
		})
	})

	describe('unenrollUser', () => {
		test('should unenroll user successfully', async () => {
			const enrollment = createMockEnrollment({ id: 'enrollment-123' })
			const enrollmentSnap = createMockQuerySnap([enrollment])
			
			mockFirestore.query.mockReturnValue('mock-query')
			mockFirestore.getDocs.mockResolvedValue(enrollmentSnap)
			mockFirestore.doc.mockReturnValue(mockDocRef)

			await EnrollmentService.unenrollUser('user-123', 'course-123')

			expect(mockFirestore.updateDoc).toHaveBeenCalledWith(
				mockDocRef,
				expect.objectContaining({
					status: 'dropped'
				})
			)
		})

		test('should throw error if enrollment not found', async () => {
			const emptySnap = createMockQuerySnap([], true)
			
			mockFirestore.query.mockReturnValue('mock-query')
			mockFirestore.getDocs.mockResolvedValue(emptySnap)

			await expect(
				EnrollmentService.unenrollUser('user-123', 'course-123')
			).rejects.toThrow('User is not enrolled in this course')
		})
	})

	describe('getEnrollment', () => {
		test('should return enrollment when it exists', async () => {
			const enrollment = createMockEnrollment()
			const enrollmentSnap = createMockQuerySnap([enrollment])
			
			mockFirestore.query.mockReturnValue('mock-query')
			mockFirestore.getDocs.mockResolvedValue(enrollmentSnap)

			const result = await EnrollmentService.getEnrollment('user-123', 'course-123')

			expect(result).toEqual(expect.objectContaining({
				userId: 'user-123',
				courseId: 'course-123'
			}))
		})

		test('should return null when enrollment does not exist', async () => {
			const emptySnap = createMockQuerySnap([], true)
			
			mockFirestore.query.mockReturnValue('mock-query')
			mockFirestore.getDocs.mockResolvedValue(emptySnap)

			const result = await EnrollmentService.getEnrollment('user-123', 'course-123')

			expect(result).toBeNull()
		})

		test('should filter by active statuses', async () => {
			const emptySnap = createMockQuerySnap([], true)
			
			mockFirestore.query.mockReturnValue('mock-query')
			mockFirestore.getDocs.mockResolvedValue(emptySnap)

			const result = await EnrollmentService.getEnrollment('user-123', 'course-123')

			expect(mockFirestore.where).toHaveBeenCalledWith('status', 'in', ['enrolled', 'active', 'completed'])
			expect(result).toBeNull()
		})
	})

	describe('getUserEnrollments', () => {
		test('should return all user enrollments', async () => {
			const enrollments = [
				createMockEnrollment({ courseId: 'course-1' }),
				createMockEnrollment({ courseId: 'course-2' })
			]
			const enrollmentSnap = createMockQuerySnap(enrollments)
			
			mockFirestore.collection.mockReturnValue('mock-collection')
			mockFirestore.query.mockReturnValue('mock-query')
			mockFirestore.where.mockReturnValue('mock-where')
			mockFirestore.orderBy.mockReturnValue('mock-orderBy')
			mockFirestore.getDocs.mockResolvedValue(enrollmentSnap)

			const result = await EnrollmentService.getUserEnrollments('user-123')

			expect(mockFirestore.where).toHaveBeenCalledWith('userId', '==', 'user-123')
			expect(result).toHaveLength(2)
		})

		test('should order enrollments by enrollment date', async () => {
			mockFirestore.collection.mockReturnValue('mock-collection')
			mockFirestore.query.mockReturnValue('mock-query')
			mockFirestore.where.mockReturnValue('mock-where')
			mockFirestore.orderBy.mockReturnValue('mock-orderBy')
			mockFirestore.getDocs.mockResolvedValue(createMockQuerySnap([]))

			await EnrollmentService.getUserEnrollments('user-123')

			expect(mockFirestore.orderBy).toHaveBeenCalledWith('enrolledAt', 'desc')
		})
	})

	describe('getCourseEnrollments', () => {
		test('should return all course enrollments', async () => {
			const enrollments = [
				createMockEnrollment({ userId: 'user-1' }),
				createMockEnrollment({ userId: 'user-2' })
			]
			const enrollmentSnap = createMockQuerySnap(enrollments)
			
			mockFirestore.collection.mockReturnValue('mock-collection')
			mockFirestore.query.mockReturnValue('mock-query')
			mockFirestore.where.mockReturnValue('mock-where')
			mockFirestore.orderBy.mockReturnValue('mock-orderBy')
			mockFirestore.getDocs.mockResolvedValue(enrollmentSnap)

			const result = await EnrollmentService.getCourseEnrollments('course-123')

			expect(mockFirestore.where).toHaveBeenCalledWith('courseId', '==', 'course-123')
			expect(result).toHaveLength(2)
		})
	})

	describe('hasAccess', () => {
		test('should return true when user has enrollment', async () => {
			const enrollment = createMockEnrollment()
			const enrollmentSnap = createMockQuerySnap([enrollment])
			
			mockFirestore.query.mockReturnValue('mock-query')
			mockFirestore.getDocs.mockResolvedValue(enrollmentSnap)

			const result = await EnrollmentService.hasAccess('user-123', 'course-123')

			expect(result).toBe(true)
		})

		test('should return false when user has no enrollment', async () => {
			const emptySnap = createMockQuerySnap([], true)
			
			mockFirestore.query.mockReturnValue('mock-query')
			mockFirestore.getDocs.mockResolvedValue(emptySnap)

			const result = await EnrollmentService.hasAccess('user-123', 'course-123')

			expect(result).toBe(false)
		})
	})

	describe('completeCourse', () => {
		test('should mark course as completed', async () => {
			const enrollment = createMockEnrollment({ status: 'enrolled' })
			const enrollmentSnap = createMockQuerySnap([enrollment])
			
			mockFirestore.query.mockReturnValue('mock-query')
			mockFirestore.getDocs.mockResolvedValue(enrollmentSnap)
			mockFirestore.doc.mockReturnValue(mockDocRef)
			mockFirestore.serverTimestamp.mockReturnValue(mockTimestamp)

			await EnrollmentService.completeCourse('user-123', 'course-123')

			expect(mockFirestore.updateDoc).toHaveBeenCalledWith(
				mockDocRef,
				expect.objectContaining({
					status: 'completed',
					completedAt: mockTimestamp
				})
			)
		})

		test('should throw error if enrollment not found', async () => {
			const emptySnap = createMockQuerySnap([], true)
			
			mockFirestore.query.mockReturnValue('mock-query')
			mockFirestore.getDocs.mockResolvedValue(emptySnap)

			await expect(
				EnrollmentService.completeCourse('user-123', 'course-123')
			).rejects.toThrow('User is not enrolled in this course')
		})
	})

	describe('getEnrollmentStats', () => {
		test('should return enrollment statistics', async () => {
			const enrollments = [
				{ status: 'enrolled', enrolledAt: mockTimestamp },
				{ status: 'completed', enrolledAt: mockTimestamp, completedAt: mockTimestamp },
				{ status: 'enrolled', enrolledAt: mockTimestamp }
			]
			const enrollmentSnap = createMockQuerySnap(enrollments)
			
			mockFirestore.collection.mockReturnValue('mock-collection')
			mockFirestore.query.mockReturnValue('mock-query')
			mockFirestore.where.mockReturnValue('mock-where')
			mockFirestore.getDocs.mockResolvedValue(enrollmentSnap)

			const result = await EnrollmentService.getEnrollmentStats('course-123')

			expect(result).toMatchObject({
				totalEnrollments: 3,
				activeEnrollments: 2,
				completedEnrollments: 1,
				completionRate: expect.any(Number)
			})
		})

		test('should handle empty enrollment data', async () => {
			const emptySnap = createMockQuerySnap([], true)
			
			mockFirestore.collection.mockReturnValue('mock-collection')
			mockFirestore.query.mockReturnValue('mock-query')
			mockFirestore.where.mockReturnValue('mock-where')
			mockFirestore.getDocs.mockResolvedValue(emptySnap)

			const result = await EnrollmentService.getEnrollmentStats('course-123')

			expect(result).toMatchObject({
				totalEnrollments: 0,
				activeEnrollments: 0,
				completedEnrollments: 0,
				completionRate: 0
			})
		})
	})

	describe('issueCertificate', () => {
		test('should issue certificate for completed course', async () => {
			const completedEnrollment = createMockEnrollment({ 
				status: 'completed',
				certificateIssued: false
			})
			const enrollmentSnap = createMockQuerySnap([completedEnrollment])
			
			mockFirestore.query.mockReturnValue('mock-query')
			mockFirestore.getDocs.mockResolvedValue(enrollmentSnap)
			mockFirestore.doc.mockReturnValue(mockDocRef)

			await EnrollmentService.issueCertificate('user-123', 'course-123', 'https://cert.url')

			expect(mockFirestore.updateDoc).toHaveBeenCalledWith(
				mockDocRef,
				expect.objectContaining({
					certificateIssued: true,
					certificateUrl: 'https://cert.url'
				})
			)
		})

		test('should throw error if course not completed', async () => {
			const enrolledEnrollment = createMockEnrollment({ status: 'enrolled' })
			const enrollmentSnap = createMockQuerySnap([enrolledEnrollment])
			
			mockFirestore.query.mockReturnValue('mock-query')
			mockFirestore.getDocs.mockResolvedValue(enrollmentSnap)

			await expect(
				EnrollmentService.issueCertificate('user-123', 'course-123', 'https://cert.url')
			).rejects.toThrow('Course must be completed to issue certificate')
		})
	})

	describe('error handling', () => {
		test('should handle Firebase errors in enrollUser', async () => {
			const error = new Error('Firebase connection failed')
			mockFirestore.getDocs.mockRejectedValue(error)

			await expect(
				EnrollmentService.enrollUser('user-123', 'course-123')
			).rejects.toThrow('Firebase connection failed')
		})

		test('should handle Firebase errors in getEnrollment', async () => {
			const error = new Error('Query failed')
			mockFirestore.getDocs.mockRejectedValue(error)

			await expect(
				EnrollmentService.getEnrollment('user-123', 'course-123')
			).rejects.toThrow('Query failed')
		})

		test('should handle Firebase errors in completeCourse', async () => {
			const error = new Error('Update failed')
			mockFirestore.updateDoc.mockRejectedValue(error)
			
			const enrollment = createMockEnrollment()
			const enrollmentSnap = createMockQuerySnap([enrollment])
			mockFirestore.query.mockReturnValue('mock-query')
			mockFirestore.getDocs.mockResolvedValue(enrollmentSnap)

			await expect(
				EnrollmentService.completeCourse('user-123', 'course-123')
			).rejects.toThrow('Update failed')
		})
	})
})