<script lang="ts">
	import { page } from '$app/stores'
	import { onMount, onDestroy } from 'svelte'
	import { goto } from '$app/navigation'
	import { CourseService } from '$lib/services/courses'
	import { EnrollmentService } from '$lib/services/enrollment'
	import { ProgressService } from '$lib/services/progress'
	import { authState } from '$lib/auth.svelte'
	import { Button } from '$lib/components/ui'
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui'
	import type { Course, Lesson, UserProgress } from '$lib/types'
	import Loading from '$lib/components/Loading.svelte'

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
	
	// Derived states
	let isCompleted = $derived(
		progress?.completedLessons.includes(lessonId) || false
	)
	let canNavigateNext = $derived(
		isCompleted || currentLesson?.type === 'lesson'
	)
	let isQuizLesson = $derived(currentLesson?.type === 'quiz')
	let hasAccess = $derived(
		authState.user && progress !== null
	)

	onMount(async () => {
		await loadLessonData()
		startLessonTimer()
	})

	onDestroy(() => {
		if (timer) {
			clearInterval(timer)
		}
		// Save session time when leaving
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
			// Check user access first
			if (!authState.user) {
				error = 'Please sign in to access this lesson'
				return
			}

			// Verify enrollment
			const hasEnrollmentAccess = await EnrollmentService.hasAccess(authState.user.id, courseId)
			if (!hasEnrollmentAccess) {
				error = 'You are not enrolled in this course'
				return
			}

			// Load course and lesson data
			const [courseData, progressData] = await Promise.all([
				CourseService.getCourse(courseId),
				ProgressService.getCourseProgress(authState.user.id, courseId)
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

			// Mark lesson as started
			await ProgressService.startLesson(authState.user.id, courseId, lessonId)

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
{:else if !hasAccess}
	<div class="container mx-auto px-4 py-8">
		<Card>
			<CardContent class="p-8 text-center">
				<h2 class="text-2xl font-bold mb-4">Access Required</h2>
				<p class="text-gray-600 mb-6">Please enroll in this course to access the lessons.</p>
				<Button onclick={() => goto(`/courses/${courseId}`)}>
					View Course
				</Button>
			</CardContent>
		</Card>
	</div>
{:else}
	<div class="min-h-screen bg-gray-50">
		<!-- Header -->
		<div class="bg-white border-b sticky top-0 z-10">
			<div class="container mx-auto px-4 py-4">
				<div class="flex items-center justify-between">
					<div class="flex items-center gap-4">
						<Button 
							variant="ghost" 
							onclick={() => goto(`/courses/${courseId}`)}
							class="p-2"
						>
							<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
							</svg>
						</Button>
						<div>
							<h1 class="font-semibold text-lg">{course?.title}</h1>
							<p class="text-sm text-gray-600">{currentLesson?.title}</p>
						</div>
					</div>
					
					<div class="flex items-center gap-4">
						<!-- Progress indicator -->
						{#if course?.lessons}
							<div class="text-sm text-gray-600">
								{currentLessonIndex + 1} of {course.lessons.length}
							</div>
						{/if}
						
						<!-- Timer -->
						<div class="text-sm font-mono bg-gray-100 px-3 py-1 rounded">
							{formatTime(sessionTime)}
						</div>
						
						<!-- Completion status -->
						{#if isCompleted}
							<div class="flex items-center gap-2 text-green-600">
								<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
									<path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
								</svg>
								<span class="text-sm font-medium">Completed</span>
							</div>
						{/if}
					</div>
				</div>
			</div>
		</div>

		<div class="container mx-auto px-4 py-8">
			<div class="grid grid-cols-1 lg:grid-cols-4 gap-8">
				<!-- Sidebar - Course Navigation -->
				<div class="lg:col-span-1">
					<Card>
						<CardHeader>
							<CardTitle class="text-lg">Course Content</CardTitle>
						</CardHeader>
						<CardContent class="p-0">
							{#if course?.lessons}
								<div class="space-y-1">
									{#each course.lessons.sort((a, b) => a.order - b.order) as lesson, index (lesson.id)}
										<button
											class="w-full text-left p-3 hover:bg-gray-50 border-b border-gray-100 last:border-b-0 {lesson.id === lessonId ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''}"
											onclick={() => handleNavigateToLesson(lesson)}
										>
											<div class="flex items-center gap-3">
												<div class="w-6 h-6 rounded-full flex items-center justify-center text-xs {progress?.completedLessons.includes(lesson.id) ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-600'}">
													{progress?.completedLessons.includes(lesson.id) ? '✓' : lesson.order || index + 1}
												</div>
												<div class="flex-1 min-w-0">
													<p class="font-medium text-sm truncate">{lesson.title}</p>
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
								</div>
							{/if}
						</CardContent>
					</Card>
				</div>

				<!-- Main Content -->
				<div class="lg:col-span-3">
					{#if currentLesson}
						<Card class="mb-6">
							<CardHeader>
								<div class="flex items-center justify-between">
									<div>
										<CardTitle class="text-2xl">{currentLesson.title}</CardTitle>
										{#if currentLesson.description}
											<p class="text-gray-600 mt-2">{currentLesson.description}</p>
										{/if}
									</div>
									<div class="flex items-center gap-2">
										<span class="px-3 py-1 bg-blue-100 text-blue-800 text-sm font-medium rounded-full capitalize">
											{currentLesson.type}
										</span>
										{#if currentLesson.isRequired}
											<span class="px-3 py-1 bg-red-100 text-red-600 text-sm font-medium rounded-full">
												Required
											</span>
										{/if}
									</div>
								</div>
							</CardHeader>
							
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
									<div class="prose max-w-none">
										{#if currentLesson.content}
											{@html currentLesson.content}
										{:else}
											<p class="text-gray-600">This lesson content will be available soon.</p>
										{/if}
									</div>
								{/if}
							</CardContent>
						</Card>

						<!-- Navigation Footer -->
						<div class="flex items-center justify-between">
							<div>
								{#if previousLesson}
									<Button 
										variant="outline" 
										onclick={() => handleNavigateToLesson(previousLesson!)}
										class="flex items-center gap-2"
									>
										<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
										</svg>
										Previous
									</Button>
								{/if}
							</div>

							<div class="flex gap-3">
								{#if !isQuizLesson && !isCompleted}
									<Button 
										onclick={handleCompleteLesson}
										disabled={completing}
									>
										{completing ? 'Completing...' : 'Mark Complete'}
									</Button>
								{/if}

								{#if nextLesson && canNavigateNext}
									<Button onclick={() => handleNavigateToLesson(nextLesson!)}>
										Next Lesson
									</Button>
								{:else if !nextLesson && isCompleted}
									<Button onclick={() => goto(`/courses/${courseId}?completed=true`)}>
										Course Complete
									</Button>
								{/if}
							</div>
						</div>
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
			</div>
		</div>
	</div>
{/if}