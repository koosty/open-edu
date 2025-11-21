<script lang="ts">
	import { page } from '$app/stores'
	import { onDestroy, untrack } from 'svelte'
	import { navigate } from '$lib/utils/navigation'
	import { CourseService } from '$lib/services/courses'
	import { EnrollmentService } from '$lib/services/enrollment'
	import { ProgressService } from '$lib/services/progress'
	import { authState } from '$lib/auth.svelte'
	import { Button, Skeleton } from '$lib/components/ui'
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui'
	import type { Course, Lesson, UserProgress } from '$lib/types'
	import Loading from '$lib/components/Loading.svelte'
	import LessonSkeleton from '$lib/components/LessonSkeleton.svelte'
	import MarkdownRenderer from '$lib/components/MarkdownRenderer.svelte'
	import TableOfContents from '$lib/components/TableOfContents.svelte'
	import AuthGuard from '$lib/components/AuthGuard.svelte'
	import LessonNavigation from '$lib/components/LessonNavigation.svelte'
	import NoteWidget from '$lib/components/NoteWidget.svelte'
	import BookmarkButton from '$lib/components/BookmarkButton.svelte'
	import NotesPanel from '$lib/components/NotesPanel.svelte'
	import ReadingModeToggle from '$lib/components/ReadingModeToggle.svelte'
	import BottomSheet from '$lib/components/BottomSheet.svelte'
	import ErrorAlert from '$lib/components/ErrorAlert.svelte'
	import AutoSaveIndicator from '$lib/components/AutoSaveIndicator.svelte'
	import CompletionCelebration from '$lib/components/CompletionCelebration.svelte'
	import { 
		ReadingPositionManager, 
		loadReadingPosition, 
		restoreScrollPosition,
		shouldRestorePosition,
		deleteReadingPosition
	} from '$lib/services/readingPosition'
	import { ReadingProgressTracker } from '$lib/services/readingProgress'
	import { createTouchGesture, type TouchGestureManager } from '$lib/services/touchGestures'
	import QuizViewer from '$lib/components/QuizViewer.svelte'
	import QuizResults from '$lib/components/QuizResults.svelte'
	import QuizAttemptHistory from '$lib/components/QuizAttemptHistory.svelte'
	import QuizSkeleton from '$lib/components/QuizSkeleton.svelte'
	import * as QuizService from '$lib/services/quiz'
	import type { Quiz, QuizAttempt, QuizAnswer } from '$lib/types/quiz'
	
	const courseId = $derived($page.params.courseId as string)
	const lessonId = $derived($page.params.lessonId as string)
	
	let course = $state<Course | null>(null)
	let currentLesson = $state<Lesson | null>(null)
	let progress = $state<UserProgress | null>(null)
	let loading = $state(true)
	let completing = $state(false)
	let error = $state<string | null>(null)
	
	// Navigation state
	let currentLessonIndex = $state(0)
	let previousLesson = $state<Lesson | null>(null)
	let nextLesson = $state<Lesson | null>(null)
	
	// Lesson timing
	let startTime = $state<Date | null>(null)
	let sessionTime = $state(0) // in seconds
	let timer: NodeJS.Timeout | null = null
	
	// Quiz state (for quiz lessons)
	let currentQuiz = $state<Quiz | null>(null)
	let currentAttempt = $state<QuizAttempt | null>(null)
	let allAttempts = $state<QuizAttempt[]>([])
	let showQuizResults = $state(false)
	let showAttemptHistory = $state(false)
	let quizSubmitting = $state(false)
	let loadingQuiz = $state(false)
	
	// UI state
	let showTableOfContents = $state(false)
	let showNotesPanel = $state(false)
	let showMobileSidebar = $state(false)
	let showMobileNotesSheet = $state(false)
	let showCompletionCelebration = $state(false)
	let sidebarSearchQuery = $state('')
	let contentElement = $state<HTMLElement | null>(null)
	
	// Reading mode state
	let focusMode = $state(false)
	let fontSize = $state<'sm' | 'base' | 'lg' | 'xl'>('base')
	let theme = $state<'light' | 'dark' | 'system'>('system')
	
	// Reading position management
	let positionManager: ReadingPositionManager | null = null
	let progressTracker: ReadingProgressTracker | null = null
	let hasRestoredPosition = $state(false)
	let lastAccessedAt = $state<Date | null>(null)
	let estimatedReadingMinutes = $state(0)
	
	// Auto-save indicator state
	let saveStatus = $state<'idle' | 'saving' | 'saved' | 'error'>('idle')
	let lastSaved = $state<Date | null>(null)
	let saveErrorMessage = $state('')
	
	// Note-taking state
	let currentHeadingId = $state<string>('')
	let currentScrollPosition = $state(0)
	
	// Touch gesture state
	let touchGestureManager: TouchGestureManager | null = null
	let swipeOffset = $state(0) // Visual feedback during swipe
	let isSwipeNavigating = $state(false)
	let mainElement = $state<HTMLElement | null>(null)
	
	// Derived states
	const isCompleted = $derived(
		progress?.completedLessons.includes(lessonId) || false
	)
	const canNavigateNext = $derived(
		isCompleted || currentLesson?.type === 'lesson'
	)
	const isQuizLesson = $derived(currentLesson?.type === 'quiz')
	// Sorted lessons to prevent mutation in template
	const sortedLessons = $derived(
		course?.lessons ? [...course.lessons].sort((a, b) => a.order - b.order) : []
	)
	
	/**
	 * Filtered lessons based on search query
	 */
	const filteredLessons = $derived.by(() => {
		if (!sidebarSearchQuery.trim()) {
			return sortedLessons
		}
		
		const query = sidebarSearchQuery.toLowerCase()
		return sortedLessons.filter(lesson =>
			lesson.title.toLowerCase().includes(query) ||
			lesson.type.toLowerCase().includes(query) ||
			lesson.description?.toLowerCase().includes(query)
		)
	})

	// Load lesson data when user is authenticated or lesson/course changes
	$effect(() => {
		// Only track auth state and route params (courseId, lessonId)
		const isReady = authState.initialized && authState.user
		const currentCourseId = courseId
		const currentLessonId = lessonId
		
		// Wait for auth to initialize and user to be available
		if (isReady) {
			// Run these functions without tracking their internal state changes
			untrack(() => {
				loadLessonData()
				startLessonTimer()
				initializeReadingTracking()
			})
			
			// Cleanup function when lesson changes or component unmounts
			return () => {
				// Cleanup doesn't need untrack - it's just cleaning up resources
				cleanupReadingTracking()
				if (timer) {
					clearInterval(timer)
					timer = null
				}
			}
		}
	})

	// Initialize touch gestures for mobile navigation
	$effect(() => {
		if (!mainElement || !previousLesson && !nextLesson) return
		
		touchGestureManager = createTouchGesture(mainElement, {
			minSwipeDistance: 80,
			maxSwipeTime: 400,
			minVelocity: 0.2,
			maxVerticalDeviation: 150,
			edgeThreshold: 30,
			onSwipe: (event) => {
				// Swipe right = go to previous lesson
				// Swipe left = go to next lesson
				if (event.direction === 'right' && previousLesson) {
					handleSwipeNavigation('previous')
				} else if (event.direction === 'left' && nextLesson && canNavigateNext) {
					handleSwipeNavigation('next')
				}
			},
			onSwipeMove: (deltaX, deltaY) => {
				// Update visual feedback during swipe
				// Limit the offset to provide resistance effect
				const maxOffset = 100
				swipeOffset = Math.max(-maxOffset, Math.min(maxOffset, deltaX * 0.3))
			},
			onSwipeEnd: () => {
				// Reset visual feedback
				swipeOffset = 0
			}
		})
		
		return () => {
			touchGestureManager?.destroy()
			touchGestureManager = null
		}
	})
	
	onDestroy(() => {
		// Save session time when leaving (if not already saved by effect cleanup)
		if (startTime && authState.user && currentLesson) {
			const timeSpent = Math.round((Date.now() - startTime.getTime()) / 60000) // in minutes
			if (timeSpent > 0) {
				ProgressService.startLesson(authState.user.id, courseId, lessonId)
			}
		}
		
		// Cleanup touch gestures
		touchGestureManager?.destroy()
	})

	async function loadLessonData() {
		loading = true
		error = null

		try {
			// No need to check authState.user - AuthGuard guarantees it exists
			
			// Verify enrollment
			const hasEnrollmentAccess = await EnrollmentService.hasAccess(authState.user!.id, courseId)
			if (!hasEnrollmentAccess) {
				error = 'You are not enrolled in this course'
				return
			}

			// Load course and lesson data
			const [courseData, progressData] = await Promise.all([
				CourseService.getCourse(courseId),
				ProgressService.getCourseProgress(authState.user!.id, courseId)
			])

			if (!courseData) {
				error = 'Course not found'
				return
			}

			course = courseData
			progress = progressData

			// Find current lesson
			const lesson = courseData.lessons?.find(l => l.id === lessonId)
			if (!lesson) {
				error = 'Lesson not found'
				return
			}

			currentLesson = lesson

			// Calculate estimated reading time if content exists
			if (lesson.content) {
				const { estimateReadingTime } = await import('$lib/services/markdown')
				estimatedReadingMinutes = estimateReadingTime(lesson.content)
			}

			// Find lesson navigation
			if (courseData.lessons) {
				const sortedLessons = [...courseData.lessons].sort((a, b) => a.order - b.order)
				currentLessonIndex = sortedLessons.findIndex(l => l.id === lessonId)
				
				if (currentLessonIndex > 0) {
					previousLesson = sortedLessons[currentLessonIndex - 1]
				}
				
				if (currentLessonIndex < sortedLessons.length - 1) {
					nextLesson = sortedLessons[currentLessonIndex + 1]
				}
			}

		// Mark lesson as started (AuthGuard guarantees user exists)
		await ProgressService.startLesson(authState.user!.id, courseId, lessonId)
		
		// Load quiz data if this is a quiz lesson
		if (lesson.type === 'quiz') {
			await loadQuizData()
		}

		} catch (err: any) {
			error = err.message || 'Failed to load lesson'
			console.error('Error loading lesson:', err)
		} finally {
			loading = false
		}
	}

	function startLessonTimer() {
		startTime = new Date()
		timer = setInterval(() => {
			sessionTime += 1
		}, 1000)
	}

	async function initializeReadingTracking() {
		if (!authState.user) return

		// Initialize reading position manager
		positionManager = new ReadingPositionManager(
			authState.user.id,
			courseId,
			lessonId,
			{
				debounceMs: 2000, // Save every 2 seconds
				minProgressDelta: 5, // Only save if scrolled 5% or more
				onSaveStart: () => {
					saveStatus = 'saving'
				},
				onSaveComplete: (success, error) => {
					if (success) {
						saveStatus = 'saved'
						lastSaved = new Date()
						saveErrorMessage = ''
						// Auto-hide "Saved" indicator after 2 seconds
						setTimeout(() => {
							if (saveStatus === 'saved') {
								saveStatus = 'idle'
							}
						}, 2000)
					} else {
						saveStatus = 'error'
						saveErrorMessage = error?.message || 'Failed to save progress'
					}
				}
			}
		)

		// Initialize reading progress tracker
		progressTracker = new ReadingProgressTracker({
			onProgressChange: (state) => {
				// Auto-save position when progress changes
				positionManager?.scheduleSave(state)
				
				// Update current position and heading for note widget
				currentScrollPosition = state.scrollPercentage
				currentHeadingId = state.activeHeadingId || ''
			},
			throttleMs: 200
		})

		progressTracker.start()

		// Try to restore saved reading position
		if (!hasRestoredPosition) {
			await restoreSavedPosition()
		}
	}

	async function restoreSavedPosition() {
		if (!authState.user || hasRestoredPosition) return

		try {
			const savedPosition = await loadReadingPosition(authState.user.id, lessonId)
			
			if (savedPosition) {
				// Set last accessed date
				lastAccessedAt = savedPosition.updatedAt
				
				if (shouldRestorePosition(savedPosition)) {
					// Wait for content to render
					setTimeout(() => {
						restoreScrollPosition(savedPosition.scrollTop, true)
						hasRestoredPosition = true
					}, 300)
				}
			}
		} catch (error) {
			console.error('Error restoring reading position:', error)
		}
	}

	async function cleanupReadingTracking() {
		// Stop tracking
		progressTracker?.stop()

		// Flush any pending saves
		if (positionManager && progressTracker) {
			const currentState = progressTracker.getState()
			await positionManager.flush(currentState)
		}

		// Reset for next lesson
		positionManager = null
		progressTracker = null
		hasRestoredPosition = false
	}

	async function handleCompleteLesson() {
		if (!authState.user || !currentLesson || completing) return

		completing = true
		error = null

		try {
			const timeSpentMinutes = startTime ? 
				Math.round((Date.now() - startTime.getTime()) / 60000) : 
				Math.round(sessionTime / 60)

			await ProgressService.completeLesson(
				authState.user.id,
				courseId,
				lessonId,
				timeSpentMinutes
			)

			// Update local progress
			if (progress && !progress.completedLessons.includes(lessonId)) {
				progress.completedLessons = [...progress.completedLessons, lessonId]
			}

			// Delete saved reading position since lesson is completed
			await deleteReadingPosition(authState.user.id, lessonId)

			// Show celebration animation
			showCompletionCelebration = true

		} catch (err: any) {
			error = err.message || 'Failed to complete lesson'
			console.error('Error completing lesson:', err)
		} finally {
			completing = false
		}
	}
	
	/**
	 * Handle celebration continue button
	 */
	function handleCelebrationContinue() {
		showCompletionCelebration = false
		
		if (nextLesson) {
			navigate(`/courses/${courseId}/learn/${nextLesson.id}`)
		} else {
			// Course completed
			navigate(`/courses/${courseId}?completed=true`)
		}
	}
	
	/**
	 * Handle celebration close button
	 */
	function handleCelebrationClose() {
		showCompletionCelebration = false
	}
	
	/**
	 * Handle keyboard shortcuts for navigation
	 */
	function handleKeyboardShortcuts(event: KeyboardEvent) {
		// Ignore shortcuts when typing in input fields
		const target = event.target as HTMLElement
		if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
			return
		}
		
		// Keyboard shortcuts
		switch(event.key) {
			case 'ArrowLeft':
				// Previous lesson
				if (previousLesson && !event.shiftKey) {
					event.preventDefault()
					handleNavigateToLesson(previousLesson)
				}
				break
			
			case 'ArrowRight':
				// Next lesson
				if (nextLesson && !event.shiftKey) {
					event.preventDefault()
					handleNavigateToLesson(nextLesson)
				}
				break
			
		case 's':
		case 'S':
			// Toggle focus mode (Ctrl/Cmd + S)
			if (event.ctrlKey || event.metaKey) {
				event.preventDefault()
				focusMode = !focusMode
				// If entering focus mode, close mobile sidebar
				if (focusMode && showMobileSidebar) {
					showMobileSidebar = false
				}
			}
			break
			
			case '/':
				// Focus search (if sidebar is open)
				if (showMobileSidebar || !focusMode) {
					event.preventDefault()
					const searchInput = document.querySelector('#sidebar-search') as HTMLInputElement
					searchInput?.focus()
				}
				break
			
			case 'Escape':
				// Close sidebar search or sidebar
				if (sidebarSearchQuery) {
					sidebarSearchQuery = ''
				} else if (showMobileSidebar) {
					showMobileSidebar = false
				}
				break
		}
	}

	// Load quiz data for quiz lessons
	async function loadQuizData() {
		if (!authState.user || !currentLesson || currentLesson.type !== 'quiz') return
		
		loadingQuiz = true
		try {
			// Get quizzes for this lesson
			const quizzes = await QuizService.getQuizzesByLesson(lessonId)
			if (quizzes.length > 0) {
				currentQuiz = quizzes[0] // Use first quiz (in future, could support multiple)
				
				// Load all previous attempts for history
				allAttempts = await QuizService.getUserQuizAttempts(
					authState.user.id,
					currentQuiz.id
				)
				
				// Start a new attempt
				currentAttempt = await QuizService.startQuizAttempt(
					authState.user.id,
					currentQuiz.id,
					courseId,
					lessonId
				)
			}
		} catch (err: any) {
			console.error('Error loading quiz:', err)
			error = 'Failed to load quiz'
		} finally {
			loadingQuiz = false
		}
	}

	async function handleQuizSubmit(answers: QuizAnswer[]) {
		if (!authState.user || !currentAttempt || quizSubmitting) return

		quizSubmitting = true
		error = null

		try {
			const timeSpentSeconds = startTime ? 
				Math.floor((Date.now() - startTime.getTime()) / 1000) : 
				sessionTime

			// Save all answers before submitting
			for (const answer of answers) {
				await QuizService.saveQuizAnswer(currentAttempt.id, answer)
			}

			// Submit quiz and get graded attempt
			const gradedAttempt = await QuizService.submitQuizAttempt(
				currentAttempt.id,
				timeSpentSeconds
			)
			
			currentAttempt = gradedAttempt
			showQuizResults = true

			// If quiz passed, mark lesson as complete
			if (gradedAttempt.isPassed) {
				const timeSpentMinutes = Math.round(timeSpentSeconds / 60)
				await ProgressService.completeLesson(
					authState.user.id,
					courseId,
					lessonId,
					timeSpentMinutes,
					gradedAttempt.score
				)

				// Update local progress
				if (progress && !progress.completedLessons.includes(lessonId)) {
					progress.completedLessons = [...progress.completedLessons, lessonId]
				}

				// Delete saved reading position since quiz is completed
				await deleteReadingPosition(authState.user.id, lessonId)
			}

		} catch (err: any) {
			error = err.message || 'Failed to submit quiz'
			console.error('Error submitting quiz:', err)
		} finally {
			quizSubmitting = false
		}
	}

	async function handleQuizRetry() {
		if (!authState.user || !currentQuiz) return
		
		showQuizResults = false
		showAttemptHistory = false
		currentAttempt = null
		startTime = new Date()
		
		// Start new attempt
		try {
			currentAttempt = await QuizService.startQuizAttempt(
				authState.user.id,
				currentQuiz.id,
				courseId,
				lessonId
			)
			
			// Reload attempt history to include the attempt we just completed
			allAttempts = await QuizService.getUserQuizAttempts(
				authState.user.id,
				currentQuiz.id
			)
		} catch (err: any) {
			error = err.message || 'Failed to start new attempt'
			console.error('Error starting quiz retry:', err)
		}
	}
	
	function handleQuizContinue() {
		// Navigate to next lesson or back to course
		if (nextLesson) {
			navigate(`/courses/${courseId}/learn/${nextLesson.id}`)
		} else {
			navigate(`/courses/${courseId}`)
		}
	}

	async function handleViewAttemptResults(attemptId: string) {
		if (!authState.user || !currentQuiz) return
		
		try {
			// Load the specific attempt
			const attempt = await QuizService.getQuizAttempt(attemptId)
			if (attempt) {
				currentAttempt = attempt
				showQuizResults = true
				showAttemptHistory = false
			}
		} catch (err: any) {
			error = err.message || 'Failed to load attempt results'
			console.error('Error loading attempt:', err)
		}
	}

	function handleBackToQuiz() {
		showQuizResults = false
		showAttemptHistory = false
		// If we're viewing an old attempt, start a new one
		if (currentAttempt?.status === 'graded' || currentAttempt?.status === 'submitted') {
			handleQuizRetry()
		}
	}

	function handleNavigateToLesson(lesson: Lesson) {
		showMobileSidebar = false // Close mobile sidebar on navigation
		navigate(`/courses/${courseId}/learn/${lesson.id}`)
	}

	function formatTime(seconds: number): string {
		const minutes = Math.floor(seconds / 60)
		const remainingSeconds = seconds % 60
		return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
	}

	function formatLessonNumber(order: number): string {
		return `Lesson ${order}`
	}
	
	/**
	 * Handle theme change
	 */
	function handleThemeChange(newTheme: 'light' | 'dark' | 'system') {
		theme = newTheme
		
		// Apply theme to document
		if (newTheme === 'system') {
			// Use system preference
			const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches
			document.documentElement.classList.toggle('dark', isDark)
		} else {
			document.documentElement.classList.toggle('dark', newTheme === 'dark')
		}
	}
	
	/**
	 * Handle swipe navigation with visual feedback
	 */
	async function handleSwipeNavigation(direction: 'previous' | 'next') {
		if (isSwipeNavigating) return
		
		const targetLesson = direction === 'previous' ? previousLesson : nextLesson
		if (!targetLesson) return
		
		isSwipeNavigating = true
		
		// Navigate to the lesson
		await navigate(`/courses/${courseId}/learn/${targetLesson.id}`)
		
		// Reset state after navigation
		setTimeout(() => {
			isSwipeNavigating = false
		}, 300)
	}
	
	/**
	 * Get font size class for content
	 */
	const fontSizeClass = $derived.by(() => {
		switch (fontSize) {
			case 'sm': return 'text-sm'
			case 'base': return 'text-base'
			case 'lg': return 'text-lg'
			case 'xl': return 'text-xl'
			default: return 'text-base'
		}
	})
</script>

<svelte:head>
	<title>{currentLesson?.title || 'Lesson'} - {course?.title || 'Open-EDU'}</title>
	<meta name="description" content={currentLesson?.description || 'Open-EDU Lesson'} />
</svelte:head>

<svelte:window onkeydown={handleKeyboardShortcuts} />

<!-- Auto-save indicator -->
<AutoSaveIndicator 
	bind:status={saveStatus}
	bind:lastSaved={lastSaved}
	errorMessage={saveErrorMessage}
/>

<!-- Completion celebration -->
<CompletionCelebration
	bind:show={showCompletionCelebration}
	lessonTitle={currentLesson?.title || ''}
	isLastLesson={!nextLesson}
	nextLessonTitle={nextLesson?.title || ''}
	courseProgress={course?.lessons ? (progress?.completedLessons.length || 0) / course.lessons.length * 100 : 0}
	onContinue={handleCelebrationContinue}
	onClose={handleCelebrationClose}
/>

<AuthGuard redirectTo="/courses/{courseId}">
{#if loading}
	<!-- Skeleton loader for better UX -->
	<div class="min-h-screen bg-slate-50">
		<div class="lg:pl-80 transition-all duration-300">
			<LessonSkeleton />
		</div>
	</div>
{:else if error}
	<div class="container mx-auto px-4 py-8">
		<ErrorAlert 
			message={error}
			onRetry={loadLessonData}
			onGoBack={() => navigate(`/courses/${courseId}`)}
			onGoHome={() => navigate('/courses')}
			showRetry={true}
			showGoBack={true}
			showGoHome={true}
		/>
	</div>
{:else}
	<div class="min-h-screen bg-slate-50">
		<!-- Mobile Menu Button (Fixed at top-left on mobile only) -->
		<button
			onclick={() => showMobileSidebar = !showMobileSidebar}
			class="fixed top-20 left-4 z-40 lg:hidden bg-white p-3 rounded-xl shadow-lg border border-slate-200 hover:bg-slate-50 transition-all duration-200 active:scale-95"
			aria-label="Toggle sidebar menu"
		>
			<svg class="w-5 h-5 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				{#if showMobileSidebar}
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
				{:else}
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
				{/if}
			</svg>
		</button>

		<!-- Mobile Sidebar Overlay -->
		{#if showMobileSidebar}
			<div 
				class="fixed inset-0 bg-black/50 z-40 lg:hidden"
				onclick={() => showMobileSidebar = false}
				onkeydown={(e) => e.key === 'Enter' && (showMobileSidebar = false)}
				role="button"
				tabindex="0"
				aria-label="Close sidebar"
			></div>
		{/if}

		<!-- Fixed Sidebar - Course Navigation (below header) -->
		<aside class="fixed top-16 bottom-0 left-0 w-80 bg-white border-r border-slate-200 z-50 transition-transform duration-300 {showMobileSidebar ? 'translate-x-0' : focusMode ? '-translate-x-full lg:-translate-x-full' : '-translate-x-full lg:translate-x-0'} lg:z-20 flex flex-col shadow-lg">
			<!-- Scrollable Content Area -->
			<div class="flex-1 overflow-y-auto scrollbar-thin">
				<div class="p-6 border-b border-slate-200 bg-gradient-to-br from-primary-50 via-white to-secondary-50">
				<Button 
					variant="ghost" 
					onclick={() => navigate(`/courses/${courseId}`)}
					class="mb-3 -ml-2"
				>
					<svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
					</svg>
					Back to Course
				</Button>
				<h1 class="font-bold text-lg text-slate-900">{course?.title}</h1>
				<div class="mt-4 flex items-center justify-between text-sm">
					<span class="text-slate-600">
						{progress?.completedLessons.length || 0} of {course?.lessons?.length || 0} complete
					</span>
					<span class="font-semibold text-primary-600">
						{Math.round(((progress?.completedLessons.length || 0) / (course?.lessons?.length || 1)) * 100)}%
					</span>
				</div>
				<!-- Progress Bar -->
				<div class="mt-3 h-2 bg-slate-200 rounded-full overflow-hidden">
					<div 
						class="h-full bg-gradient-to-r from-primary-500 to-secondary-500 transition-all duration-500 rounded-full"
						style="width: {Math.round(((progress?.completedLessons.length || 0) / (course?.lessons?.length || 1)) * 100)}%"
					></div>
				</div>
			</div>

			<div class="p-4">
				<div class="mb-4">
					<h2 class="text-sm font-semibold text-slate-900 mb-2 px-2">Lessons</h2>
					<!-- Search input -->
					<div class="relative px-2">
						<input
							id="sidebar-search"
							type="text"
							bind:value={sidebarSearchQuery}
							placeholder="Search lessons... (Press /)"
							class="w-full px-3 py-2 pl-9 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
						/>
						<svg class="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
						</svg>
						{#if sidebarSearchQuery}
							<button
								onclick={() => sidebarSearchQuery = ''}
								class="absolute right-4 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-100 rounded"
								aria-label="Clear search"
							>
								<svg class="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
								</svg>
							</button>
						{/if}
					</div>
				</div>
				{#if course?.lessons}
					{#if filteredLessons.length > 0}
					<nav class="space-y-1.5">
						{#each filteredLessons as lesson, index (lesson.id)}
							<button
								class="w-full text-left p-3 rounded-xl transition-all duration-200 {lesson.id === lessonId ? 'bg-primary-50 border-l-4 border-l-primary-600 shadow-sm' : 'hover:bg-slate-50 active:scale-[0.98]'}"
								onclick={() => handleNavigateToLesson(lesson)}
							>
								<div class="flex items-center gap-3">
									<div class="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-all duration-200 {progress?.completedLessons.includes(lesson.id) ? 'bg-gradient-to-br from-secondary-500 to-secondary-600 text-white shadow-md' : 'bg-slate-200 text-slate-600'}">
										{progress?.completedLessons.includes(lesson.id) ? '✓' : lesson.order || index + 1}
									</div>
									<div class="flex-1 min-w-0">
										<p class="font-medium text-sm truncate {lesson.id === lessonId ? 'text-primary-900' : 'text-slate-900'}">{lesson.title}</p>
										<div class="flex items-center gap-2 text-xs text-slate-500">
											<span class="capitalize">{lesson.type}</span>
											{#if lesson.duration}
												<span>• {lesson.duration} min</span>
											{/if}
										</div>
									</div>
								</div>
							</button>
						{/each}
					</nav>
					{:else}
						<!-- No results message -->
						<div class="text-center py-8 px-4">
							<svg class="w-12 h-12 mx-auto text-slate-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
							</svg>
							<p class="text-sm text-slate-600 mb-1">No lessons found</p>
							<p class="text-xs text-slate-500">Try a different search term</p>
							<button
								onclick={() => sidebarSearchQuery = ''}
								class="mt-3 text-xs text-primary-600 hover:text-primary-700 font-medium"
							>
								Clear search
							</button>
						</div>
					{/if}
				{/if}
			</div>

				<!-- Table of Contents (in sidebar) -->
				{#if !isQuizLesson && currentLesson?.content}
					<div class="border-t border-slate-200 p-4">
						<button
							onclick={() => showTableOfContents = !showTableOfContents}
							class="interactive w-full flex items-center justify-between px-2 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-50 rounded-lg active:scale-[0.98] transition-all"
						>
							<span>Table of Contents</span>
							<svg 
								class="w-4 h-4 transition-transform {showTableOfContents ? 'rotate-180' : ''}" 
								fill="none" 
								stroke="currentColor" 
								viewBox="0 0 24 24"
							>
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
							</svg>
						</button>
						{#if showTableOfContents}
							<div class="mt-2">
								<TableOfContents 
									markdown={currentLesson.content}
								/>
							</div>
						{/if}
					</div>
				{/if}
				
				<!-- Notes & Bookmarks Panel (in sidebar) -->
				<div class="border-t border-slate-200">
					<button
						onclick={() => showNotesPanel = !showNotesPanel}
						class="interactive w-full flex items-center justify-between px-6 py-3 text-sm font-semibold text-slate-900 hover:bg-slate-50 rounded-lg active:scale-[0.98] transition-all"
					>
						<span>Notes & Bookmarks</span>
						<svg 
							class="w-4 h-4 transition-transform {showNotesPanel ? 'rotate-180' : ''}" 
							fill="none" 
							stroke="currentColor" 
							viewBox="0 0 24 24"
						>
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
						</svg>
					</button>
					{#if showNotesPanel}
						<div class="max-h-96 overflow-hidden">
							<NotesPanel 
								{courseId}
								{lessonId}
							/>
						</div>
					{/if}
				</div>
				
				<!-- Keyboard Shortcuts Help -->
				<div class="border-t border-slate-200 p-4 bg-slate-50">
					<p class="text-xs font-semibold text-slate-700 mb-2">Keyboard Shortcuts</p>
					<div class="space-y-1 text-xs text-slate-600">
						<div class="flex justify-between">
							<span>Search lessons</span>
							<kbd class="px-2 py-0.5 bg-white border border-slate-300 rounded text-slate-700 font-mono">/</kbd>
						</div>
						<div class="flex justify-between">
							<span>Previous lesson</span>
							<kbd class="px-2 py-0.5 bg-white border border-slate-300 rounded text-slate-700 font-mono">←</kbd>
						</div>
						<div class="flex justify-between">
							<span>Next lesson</span>
							<kbd class="px-2 py-0.5 bg-white border border-slate-300 rounded text-slate-700 font-mono">→</kbd>
						</div>
						<div class="flex justify-between">
							<span>Toggle focus mode</span>
							<div class="flex gap-1">
								<kbd class="px-2 py-0.5 bg-white border border-slate-300 rounded text-slate-700 font-mono">⌘</kbd>
								<span class="text-slate-400">+</span>
								<kbd class="px-2 py-0.5 bg-white border border-slate-300 rounded text-slate-700 font-mono">S</kbd>
							</div>
						</div>
					</div>
				</div>
			</div>
		</aside>

		<!-- Main Content (with left offset for sidebar) -->
		<main 
			bind:this={mainElement}
			class="transition-all duration-300 {focusMode ? 'lg:pl-0' : 'lg:pl-80'} relative overflow-hidden"
			style="transform: translateX({swipeOffset}px); transition: {swipeOffset === 0 ? 'transform 0.3s ease-out' : 'none'};"
		>
			<!-- Swipe Navigation Hints (Mobile Only) -->
			{#if swipeOffset !== 0}
				<div class="fixed inset-0 pointer-events-none z-10 lg:hidden">
					{#if swipeOffset > 0 && previousLesson}
						<div 
							class="absolute left-0 top-1/2 -translate-y-1/2 bg-gradient-to-br from-primary-600 to-primary-700 text-white px-6 py-3 rounded-r-xl shadow-lg font-medium"
							style="opacity: {Math.min(swipeOffset / 50, 1)}; transform: translateX({Math.max(-100, -100 + swipeOffset)}px) translateY(-50%);"
						>
							← Previous
						</div>
					{/if}
					{#if swipeOffset < 0 && nextLesson && canNavigateNext}
						<div 
							class="absolute right-0 top-1/2 -translate-y-1/2 bg-gradient-to-br from-primary-600 to-primary-700 text-white px-6 py-3 rounded-l-xl shadow-lg font-medium"
							style="opacity: {Math.min(Math.abs(swipeOffset) / 50, 1)}; transform: translateX({Math.min(100, 100 + swipeOffset)}px) translateY(-50%);"
						>
							Next →
						</div>
					{/if}
				</div>
			{/if}
			
			<!-- Lesson Content -->
			<div class="px-6 py-12 {focusMode ? 'max-w-3xl' : 'max-w-4xl'} mx-auto {fontSizeClass}">
					{#if currentLesson}
						<Card class="mb-6 card-hover shadow-lg">
							<!-- Lesson Header with Bookmark -->
							<div class="px-6 pt-6 pb-4 border-b border-slate-200 dark:border-slate-700">
								<!-- Top Row: Controls -->
								<div class="flex items-center justify-between gap-4 mb-4">
									<div class="flex items-center gap-3">
										<ReadingModeToggle
											bind:focusMode
											bind:fontSize
											bind:theme
											onThemeChange={handleThemeChange}
										/>
									</div>
									<BookmarkButton
										{courseId}
										{lessonId}
										currentHeadingId={currentHeadingId}
										scrollPosition={currentScrollPosition}
										getCurrentContext={() => {
											// Get current heading text for context
											const heading = document.getElementById(currentHeadingId)
											return heading?.textContent || ''
										}}
										onSuccess={(bookmarkId) => {
											console.log('Bookmark saved:', bookmarkId)
										}}
									/>
								</div>
								
								<!-- Bottom Row: Title and Description -->
								<div class="space-y-2">
									<h1 class="text-2xl font-bold text-slate-900 dark:text-slate-100 leading-tight">
										{currentLesson.title}
									</h1>
									{#if currentLesson.description}
										<p class="text-slate-600 dark:text-slate-400 text-sm leading-relaxed max-w-3xl">
											{currentLesson.description}
										</p>
									{/if}
								</div>
							</div>
							
							<CardContent>
								{#if isQuizLesson}
									{#if loadingQuiz}
										<!-- Quiz loading skeleton -->
										<div class="space-y-4 py-8">
											<Skeleton variant="heading" width="60%" />
											<Skeleton variant="text" width="80%" />
											<div class="space-y-3 mt-6">
												<Skeleton variant="button" height="44px" />
												<Skeleton variant="button" height="44px" />
												<Skeleton variant="button" height="44px" />
												<Skeleton variant="button" height="44px" />
											</div>
											<div class="flex justify-between mt-8">
												<Skeleton variant="button" width="100px" />
												<Skeleton variant="button" width="120px" />
											</div>
										</div>
									{:else if showAttemptHistory && currentQuiz && allAttempts.length > 0}
										<!-- Quiz Attempt History View -->
										<div class="space-y-4">
											<div class="flex items-center justify-between">
												<h2 class="text-xl font-semibold text-slate-900">Attempt History</h2>
												<Button variant="ghost" onclick={handleBackToQuiz}>
													<svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
														<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
													</svg>
													Back
												</Button>
											</div>
											<QuizAttemptHistory 
												attempts={allAttempts}
												quiz={currentQuiz}
												onViewResults={handleViewAttemptResults}
											/>
										</div>
									{:else if currentQuiz && currentAttempt && !showQuizResults}
										<!-- Quiz Taking Interface -->
										<div class="space-y-4">
											<!-- Show attempt history toggle if there are previous attempts -->
											{#if allAttempts.length > 0}
												<div class="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200">
													<div class="flex items-center gap-2">
														<svg class="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
															<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
														</svg>
														<span class="text-sm font-medium text-slate-700">
															You have {allAttempts.length} previous {allAttempts.length === 1 ? 'attempt' : 'attempts'}
														</span>
													</div>
													<Button variant="outline" size="sm" onclick={() => showAttemptHistory = true}>
														View History
													</Button>
												</div>
											{/if}
											
											<QuizViewer 
												quiz={currentQuiz}
												onSubmit={handleQuizSubmit}
												isSubmitting={quizSubmitting}
											/>
										</div>
									{:else if showQuizResults && currentQuiz && currentAttempt}
										<!-- Quiz Results Display -->
										<div class="space-y-4">
											<!-- Show attempt history button -->
											{#if allAttempts.length > 1}
												<div class="flex justify-end">
													<Button variant="ghost" size="sm" onclick={() => showAttemptHistory = true}>
														<svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
															<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
														</svg>
														View All Attempts
													</Button>
												</div>
											{/if}
											
											<QuizResults
												quiz={currentQuiz}
												attempt={currentAttempt}
												showCorrectAnswers={currentQuiz.showCorrectAnswers}
												showExplanations={currentQuiz.showExplanations}
												allowRetry={currentQuiz.allowMultipleAttempts}
												allowShare={true}
												studentName={authState.user?.displayName || authState.user?.email || 'Student'}
												courseName={course?.title || 'Course'}
												onRetry={handleQuizRetry}
												onContinue={handleQuizContinue}
											/>
										</div>
									{:else}
										<!-- Error State: Quiz not found -->
										<ErrorAlert 
											message="Quiz not available. This quiz could not be loaded."
											onRetry={loadQuizData}
											onGoBack={() => navigate(`/courses/${courseId}`)}
											showRetry={true}
											showGoBack={true}
										/>
									{/if}
								{:else}
									<!-- Regular Lesson Content -->
									<div bind:this={contentElement} class="prose prose-slate max-w-none">
										{#if currentLesson.content}
											<MarkdownRenderer content={currentLesson.content} />
										{:else}
											<p class="text-slate-600">This lesson content will be available soon.</p>
										{/if}
									</div>
								{/if}
							</CardContent>
						</Card>

					<!-- Navigation Footer -->
					<LessonNavigation
						{previousLesson}
						{nextLesson}
						currentLessonIndex={currentLessonIndex}
						totalLessons={sortedLessons.length}
						{isCompleted}
						{canNavigateNext}
						{completing}
						onNavigate={handleNavigateToLesson}
						onComplete={handleCompleteLesson}
						onCourseComplete={() => navigate(`/courses/${courseId}?completed=true`)}
						showMarkComplete={!isQuizLesson}
					/>
					{/if}
					
					<!-- Note Widget (only for regular lessons, not quizzes) -->
					{#if !isQuizLesson && currentLesson}
						<NoteWidget
							{courseId}
							{lessonId}
							{currentHeadingId}
							scrollPosition={currentScrollPosition}
							onNoteCreated={(noteId) => {
								console.log('Note created:', noteId)
								// Refresh notes panel if open
								showMobileNotesSheet = false
								setTimeout(() => showMobileNotesSheet = true, 100)
							}}
						/>
					{/if}
					
					<!-- Mobile Notes Button (Fixed at bottom-right on mobile only) -->
					<button
						onclick={() => showMobileNotesSheet = true}
						class="interactive fixed bottom-24 right-4 z-30 lg:hidden bg-gradient-to-br from-primary-600 to-primary-700 text-white p-4 rounded-full shadow-lg hover:shadow-xl active:scale-95 transition-all"
						aria-label="Open notes panel"
					>
						<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
						</svg>
					</button>
					
					<!-- Mobile Notes Bottom Sheet -->
					<BottomSheet 
						bind:open={showMobileNotesSheet}
						title="Notes & Bookmarks"
						height="full"
						snapPoints={[50, 90]}
					>
						<NotesPanel 
							{courseId}
							{lessonId}
						/>
					</BottomSheet>

					<!-- Error Display -->
					{#if error}
						<div class="mt-6 p-5 bg-red-50 border border-red-200 rounded-xl shadow-sm">
							<div class="flex items-start gap-3">
								<svg class="w-5 h-5 text-red-600 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
								</svg>
								<div>
									<h3 class="text-sm font-semibold text-red-900">Error</h3>
									<p class="text-sm text-red-700 mt-1">{error}</p>
								</div>
							</div>
						</div>
					{/if}
				</div>
			</main>
		</div>
{/if}
</AuthGuard>