<script lang="ts">
	/**
	 * BottomSheet Component
	 * 
	 * A mobile-friendly bottom sheet that slides up from the bottom of the screen.
	 * Features: drag to close, backdrop, smooth animations, keyboard-aware.
	 */
	
	import { createEventDispatcher } from 'svelte'
	
	interface Props {
		open?: boolean
		title?: string
		height?: 'auto' | 'half' | 'full'
		children?: import('svelte').Snippet
	}
	
	let {
		open = $bindable(false),
		title = '',
		height = 'half',
		children
	}: Props = $props()
	
	// Snap points for drag behavior (percentages)
	const snapPoints = [50, 90]
	
	const dispatch = createEventDispatcher()
	
	// Drag state
	let isDragging = $state(false)
	let startY = $state(0)
	let translateY = $state(0)
	let sheetElement = $state<HTMLDivElement | null>(null)
	let currentSnapIndex = $state(0)
	
	// Calculate height based on prop
	const sheetHeight = $derived.by(() => {
		if (height === 'auto') return 'max-h-[60vh]'
		if (height === 'half') return 'h-[50vh]'
		if (height === 'full') return 'h-[90vh]'
		return 'h-[50vh]'
	})
	
	// Calculate current snap point
	const currentSnapPoint = $derived.by(() => {
		if (snapPoints.length === 0) return 50
		return snapPoints[currentSnapIndex] || 50
	})
	
	/**
	 * Handle touch/mouse start
	 */
	function handleDragStart(event: TouchEvent | MouseEvent) {
		isDragging = true
		
		if (event instanceof TouchEvent) {
			startY = event.touches[0].clientY
		} else {
			startY = event.clientY
		}
		
		translateY = 0
	}
	
	/**
	 * Handle touch/mouse move
	 */
	function handleDragMove(event: TouchEvent | MouseEvent) {
		if (!isDragging) return
		
		event.preventDefault()
		
		let clientY: number
		if (event instanceof TouchEvent) {
			clientY = event.touches[0].clientY
		} else {
			clientY = event.clientY
		}
		
		const deltaY = clientY - startY
		
		// Only allow dragging down (positive deltaY)
		if (deltaY > 0) {
			translateY = deltaY
		}
	}
	
	/**
	 * Handle touch/mouse end
	 */
	function handleDragEnd() {
		if (!isDragging) return
		
		isDragging = false
		
		// Determine if should close based on drag distance
		const threshold = window.innerHeight * 0.3 // 30% of screen height
		
		if (translateY > threshold) {
			// Close the sheet
			handleClose()
		} else if (snapPoints.length > 1) {
			// Snap to nearest point
			const dragPercentage = (translateY / window.innerHeight) * 100
			const targetSnapIndex = findNearestSnapPoint(currentSnapPoint - dragPercentage)
			
			if (targetSnapIndex !== currentSnapIndex) {
				currentSnapIndex = targetSnapIndex
				dispatch('snap', { snapPoint: snapPoints[targetSnapIndex] })
			}
		}
		
		// Reset translate
		translateY = 0
	}
	
	/**
	 * Find nearest snap point
	 */
	function findNearestSnapPoint(percentage: number): number {
		let nearestIndex = 0
		let minDiff = Math.abs(snapPoints[0] - percentage)
		
		for (let i = 1; i < snapPoints.length; i++) {
			const diff = Math.abs(snapPoints[i] - percentage)
			if (diff < minDiff) {
				minDiff = diff
				nearestIndex = i
			}
		}
		
		return nearestIndex
	}
	
	/**
	 * Handle close
	 */
	function handleClose() {
		open = false
		translateY = 0
		currentSnapIndex = 0
		dispatch('close')
	}
	
	/**
	 * Handle backdrop click
	 */
	function handleBackdropClick() {
		handleClose()
	}
	
	/**
	 * Handle escape key
	 */
	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape' && open) {
			handleClose()
		}
	}
</script>

<svelte:window 
	onkeydown={handleKeydown}
	onmousemove={isDragging ? handleDragMove : undefined}
	onmouseup={isDragging ? handleDragEnd : undefined}
/>

{#if open}
	<!-- Backdrop -->
	<div 
		class="fixed inset-0 bg-black/40 z-50 transition-opacity duration-300 {open ? 'opacity-100' : 'opacity-0'}"
		onclick={handleBackdropClick}
		onkeydown={(e) => e.key === 'Enter' && handleBackdropClick()}
		role="button"
		tabindex="-1"
		aria-label="Close bottom sheet"
	></div>
	
	<!-- Bottom Sheet -->
	<div
		bind:this={sheetElement}
		class="fixed left-0 right-0 bottom-0 bg-white dark:bg-gray-900 rounded-t-2xl shadow-2xl z-50 transition-transform duration-300 {open ? 'translate-y-0' : 'translate-y-full'}"
		style="transform: translateY({translateY}px); max-height: {currentSnapPoint}vh;"
		role="dialog"
		aria-modal="true"
		aria-label={title || 'Bottom sheet'}
	>
		<!-- Drag Handle -->
		<div 
			class="flex items-center justify-center pt-3 pb-2 cursor-grab active:cursor-grabbing"
			ontouchstart={handleDragStart}
			ontouchmove={handleDragMove}
			ontouchend={handleDragEnd}
			onmousedown={handleDragStart}
			role="button"
			tabindex="0"
			aria-label="Drag to close"
		>
			<div class="w-10 h-1.5 bg-gray-300 dark:bg-gray-600 rounded-full"></div>
		</div>
		
		<!-- Header (optional) -->
		{#if title}
			<div class="px-6 pb-4 border-b border-gray-200 dark:border-gray-700">
				<div class="flex items-center justify-between">
					<h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100">
						{title}
					</h2>
					<button
						onclick={handleClose}
						class="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
						aria-label="Close"
					>
						<svg class="w-5 h-5 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
						</svg>
					</button>
				</div>
			</div>
		{/if}
		
		<!-- Content -->
		<div class="overflow-y-auto {sheetHeight} overscroll-contain">
			{#if children}
				{@render children()}
			{/if}
		</div>
	</div>
{/if}

<style>
	/* Prevent body scroll when bottom sheet is open */
	:global(body:has(.bottom-sheet-open)) {
		overflow: hidden;
		touch-action: none;
	}
	
	/* Smooth animations */
	@media (prefers-reduced-motion: reduce) {
		.transition-transform {
			transition: none;
		}
	}
	
	/* Improve touch scrolling on iOS */
	.overscroll-contain {
		-webkit-overflow-scrolling: touch;
		overscroll-behavior: contain;
	}
</style>
