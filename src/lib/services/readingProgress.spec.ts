// Unit tests for reading progress tracking
// Tests scroll tracking, time calculation, and section completion

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
	ReadingProgressTracker,
	formatTimeSpent,
	estimateRemainingTime,
	calculateWordsRead,
	type ReadingProgressState
} from './readingProgress'

describe('ReadingProgressTracker', () => {
	let tracker: ReadingProgressTracker
	
	beforeEach(() => {
		// Mock window and document for testing
		vi.stubGlobal('window', {
			scrollY: 0,
			innerHeight: 800,
			addEventListener: vi.fn(),
			removeEventListener: vi.fn()
		})
		
		vi.stubGlobal('document', {
			documentElement: {
				scrollTop: 0,
				clientHeight: 800,
				scrollHeight: 2000,
				offsetHeight: 2000
			},
			body: {
				scrollHeight: 2000,
				offsetHeight: 2000
			},
			querySelectorAll: vi.fn(() => [])
		})
		
		// Mock IntersectionObserver as a proper constructor
		global.IntersectionObserver = vi.fn(function(this: any) {
			this.observe = vi.fn()
			this.disconnect = vi.fn()
			this.unobserve = vi.fn()
		}) as any
	})
	
	afterEach(() => {
		if (tracker) {
			tracker.stop()
		}
		vi.clearAllMocks()
		vi.unstubAllGlobals()
	})
	
	it('should initialize with default state', () => {
		tracker = new ReadingProgressTracker()
		const state = tracker.getState()
		
		expect(state.scrollPercentage).toBe(0)
		expect(state.scrollTop).toBe(0)
		expect(state.timeSpent).toBe(0)
		expect(state.activeHeadingId).toBeNull()
		expect(state.sectionsCompleted).toEqual([])
	})
	
	it('should start tracking when start() is called', () => {
		tracker = new ReadingProgressTracker()
		tracker.start()
		
		expect(window.addEventListener).toHaveBeenCalledWith('scroll', expect.any(Function))
		expect(window.addEventListener).toHaveBeenCalledWith('resize', expect.any(Function))
	})
	
	it('should stop tracking when stop() is called', () => {
		tracker = new ReadingProgressTracker()
		tracker.start()
		tracker.stop()
		
		expect(window.removeEventListener).toHaveBeenCalledWith('scroll', expect.any(Function))
		expect(window.removeEventListener).toHaveBeenCalledWith('resize', expect.any(Function))
	})
	
	it('should not start twice', () => {
		tracker = new ReadingProgressTracker()
		tracker.start()
		tracker.start() // Should be ignored
		
		// addEventListener should only be called once per event
		expect(window.addEventListener).toHaveBeenCalledTimes(2) // scroll + resize
	})
	
	it('should calculate scroll percentage correctly', () => {
		tracker = new ReadingProgressTracker()
		tracker.start()
		
		const state = tracker.getState()
		
		// At top: scrollY=0, scrollableHeight=1200 (2000-800)
		expect(state.scrollPercentage).toBe(0)
		
		// Document height and viewport should be captured
		expect(state.documentHeight).toBe(2000)
		expect(state.viewportHeight).toBe(800)
	})
	
	it('should reset state when reset() is called', () => {
		tracker = new ReadingProgressTracker()
		tracker.start()
		
		// Simulate some progress
		tracker.markSectionCompleted('section-1')
		
		tracker.reset()
		const state = tracker.getState()
		
		expect(state.scrollPercentage).toBe(0)
		expect(state.timeSpent).toBe(0)
		expect(state.sectionsCompleted).toEqual([])
	})
	
	it('should mark sections as completed', () => {
		tracker = new ReadingProgressTracker()
		
		tracker.markSectionCompleted('intro')
		tracker.markSectionCompleted('chapter-1')
		
		expect(tracker.isSectionCompleted('intro')).toBe(true)
		expect(tracker.isSectionCompleted('chapter-1')).toBe(true)
		expect(tracker.isSectionCompleted('chapter-2')).toBe(false)
	})
	
	it('should not duplicate completed sections', () => {
		tracker = new ReadingProgressTracker()
		
		tracker.markSectionCompleted('intro')
		tracker.markSectionCompleted('intro') // Duplicate
		
		const state = tracker.getState()
		expect(state.sectionsCompleted).toEqual(['intro'])
	})
	
	it('should calculate section completion percentage', () => {
		tracker = new ReadingProgressTracker()
		
		tracker.markSectionCompleted('section-1')
		tracker.markSectionCompleted('section-2')
		
		// 2 out of 5 sections = 40%
		expect(tracker.getSectionCompletionPercentage(5)).toBe(40)
		
		// All sections completed
		tracker.markSectionCompleted('section-3')
		tracker.markSectionCompleted('section-4')
		tracker.markSectionCompleted('section-5')
		expect(tracker.getSectionCompletionPercentage(5)).toBe(100)
	})
	
	it('should handle zero sections gracefully', () => {
		tracker = new ReadingProgressTracker()
		expect(tracker.getSectionCompletionPercentage(0)).toBe(0)
	})
	
	it('should call onProgressChange callback', () => {
		const onProgressChange = vi.fn()
		tracker = new ReadingProgressTracker({ onProgressChange })
		
		tracker.start()
		
		// Callback should be called during start (initial update)
		expect(onProgressChange).toHaveBeenCalled()
		
		const lastCall = onProgressChange.mock.calls[onProgressChange.mock.calls.length - 1]
		const state = lastCall[0] as ReadingProgressState
		
		expect(state).toHaveProperty('scrollPercentage')
		expect(state).toHaveProperty('timeSpent')
	})
	
	it('should use custom throttle time', () => {
		tracker = new ReadingProgressTracker({ throttleMs: 500 })
		expect(tracker).toBeDefined()
		// Throttle is internal, just verify constructor accepts it
	})
	
	it('should use custom heading offset', () => {
		tracker = new ReadingProgressTracker({ headingOffset: 200 })
		expect(tracker).toBeDefined()
		// Offset is internal, just verify constructor accepts it
	})
	
	it('should setup IntersectionObserver for headings', () => {
		tracker = new ReadingProgressTracker()
		tracker.start()
		
		expect(IntersectionObserver).toHaveBeenCalled()
	})
})

describe('formatTimeSpent', () => {
	it('should format seconds only', () => {
		expect(formatTimeSpent(0)).toBe('0s')
		expect(formatTimeSpent(30)).toBe('30s')
		expect(formatTimeSpent(59)).toBe('59s')
	})
	
	it('should format minutes and seconds', () => {
		expect(formatTimeSpent(60)).toBe('1m')
		expect(formatTimeSpent(90)).toBe('1m 30s')
		expect(formatTimeSpent(125)).toBe('2m 5s')
		expect(formatTimeSpent(3599)).toBe('59m 59s')
	})
	
	it('should format hours and minutes', () => {
		expect(formatTimeSpent(3600)).toBe('1h')
		expect(formatTimeSpent(3660)).toBe('1h 1m')
		expect(formatTimeSpent(5400)).toBe('1h 30m')
		expect(formatTimeSpent(7200)).toBe('2h')
	})
	
	it('should handle large time values', () => {
		expect(formatTimeSpent(36000)).toBe('10h')
		expect(formatTimeSpent(90000)).toBe('25h')
	})
})

describe('estimateRemainingTime', () => {
	it('should estimate remaining time at default speed (200 wpm)', () => {
		const totalWords = 1000
		const wordsRead = 500
		
		// 500 words remaining at 200 wpm = 2.5 minutes = 150 seconds
		const remaining = estimateRemainingTime(totalWords, wordsRead)
		expect(remaining).toBe(150)
	})
	
	it('should estimate remaining time at custom speed', () => {
		const totalWords = 1000
		const wordsRead = 500
		const wpm = 250
		
		// 500 words remaining at 250 wpm = 2 minutes = 120 seconds
		const remaining = estimateRemainingTime(totalWords, wordsRead, wpm)
		expect(remaining).toBe(120)
	})
	
	it('should handle completion (no words remaining)', () => {
		const remaining = estimateRemainingTime(1000, 1000)
		expect(remaining).toBe(0)
	})
	
	it('should handle no progress', () => {
		const remaining = estimateRemainingTime(1000, 0, 200)
		// 1000 words at 200 wpm = 5 minutes = 300 seconds
		expect(remaining).toBe(300)
	})
	
	it('should round up to nearest second', () => {
		// 100 words at 200 wpm = 0.5 minutes = 30 seconds
		const remaining = estimateRemainingTime(100, 0, 200)
		expect(remaining).toBe(30)
	})
	
	it('should handle fast readers', () => {
		// Very fast reader: 500 wpm
		const remaining = estimateRemainingTime(1000, 0, 500)
		// 1000 words at 500 wpm = 2 minutes = 120 seconds
		expect(remaining).toBe(120)
	})
	
	it('should handle slow readers', () => {
		// Slow reader: 100 wpm
		const remaining = estimateRemainingTime(1000, 0, 100)
		// 1000 words at 100 wpm = 10 minutes = 600 seconds
		expect(remaining).toBe(600)
	})
})

describe('calculateWordsRead', () => {
	it('should calculate words at start', () => {
		expect(calculateWordsRead(1000, 0)).toBe(0)
	})
	
	it('should calculate words at 50% scroll', () => {
		expect(calculateWordsRead(1000, 50)).toBe(500)
	})
	
	it('should calculate words at completion', () => {
		expect(calculateWordsRead(1000, 100)).toBe(1000)
	})
	
	it('should handle decimal scroll percentages', () => {
		expect(calculateWordsRead(1000, 25.5)).toBe(255)
		expect(calculateWordsRead(1000, 33.3)).toBe(333)
	})
	
	it('should round down to nearest word', () => {
		// 1000 words * 0.333 = 333.3 -> rounds down to 333
		expect(calculateWordsRead(1000, 33.3)).toBe(333)
	})
	
	it('should handle large word counts', () => {
		expect(calculateWordsRead(10000, 75)).toBe(7500)
	})
	
	it('should handle small word counts', () => {
		expect(calculateWordsRead(50, 50)).toBe(25)
	})
	
	it('should handle zero words', () => {
		expect(calculateWordsRead(0, 50)).toBe(0)
	})
})
