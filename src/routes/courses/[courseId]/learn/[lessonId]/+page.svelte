<script lang="ts">
	import { page } from '$app/stores'
	import { onDestroy, untrack } from 'svelte'
	import { goto } from '$app/navigation'
	import { CourseService } from '$lib/services/courses'
	import { EnrollmentService } from '$lib/services/enrollment'
	import { ProgressService } from '$lib/services/progress'
	import { authState } from '$lib/auth.svelte'
	import { Button } from '$lib/components/ui'
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui'
	import type { Course, Lesson, UserProgress } from '$lib/types'
	import Loading from '$lib/components/Loading.svelte'
	import MarkdownRenderer from '$lib/components/MarkdownRenderer.svelte'
	import TableOfContents from '$lib/components/TableOfContents.svelte'
	import AuthGuard from '$lib/components/AuthGuard.svelte'
	import LessonNavigation from '$lib/components/LessonNavigation.svelte'
	import NoteWidget from '$lib/components/NoteWidget.svelte'
	import BookmarkButton from '$lib/components/BookmarkButton.svelte'
	import NotesPanel from '$lib/components/NotesPanel.svelte'
	import { 
		ReadingPositionManager, 
		loadReadingPosition, 
		restoreScrollPosition,
		shouldRestorePosition,
		deleteReadingPosition
	} from '$lib/services/readingPosition'
	import { ReadingProgressTracker } from '$lib/services/readingProgress'

	let courseId = $derived($page.params.courseId as string)
	let lessonId = $derived($page.params.lessonId as string)
	
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
	let quizAnswers = $state<Record<string, any>>({})
	let showQuizResults = $state(false)
	let quizScore = $state<number | null>(null)
	let quizSubmitting = $state(false)
	
	// UI state
	let showTableOfContents = $state(false)
	let showNotesPanel = $state(false)
	let showMobileSidebar = $state(false)
	let contentElement = $state<HTMLElement | null>(null)
	
	// Reading position management
	let positionManager: ReadingPositionManager | null = null
	let progressTracker: ReadingProgressTracker | null = null
	let hasRestoredPosition = $state(false)
	let lastAccessedAt = $state<Date | null>(null)
	let estimatedReadingMinutes = $state(0)
	
	// Note-taking state
	let currentHeadingId = $state<string>('')
	let currentScrollPosition = $state(0)
	
	// Derived states
	let isCompleted = $derived(
		progress?.completedLessons.includes(lessonId) || false
	)
	let canNavigateNext = $derived(
		isCompleted || currentLesson?.type === 'lesson'
	)
	let isQuizLesson = $derived(currentLesson?.type === 'quiz')
	// Sorted lessons to prevent mutation in template
	let sortedLessons = $derived(
		course?.lessons ? [...course.lessons].sort((a, b) => a.order - b.order) : []
	)

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

	onDestroy(() => {
		// Save session time when leaving (if not already saved by effect cleanup)
		if (startTime && authState.user && currentLesson) {
			const timeSpent = Math.round((Date.now() - startTime.getTime()) / 60000) // in minutes
			if (timeSpent > 0) {
				ProgressService.startLesson(authState.user.id, courseId, lessonId)
			}
		}
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
				minProgressDelta: 5 // Only save if scrolled 5% or more
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

			// Navigate to next lesson if available
			if (nextLesson) {
				goto(`/courses/${courseId}/learn/${nextLesson.id}`)
			} else {
				// Course completed
				goto(`/courses/${courseId}?completed=true`)
			}

		} catch (err: any) {
			error = err.message || 'Failed to complete lesson'
			console.error('Error completing lesson:', err)
		} finally {
			completing = false
		}
	}

	async function handleQuizSubmit() {
		if (!authState.user || !currentLesson?.quiz || quizSubmitting) return

		quizSubmitting = true
		error = null

		try {
			// Calculate score
			const totalQuestions = currentLesson.quiz.questions.length
			let correctAnswers = 0

			currentLesson.quiz.questions.forEach(question => {
				const userAnswer = quizAnswers[question.id]
				if (userAnswer === question.correctAnswer) {
					correctAnswers++
				}
			})

			const score = Math.round((correctAnswers / totalQuestions) * 100)
			quizScore = score

			const timeSpentMinutes = startTime ? 
				Math.round((Date.now() - startTime.getTime()) / 60000) : 
				Math.round(sessionTime / 60)

			// Update quiz attempt
			await ProgressService.updateQuizAttempt(
				authState.user.id,
				courseId,
				lessonId,
				score,
				timeSpentMinutes
			)

			// Check if quiz passed
			const passingScore = currentLesson.quiz.passingScore || 70
			if (score >= passingScore) {
				await ProgressService.completeLesson(
					authState.user.id,
					courseId,
					lessonId,
					timeSpentMinutes,
					score
				)

				// Update local progress
				if (progress && !progress.completedLessons.includes(lessonId)) {
					progress.completedLessons = [...progress.completedLessons, lessonId]
				}

				// Delete saved reading position since quiz is completed
				await deleteReadingPosition(authState.user.id, lessonId)
			}

			showQuizResults = true

		} catch (err: any) {
			error = err.message || 'Failed to submit quiz'
			console.error('Error submitting quiz:', err)
		} finally {
			quizSubmitting = false
		}
	}

	function handleQuizRetry() {
		quizAnswers = {}
		showQuizResults = false
		quizScore = null
		startTime = new Date()
	}

	function handleNavigateToLesson(lesson: Lesson) {
		showMobileSidebar = false // Close mobile sidebar on navigation
		goto(`/courses/${courseId}/learn/${lesson.id}`)
	}

	function formatTime(seconds: number): string {
		const minutes = Math.floor(seconds / 60)
		const remainingSeconds = seconds % 60
		return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
	}

	function formatLessonNumber(order: number): string {
		return `Lesson ${order}`
	}
</script>

<svelte:head>
	<title>{currentLesson?.title || 'Lesson'} - {course?.title || 'Open-EDU'}</title>
	<meta name="description" content={currentLesson?.description || 'Open-EDU Lesson'} />
</svelte:head>

<AuthGuard redirectTo="/courses/{courseId}">
{#if loading}
	<div class="flex justify-center items-center min-h-[50vh]">
		<Loading />
	</div>
{:else if error}
	<div class="container mx-auto px-4 py-8">
		<Card>
			<CardContent class="p-8 text-center">
				<h2 class="text-2xl font-bold text-red-600 mb-4">Access Error</h2>
				<p class="text-gray-600 mb-6">{error}</p>
				<div class="flex gap-3 justify-center">
					<Button onclick={() => goto('/courses')}>
						Browse Courses
					</Button>
					{#if !authState.user}
						<Button onclick={() => goto('/auth/login')}>
							Sign In
						</Button>
					{/if}
				</div>
			</CardContent>
		</Card>
	</div>
{:else}
	<div class="min-h-screen bg-gray-50">
		<!-- Mobile Menu Button (Fixed at top-left on mobile only) -->
		<button
			onclick={() => showMobileSidebar = !showMobileSidebar}
			class="fixed top-20 left-4 z-40 lg:hidden bg-white p-2 rounded-lg shadow-lg border border-gray-200 hover:bg-gray-50 transition-colors"
			aria-label="Toggle sidebar menu"
		>
			<svg class="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
		<aside class="fixed top-16 bottom-0 left-0 w-80 bg-white border-r z-50 transition-transform duration-300 {showMobileSidebar ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'} lg:z-20 flex flex-col">
			<!-- Scrollable Content Area -->
			<div class="flex-1 overflow-y-auto">
				<div class="p-6 border-b bg-gradient-to-r from-blue-50 to-blue-100">
				<Button 
					variant="ghost" 
					onclick={() => goto(`/courses/${courseId}`)}
					class="mb-3 -ml-2"
				>
					<svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
					</svg>
					Back to Course
				</Button>
				<h1 class="font-bold text-lg text-gray-900">{course?.title}</h1>
				<div class="mt-4 flex items-center justify-between text-sm">
					<span class="text-gray-600">
						{progress?.completedLessons.length || 0} of {course?.lessons?.length || 0} complete
					</span>
					<span class="font-medium text-blue-600">
						{Math.round(((progress?.completedLessons.length || 0) / (course?.lessons?.length || 1)) * 100)}%
					</span>
				</div>
			</div>

			<div class="p-4">
				<h2 class="text-sm font-semibold text-gray-900 mb-3 px-2">Lessons</h2>
				{#if course?.lessons}
					<nav class="space-y-1">
						{#each sortedLessons as lesson, index (lesson.id)}
							<button
								class="w-full text-left p-3 rounded-lg transition-colors {lesson.id === lessonId ? 'bg-blue-50 border-l-4 border-l-blue-600' : 'hover:bg-gray-50'}"
								onclick={() => handleNavigateToLesson(lesson)}
							>
								<div class="flex items-center gap-3">
									<div class="w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium {progress?.completedLessons.includes(lesson.id) ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-600'}">
										{progress?.completedLessons.includes(lesson.id) ? '✓' : lesson.order || index + 1}
									</div>
									<div class="flex-1 min-w-0">
										<p class="font-medium text-sm truncate {lesson.id === lessonId ? 'text-blue-900' : 'text-gray-900'}">{lesson.title}</p>
										<div class="flex items-center gap-2 text-xs text-gray-500">
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
				{/if}
			</div>

				<!-- Table of Contents (in sidebar) -->
				{#if !isQuizLesson && currentLesson?.content}
					<div class="border-t p-4">
						<button
							onclick={() => showTableOfContents = !showTableOfContents}
							class="w-full flex items-center justify-between px-2 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-50 rounded"
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
				<div class="border-t">
					<button
						onclick={() => showNotesPanel = !showNotesPanel}
						class="w-full flex items-center justify-between px-6 py-3 text-sm font-semibold text-gray-900 hover:bg-gray-50 rounded"
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
			</div>
		</aside>

		<!-- Main Content (with left offset for sidebar) -->
		<main class="lg:pl-80">
			<!-- Lesson Content -->
			<div class="px-6 py-12 max-w-4xl mx-auto">
					{#if currentLesson}
						<Card class="mb-6">
							<!-- Lesson Header with Bookmark -->
							<div class="px-6 pt-6 pb-4 border-b border-gray-200 dark:border-gray-700">
								<div class="flex items-start justify-between gap-4">
									<div class="flex-1">
										<h1 class="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
											{currentLesson.title}
										</h1>
										{#if currentLesson.description}
											<p class="text-gray-600 dark:text-gray-400 text-sm">
												{currentLesson.description}
											</p>
										{/if}
									</div>
									<div class="flex items-center gap-3">
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
								</div>
							</div>
							
							<CardContent>
								{#if isQuizLesson && currentLesson.quiz}
									<!-- Quiz Content -->
									{#if !showQuizResults}
										<div class="space-y-6">
											<div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
												<div class="flex items-start gap-3">
													<svg class="w-5 h-5 text-yellow-600 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
														<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
													</svg>
													<div>
														<h3 class="text-sm font-medium text-yellow-800">Quiz Instructions</h3>
														<p class="text-sm text-yellow-700 mt-1">
															You need {currentLesson.quiz.passingScore || 70}% to pass this quiz.
															{#if currentLesson.quiz.timeLimit}
																Time limit: {currentLesson.quiz.timeLimit} minutes.
															{/if}
															{#if currentLesson.quiz.allowMultipleAttempts}
																You can retake this quiz multiple times.
															{/if}
														</p>
													</div>
												</div>
											</div>

											{#each currentLesson.quiz.questions as question, qIndex (question.id)}
												<div class="border border-gray-200 rounded-lg p-6">
													<div class="flex items-start gap-4">
														<div class="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-sm font-medium text-blue-600">
															{qIndex + 1}
														</div>
														<div class="flex-1">
															<h3 class="font-medium mb-4">{question.question}</h3>
															
															{#if question.type === 'multiple_choice'}
																<div class="space-y-3">
																	{#each question.options || [] as option, optIndex (optIndex)}
																		<label class="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
																			<input
																				type="radio"
																				name="question_{question.id}"
																				value={optIndex}
																				bind:group={quizAnswers[question.id]}
																				class="text-blue-600 focus:ring-blue-500"
																			/>
																			<span>{option}</span>
																		</label>
																	{/each}
																</div>
															{:else if question.type === 'true_false'}
																<div class="space-y-3">
																	<label class="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
																		<input
																			type="radio"
																			name="question_{question.id}"
																			value="true"
																			bind:group={quizAnswers[question.id]}
																			class="text-blue-600 focus:ring-blue-500"
																		/>
																		<span>True</span>
																	</label>
																	<label class="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
																		<input
																			type="radio"
																			name="question_{question.id}"
																			value="false"
																			bind:group={quizAnswers[question.id]}
																			class="text-blue-600 focus:ring-blue-500"
																		/>
																		<span>False</span>
																	</label>
																</div>
															{:else}
																<textarea
																	bind:value={quizAnswers[question.id]}
																	placeholder="Enter your answer..."
																	class="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
																	rows="3"
																></textarea>
															{/if}
														</div>
													</div>
												</div>
											{/each}

											<div class="flex justify-end">
												<Button 
													onclick={handleQuizSubmit}
													disabled={quizSubmitting}
													class="px-8"
												>
													{quizSubmitting ? 'Submitting...' : 'Submit Quiz'}
												</Button>
											</div>
										</div>
									{:else}
										<!-- Quiz Results -->
										<div class="text-center space-y-6">
											<div class="w-24 h-24 mx-auto rounded-full flex items-center justify-center {quizScore && quizScore >= (currentLesson.quiz.passingScore || 70) ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}">
												<span class="text-2xl font-bold">{quizScore}%</span>
											</div>
											
											<div>
												<h3 class="text-xl font-semibold mb-2">
													{quizScore && quizScore >= (currentLesson.quiz.passingScore || 70) ? 'Congratulations!' : 'Keep Trying!'}
												</h3>
												<p class="text-gray-600">
													{quizScore && quizScore >= (currentLesson.quiz.passingScore || 70) 
														? 'You passed the quiz!' 
														: `You need ${currentLesson.quiz.passingScore || 70}% to pass. You scored ${quizScore}%.`}
												</p>
											</div>
											
											{#if currentLesson.quiz.showCorrectAnswers}
												<!-- Show correct answers -->
												<div class="text-left border-t pt-6">
													<h4 class="font-medium mb-4">Review Answers:</h4>
													<!-- Implementation of answer review would go here -->
												</div>
											{/if}
											
											<div class="flex gap-3 justify-center">
												{#if currentLesson.quiz.allowMultipleAttempts && (!quizScore || quizScore < (currentLesson.quiz.passingScore || 70))}
													<Button onclick={handleQuizRetry} variant="outline">
														Try Again
													</Button>
												{/if}
												
												{#if nextLesson}
													<Button onclick={() => handleNavigateToLesson(nextLesson!)}>
														Next Lesson
													</Button>
												{:else}
													<Button onclick={() => goto(`/courses/${courseId}`)}>
														Back to Course
													</Button>
												{/if}
											</div>
										</div>
									{/if}
								{:else}
									<!-- Regular Lesson Content -->
									<div bind:this={contentElement}>
										{#if currentLesson.content}
											<MarkdownRenderer content={currentLesson.content} />
										{:else}
											<p class="text-gray-600">This lesson content will be available soon.</p>
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
						onCourseComplete={() => goto(`/courses/${courseId}?completed=true`)}
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
								// TODO: Optionally refresh notes list or show success message
							}}
						/>
					{/if}

					<!-- Error Display -->
					{#if error}
						<div class="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
							<div class="flex items-start gap-3">
								<svg class="w-5 h-5 text-red-500 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
								</svg>
								<div>
									<h3 class="text-sm font-medium text-red-800">Error</h3>
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