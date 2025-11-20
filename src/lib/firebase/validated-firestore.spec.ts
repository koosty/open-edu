/**
 * Tests for ValidatedFirestore
 * Comprehensive test coverage for type-safe Firestore wrapper with schema validation
 */

import { describe, test, expect, beforeEach, vi } from 'vitest'
import { z } from 'zod'
import {
	ValidatedFirestore,
	ValidationError,
	createValidatedFirestore,
	createTypedService
} from './validated-firestore'
import { COLLECTIONS } from './collections'

// Mock Firestore functions - defined inline to avoid hoisting issues
vi.mock('firebase/firestore', () => ({
	doc: vi.fn(),
	setDoc: vi.fn(),
	addDoc: vi.fn(),
	getDoc: vi.fn(),
	updateDoc: vi.fn(),
	deleteDoc: vi.fn(),
	collection: vi.fn(),
	query: vi.fn(),
	getDocs: vi.fn(),
	where: vi.fn(),
	orderBy: vi.fn(),
	limit: vi.fn()
}))

// Get mocked functions - cast to any to avoid TypeScript mock type issues
const mockFirestore = (await import('firebase/firestore')) as any

// Test schemas
const TestUserSchema = z.object({
	id: z.string().optional(), // Optional for creation, added by Firestore
	name: z.string(),
	email: z.string().email(),
	age: z.number().min(0).optional(),
	createdAt: z.string().optional(), // Added by validation layer
	updatedAt: z.string().optional() // Added by validation layer
})

type TestUser = z.infer<typeof TestUserSchema>

const TestCourseSchema = z.object({
	id: z.string().optional(), // Optional for creation
	title: z.string().min(1),
	description: z.string().optional(),
	createdAt: z.string().optional(),
	updatedAt: z.string().optional()
})

type TestCourse = z.infer<typeof TestCourseSchema>

// Helper to create mock document snapshot
function createMockDocSnap(data: any, exists: boolean = true) {
	return {
		exists: () => exists,
		id: data?.id || 'doc-123',
		data: () => {
			if (!exists) return undefined
			const { id, ...rest } = data || {}
			return rest
		}
	}
}

// Helper to create mock query snapshot
function createMockQuerySnap(docs: any[]) {
	return {
		docs: docs.map((data) => ({
			id: data.id || 'doc-123',
			data: () => {
				const { id, ...rest } = data
				return rest
			}
		}))
	}
}

// Helper to create mock Firestore Timestamp
function createMockTimestamp(isoString: string) {
	return {
		toDate: () => new Date(isoString)
	}
}

describe('ValidatedFirestore', () => {
	let validatedFirestore: ValidatedFirestore
	let mockDb: any

	beforeEach(() => {
		mockDb = { _mock: 'firestore-db' }
		validatedFirestore = new ValidatedFirestore(mockDb)

		// Reset all mocks
		Object.values(mockFirestore).forEach((mock: any) => {
			if (typeof mock === 'function' && 'mockReset' in mock) {
				mock.mockReset()
			}
		})

		// Default mock implementations
		mockFirestore.doc.mockReturnValue({ _type: 'docRef' })
		mockFirestore.collection.mockReturnValue({ _type: 'collectionRef' })
		mockFirestore.query.mockImplementation((...args: any[]) => ({ _type: 'query', args }))
	})

	describe('setValidated', () => {
		test('should set document with valid data', async () => {
			const userData: Omit<TestUser, 'id' | 'createdAt' | 'updatedAt'> = {
				name: 'John Doe',
				email: 'john@example.com',
				age: 30
			}

			mockFirestore.setDoc.mockResolvedValue(undefined)

			await validatedFirestore.setValidated(
				COLLECTIONS.USERS,
				'user-123',
				{ id: 'user-123', createdAt: '2024-01-01T00:00:00.000Z', ...userData } as TestUser,
				TestUserSchema
			)

			expect(mockFirestore.setDoc).toHaveBeenCalled()
			expect(mockFirestore.doc).toHaveBeenCalledWith(mockDb, COLLECTIONS.USERS, 'user-123')
		})

		test('should add updatedAt timestamp automatically', async () => {
			const userData: Omit<TestUser, 'updatedAt'> = {
				id: 'user-123',
				name: 'John Doe',
				email: 'john@example.com',
				createdAt: '2024-01-01T00:00:00.000Z'
			}

			mockFirestore.setDoc.mockResolvedValue(undefined)

			await validatedFirestore.setValidated(
				COLLECTIONS.USERS,
				'user-123',
				userData as TestUser,
				TestUserSchema
			)

			const callArgs = mockFirestore.setDoc.mock.calls[0][1]
			expect(callArgs.updatedAt).toBeDefined()
			expect(typeof callArgs.updatedAt).toBe('string')
		})

		test('should throw ValidationError on schema validation failure', async () => {
			const invalidData = {
				id: 'user-123',
				name: 'John Doe',
				email: 'invalid-email', // Invalid email format
				createdAt: '2024-01-01T00:00:00.000Z',
				updatedAt: '2024-01-01T00:00:00.000Z'
			}

			await expect(
				validatedFirestore.setValidated(
					COLLECTIONS.USERS,
					'user-123',
					invalidData as TestUser,
					TestUserSchema
				)
			).rejects.toThrow(ValidationError)

			await expect(
				validatedFirestore.setValidated(
					COLLECTIONS.USERS,
					'user-123',
					invalidData as TestUser,
					TestUserSchema
				)
			).rejects.toThrow(/Schema validation failed/)
		})

		test('should include Zod error details in ValidationError', async () => {
			const invalidData = {
				id: 'user-123',
				name: 'John Doe',
				email: 'invalid-email',
				createdAt: '2024-01-01T00:00:00.000Z',
				updatedAt: '2024-01-01T00:00:00.000Z'
			}

			try {
				await validatedFirestore.setValidated(
					COLLECTIONS.USERS,
					'user-123',
					invalidData as TestUser,
					TestUserSchema
				)
				throw new Error('Should have thrown ValidationError')
			} catch (error: any) {
				expect(error).toBeInstanceOf(ValidationError)
				expect(error.zodError).toBeDefined()
				expect(error.collection).toBe(COLLECTIONS.USERS)
				expect(error.docId).toBe('user-123')
			}
		})
	})

	describe('addValidated', () => {
		test('should add document with valid data', async () => {
			const courseData: Omit<TestCourse, 'id' | 'createdAt' | 'updatedAt'> = {
				title: 'Test Course',
				description: 'A test course'
			}

			mockFirestore.addDoc.mockResolvedValue({ id: 'course-new-123' })

			const docId = await validatedFirestore.addValidated(
				COLLECTIONS.COURSES,
				courseData as TestCourse,
				TestCourseSchema
			)

			expect(docId).toBe('course-new-123')
			expect(mockFirestore.addDoc).toHaveBeenCalled()
			expect(mockFirestore.collection).toHaveBeenCalledWith(mockDb, COLLECTIONS.COURSES)
		})

		test('should add both createdAt and updatedAt timestamps', async () => {
			const courseData = {
				title: 'Test Course'
			}

			mockFirestore.addDoc.mockResolvedValue({ id: 'course-123' })

			await validatedFirestore.addValidated(
				COLLECTIONS.COURSES,
				courseData as TestCourse,
				TestCourseSchema
			)

			const callArgs = mockFirestore.addDoc.mock.calls[0][1]
			expect(callArgs.createdAt).toBeDefined()
			expect(callArgs.updatedAt).toBeDefined()
			expect(callArgs.createdAt).toBe(callArgs.updatedAt)
		})

		test('should throw ValidationError on invalid data', async () => {
			const invalidData = {
				title: '', // Empty title not allowed
				description: 'Test'
			}

			await expect(
				validatedFirestore.addValidated(
					COLLECTIONS.COURSES,
					invalidData as TestCourse,
					TestCourseSchema
				)
			).rejects.toThrow(ValidationError)
		})

		test('should not include docId in ValidationError for add operations', async () => {
			const invalidData = {
				title: ''
			}

			try {
				await validatedFirestore.addValidated(
					COLLECTIONS.COURSES,
					invalidData as TestCourse,
					TestCourseSchema
				)
			} catch (error: any) {
				expect(error.docId).toBeUndefined()
				expect(error.collection).toBe(COLLECTIONS.COURSES)
			}
		})
	})

	describe('updateValidated', () => {
		test('should update document with partial data', async () => {
			const updates = {
				name: 'Jane Doe'
			}

			mockFirestore.updateDoc.mockResolvedValue(undefined)

			await validatedFirestore.updateValidated(
				COLLECTIONS.USERS,
				'user-123',
				updates,
				TestUserSchema
			)

			expect(mockFirestore.updateDoc).toHaveBeenCalled()
			expect(mockFirestore.doc).toHaveBeenCalledWith(mockDb, COLLECTIONS.USERS, 'user-123')
		})

		test('should add updatedAt timestamp to updates', async () => {
			const updates = {
				name: 'Jane Doe'
			}

			mockFirestore.updateDoc.mockResolvedValue(undefined)

			await validatedFirestore.updateValidated(
				COLLECTIONS.USERS,
				'user-123',
				updates,
				TestUserSchema
			)

			const callArgs = mockFirestore.updateDoc.mock.calls[0][1]
			expect(callArgs.updatedAt).toBeDefined()
			expect(callArgs.name).toBe('Jane Doe')
		})

		test('should handle update errors', async () => {
			const updates = { name: 'Jane Doe' }

			mockFirestore.updateDoc.mockRejectedValue(new Error('Firestore error'))

			await expect(
				validatedFirestore.updateValidated(COLLECTIONS.USERS, 'user-123', updates, TestUserSchema)
			).rejects.toThrow(ValidationError)

			await expect(
				validatedFirestore.updateValidated(COLLECTIONS.USERS, 'user-123', updates, TestUserSchema)
			).rejects.toThrow(/Update failed/)
		})
	})

	describe('getValidated', () => {
		test('should get and validate existing document', async () => {
			const userData = {
				id: 'user-123',
				name: 'John Doe',
				email: 'john@example.com',
				age: 30,
				createdAt: '2024-01-01T00:00:00.000Z',
				updatedAt: '2024-01-01T00:00:00.000Z'
			}

			mockFirestore.getDoc.mockResolvedValue(createMockDocSnap(userData))

			const result = await validatedFirestore.getValidated(
				COLLECTIONS.USERS,
				'user-123',
				TestUserSchema
			)

			expect(result).toEqual(userData)
			expect(mockFirestore.getDoc).toHaveBeenCalled()
		})

		test('should return null for non-existent document', async () => {
			mockFirestore.getDoc.mockResolvedValue(createMockDocSnap(null, false))

			const result = await validatedFirestore.getValidated(
				COLLECTIONS.USERS,
				'user-123',
				TestUserSchema
			)

			expect(result).toBeNull()
		})

		test('should convert Firestore Timestamps to ISO strings', async () => {
			const userData = {
				id: 'user-123',
				name: 'John Doe',
				email: 'john@example.com',
				createdAt: createMockTimestamp('2024-01-01T00:00:00.000Z'),
				updatedAt: createMockTimestamp('2024-01-01T00:00:00.000Z')
			}

			mockFirestore.getDoc.mockResolvedValue(createMockDocSnap(userData))

			const result = await validatedFirestore.getValidated(
				COLLECTIONS.USERS,
				'user-123',
				TestUserSchema
			)

			expect(result?.createdAt).toBe('2024-01-01T00:00:00.000Z')
			expect(result?.updatedAt).toBe('2024-01-01T00:00:00.000Z')
		})

		test('should throw ValidationError on schema mismatch', async () => {
			const invalidData = {
				id: 'user-123',
				name: 'John Doe',
				email: 'invalid-email',
				createdAt: '2024-01-01T00:00:00.000Z',
				updatedAt: '2024-01-01T00:00:00.000Z'
			}

			mockFirestore.getDoc.mockResolvedValue(createMockDocSnap(invalidData))

			await expect(
				validatedFirestore.getValidated(COLLECTIONS.USERS, 'user-123', TestUserSchema)
			).rejects.toThrow(ValidationError)
		})
	})

	describe('queryValidated', () => {
		test('should query and validate multiple documents', async () => {
			const users = [
				{
					id: 'user-1',
					name: 'John Doe',
					email: 'john@example.com',
					createdAt: '2024-01-01T00:00:00.000Z',
					updatedAt: '2024-01-01T00:00:00.000Z'
				},
				{
					id: 'user-2',
					name: 'Jane Smith',
					email: 'jane@example.com',
					createdAt: '2024-01-02T00:00:00.000Z',
					updatedAt: '2024-01-02T00:00:00.000Z'
				}
			]

			mockFirestore.getDocs.mockResolvedValue(createMockQuerySnap(users))

			const results = await validatedFirestore.queryValidated(
				COLLECTIONS.USERS,
				TestUserSchema,
				mockFirestore.where('age', '>', 18)
			)

			expect(results).toHaveLength(2)
			expect(results[0].name).toBe('John Doe')
			expect(results[1].name).toBe('Jane Smith')
		})

		test('should return empty array for no results', async () => {
			mockFirestore.getDocs.mockResolvedValue(createMockQuerySnap([]))

			const results = await validatedFirestore.queryValidated(
				COLLECTIONS.USERS,
				TestUserSchema
			)

			expect(results).toEqual([])
		})

		test('should convert Timestamps in query results', async () => {
			const users = [
				{
					id: 'user-1',
					name: 'John Doe',
					email: 'john@example.com',
					createdAt: createMockTimestamp('2024-01-01T00:00:00.000Z'),
					updatedAt: createMockTimestamp('2024-01-01T00:00:00.000Z')
				}
			]

			mockFirestore.getDocs.mockResolvedValue(createMockQuerySnap(users))

			const results = await validatedFirestore.queryValidated(
				COLLECTIONS.USERS,
				TestUserSchema
			)

			expect(results[0].createdAt).toBe('2024-01-01T00:00:00.000Z')
		})

		test('should throw ValidationError if any document fails validation', async () => {
			const users = [
				{
					id: 'user-1',
					name: 'John Doe',
					email: 'john@example.com',
					createdAt: '2024-01-01T00:00:00.000Z',
					updatedAt: '2024-01-01T00:00:00.000Z'
				},
				{
					id: 'user-2',
					name: 'Jane Smith',
					email: 'invalid-email', // Invalid
					createdAt: '2024-01-02T00:00:00.000Z',
					updatedAt: '2024-01-02T00:00:00.000Z'
				}
			]

			mockFirestore.getDocs.mockResolvedValue(createMockQuerySnap(users))

			await expect(
				validatedFirestore.queryValidated(COLLECTIONS.USERS, TestUserSchema)
			).rejects.toThrow(ValidationError)
		})
	})

	describe('deleteDoc', () => {
		test('should delete document', async () => {
			mockFirestore.deleteDoc.mockResolvedValue(undefined)

			await validatedFirestore.deleteDoc(COLLECTIONS.USERS, 'user-123')

			expect(mockFirestore.deleteDoc).toHaveBeenCalled()
			expect(mockFirestore.doc).toHaveBeenCalledWith(mockDb, COLLECTIONS.USERS, 'user-123')
		})

		test('should handle delete errors', async () => {
			mockFirestore.deleteDoc.mockRejectedValue(new Error('Firestore error'))

			await expect(
				validatedFirestore.deleteDoc(COLLECTIONS.USERS, 'user-123')
			).rejects.toThrow('Firestore error')
		})
	})

	describe('getDocRef', () => {
		test('should return document reference', () => {
			const docRef = validatedFirestore.getDocRef(COLLECTIONS.USERS, 'user-123')

			expect(docRef).toBeDefined()
			expect(mockFirestore.doc).toHaveBeenCalledWith(mockDb, COLLECTIONS.USERS, 'user-123')
		})
	})

	describe('getCollectionRef', () => {
		test('should return collection reference', () => {
			const collectionRef = validatedFirestore.getCollectionRef(COLLECTIONS.USERS)

			expect(collectionRef).toBeDefined()
			expect(mockFirestore.collection).toHaveBeenCalledWith(mockDb, COLLECTIONS.USERS)
		})
	})
})

describe('createValidatedFirestore', () => {
	test('should create ValidatedFirestore instance', () => {
		const mockDb = { _mock: 'firestore' } as any
		const instance = createValidatedFirestore(mockDb)

		expect(instance).toBeInstanceOf(ValidatedFirestore)
	})
})

describe('createTypedService', () => {
	let validatedFirestore: ValidatedFirestore
	let userService: ReturnType<typeof createTypedService<TestUser>>

	beforeEach(() => {
		const mockDb = { _mock: 'firestore' } as any
		validatedFirestore = new ValidatedFirestore(mockDb)
		userService = createTypedService(validatedFirestore, COLLECTIONS.USERS, TestUserSchema)

		// Reset mocks
		Object.values(mockFirestore).forEach((mock: any) => {
			if (typeof mock === 'function' && 'mockReset' in mock) {
				mock.mockReset()
			}
		})

		mockFirestore.doc.mockReturnValue({ _type: 'docRef' })
		mockFirestore.collection.mockReturnValue({ _type: 'collectionRef' })
	})

	test('should create service with correct collection and schema', () => {
		expect(userService.collection).toBe(COLLECTIONS.USERS)
		expect(userService.schema).toBe(TestUserSchema)
	})

	test('create method should add document', async () => {
		mockFirestore.addDoc.mockResolvedValue({ id: 'user-new' })

		const userData = {
			name: 'John Doe',
			email: 'john@example.com'
		}

		const id = await userService.create(userData)

		expect(id).toBe('user-new')
		expect(mockFirestore.addDoc).toHaveBeenCalled()
	})

	test('get method should retrieve document', async () => {
		const userData = {
			id: 'user-123',
			name: 'John Doe',
			email: 'john@example.com',
			createdAt: '2024-01-01T00:00:00.000Z',
			updatedAt: '2024-01-01T00:00:00.000Z'
		}

		mockFirestore.getDoc.mockResolvedValue(createMockDocSnap(userData))

		const result = await userService.get('user-123')

		expect(result).toEqual(userData)
	})

	test('update method should update document', async () => {
		mockFirestore.updateDoc.mockResolvedValue(undefined)

		await userService.update('user-123', { name: 'Jane Doe' })

		expect(mockFirestore.updateDoc).toHaveBeenCalled()
	})

	test('delete method should delete document', async () => {
		mockFirestore.deleteDoc.mockResolvedValue(undefined)

		await userService.delete('user-123')

		expect(mockFirestore.deleteDoc).toHaveBeenCalled()
	})

	test('query method should query documents', async () => {
		const users = [
			{
				id: 'user-1',
				name: 'John Doe',
				email: 'john@example.com',
				createdAt: '2024-01-01T00:00:00.000Z',
				updatedAt: '2024-01-01T00:00:00.000Z'
			}
		]

		mockFirestore.getDocs.mockResolvedValue(createMockQuerySnap(users))

		const results = await userService.query(mockFirestore.where('age', '>', 18))

		expect(results).toHaveLength(1)
		expect(results[0].name).toBe('John Doe')
	})
})

describe('ValidationError', () => {
	test('should create error with correct properties', () => {
		const error = new ValidationError('Test error', 'users', 'user-123')

		expect(error.message).toBe('Test error')
		expect(error.collection).toBe('users')
		expect(error.docId).toBe('user-123')
		expect(error.name).toBe('ValidationError')
	})

	test('should include Zod error if provided', () => {
		const zodError = new z.ZodError([])
		const error = new ValidationError('Test error', 'users', 'user-123', zodError)

		expect(error.zodError).toBe(zodError)
	})
})
