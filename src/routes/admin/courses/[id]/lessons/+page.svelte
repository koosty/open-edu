<script lang="ts">
	import { page } from '$app/stores'
	import { goto } from '$app/navigation'
	import { authState } from '$lib/auth.svelte'
	import { canManageCourses } from '$lib/utils/admin'
	import { Button } from '$lib/components/ui'
	import { Card, CardContent } from '$lib/components/ui'
	import AuthGuard from '$lib/components/AuthGuard.svelte'
	import Loading from '$lib/components/Loading.svelte'
	import { CourseService } from '$lib/services/courses'
	import type { Course } from '$lib/types'
	
	let courseId = $derived($page.params.id as string)
	let action = $derived($page.url.searchParams.get('action') || '')
	
	// State
	let course = $state<Course | null>(null)
	let loading = $state(true)
	let error = $state<string | null>(null)
	
	// Redirect if not authorized
	$effect(() => {
		if (!authState.initialized) return
		
		if (!authState.user || !canManageCourses(authState.user)) {
			goto('/dashboard')
			return
		}
		
		loadCourse()
	})
	
	async function loadCourse() {
		loading = true
		error = null
		
		try {
			const courseData = await CourseService.getCourse(courseId)
			
			if (!courseData) {
				error = 'Course not found'
				return
			}
			
			course = courseData
		} catch (err: any) {
			error = err.message || 'Failed to load course'
			console.error('Error loading course:', err)
		} finally {
			loading = false
		}
	}
	
	function handleLessonSelect(lessonId: string) {
		if (action === 'select-for-quiz') {
			goto(`/admin/courses/${courseId}/quizzes/new?lessonId=${lessonId}`)
		}
	}
	
	function handleCancel() {
		if (action === 'select-for-quiz') {
			goto(`/admin/courses/${courseId}/quizzes`)
		} else {
			goto(`/admin/courses/${courseId}`)
		}
	}
</script>

<svelte:head>
	<title>Select Lesson - {course?.title || 'Loading...'}</title>
</svelte:head>

<AuthGuard>
	{#if loading}
		<div class="flex justify-center items-center min-h-screen">
			<Loading />
		</div>
	{:else if error}
		<div class="min-h-screen bg-gray-50 flex items-center justify-center">
			<Card class="max-w-md">
				<CardContent class="p-8 text-center">
					<h2 class="text-2xl font-bold text-red-600 mb-4">Error</h2>
					<p class="text-gray-600 mb-6">{error}</p>
					<Button onclick={() => goto('/admin')}>
						Back to Admin
					</Button>
				</CardContent>
			</Card>
		</div>
	{:else if action === 'select-for-quiz'}
		<div class="min-h-screen bg-gray-50">
			<!-- Header -->
			<div class="bg-white border-b">
				<div class="container mx-auto px-4 py-6">
					<div class="flex items-center justify-between">
						<div>
							<div class="flex items-center gap-3 text-sm text-gray-600 mb-2">
								<button
									onclick={() => goto('/admin')}
									class="hover:text-blue-600"
								>
									Admin
								</button>
								<span>/</span>
								<button
									onclick={() => goto(`/admin/courses/${courseId}`)}
									class="hover:text-blue-600"
								>
									{course?.title}
								</button>
								<span>/</span>
								<button
									onclick={() => goto(`/admin/courses/${courseId}/quizzes`)}
									class="hover:text-blue-600"
								>
									Quizzes
								</button>
								<span>/</span>
								<span class="text-gray-900">Select Lesson</span>
							</div>
							<h1 class="text-3xl font-bold">Select a Lesson for Your Quiz</h1>
							<p class="text-gray-600 mt-1">
								Choose which lesson this quiz should be associated with
							</p>
						</div>
						<Button variant="outline" onclick={handleCancel}>
							Cancel
						</Button>
					</div>
				</div>
			</div>

			<div class="container mx-auto px-4 py-8">
				<div class="max-w-4xl mx-auto">
					{#if !course?.lessons || course.lessons.length === 0}
						<!-- No Lessons -->
						<Card>
							<CardContent class="py-16 text-center">
								<div class="flex justify-center mb-4">
									<svg class="w-16 h-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
									</svg>
								</div>
								<h3 class="text-xl font-semibold text-gray-900 mb-2">No lessons yet</h3>
								<p class="text-gray-600 mb-6 max-w-md mx-auto">
									You need to create at least one lesson before you can add a quiz.
								</p>
								<div class="flex gap-3 justify-center">
									<Button onclick={() => goto(`/admin/courses/${courseId}`)}>
										Add Lessons
									</Button>
									<Button variant="outline" onclick={handleCancel}>
										Cancel
									</Button>
								</div>
							</CardContent>
						</Card>
					{:else}
						<!-- Lesson List -->
						<div class="space-y-3">
							{#each course.lessons as lesson, index (lesson.id)}
								<button
									onclick={() => handleLessonSelect(lesson.id)}
									class="w-full text-left transition-all hover:shadow-md"
								>
									<Card>
										<CardContent class="p-6">
											<div class="flex items-center gap-4">
												<!-- Lesson Number -->
												<div class="flex-shrink-0 w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
													<span class="text-lg font-bold text-blue-600">{index + 1}</span>
												</div>
												
												<!-- Lesson Info -->
												<div class="flex-1 min-w-0">
													<h3 class="text-lg font-semibold text-gray-900 mb-1">
														{lesson.title}
													</h3>
													{#if lesson.description}
														<p class="text-sm text-gray-600 line-clamp-2">
															{lesson.description}
														</p>
													{/if}
													<div class="flex items-center gap-4 mt-2 text-xs text-gray-500">
														<span class="flex items-center gap-1">
															<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
																<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
															</svg>
															{lesson.duration || 'N/A'}
														</span>
														<span class="flex items-center gap-1">
															<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
																<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
															</svg>
															{lesson.type || 'lesson'}
														</span>
													</div>
												</div>
												
												<!-- Arrow Icon -->
												<div class="flex-shrink-0">
													<svg class="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
														<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
													</svg>
												</div>
											</div>
										</CardContent>
									</Card>
								</button>
							{/each}
						</div>
						
						<!-- Help Text -->
						<div class="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
							<div class="flex gap-3">
								<svg class="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
								</svg>
								<div class="text-sm text-blue-800">
									<p class="font-medium mb-1">About lesson quizzes</p>
									<p>
										Each quiz is linked to a specific lesson. Students will see the quiz option 
										when they complete that lesson, helping to reinforce what they've learned.
									</p>
								</div>
							</div>
						</div>
					{/if}
				</div>
			</div>
		</div>
	{:else}
		<!-- Default: redirect to course edit -->
		<div class="flex justify-center items-center min-h-screen">
			<Loading />
		</div>
		{#if typeof window !== 'undefined'}
			{goto(`/admin/courses/${courseId}`)}
		{/if}
	{/if}
</AuthGuard>
