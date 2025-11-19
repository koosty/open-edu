<script lang="ts">
	import { onMount } from 'svelte'
	import { ReadingProgressTracker, formatTimeSpent, calculateWordsRead, estimateRemainingTime } from '$lib/services/readingProgress'
	import type { ReadingProgressState } from '$lib/services/readingProgress'
	
	// Props
	let {
		totalWords = 0,
		onProgressUpdate = undefined,
		showTimeEstimate = true,
		showPercentage = false,
		position = 'fixed',
		class: className = ''
	} = $props<{
		totalWords?: number
		onProgressUpdate?: (state: ReadingProgressState) => void
		showTimeEstimate?: boolean
		showPercentage?: boolean
		position?: 'fixed' | 'sticky' | 'relative'
		class?: string
	}>()
	
	// State
	let tracker: ReadingProgressTracker | null = null
	let progressState = $state<ReadingProgressState>({
		scrollPercentage: 0,
		scrollTop: 0,
		documentHeight: 0,
		viewportHeight: 0,
		timeSpent: 0,
		activeHeadingId: null,
		sectionsCompleted: []
	})
	
	// Derived values
	const wordsRead = $derived(calculateWordsRead(totalWords, progressState.scrollPercentage))
	const remainingTime = $derived(
		estimateRemainingTime(totalWords, wordsRead)
	)
	const formattedTimeSpent = $derived(formatTimeSpent(progressState.timeSpent))
	const formattedRemainingTime = $derived(formatTimeSpent(remainingTime))
	
	// Position class
	const positionClass = $derived(
		position === 'fixed' ? 'reading-progress-fixed' :
		position === 'sticky' ? 'reading-progress-sticky' :
		'reading-progress-relative'
	)
	
	// Initialize tracker on mount
	onMount(() => {
		tracker = new ReadingProgressTracker({
			onProgressChange: (state) => {
				progressState = state
				onProgressUpdate?.(state)
			},
			throttleMs: 100,
			headingOffset: 100
		})
		
		tracker.start()
		
		// Cleanup on unmount
		return () => {
			tracker?.stop()
		}
	})
</script>

<div class="reading-progress-container {positionClass} {className}" role="complementary" aria-label="Reading progress">
	<!-- Progress bar -->
	<div class="progress-bar-wrapper">
		<div 
			class="progress-bar"
			style="width: {progressState.scrollPercentage}%"
			role="progressbar"
			aria-valuenow={progressState.scrollPercentage}
			aria-valuemin={0}
			aria-valuemax={100}
			aria-label="Reading progress: {progressState.scrollPercentage}%"
		></div>
	</div>
	
	<!-- Progress info (optional) -->
	{#if showPercentage || showTimeEstimate}
		<div class="progress-info">
			{#if showPercentage}
				<span class="progress-percentage" aria-live="polite">
					{progressState.scrollPercentage}%
				</span>
			{/if}
			
			{#if showTimeEstimate && totalWords > 0}
				<div class="progress-time">
					{#if progressState.timeSpent > 0}
						<span class="time-spent" title="Time spent reading">
							<svg class="time-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
								<circle cx="12" cy="12" r="10"></circle>
								<polyline points="12 6 12 12 16 14"></polyline>
							</svg>
							{formattedTimeSpent}
						</span>
					{/if}
					
					{#if remainingTime > 0 && progressState.scrollPercentage < 100}
						<span class="time-remaining" title="Estimated time remaining">
							<svg class="time-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
								<circle cx="12" cy="12" r="10"></circle>
								<polyline points="12 6 12 12 16 14"></polyline>
							</svg>
							~{formattedRemainingTime} left
						</span>
					{/if}
				</div>
			{/if}
		</div>
	{/if}
</div>

<style>
	.reading-progress-container {
		z-index: 50;
		background-color: white;
		border-bottom: 1px solid #e5e7eb;
	}
	
	:global(.dark) .reading-progress-container {
		background-color: #1f2937;
		border-bottom-color: #374151;
	}
	
	/* Position variants */
	.reading-progress-fixed {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
	}
	
	.reading-progress-sticky {
		position: sticky;
		top: 0;
	}
	
	.reading-progress-relative {
		position: relative;
	}
	
	/* Progress bar */
	.progress-bar-wrapper {
		height: 4px;
		background-color: #e5e7eb;
		position: relative;
		overflow: hidden;
	}
	
	:global(.dark) .progress-bar-wrapper {
		background-color: #374151;
	}
	
	.progress-bar {
		height: 100%;
		background: linear-gradient(90deg, #3b82f6, #8b5cf6);
		transition: width 0.3s ease-out;
		position: relative;
	}
	
	.progress-bar::after {
		content: '';
		position: absolute;
		top: 0;
		right: 0;
		bottom: 0;
		width: 40px;
		background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3));
		animation: shimmer 2s infinite;
	}
	
	@keyframes shimmer {
		0% {
			transform: translateX(-40px);
		}
		100% {
			transform: translateX(40px);
		}
	}
	
	/* Progress info */
	.progress-info {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.5rem 1rem;
		font-size: 0.875rem;
		gap: 1rem;
	}
	
	.progress-percentage {
		font-weight: 600;
		color: #3b82f6;
		min-width: 3rem;
	}
	
	:global(.dark) .progress-percentage {
		color: #60a5fa;
	}
	
	.progress-time {
		display: flex;
		align-items: center;
		gap: 1rem;
		color: #6b7280;
		font-size: 0.8125rem;
	}
	
	:global(.dark) .progress-time {
		color: #9ca3af;
	}
	
	.time-spent,
	.time-remaining {
		display: flex;
		align-items: center;
		gap: 0.375rem;
	}
	
	.time-icon {
		width: 1rem;
		height: 1rem;
		opacity: 0.7;
	}
	
	.time-remaining {
		color: #f59e0b;
	}
	
	:global(.dark) .time-remaining {
		color: #fbbf24;
	}
	
	/* Responsive adjustments */
	@media (max-width: 640px) {
		.progress-info {
			padding: 0.375rem 0.75rem;
			font-size: 0.75rem;
		}
		
		.progress-percentage {
			font-size: 0.75rem;
			min-width: 2.5rem;
		}
		
		.progress-time {
			font-size: 0.75rem;
			gap: 0.5rem;
		}
		
		.time-icon {
			width: 0.875rem;
			height: 0.875rem;
		}
		
		/* Hide "left" text on very small screens */
		.time-remaining {
			gap: 0.25rem;
		}
	}
	
	@media (max-width: 480px) {
		.progress-time {
			flex-direction: column;
			align-items: flex-end;
			gap: 0.25rem;
		}
	}
	
	/* Accessibility - reduce motion */
	@media (prefers-reduced-motion: reduce) {
		.progress-bar {
			transition: none;
		}
		
		.progress-bar::after {
			animation: none;
		}
	}
	
	/* Print styles */
	@media print {
		.reading-progress-container {
			display: none;
		}
	}
</style>
