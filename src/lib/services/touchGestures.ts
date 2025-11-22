/**
 * Touch Gestures Service
 * 
 * Provides touch gesture detection for mobile navigation:
 * - Swipe left/right for lesson navigation
 * - Configurable thresholds and sensitivity
 * - Visual feedback during gesture
 */

export type SwipeDirection = 'left' | 'right' | 'up' | 'down'

export interface SwipeEvent {
	direction: SwipeDirection
	distance: number
	duration: number
	velocity: number
}

export interface TouchGestureOptions {
	/** Minimum distance in pixels to trigger swipe (default: 50) */
	minSwipeDistance?: number
	/** Maximum time in ms for swipe gesture (default: 300) */
	maxSwipeTime?: number
	/** Minimum velocity in px/ms to trigger swipe (default: 0.3) */
	minVelocity?: number
	/** Maximum vertical deviation for horizontal swipe (default: 100) */
	maxVerticalDeviation?: number
	/** Edge threshold in pixels to prevent swipe from edge (default: 20) */
	edgeThreshold?: number
	/** Callback when swipe is detected */
	onSwipe?: (event: SwipeEvent) => void
	/** Callback during swipe for visual feedback */
	onSwipeMove?: (deltaX: number, deltaY: number) => void
	/** Callback when swipe ends/cancels */
	onSwipeEnd?: () => void
}

interface TouchState {
	startX: number
	startY: number
	currentX: number
	currentY: number
	startTime: number
	isTracking: boolean
}

/**
 * Touch Gesture Manager
 * Handles touch events and detects swipe gestures
 */
export class TouchGestureManager {
	private element: HTMLElement
	private options: Required<TouchGestureOptions>
	private state: TouchState
	private boundHandlers: {
		touchStart: (e: TouchEvent) => void
		touchMove: (e: TouchEvent) => void
		touchEnd: (e: TouchEvent) => void
		touchCancel: (e: TouchEvent) => void
	}

	constructor(element: HTMLElement, options: TouchGestureOptions = {}) {
		this.element = element
		this.options = {
			minSwipeDistance: options.minSwipeDistance ?? 50,
			maxSwipeTime: options.maxSwipeTime ?? 300,
			minVelocity: options.minVelocity ?? 0.3,
			maxVerticalDeviation: options.maxVerticalDeviation ?? 100,
			edgeThreshold: options.edgeThreshold ?? 20,
			onSwipe: options.onSwipe ?? (() => {}),
			onSwipeMove: options.onSwipeMove ?? (() => {}),
			onSwipeEnd: options.onSwipeEnd ?? (() => {})
		}

		this.state = {
			startX: 0,
			startY: 0,
			currentX: 0,
			currentY: 0,
			startTime: 0,
			isTracking: false
		}

		// Bind handlers
		this.boundHandlers = {
			touchStart: this.handleTouchStart.bind(this),
			touchMove: this.handleTouchMove.bind(this),
			touchEnd: this.handleTouchEnd.bind(this),
			touchCancel: this.handleTouchCancel.bind(this)
		}

		this.attach()
	}

	private attach() {
		this.element.addEventListener('touchstart', this.boundHandlers.touchStart, { passive: false })
		this.element.addEventListener('touchmove', this.boundHandlers.touchMove, { passive: false })
		this.element.addEventListener('touchend', this.boundHandlers.touchEnd)
		this.element.addEventListener('touchcancel', this.boundHandlers.touchCancel)
	}

	private handleTouchStart(e: TouchEvent) {
		if (e.touches.length !== 1) return

		const touch = e.touches[0]
		
		// Ignore touches near screen edges (could be system gestures)
		if (
			touch.clientX < this.options.edgeThreshold ||
			touch.clientX > window.innerWidth - this.options.edgeThreshold
		) {
			return
		}

		this.state = {
			startX: touch.clientX,
			startY: touch.clientY,
			currentX: touch.clientX,
			currentY: touch.clientY,
			startTime: Date.now(),
			isTracking: true
		}
	}

	private handleTouchMove(e: TouchEvent) {
		if (!this.state.isTracking || e.touches.length !== 1) return

		const touch = e.touches[0]
		this.state.currentX = touch.clientX
		this.state.currentY = touch.clientY

		const deltaX = this.state.currentX - this.state.startX
		const deltaY = this.state.currentY - this.state.startY

		// Check if it's a horizontal swipe (more horizontal than vertical)
		if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 10) {
			// Prevent default to avoid page scrolling during swipe
			e.preventDefault()
			
			// Call move callback for visual feedback
			this.options.onSwipeMove(deltaX, deltaY)
		}
	}

	private handleTouchEnd(_e: TouchEvent) {
		if (!this.state.isTracking) return

		this.processSwipe()
		this.resetState()
	}

	private handleTouchCancel(_e: TouchEvent) {
		if (!this.state.isTracking) return
		
		this.options.onSwipeEnd()
		this.resetState()
	}

	private processSwipe() {
		const deltaX = this.state.currentX - this.state.startX
		const deltaY = this.state.currentY - this.state.startY
		const duration = Date.now() - this.state.startTime

		// Check if vertical deviation is too large (not a horizontal swipe)
		if (Math.abs(deltaY) > this.options.maxVerticalDeviation) {
			this.options.onSwipeEnd()
			return
		}

		// Check if swipe is fast enough
		if (duration > this.options.maxSwipeTime) {
			this.options.onSwipeEnd()
			return
		}

		const distance = Math.abs(deltaX)
		const velocity = distance / duration

		// Check if swipe meets minimum distance and velocity
		if (distance < this.options.minSwipeDistance || velocity < this.options.minVelocity) {
			this.options.onSwipeEnd()
			return
		}

		// Determine direction
		const direction: SwipeDirection = deltaX > 0 ? 'right' : 'left'

		// Trigger swipe callback
		this.options.onSwipe({
			direction,
			distance,
			duration,
			velocity
		})

		this.options.onSwipeEnd()
	}

	private resetState() {
		this.state.isTracking = false
		this.state.startX = 0
		this.state.startY = 0
		this.state.currentX = 0
		this.state.currentY = 0
		this.state.startTime = 0
	}

	/**
	 * Update options dynamically
	 */
	updateOptions(options: Partial<TouchGestureOptions>) {
		this.options = {
			...this.options,
			...options
		}
	}

	/**
	 * Clean up event listeners
	 */
	destroy() {
		this.element.removeEventListener('touchstart', this.boundHandlers.touchStart)
		this.element.removeEventListener('touchmove', this.boundHandlers.touchMove)
		this.element.removeEventListener('touchend', this.boundHandlers.touchEnd)
		this.element.removeEventListener('touchcancel', this.boundHandlers.touchCancel)
	}
}

/**
 * Utility function to create a touch gesture manager
 */
export function createTouchGesture(
	element: HTMLElement,
	options: TouchGestureOptions = {}
): TouchGestureManager {
	return new TouchGestureManager(element, options)
}
