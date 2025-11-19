/**
 * Tests for Reading Position Service
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { 
	ReadingPositionManager, 
	shouldRestorePosition,
	type ReadingPosition 
} from './readingPosition'
import type { ReadingProgressState } from './readingProgress'

describe('ReadingPositionManager', () => {
	let manager: ReadingPositionManager
	const userId = 'user123'
	const courseId = 'course456'
	const lessonId = 'lesson789'

	beforeEach(() => {
		vi.useFakeTimers()
		manager = new ReadingPositionManager(userId, courseId, lessonId)
	})

	afterEach(() => {
		vi.restoreAllMocks()
		manager.cancel()
	})

	describe('scheduleSave', () => {
		it('should debounce save operations', () => {
			const saveSpy = vi.spyOn(manager as any, 'save').mockResolvedValue(undefined)

			const progressState: ReadingProgressState = {
				scrollPercentage: 25,
				scrollTop: 1000,
				documentHeight: 5000,
				viewportHeight: 800,
				timeSpent: 60,
				activeHeadingId: 'section-1',
				sectionsCompleted: []
			}

			// Schedule multiple saves
			manager.scheduleSave(progressState)
			manager.scheduleSave(progressState)
			manager.scheduleSave(progressState)

			// Should not save immediately
			expect(saveSpy).not.toHaveBeenCalled()

			// Fast-forward time
			vi.advanceTimersByTime(2000)

			// Should only save once
			expect(saveSpy).toHaveBeenCalledTimes(1)
		})

		it('should not schedule save if progress delta is too small', () => {
			// Set lastSavedProgress to simulate a previous save
			;(manager as any).lastSavedProgress = 25

			// Small change (less than 5%)
			const state: ReadingProgressState = {
				scrollPercentage: 27,
				scrollTop: 1000,
				documentHeight: 5000,
				viewportHeight: 800,
				timeSpent: 60,
				activeHeadingId: 'section-1',
				sectionsCompleted: []
			}

			manager.scheduleSave(state)

			// Should not schedule a new save
			expect((manager as any).saveTimer).toBeNull()
		})

		it('should save if progress delta exceeds threshold', () => {
			const saveSpy = vi.spyOn(manager as any, 'save').mockResolvedValue(undefined)

			const state1: ReadingProgressState = {
				scrollPercentage: 25,
				scrollTop: 1000,
				documentHeight: 5000,
				viewportHeight: 800,
				timeSpent: 60,
				activeHeadingId: 'section-1',
				sectionsCompleted: []
			}

			manager.scheduleSave(state1)
			vi.advanceTimersByTime(2000)

			// Large change (more than 5%)
			const state2: ReadingProgressState = {
				...state1,
				scrollPercentage: 35
			}

			manager.scheduleSave(state2)
			vi.advanceTimersByTime(2000)

			// Should save again
			expect(saveSpy).toHaveBeenCalledTimes(2)
		})
	})

	describe('cancel', () => {
		it('should cancel pending save operations', () => {
			const saveSpy = vi.spyOn(manager as any, 'save').mockResolvedValue(undefined)

			const progressState: ReadingProgressState = {
				scrollPercentage: 25,
				scrollTop: 1000,
				documentHeight: 5000,
				viewportHeight: 800,
				timeSpent: 60,
				activeHeadingId: 'section-1',
				sectionsCompleted: []
			}

			manager.scheduleSave(progressState)
			manager.cancel()

			vi.advanceTimersByTime(2000)

			// Should not save
			expect(saveSpy).not.toHaveBeenCalled()
		})
	})

	describe('flush', () => {
		it('should immediately save and cancel pending operations', async () => {
			const saveSpy = vi.spyOn(manager as any, 'save').mockResolvedValue(undefined)

			const progressState: ReadingProgressState = {
				scrollPercentage: 25,
				scrollTop: 1000,
				documentHeight: 5000,
				viewportHeight: 800,
				timeSpent: 60,
				activeHeadingId: 'section-1',
				sectionsCompleted: []
			}

			manager.scheduleSave(progressState)
			await manager.flush(progressState)

			// Should save immediately
			expect(saveSpy).toHaveBeenCalledTimes(1)

			vi.advanceTimersByTime(2000)

			// Should not save again from the scheduled operation
			expect(saveSpy).toHaveBeenCalledTimes(1)
		})
	})
})

describe('shouldRestorePosition', () => {
	it('should return false if position is null', () => {
		expect(shouldRestorePosition(null)).toBe(false)
	})

	it('should return false if scroll percentage is above 90%', () => {
		const position: ReadingPosition = {
			userId: 'user123',
			courseId: 'course456',
			lessonId: 'lesson789',
			scrollPercentage: 95,
			scrollTop: 5000,
			activeHeadingId: null,
			sectionsCompleted: [],
			timeSpent: 300,
			lastPosition: 5000,
			updatedAt: new Date()
		}

		expect(shouldRestorePosition(position)).toBe(false)
	})

	it('should return false if position is older than 7 days', () => {
		const eightDaysAgo = new Date()
		eightDaysAgo.setDate(eightDaysAgo.getDate() - 8)

		const position: ReadingPosition = {
			userId: 'user123',
			courseId: 'course456',
			lessonId: 'lesson789',
			scrollPercentage: 50,
			scrollTop: 2000,
			activeHeadingId: null,
			sectionsCompleted: [],
			timeSpent: 300,
			lastPosition: 2000,
			updatedAt: eightDaysAgo
		}

		expect(shouldRestorePosition(position)).toBe(false)
	})

	it('should return true for valid recent positions', () => {
		const position: ReadingPosition = {
			userId: 'user123',
			courseId: 'course456',
			lessonId: 'lesson789',
			scrollPercentage: 50,
			scrollTop: 2000,
			activeHeadingId: 'section-2',
			sectionsCompleted: ['section-1'],
			timeSpent: 300,
			lastPosition: 2000,
			updatedAt: new Date()
		}

		expect(shouldRestorePosition(position)).toBe(true)
	})

	it('should return true for positions at exactly 90%', () => {
		const position: ReadingPosition = {
			userId: 'user123',
			courseId: 'course456',
			lessonId: 'lesson789',
			scrollPercentage: 90,
			scrollTop: 4000,
			activeHeadingId: null,
			sectionsCompleted: [],
			timeSpent: 300,
			lastPosition: 4000,
			updatedAt: new Date()
		}

		expect(shouldRestorePosition(position)).toBe(true)
	})

	it('should return true for positions at exactly 7 days old', () => {
		const sevenDaysAgo = new Date()
		sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

		const position: ReadingPosition = {
			userId: 'user123',
			courseId: 'course456',
			lessonId: 'lesson789',
			scrollPercentage: 50,
			scrollTop: 2000,
			activeHeadingId: null,
			sectionsCompleted: [],
			timeSpent: 300,
			lastPosition: 2000,
			updatedAt: sevenDaysAgo
		}

		expect(shouldRestorePosition(position)).toBe(true)
	})
})
