<script lang="ts">
	import { page } from '$app/stores'
	import { goto } from '$app/navigation'
	import { CourseService } from '$lib/services/courses'
	import { authState } from '$lib/auth.svelte'
	import { canManageCourses } from '$lib/utils/admin'
	import { Button } from '$lib/components/ui'
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui'
	import { Input } from '$lib/components/ui'
	import AuthGuard from '$lib/components/AuthGuard.svelte'
	import Loading from '$lib/components/Loading.svelte'
	import type { Course, Lesson } from '$lib/types'
	
	const courseId = $derived($page.params.id as string)
	
	// Course data
	let course = $state<Course | null>(null)
	let loading = $state(true)
	let error = $state<string | null>(null)
	
	// Form state
	const form = $state({
		title: '',
		description: '',
		category: '',
		difficulty: 'Beginner' as 'Beginner' | 'Intermediate' | 'Advanced',
		duration: '',
		level: 'free' as 'free' | 'premium',
		price: '0',
		currency: 'USD',
		prerequisites: '',
		learningOutcomes: '',
		tags: '',
		thumbnail: '',
		isPublished: false,
		isFeatured: false
	})
	
	// Lessons state
	let lessons = $state<Lesson[]>([])
	
	// State management
	let submitting = $state(false)
	let success = $state(false)
	
	// Validation
	const isValid = $derived(
		form.title.trim().length > 0 &&
		form.description.trim().length > 0 &&
		form.category.trim().length > 0 &&
		form.duration.trim().length > 0 &&
		(form.level === 'free' || (form.level === 'premium' && parseFloat(form.price) > 0))
	)
	
	// Categories for selection
	const categories = [
		'Programming',
		'Web Development',
		'Data Science',
		'Machine Learning',
		'Design',
		'Business',
		'Marketing',
		'Photography',
		'Music',
		'Language',
		'Other'
	]
	
	// Load course data
	$effect(() => {
		// Track courseId to trigger reload on navigation
		const currentCourseId = courseId
		
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
			lessons = courseData.lessons || []
			
			// Populate form
			form.title = courseData.title
			form.description = courseData.description
			form.category = courseData.category
			form.difficulty = courseData.difficulty
			form.duration = courseData.duration
			form.level = courseData.level
			form.price = courseData.price?.toString() || '0'
			form.currency = courseData.currency || 'USD'
			form.prerequisites = courseData.prerequisites?.join('\n') || ''
			form.learningOutcomes = courseData.learningOutcomes?.join('\n') || ''
			form.tags = courseData.tags?.join(', ') || ''
			form.thumbnail = courseData.thumbnail
			form.isPublished = courseData.isPublished
			form.isFeatured = courseData.isFeatured
			
		} catch (err: any) {
			error = err.message || 'Failed to load course'
			console.error('Error loading course:', err)
		} finally {
			loading = false
		}
	}
	
	async function handleSubmit(event: SubmitEvent) {
		event.preventDefault()
		await submitForm()
	}
	
	async function submitForm() {
		if (!authState.user || !isValid || submitting) return
		
		submitting = true
		error = null
		success = false
		
		try {
			// Process form data
			const updates: any = {
				title: form.title.trim(),
				description: form.description.trim(),
				category: form.category.trim(),
				difficulty: form.difficulty,
				duration: form.duration.trim(),
				thumbnail: form.thumbnail,
				level: form.level,
				tags: form.tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0),
				prerequisites: form.prerequisites.split('\n').map(prereq => prereq.trim()).filter(prereq => prereq.length > 0),
				learningOutcomes: form.learningOutcomes.split('\n').map(outcome => outcome.trim()).filter(outcome => outcome.length > 0),
				isPublished: form.isPublished,
				isFeatured: form.isFeatured,
				lessons: lessons
			}
			
			// Add price info for premium courses
			if (form.level === 'premium') {
				updates.price = parseFloat(form.price) || 0
				updates.currency = form.currency
			}
			
			await CourseService.updateCourse(courseId, updates)
			
			success = true
			
			// Reload course data
			setTimeout(() => {
				success = false
				loadCourse()
			}, 2000)
			
		} catch (err: any) {
			error = err.message || 'Failed to update course'
			console.error('Error updating course:', err)
		} finally {
			submitting = false
		}
	}
	
	function handleCancel() {
		goto(`/courses/${courseId}`)
	}
	
	function handleAddLesson() {
		goto(`/admin/courses/${courseId}/lessons/new`)
	}
	
	function handleEditLesson(lessonId: string) {
		goto(`/admin/courses/${courseId}/lessons/${lessonId}`)
	}
	
	async function handleDeleteLesson(lessonId: string) {
		if (!confirm('Are you sure you want to delete this lesson?')) return
		
		lessons = lessons.filter(l => l.id !== lessonId)
		
		// Update course with new lessons array
		try {
			await CourseService.updateCourse(courseId, { lessons })
			success = true
			setTimeout(() => success = false, 2000)
		} catch (err: any) {
			error = err.message || 'Failed to delete lesson'
		}
	}
	
	function handleReorderLesson(index: number, direction: 'up' | 'down') {
		if (direction === 'up' && index === 0) return
		if (direction === 'down' && index === lessons.length - 1) return
		
		const newIndex = direction === 'up' ? index - 1 : index + 1
		const temp = lessons[index]
		lessons[index] = lessons[newIndex]
		lessons[newIndex] = temp
		
		// Update order numbers
		lessons = lessons.map((lesson, idx) => ({
			...lesson,
			order: idx + 1
		}))
	}
</script>

<svelte:head>
	<title>Edit Course - Open-EDU Admin</title>
	<meta name="description" content="Edit course on Open-EDU" />
</svelte:head>

<AuthGuard>
	{#if loading}
		<div class="flex justify-center items-center min-h-screen">
			<Loading />
		</div>
	{:else if error && !course}
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
	{:else}
		<div class="min-h-screen bg-gray-50">
			<!-- Header -->
			<div class="bg-white border-b">
				<div class="container mx-auto px-4 py-6">
					<div class="flex items-center justify-between">
						<div>
							<h1 class="text-3xl font-bold">Edit Course</h1>
							<p class="text-gray-600 mt-1">Update your course information and manage lessons</p>
						</div>
						<div class="flex gap-3">
							<Button variant="outline" onclick={handleCancel}>
								Cancel
							</Button>
							<Button 
								onclick={submitForm} 
								disabled={!isValid || submitting}
								class="px-6"
							>
								{submitting ? 'Saving...' : 'Save Changes'}
							</Button>
						</div>
					</div>
				</div>
			</div>

			<div class="container mx-auto px-4 py-8">
				<div class="max-w-6xl mx-auto">
					<!-- Success Message -->
					{#if success}
						<div class="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
							<div class="flex items-center gap-3">
								<svg class="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
								</svg>
								<p class="text-green-800 font-medium">Course updated successfully!</p>
							</div>
						</div>
					{/if}

					<!-- Error Message -->
					{#if error}
						<div class="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
							<div class="flex items-center gap-3">
								<svg class="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
								</svg>
								<p class="text-red-800">{error}</p>
							</div>
						</div>
					{/if}

					<div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
						<!-- Main Content (Left: 2/3) -->
						<div class="lg:col-span-2 space-y-8">
							<form onsubmit={handleSubmit}>
								<!-- Basic Information -->
								<Card>
									<CardHeader>
										<CardTitle>Basic Information</CardTitle>
									</CardHeader>
									<CardContent class="space-y-6">
										<div>
											<label for="title" class="block text-sm font-medium text-gray-700 mb-2">
												Course Title *
											</label>
											<Input
												id="title"
												bind:value={form.title}
												placeholder="Enter a compelling course title"
												class="w-full"
												required
											/>
										</div>

										<div>
											<label for="description" class="block text-sm font-medium text-gray-700 mb-2">
												Course Description *
											</label>
											<textarea
												id="description"
												bind:value={form.description}
												placeholder="Describe what students will learn and achieve..."
												rows="4"
												class="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
												required
											></textarea>
										</div>

										<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
											<div>
												<label for="category" class="block text-sm font-medium text-gray-700 mb-2">
													Category *
												</label>
												<select
													id="category"
													bind:value={form.category}
													class="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
													required
												>
													<option value="">Select a category</option>
													{#each categories as category (category)}
														<option value={category}>{category}</option>
													{/each}
												</select>
											</div>

											<div>
												<label for="difficulty" class="block text-sm font-medium text-gray-700 mb-2">
													Difficulty Level *
												</label>
												<select
													id="difficulty"
													bind:value={form.difficulty}
													class="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
												>
													<option value="Beginner">Beginner</option>
													<option value="Intermediate">Intermediate</option>
													<option value="Advanced">Advanced</option>
												</select>
											</div>

											<div>
												<label for="duration" class="block text-sm font-medium text-gray-700 mb-2">
													Duration *
												</label>
												<Input
													id="duration"
													bind:value={form.duration}
													placeholder="e.g., 8 weeks, 20 hours"
													class="w-full"
													required
												/>
											</div>

											<div>
												<label for="level" class="block text-sm font-medium text-gray-700 mb-2">
													Course Level *
												</label>
												<select
													id="level"
													bind:value={form.level}
													class="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
												>
													<option value="free">Free</option>
													<option value="premium">Premium</option>
												</select>
											</div>
										</div>

										{#if form.level === 'premium'}
											<div class="grid grid-cols-2 gap-6">
												<div>
													<label for="price" class="block text-sm font-medium text-gray-700 mb-2">
														Price *
													</label>
													<Input
														id="price"
														type="number"
														bind:value={form.price}
														placeholder="0.00"
														class="w-full"
														min="0"
														step="0.01"
														required
													/>
												</div>

												<div>
													<label for="currency" class="block text-sm font-medium text-gray-700 mb-2">
														Currency *
													</label>
													<select
														id="currency"
														bind:value={form.currency}
														class="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
													>
														<option value="USD">USD</option>
														<option value="EUR">EUR</option>
														<option value="GBP">GBP</option>
													</select>
												</div>
											</div>
										{/if}

										<div>
											<label for="thumbnail" class="block text-sm font-medium text-gray-700 mb-2">
												Thumbnail URL
											</label>
											<Input
												id="thumbnail"
												bind:value={form.thumbnail}
												placeholder="https://example.com/course-thumbnail.jpg"
												class="w-full"
											/>
											{#if form.thumbnail}
												<img 
													src={form.thumbnail} 
													alt="Course thumbnail preview"
													class="mt-3 w-48 h-27 object-cover rounded-lg border"
													onerror={(e) => {
														const target = e.currentTarget as HTMLImageElement
														target.src = 'https://via.placeholder.com/400x225/6366f1/white?text=Invalid+Image'
													}}
												/>
											{/if}
										</div>

										<div>
											<label for="tags" class="block text-sm font-medium text-gray-700 mb-2">
												Tags
											</label>
											<Input
												id="tags"
												bind:value={form.tags}
												placeholder="javascript, react, web development"
												class="w-full"
											/>
											<p class="text-xs text-gray-500 mt-1">Comma-separated tags</p>
										</div>

										<div>
											<label for="prerequisites" class="block text-sm font-medium text-gray-700 mb-2">
												Prerequisites
											</label>
											<textarea
												id="prerequisites"
												bind:value={form.prerequisites}
												placeholder="Enter each prerequisite on a new line"
												rows="3"
												class="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
											></textarea>
										</div>

										<div>
											<label for="learning-outcomes" class="block text-sm font-medium text-gray-700 mb-2">
												Learning Outcomes
											</label>
											<textarea
												id="learning-outcomes"
												bind:value={form.learningOutcomes}
												placeholder="Enter each learning outcome on a new line"
												rows="4"
												class="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
											></textarea>
										</div>

										<div class="flex items-center gap-6">
											<label class="flex items-center gap-2">
												<input
													type="checkbox"
													bind:checked={form.isPublished}
													class="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
												/>
												<span class="text-sm font-medium text-gray-700">Published</span>
											</label>

											<label class="flex items-center gap-2">
												<input
													type="checkbox"
													bind:checked={form.isFeatured}
													class="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
												/>
												<span class="text-sm font-medium text-gray-700">Featured</span>
											</label>
										</div>
									</CardContent>
								</Card>
							</form>
						</div>

						<!-- Sidebar (Right: 1/3) -->
						<div class="space-y-6">
							<!-- Lesson Management -->
							<Card>
								<CardHeader>
									<div class="flex items-center justify-between">
										<CardTitle>Lessons ({lessons.length})</CardTitle>
										<Button onclick={handleAddLesson} class="text-sm">
											<svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
											</svg>
											Add Lesson
										</Button>
									</div>
								</CardHeader>
								<CardContent>
									{#if lessons.length === 0}
										<div class="text-center py-8">
											<svg class="w-12 h-12 mx-auto text-gray-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
											</svg>
											<p class="text-gray-600 text-sm">No lessons yet</p>
											<p class="text-gray-500 text-xs mt-1">Click "Add Lesson" to get started</p>
										</div>
									{:else}
										<div class="space-y-2">
											{#each lessons as lesson, index (lesson.id)}
												<div class="border border-gray-200 rounded-lg p-3 hover:bg-gray-50 transition-colors">
													<div class="flex items-start gap-3">
														<div class="flex flex-col gap-1">
															<button
																onclick={() => handleReorderLesson(index, 'up')}
																disabled={index === 0}
																class="p-1 hover:bg-gray-200 rounded disabled:opacity-30 disabled:cursor-not-allowed"
																aria-label="Move up"
															>
																<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
																	<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7" />
																</svg>
															</button>
															<button
																onclick={() => handleReorderLesson(index, 'down')}
																disabled={index === lessons.length - 1}
																class="p-1 hover:bg-gray-200 rounded disabled:opacity-30 disabled:cursor-not-allowed"
																aria-label="Move down"
															>
																<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
																	<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
																</svg>
															</button>
														</div>
														
														<div class="flex-1 min-w-0">
															<div class="flex items-center gap-2">
																<span class="text-xs font-medium text-gray-500">{lesson.order}</span>
																<h4 class="font-medium text-sm truncate">{lesson.title}</h4>
															</div>
															<div class="flex items-center gap-2 mt-1">
																<span class="text-xs text-gray-500 capitalize">{lesson.type}</span>
																{#if lesson.duration}
																	<span class="text-xs text-gray-400">• {lesson.duration} min</span>
																{/if}
															</div>
														</div>
														
														<div class="flex gap-1">
															<button
																onclick={() => handleEditLesson(lesson.id)}
																class="p-1.5 hover:bg-blue-50 rounded text-blue-600"
																aria-label="Edit lesson"
															>
																<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
																	<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
																</svg>
															</button>
															<button
																onclick={() => handleDeleteLesson(lesson.id)}
																class="p-1.5 hover:bg-red-50 rounded text-red-600"
																aria-label="Delete lesson"
															>
																<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
																	<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
																</svg>
															</button>
														</div>
													</div>
												</div>
											{/each}
										</div>
									{/if}
								</CardContent>
							</Card>

							<!-- Quick Actions -->
							<Card>
								<CardHeader>
									<CardTitle>Quick Actions</CardTitle>
								</CardHeader>
								<CardContent class="space-y-3">
									<Button
										variant="outline"
										class="w-full justify-start"
										onclick={() => goto(`/admin/courses/${courseId}/analytics`)}
									>
										<svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
										</svg>
										View Analytics
									</Button>
									
									<Button
										variant="outline"
										class="w-full justify-start"
										onclick={() => goto(`/admin/courses/${courseId}/quizzes`)}
									>
										<svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
										</svg>
										Manage Quizzes
									</Button>
									
									<Button
										variant="outline"
										class="w-full justify-start"
										onclick={() => goto(`/courses/${courseId}`)}
									>
										<svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
										</svg>
										View Course Page
									</Button>
									
									<Button
										variant="outline"
										class="w-full justify-start"
										onclick={() => goto('/admin')}
									>
										<svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
										</svg>
										Back to Admin
									</Button>
								</CardContent>
							</Card>
						</div>
					</div>
				</div>
			</div>
		</div>
	{/if}
</AuthGuard>
