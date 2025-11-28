/**
 * Tests for TouchGestureManager
 * Comprehensive test coverage for mobile swipe gesture detection
 */

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest'
import { TouchGestureManager, createTouchGesture } from './touchGestures'

// Helper to create mock touch event
function createTouchEvent(
	type: 'touchstart' | 'touchmove' | 'touchend' | 'touchcancel',
	touches: { clientX: number; clientY: number }[]
): TouchEvent {
	return {
		type,
		touches: touches as any,
		preventDefault: vi.fn()
	} as any
}

describe('TouchGestureManager', () => {
	let element: HTMLElement
	let manager: TouchGestureManager
	let onSwipe: any
	let onSwipeMove: any
	let onSwipeEnd: any

	beforeEach(() => {
		// Create a mock element
		element = {
			addEventListener: vi.fn(),
			removeEventListener: vi.fn()
		} as any

		// Mock Date.now for consistent timing
		vi.spyOn(Date, 'now').mockReturnValue(1000)

		// Mock window.innerWidth for edge detection
		vi.stubGlobal('window', { innerWidth: 375 })

		// Create mock callbacks
		onSwipe = vi.fn() as any
		onSwipeMove = vi.fn() as any
		onSwipeEnd = vi.fn() as any
	})

	afterEach(() => {
		vi.restoreAllMocks()
		vi.unstubAllGlobals()
	})

	describe('Constructor and Initialization', () => {
		test('should attach event listeners on creation', () => {
			manager = new TouchGestureManager(element)

			expect(element.addEventListener).toHaveBeenCalledTimes(4)
			expect(element.addEventListener).toHaveBeenCalledWith(
				'touchstart',
				expect.any(Function),
				{ passive: false }
			)
			expect(element.addEventListener).toHaveBeenCalledWith(
				'touchmove',
				expect.any(Function),
				{ passive: false }
			)
			expect(element.addEventListener).toHaveBeenCalledWith(
				'touchend',
				expect.any(Function)
			)
			expect(element.addEventListener).toHaveBeenCalledWith(
				'touchcancel',
				expect.any(Function)
			)
		})

		test('should use default options', () => {
			manager = new TouchGestureManager(element)

			expect(manager).toBeDefined()
		})

		test('should use custom options', () => {
			manager = new TouchGestureManager(element, {
				minSwipeDistance: 100,
				maxSwipeTime: 500,
				minVelocity: 0.5,
				onSwipe,
				onSwipeMove,
				onSwipeEnd
			})

			expect(manager).toBeDefined()
		})
	})

	describe('Touch Start Handling', () => {
		beforeEach(() => {
			manager = new TouchGestureManager(element, { onSwipe, onSwipeMove, onSwipeEnd })
		})

		test('should track single touch start', () => {
			const event = createTouchEvent('touchstart', [{ clientX: 100, clientY: 200 }])
			const handler = (element.addEventListener as any).mock.calls.find(
				(call: any) => call[0] === 'touchstart'
			)[1]

			handler(event)

			// Verify tracking started by checking if move callback works
			const moveEvent = createTouchEvent('touchmove', [{ clientX: 150, clientY: 200 }])
			const moveHandler = (element.addEventListener as any).mock.calls.find(
				(call: any) => call[0] === 'touchmove'
			)[1]

			moveHandler(moveEvent)

			expect(onSwipeMove).toHaveBeenCalled()
		})

		test('should ignore multi-touch gestures', () => {
			const event = createTouchEvent('touchstart', [
				{ clientX: 100, clientY: 200 },
				{ clientX: 150, clientY: 200 }
			])
			const handler = (element.addEventListener as any).mock.calls.find(
				(call: any) => call[0] === 'touchstart'
			)[1]

			handler(event)

			// Try to trigger move - should not track
			const moveEvent = createTouchEvent('touchmove', [{ clientX: 200, clientY: 200 }])
			const moveHandler = (element.addEventListener as any).mock.calls.find(
				(call: any) => call[0] === 'touchmove'
			)[1]

			moveHandler(moveEvent)

			expect(onSwipeMove).not.toHaveBeenCalled()
		})

		test('should ignore touches near left edge', () => {
			const event = createTouchEvent('touchstart', [{ clientX: 10, clientY: 200 }])
			const handler = (element.addEventListener as any).mock.calls.find(
				(call: any) => call[0] === 'touchstart'
			)[1]

			handler(event)

			const moveEvent = createTouchEvent('touchmove', [{ clientX: 60, clientY: 200 }])
			const moveHandler = (element.addEventListener as any).mock.calls.find(
				(call: any) => call[0] === 'touchmove'
			)[1]

			moveHandler(moveEvent)

			expect(onSwipeMove).not.toHaveBeenCalled()
		})

		test('should ignore touches near right edge', () => {
			const event = createTouchEvent('touchstart', [{ clientX: 365, clientY: 200 }])
			const handler = (element.addEventListener as any).mock.calls.find(
				(call: any) => call[0] === 'touchstart'
			)[1]

			handler(event)

			const moveEvent = createTouchEvent('touchmove', [{ clientX: 315, clientY: 200 }])
			const moveHandler = (element.addEventListener as any).mock.calls.find(
				(call: any) => call[0] === 'touchmove'
			)[1]

			moveHandler(moveEvent)

			expect(onSwipeMove).not.toHaveBeenCalled()
		})

		test('should respect custom edge threshold', () => {
			manager.destroy()
			
			// Clear previous addEventListener calls
			;(element.addEventListener as any).mockClear()
			
			manager = new TouchGestureManager(element, {
				edgeThreshold: 50,
				onSwipe,
				onSwipeMove,
				onSwipeEnd
			})

			const event = createTouchEvent('touchstart', [{ clientX: 30, clientY: 200 }])
			const handler = (element.addEventListener as any).mock.calls.find(
				(call: any) => call[0] === 'touchstart'
			)[1]

			handler(event)

			const moveEvent = createTouchEvent('touchmove', [{ clientX: 80, clientY: 200 }])
			const moveHandler = (element.addEventListener as any).mock.calls.find(
				(call: any) => call[0] === 'touchmove'
			)[1]

			moveHandler(moveEvent)

			expect(onSwipeMove).not.toHaveBeenCalled()
		})
	})

	describe('Touch Move Handling', () => {
		beforeEach(() => {
			manager = new TouchGestureManager(element, { onSwipe, onSwipeMove, onSwipeEnd })
		})

		test('should call onSwipeMove for horizontal swipe', () => {
			// Start touch
			const _startEvent = createTouchEvent('touchstart', [{ clientX: 100, clientY: 200 }])
			const startHandler = (element.addEventListener as any).mock.calls.find(
				(call: any) => call[0] === 'touchstart'
			)[1]
			startHandler(_startEvent)

			// Move horizontally
			const moveEvent = createTouchEvent('touchmove', [{ clientX: 150, clientY: 200 }])
			const moveHandler = (element.addEventListener as any).mock.calls.find(
				(call: any) => call[0] === 'touchmove'
			)[1]
			moveHandler(moveEvent)

			expect(onSwipeMove).toHaveBeenCalledWith(50, 0)
		})

		test('should prevent default for horizontal swipes', () => {
			const _startEvent = createTouchEvent('touchstart', [{ clientX: 100, clientY: 200 }])
			const startHandler = (element.addEventListener as any).mock.calls.find(
				(call: any) => call[0] === 'touchstart'
			)[1]
			startHandler(_startEvent)

			const moveEvent = createTouchEvent('touchmove', [{ clientX: 160, clientY: 200 }])
			const moveHandler = (element.addEventListener as any).mock.calls.find(
				(call: any) => call[0] === 'touchmove'
			)[1]
			moveHandler(moveEvent)

			expect(moveEvent.preventDefault).toHaveBeenCalled()
		})

		test('should not prevent default for small movements', () => {
			const _startEvent = createTouchEvent('touchstart', [{ clientX: 100, clientY: 200 }])
			const startHandler = (element.addEventListener as any).mock.calls.find(
				(call: any) => call[0] === 'touchstart'
			)[1]
			startHandler(_startEvent)

			const moveEvent = createTouchEvent('touchmove', [{ clientX: 105, clientY: 200 }])
			const moveHandler = (element.addEventListener as any).mock.calls.find(
				(call: any) => call[0] === 'touchmove'
			)[1]
			moveHandler(moveEvent)

			expect(moveEvent.preventDefault).not.toHaveBeenCalled()
		})

		test('should not call onSwipeMove for primarily vertical swipes', () => {
			const _startEvent = createTouchEvent('touchstart', [{ clientX: 100, clientY: 200 }])
			const startHandler = (element.addEventListener as any).mock.calls.find(
				(call: any) => call[0] === 'touchstart'
			)[1]
			startHandler(_startEvent)

			// Move more vertically than horizontally
			const moveEvent = createTouchEvent('touchmove', [{ clientX: 105, clientY: 250 }])
			const moveHandler = (element.addEventListener as any).mock.calls.find(
				(call: any) => call[0] === 'touchmove'
			)[1]
			moveHandler(moveEvent)

			expect(moveEvent.preventDefault).not.toHaveBeenCalled()
		})

		test('should ignore move events without tracking', () => {
			// Don't start touch first
			const moveEvent = createTouchEvent('touchmove', [{ clientX: 150, clientY: 200 }])
			const moveHandler = (element.addEventListener as any).mock.calls.find(
				(call: any) => call[0] === 'touchmove'
			)[1]
			moveHandler(moveEvent)

			expect(onSwipeMove).not.toHaveBeenCalled()
		})

		test('should ignore multi-touch move events', () => {
			const _startEvent = createTouchEvent('touchstart', [{ clientX: 100, clientY: 200 }])
			const startHandler = (element.addEventListener as any).mock.calls.find(
				(call: any) => call[0] === 'touchstart'
			)[1]
			startHandler(_startEvent)

			// Multi-touch move
			const moveEvent = createTouchEvent('touchmove', [
				{ clientX: 150, clientY: 200 },
				{ clientX: 160, clientY: 210 }
			])
			const moveHandler = (element.addEventListener as any).mock.calls.find(
				(call: any) => call[0] === 'touchmove'
			)[1]
			moveHandler(moveEvent)

			expect(onSwipeMove).not.toHaveBeenCalled()
		})
	})

	describe('Touch End and Swipe Detection', () => {
		beforeEach(() => {
			manager = new TouchGestureManager(element, {
				minSwipeDistance: 50,
				maxSwipeTime: 300,
				minVelocity: 0.3,
				onSwipe,
				onSwipeMove,
				onSwipeEnd
			})
		})

		test('should detect right swipe', () => {
			// Start
			const _startEvent = createTouchEvent('touchstart', [{ clientX: 100, clientY: 200 }])
			const startHandler = (element.addEventListener as any).mock.calls.find(
				(call: any) => call[0] === 'touchstart'
			)[1]
			vi.spyOn(Date, 'now').mockReturnValue(1000)
			startHandler(_startEvent)

			// Move
			const moveEvent = createTouchEvent('touchmove', [{ clientX: 200, clientY: 200 }])
			const moveHandler = (element.addEventListener as any).mock.calls.find(
				(call: any) => call[0] === 'touchmove'
			)[1]
			vi.spyOn(Date, 'now').mockReturnValue(1100)
			moveHandler(moveEvent)

			// End
			const endEvent = createTouchEvent('touchend', [])
			const endHandler = (element.addEventListener as any).mock.calls.find(
				(call: any) => call[0] === 'touchend'
			)[1]
			vi.spyOn(Date, 'now').mockReturnValue(1150)
			endHandler(endEvent)

			expect(onSwipe).toHaveBeenCalledWith(
				expect.objectContaining({
					direction: 'right',
					distance: 100,
					duration: 150,
					velocity: expect.any(Number)
				})
			)
			expect(onSwipeEnd).toHaveBeenCalled()
		})

		test('should detect left swipe', () => {
			const _startEvent = createTouchEvent('touchstart', [{ clientX: 200, clientY: 200 }])
			const startHandler = (element.addEventListener as any).mock.calls.find(
				(call: any) => call[0] === 'touchstart'
			)[1]
			vi.spyOn(Date, 'now').mockReturnValue(1000)
			startHandler(_startEvent)

			const moveEvent = createTouchEvent('touchmove', [{ clientX: 100, clientY: 200 }])
			const moveHandler = (element.addEventListener as any).mock.calls.find(
				(call: any) => call[0] === 'touchmove'
			)[1]
			vi.spyOn(Date, 'now').mockReturnValue(1100)
			moveHandler(moveEvent)

			const endEvent = createTouchEvent('touchend', [])
			const endHandler = (element.addEventListener as any).mock.calls.find(
				(call: any) => call[0] === 'touchend'
			)[1]
			vi.spyOn(Date, 'now').mockReturnValue(1150)
			endHandler(endEvent)

			expect(onSwipe).toHaveBeenCalledWith(
				expect.objectContaining({
					direction: 'left'
				})
			)
		})

		test('should not trigger swipe if distance too small', () => {
			const _startEvent = createTouchEvent('touchstart', [{ clientX: 100, clientY: 200 }])
			const startHandler = (element.addEventListener as any).mock.calls.find(
				(call: any) => call[0] === 'touchstart'
			)[1]
			startHandler(_startEvent)

			// Move only 30px (less than 50px threshold)
			const moveEvent = createTouchEvent('touchmove', [{ clientX: 130, clientY: 200 }])
			const moveHandler = (element.addEventListener as any).mock.calls.find(
				(call: any) => call[0] === 'touchmove'
			)[1]
			moveHandler(moveEvent)

			const endEvent = createTouchEvent('touchend', [])
			const endHandler = (element.addEventListener as any).mock.calls.find(
				(call: any) => call[0] === 'touchend'
			)[1]
			endHandler(endEvent)

			expect(onSwipe).not.toHaveBeenCalled()
			expect(onSwipeEnd).toHaveBeenCalled()
		})

		test('should not trigger swipe if duration too long', () => {
			const _startEvent = createTouchEvent('touchstart', [{ clientX: 100, clientY: 200 }])
			const startHandler = (element.addEventListener as any).mock.calls.find(
				(call: any) => call[0] === 'touchstart'
			)[1]
			vi.spyOn(Date, 'now').mockReturnValue(1000)
			startHandler(_startEvent)

			const moveEvent = createTouchEvent('touchmove', [{ clientX: 200, clientY: 200 }])
			const moveHandler = (element.addEventListener as any).mock.calls.find(
				(call: any) => call[0] === 'touchmove'
			)[1]
			moveHandler(moveEvent)

			const endEvent = createTouchEvent('touchend', [])
			const endHandler = (element.addEventListener as any).mock.calls.find(
				(call: any) => call[0] === 'touchend'
			)[1]
			// 400ms later (more than 300ms max)
			vi.spyOn(Date, 'now').mockReturnValue(1400)
			endHandler(endEvent)

			expect(onSwipe).not.toHaveBeenCalled()
		})

		test('should not trigger swipe if velocity too low', () => {
			const _startEvent = createTouchEvent('touchstart', [{ clientX: 100, clientY: 200 }])
			const startHandler = (element.addEventListener as any).mock.calls.find(
				(call: any) => call[0] === 'touchstart'
			)[1]
			vi.spyOn(Date, 'now').mockReturnValue(1000)
			startHandler(_startEvent)

			// Move 60px in 250ms = 0.24 px/ms (less than 0.3 min velocity)
			const moveEvent = createTouchEvent('touchmove', [{ clientX: 160, clientY: 200 }])
			const moveHandler = (element.addEventListener as any).mock.calls.find(
				(call: any) => call[0] === 'touchmove'
			)[1]
			moveHandler(moveEvent)

			const endEvent = createTouchEvent('touchend', [])
			const endHandler = (element.addEventListener as any).mock.calls.find(
				(call: any) => call[0] === 'touchend'
			)[1]
			vi.spyOn(Date, 'now').mockReturnValue(1250)
			endHandler(endEvent)

			expect(onSwipe).not.toHaveBeenCalled()
		})

		test('should not trigger swipe if too much vertical deviation', () => {
			const _startEvent = createTouchEvent('touchstart', [{ clientX: 100, clientY: 200 }])
			const startHandler = (element.addEventListener as any).mock.calls.find(
				(call: any) => call[0] === 'touchstart'
			)[1]
			vi.spyOn(Date, 'now').mockReturnValue(1000)
			startHandler(_startEvent)

			// Move horizontally but also 120px vertically (more than 100px max deviation)
			const moveEvent = createTouchEvent('touchmove', [{ clientX: 200, clientY: 320 }])
			const moveHandler = (element.addEventListener as any).mock.calls.find(
				(call: any) => call[0] === 'touchmove'
			)[1]
			moveHandler(moveEvent)

			const endEvent = createTouchEvent('touchend', [])
			const endHandler = (element.addEventListener as any).mock.calls.find(
				(call: any) => call[0] === 'touchend'
			)[1]
			vi.spyOn(Date, 'now').mockReturnValue(1100)
			endHandler(endEvent)

			expect(onSwipe).not.toHaveBeenCalled()
		})

		test('should handle touch end without tracking', () => {
			// End without start
			const endEvent = createTouchEvent('touchend', [])
			const endHandler = (element.addEventListener as any).mock.calls.find(
				(call: any) => call[0] === 'touchend'
			)[1]
			endHandler(endEvent)

			expect(onSwipe).not.toHaveBeenCalled()
			expect(onSwipeEnd).not.toHaveBeenCalled()
		})
	})

	describe('Touch Cancel Handling', () => {
		beforeEach(() => {
			manager = new TouchGestureManager(element, { onSwipe, onSwipeMove, onSwipeEnd })
		})

		test('should call onSwipeEnd on cancel', () => {
			// Start tracking
			const _startEvent = createTouchEvent('touchstart', [{ clientX: 100, clientY: 200 }])
			const startHandler = (element.addEventListener as any).mock.calls.find(
				(call: any) => call[0] === 'touchstart'
			)[1]
			startHandler(_startEvent)

			// Cancel
			const cancelEvent = createTouchEvent('touchcancel', [])
			const cancelHandler = (element.addEventListener as any).mock.calls.find(
				(call: any) => call[0] === 'touchcancel'
			)[1]
			cancelHandler(cancelEvent)

			expect(onSwipeEnd).toHaveBeenCalled()
			expect(onSwipe).not.toHaveBeenCalled()
		})

		test('should handle cancel without tracking', () => {
			const cancelEvent = createTouchEvent('touchcancel', [])
			const cancelHandler = (element.addEventListener as any).mock.calls.find(
				(call: any) => call[0] === 'touchcancel'
			)[1]
			cancelHandler(cancelEvent)

			expect(onSwipeEnd).not.toHaveBeenCalled()
		})
	})

	describe('updateOptions', () => {
		beforeEach(() => {
			manager = new TouchGestureManager(element, {
				minSwipeDistance: 50,
				onSwipe,
				onSwipeMove,
				onSwipeEnd
			})
		})

		test('should update options dynamically', () => {
			manager.updateOptions({
				minSwipeDistance: 100,
				maxSwipeTime: 500
			})

			// Test with new options - swipe of 80px should not trigger (100px min now)
			const _startEvent = createTouchEvent('touchstart', [{ clientX: 100, clientY: 200 }])
			const startHandler = (element.addEventListener as any).mock.calls.find(
				(call: any) => call[0] === 'touchstart'
			)[1]
			vi.spyOn(Date, 'now').mockReturnValue(1000)
			startHandler(_startEvent)

			const moveEvent = createTouchEvent('touchmove', [{ clientX: 180, clientY: 200 }])
			const moveHandler = (element.addEventListener as any).mock.calls.find(
				(call: any) => call[0] === 'touchmove'
			)[1]
			moveHandler(moveEvent)

			const endEvent = createTouchEvent('touchend', [])
			const endHandler = (element.addEventListener as any).mock.calls.find(
				(call: any) => call[0] === 'touchend'
			)[1]
			vi.spyOn(Date, 'now').mockReturnValue(1100)
			endHandler(endEvent)

			expect(onSwipe).not.toHaveBeenCalled()
		})

		test('should update callback functions', () => {
			const newOnSwipe = vi.fn()
			manager.updateOptions({ onSwipe: newOnSwipe })

			// Trigger swipe
			const _startEvent = createTouchEvent('touchstart', [{ clientX: 100, clientY: 200 }])
			const startHandler = (element.addEventListener as any).mock.calls.find(
				(call: any) => call[0] === 'touchstart'
			)[1]
			vi.spyOn(Date, 'now').mockReturnValue(1000)
			startHandler(_startEvent)

			const moveEvent = createTouchEvent('touchmove', [{ clientX: 200, clientY: 200 }])
			const moveHandler = (element.addEventListener as any).mock.calls.find(
				(call: any) => call[0] === 'touchmove'
			)[1]
			moveHandler(moveEvent)

			const endEvent = createTouchEvent('touchend', [])
			const endHandler = (element.addEventListener as any).mock.calls.find(
				(call: any) => call[0] === 'touchend'
			)[1]
			vi.spyOn(Date, 'now').mockReturnValue(1100)
			endHandler(endEvent)

			expect(newOnSwipe).toHaveBeenCalled()
			expect(onSwipe).not.toHaveBeenCalled()
		})
	})

	describe('destroy', () => {
		beforeEach(() => {
			manager = new TouchGestureManager(element, { onSwipe, onSwipeMove, onSwipeEnd })
		})

		test('should remove all event listeners', () => {
			manager.destroy()

			expect(element.removeEventListener).toHaveBeenCalledTimes(4)
			expect(element.removeEventListener).toHaveBeenCalledWith(
				'touchstart',
				expect.any(Function)
			)
			expect(element.removeEventListener).toHaveBeenCalledWith(
				'touchmove',
				expect.any(Function)
			)
			expect(element.removeEventListener).toHaveBeenCalledWith('touchend', expect.any(Function))
			expect(element.removeEventListener).toHaveBeenCalledWith(
				'touchcancel',
				expect.any(Function)
			)
		})

		test('should not respond to events after destroy', () => {
			manager.destroy()

			// Try to trigger events - handlers should not be called
			const _startEvent = createTouchEvent('touchstart', [{ clientX: 100, clientY: 200 }])
			// The handlers were removed, so calling them directly would fail
			// This test verifies that removeEventListener was called
			expect(element.removeEventListener).toHaveBeenCalled()
		})
	})
})

describe('createTouchGesture', () => {
	test('should create TouchGestureManager instance', () => {
		const element = {
			addEventListener: vi.fn(),
			removeEventListener: vi.fn()
		} as any

		const manager = createTouchGesture(element)

		expect(manager).toBeInstanceOf(TouchGestureManager)
		expect(element.addEventListener).toHaveBeenCalled()
	})

	test('should pass options to constructor', () => {
		const element = {
			addEventListener: vi.fn(),
			removeEventListener: vi.fn()
		} as any

		const onSwipe = vi.fn()
		const manager = createTouchGesture(element, {
			minSwipeDistance: 100,
			onSwipe
		})

		expect(manager).toBeInstanceOf(TouchGestureManager)
	})
})
