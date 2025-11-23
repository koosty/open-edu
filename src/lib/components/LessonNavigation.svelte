<script lang="ts">
	import { onMount } from 'svelte'
	import { Button } from '$lib/components/ui'
	import type { Lesson } from '$lib/types'
	import { 
		ChevronLeft, 
		ChevronRight, 
		CheckCircle, 
		ArrowLeft, 
		ArrowRight 
	} from 'lucide-svelte'

	// Props
	const {
		previousLesson = null,
		nextLesson = null,
		currentLessonIndex = 0,
		totalLessons = 0,
		isCompleted = false,
		canNavigateNext = true,
		completing = false,
		onNavigate,
		onComplete,
		onCourseComplete,
		showMarkComplete = true,
		enableKeyboardShortcuts = true,
		class: className = ''
	} = $props<{
		previousLesson?: Lesson | null
		nextLesson?: Lesson | null
		currentLessonIndex?: number
		totalLessons?: number
		isCompleted?: boolean
		canNavigateNext?: boolean
		completing?: boolean
		onNavigate: (lesson: Lesson) => void
		onComplete?: () => void
		onCourseComplete?: () => void
		showMarkComplete?: boolean
		enableKeyboardShortcuts?: boolean
		class?: string
	}>()

	// State
	let showTooltip = $state(false)

	// Derived values
	const hasPrevious = $derived(previousLesson !== null)
	const hasNext = $derived(nextLesson !== null)
	const isLastLesson = $derived(!hasNext)
	const showCompleteButton = $derived(
		showMarkComplete && !isCompleted && onComplete
	)
	const showCourseCompleteButton = $derived(
		isLastLesson && isCompleted && onCourseComplete
	)

	// Keyboard shortcuts
	function handleKeydown(event: KeyboardEvent) {
		if (!enableKeyboardShortcuts) return

		// Don't trigger if user is typing in an input/textarea
		const target = event.target as HTMLElement
		if (
			target.tagName === 'INPUT' ||
			target.tagName === 'TEXTAREA' ||
			target.isContentEditable
		) {
			return
		}

		// Left Arrow - Previous lesson
		if (event.key === 'ArrowLeft' && hasPrevious) {
			event.preventDefault()
			onNavigate(previousLesson!)
		}

		// Right Arrow - Next lesson (only if allowed)
		if (event.key === 'ArrowRight' && hasNext && canNavigateNext) {
			event.preventDefault()
			onNavigate(nextLesson!)
		}
	}

	onMount(() => {
		if (enableKeyboardShortcuts) {
			window.addEventListener('keydown', handleKeydown)
			
			// Show keyboard hint briefly on mount
			showTooltip = true
			setTimeout(() => {
				showTooltip = false
			}, 3000)

			return () => {
				window.removeEventListener('keydown', handleKeydown)
			}
		}
	})
</script>

<nav 
	class="lesson-navigation {className}" 
	aria-label="Lesson navigation"
>
	<div class="navigation-container">
		<!-- Previous Lesson -->
		<div class="nav-item nav-previous">
			{#if hasPrevious}
				<Button 
					variant="outline"
					onclick={() => onNavigate(previousLesson!)}
					class="nav-button"
					aria-label="Previous lesson: {previousLesson!.title}"
				>
					<ChevronLeft class="icon" />
					<span class="nav-text">
						<span class="nav-title">{previousLesson!.title}</span>
					</span>
				</Button>
			{:else}
				<div class="nav-placeholder" aria-hidden="true"></div>
			{/if}
		</div>

		<!-- Center Actions -->
		<div class="nav-center">
			{#if showCompleteButton}
				<Button 
					onclick={onComplete}
					disabled={completing}
					class="complete-button"
					aria-label="Mark lesson as complete"
				>
					<CheckCircle class="icon-complete" />
					{completing ? 'Completing...' : 'Mark Complete'}
				</Button>
			{:else if showCourseCompleteButton}
				<Button 
					onclick={onCourseComplete}
					class="course-complete-button"
					aria-label="View course completion"
				>
					<CheckCircle class="icon-complete" />
					Course Complete
				</Button>
			{/if}

			<!-- Progress Indicator -->
			{#if totalLessons > 0}
				<div class="progress-indicator" aria-label="Lesson {currentLessonIndex + 1} of {totalLessons}">
					<span class="progress-text">
						{currentLessonIndex + 1} / {totalLessons}
					</span>
				</div>
			{/if}
		</div>

		<!-- Next Lesson -->
		<div class="nav-item nav-next">
			{#if hasNext}
				<Button 
					variant="outline"
					onclick={() => onNavigate(nextLesson!)}
					disabled={!canNavigateNext}
					class="nav-button flex justify-center"
					aria-label="Next lesson: {nextLesson!.title}"
					title={!canNavigateNext ? 'Complete current lesson to continue' : ''}
				>
					<span class="nav-text">
						<span class="nav-title">{nextLesson!.title}</span>
					</span>
					<ChevronRight class="icon" />
				</Button>
			{:else}
				<div class="nav-placeholder" aria-hidden="true"></div>
			{/if}
		</div>
	</div>

	<!-- Keyboard Shortcuts Hint -->
	{#if enableKeyboardShortcuts && showTooltip}
		<div class="keyboard-hint" role="status" aria-live="polite">
			<span class="hint-text">
				<kbd><ArrowLeft class="hint-icon" /></kbd> 
				<kbd><ArrowRight class="hint-icon" /></kbd> 
				to navigate
			</span>
		</div>
	{/if}
</nav>

<style>
	.lesson-navigation {
		width: 100%;
		padding: 1.5rem 0;
		border-top: 1px solid #e5e7eb;
		background-color: white;
		position: relative;
	}

	:global(.dark) .lesson-navigation {
		background-color: #1f2937;
		border-top-color: #374151;
	}

	.navigation-container {
		display: grid;
		grid-template-columns: 1fr auto 1fr;
		gap: 1rem;
		align-items: center;
		max-width: 1200px;
		margin: 0 auto;
		padding: 0 1rem;
	}

	/* Navigation Items */
	.nav-item {
		display: flex;
	}

	.nav-previous {
		justify-content: flex-start;
	}

	.nav-next {
		justify-content: flex-end;
	}

	.nav-placeholder {
		min-width: 120px;
	}

	/* Navigation Buttons */
	:global(.nav-button) {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.75rem 1rem;
		border-radius: 0.5rem;
		transition: all 0.2s;
		max-width: 300px;
	}

	:global(.nav-button:hover:not(:disabled)) {
		transform: translateY(-1px);
		box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
	}

	:global(.nav-button:disabled) {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.nav-text {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		text-align: left;
	}

	.nav-next .nav-text {
		align-items: flex-end;
		text-align: right;
	}

	.nav-label {
		font-size: 0.75rem;
		font-weight: 500;
		color: #6b7280;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	:global(.dark) .nav-label {
		color: #9ca3af;
	}

	.nav-title {
		font-size: 0.875rem;
		font-weight: 600;
		color: #111827;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		max-width: 200px;
	}

	:global(.dark) .nav-title {
		color: #f9fafb;
	}

	/* Icons */
	:global(.icon) {
		width: 1.25rem;
		height: 1.25rem;
		flex-shrink: 0;
	}

	:global(.icon-complete) {
		width: 1.125rem;
		height: 1.125rem;
		margin-right: 0.375rem;
	}

	/* Center Section */
	.nav-center {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.75rem;
	}

	:global(.complete-button),
	:global(.course-complete-button) {
		display: flex;
		align-items: center;
		white-space: nowrap;
	}

	:global(.course-complete-button) {
		background: linear-gradient(135deg, #10b981 0%, #059669 100%);
		color: white;
	}

	.progress-indicator {
		padding: 0.25rem 0.75rem;
		background-color: #f3f4f6;
		border-radius: 9999px;
		font-size: 0.75rem;
		font-weight: 600;
		color: #6b7280;
	}

	:global(.dark) .progress-indicator {
		background-color: #374151;
		color: #9ca3af;
	}

	.progress-text {
		font-variant-numeric: tabular-nums;
	}

	/* Keyboard Hint */
	.keyboard-hint {
		position: absolute;
		bottom: -2.5rem;
		left: 50%;
		transform: translateX(-50%);
		background-color: #1f2937;
		color: white;
		padding: 0.5rem 1rem;
		border-radius: 0.5rem;
		font-size: 0.75rem;
		white-space: nowrap;
		box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.2);
		animation: fadeIn 0.3s ease-out;
		z-index: 50;
	}

	@keyframes fadeIn {
		from {
			opacity: 0;
			transform: translateX(-50%) translateY(-5px);
		}
		to {
			opacity: 1;
			transform: translateX(-50%) translateY(0);
		}
	}

	.hint-text {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	kbd {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		padding: 0.25rem 0.5rem;
		background-color: #374151;
		border: 1px solid #4b5563;
		border-radius: 0.25rem;
		font-size: 0.75rem;
		font-family: monospace;
		box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
	}

	:global(.hint-icon) {
		width: 0.875rem;
		height: 0.875rem;
	}

	/* Responsive Design */
	@media (max-width: 768px) {
		.navigation-container {
			grid-template-columns: 1fr;
			gap: 1rem;
		}

		.nav-item {
			justify-content: center;
		}

		.nav-previous {
			order: 2;
		}

		.nav-center {
			order: 1;
		}

		.nav-next {
			order: 3;
		}

		.nav-label {
			display: none;
		}

		.nav-title {
			font-size: 0.8125rem;
			max-width: 150px;
		}

		:global(.nav-button) {
			width: 100%;
			justify-content: center;
		}

		.keyboard-hint {
			display: none;
		}
	}

	@media (max-width: 480px) {
		.lesson-navigation {
			padding: 1rem 0;
		}

		.navigation-container {
			padding: 0 0.75rem;
		}

		.nav-title {
			display: none;
		}

		.nav-text {
			align-items: center;
		}
	}

	/* Print styles */
	@media print {
		.lesson-navigation {
			display: none;
		}
	}

	/* Accessibility - reduce motion */
	@media (prefers-reduced-motion: reduce) {
		:global(.nav-button:hover:not(:disabled)) {
			transform: none;
		}

		.keyboard-hint {
			animation: none;
		}
	}
</style>
