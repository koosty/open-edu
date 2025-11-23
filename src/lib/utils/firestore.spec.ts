/**
 * Tests for Firestore Utilities
 */

import { describe, test, expect } from 'vitest'
import { hasToDate, convertTimestamps } from './firestore'

describe('hasToDate', () => {
	test('should return true for objects with toDate method', () => {
		const mockTimestamp = {
			toDate: () => new Date('2024-01-01'),
		}
		expect(hasToDate(mockTimestamp)).toBe(true)
	})

	test('should return false for null', () => {
		expect(hasToDate(null)).toBe(false)
	})

	test('should return false for undefined', () => {
		expect(hasToDate(undefined)).toBe(false)
	})

	test('should return false for strings', () => {
		expect(hasToDate('2024-01-01')).toBe(false)
	})

	test('should return false for numbers', () => {
		expect(hasToDate(123456789)).toBe(false)
	})

	test('should return false for objects without toDate', () => {
		expect(hasToDate({ date: new Date() })).toBe(false)
	})

	test('should return false for objects with non-function toDate', () => {
		expect(hasToDate({ toDate: 'not a function' })).toBe(false)
	})
})

describe('convertTimestamps', () => {
	test('should convert Firestore timestamps to ISO strings', () => {
		const mockDate = new Date('2024-01-01T12:00:00Z')
		const data = {
			id: 'test-123',
			name: 'Test Course',
			createdAt: { toDate: () => mockDate },
			updatedAt: { toDate: () => mockDate },
		}

		const result = convertTimestamps(data)

		expect(result.id).toBe('test-123')
		expect(result.name).toBe('Test Course')
		expect(result.createdAt).toBe('2024-01-01T12:00:00.000Z')
		expect(result.updatedAt).toBe('2024-01-01T12:00:00.000Z')
	})

	test('should not modify non-timestamp values', () => {
		const data = {
			id: 'test-123',
			name: 'Test Course',
			count: 42,
			active: true,
			tags: ['tag1', 'tag2'],
			metadata: { key: 'value' },
		}

		const result = convertTimestamps(data)

		expect(result).toEqual(data)
	})

	test('should handle mixed data with timestamps and regular values', () => {
		const mockDate = new Date('2024-01-01T12:00:00Z')
		const data = {
			id: 'test-123',
			title: 'Course Title',
			count: 10,
			createdAt: { toDate: () => mockDate },
			tags: ['js', 'ts'],
		}

		const result = convertTimestamps(data)

		expect(result.id).toBe('test-123')
		expect(result.title).toBe('Course Title')
		expect(result.count).toBe(10)
		expect(result.createdAt).toBe('2024-01-01T12:00:00.000Z')
		expect(result.tags).toEqual(['js', 'ts'])
	})

	test('should handle null data', () => {
		const result = convertTimestamps(null as any)
		expect(result).toBeNull()
	})

	test('should handle undefined data', () => {
		const result = convertTimestamps(undefined as any)
		expect(result).toBeUndefined()
	})

	test('should handle empty object', () => {
		const result = convertTimestamps({})
		expect(result).toEqual({})
	})

	test('should not mutate the original object', () => {
		const mockDate = new Date('2024-01-01T12:00:00Z')
		const original = {
			id: 'test-123',
			createdAt: { toDate: () => mockDate },
		}

		const result = convertTimestamps(original)

		expect(result.createdAt).toBe('2024-01-01T12:00:00.000Z')
		expect(original.createdAt).toEqual({ toDate: expect.any(Function) })
	})
})
