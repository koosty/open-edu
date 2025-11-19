/**
 * Reading Progress Tracker Service
 * 
 * Tracks user's reading progress through lesson content including:
 * - Scroll position and percentage
 * - Reading time estimation
 * - Section-based progress
 * - Active heading detection
 */

export interface ReadingProgressState {
	scrollPercentage: number
	scrollTop: number
	documentHeight: number
	viewportHeight: number
	timeSpent: number // in seconds
	activeHeadingId: string | null
	sectionsCompleted: string[]
}

export interface ReadingProgressOptions {
	onProgressChange?: (state: ReadingProgressState) => void
	onHeadingChange?: (headingId: string | null) => void
	throttleMs?: number // Throttle scroll updates (default: 100ms)
	headingOffset?: number // Offset for heading detection (default: 100px)
}

export class ReadingProgressTracker {
	private state: ReadingProgressState
	private options: ReadingProgressOptions
	private startTime: number
	private scrollThrottleTimer: ReturnType<typeof setTimeout> | null = null
	private intersectionObserver: IntersectionObserver | null = null
	private timeInterval: ReturnType<typeof setInterval> | null = null
	private isActive: boolean = false

	constructor(options: ReadingProgressOptions = {}) {
		this.options = {
			throttleMs: 100,
			headingOffset: 100,
			...options
		}

		this.state = {
			scrollPercentage: 0,
			scrollTop: 0,
			documentHeight: 0,
			viewportHeight: 0,
			timeSpent: 0,
			activeHeadingId: null,
			sectionsCompleted: []
		}

		this.startTime = Date.now()
	}

	/**
	 * Start tracking reading progress
	 */
	start(): void {
		if (this.isActive) return
		this.isActive = true

		// Track scroll progress
		window.addEventListener('scroll', this.handleScroll)
		window.addEventListener('resize', this.handleResize)

		// Track time spent
		this.timeInterval = setInterval(() => {
			this.updateTimeSpent()
		}, 1000) // Update every second

		// Set up heading observation
		this.setupHeadingObserver()

		// Initial update
		this.updateScrollProgress()
	}

	/**
	 * Stop tracking reading progress
	 */
	stop(): void {
		if (!this.isActive) return
		this.isActive = false

		window.removeEventListener('scroll', this.handleScroll)
		window.removeEventListener('resize', this.handleResize)

		if (this.scrollThrottleTimer) {
			clearTimeout(this.scrollThrottleTimer)
			this.scrollThrottleTimer = null
		}

		if (this.timeInterval) {
			clearInterval(this.timeInterval)
			this.timeInterval = null
		}

		if (this.intersectionObserver) {
			this.intersectionObserver.disconnect()
			this.intersectionObserver = null
		}
	}

	/**
	 * Get current reading progress state
	 */
	getState(): ReadingProgressState {
		return { ...this.state }
	}

	/**
	 * Reset reading progress
	 */
	reset(): void {
		this.startTime = Date.now()
		this.state = {
			scrollPercentage: 0,
			scrollTop: 0,
			documentHeight: 0,
			viewportHeight: 0,
			timeSpent: 0,
			activeHeadingId: null,
			sectionsCompleted: []
		}
		this.updateScrollProgress()
	}

	/**
	 * Mark a section as completed
	 */
	markSectionCompleted(headingId: string): void {
		if (!this.state.sectionsCompleted.includes(headingId)) {
			this.state.sectionsCompleted.push(headingId)
			this.notifyProgressChange()
		}
	}

	/**
	 * Check if a section is completed
	 */
	isSectionCompleted(headingId: string): boolean {
		return this.state.sectionsCompleted.includes(headingId)
	}

	/**
	 * Get completion percentage based on sections
	 */
	getSectionCompletionPercentage(totalSections: number): number {
		if (totalSections === 0) return 0
		return Math.round((this.state.sectionsCompleted.length / totalSections) * 100)
	}

	private handleScroll = (): void => {
		if (this.scrollThrottleTimer) {
			clearTimeout(this.scrollThrottleTimer)
		}

		this.scrollThrottleTimer = setTimeout(() => {
			this.updateScrollProgress()
		}, this.options.throttleMs)
	}

	private handleResize = (): void => {
		this.updateScrollProgress()
	}

	private updateScrollProgress(): void {
		const scrollTop = window.scrollY || document.documentElement.scrollTop
		const documentHeight = Math.max(
			document.body.scrollHeight,
			document.body.offsetHeight,
			document.documentElement.clientHeight,
			document.documentElement.scrollHeight,
			document.documentElement.offsetHeight
		)
		const viewportHeight = window.innerHeight

		// Calculate scroll percentage
		const scrollableHeight = documentHeight - viewportHeight
		const scrollPercentage =
			scrollableHeight > 0 ? Math.min(Math.max((scrollTop / scrollableHeight) * 100, 0), 100) : 0

		this.state.scrollTop = scrollTop
		this.state.documentHeight = documentHeight
		this.state.viewportHeight = viewportHeight
		this.state.scrollPercentage = Math.round(scrollPercentage)

		this.notifyProgressChange()
	}

	private updateTimeSpent(): void {
		const now = Date.now()
		const elapsed = Math.floor((now - this.startTime) / 1000)
		this.state.timeSpent = elapsed
		this.notifyProgressChange()
	}

	private setupHeadingObserver(): void {
		// Create intersection observer to track which heading is currently visible
		const options = {
			rootMargin: `-${this.options.headingOffset}px 0px -70% 0px`,
			threshold: 0
		}

		this.intersectionObserver = new IntersectionObserver((entries) => {
			// Find the first intersecting heading
			for (const entry of entries) {
				if (entry.isIntersecting) {
					const headingId = entry.target.id
					if (headingId && headingId !== this.state.activeHeadingId) {
						this.state.activeHeadingId = headingId
						this.options.onHeadingChange?.(headingId)
						this.notifyProgressChange()
					}
					break
				}
			}
		}, options)

		// Observe all headings in the document
		const headings = document.querySelectorAll('h1[id], h2[id], h3[id], h4[id], h5[id], h6[id]')
		headings.forEach((heading) => {
			this.intersectionObserver?.observe(heading)
		})
	}

	private notifyProgressChange(): void {
		this.options.onProgressChange?.(this.getState())
	}
}

/**
 * Format time spent in human-readable format
 * e.g., "2m 30s" or "1h 15m"
 */
export function formatTimeSpent(seconds: number): string {
	if (seconds < 60) {
		return `${seconds}s`
	}

	const minutes = Math.floor(seconds / 60)
	const remainingSeconds = seconds % 60

	if (minutes < 60) {
		return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`
	}

	const hours = Math.floor(minutes / 60)
	const remainingMinutes = minutes % 60

	if (remainingMinutes > 0) {
		return `${hours}h ${remainingMinutes}m`
	}

	return `${hours}h`
}

/**
 * Estimate remaining reading time based on current progress
 * @param totalWords Total word count
 * @param wordsRead Words read so far
 * @param wordsPerMinute Average reading speed (default: 200)
 */
export function estimateRemainingTime(
	totalWords: number,
	wordsRead: number,
	wordsPerMinute: number = 200
): number {
	const remainingWords = totalWords - wordsRead
	return Math.ceil((remainingWords / wordsPerMinute) * 60) // Return in seconds
}

/**
 * Calculate words read based on scroll percentage
 * @param totalWords Total word count
 * @param scrollPercentage Current scroll percentage (0-100)
 */
export function calculateWordsRead(totalWords: number, scrollPercentage: number): number {
	return Math.floor((totalWords * scrollPercentage) / 100)
}
