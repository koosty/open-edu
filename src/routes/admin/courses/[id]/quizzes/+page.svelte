<script lang="ts">
	import { page } from '$app/stores'
	import { goto } from '$app/navigation'
	import { authState } from '$lib/auth.svelte'
	import { canManageCourses } from '$lib/utils/admin'
	import { Button } from '$lib/components/ui'
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui'
	import AuthGuard from '$lib/components/AuthGuard.svelte'
	import Loading from '$lib/components/Loading.svelte'
	import * as QuizService from '$lib/services/quiz'
	import { CourseService } from '$lib/services/courses'
	import type { Course } from '$lib/types'
	import type { Quiz, QuizStatistics } from '$lib/types/quiz'
	
	let courseId = $derived($page.params.id as string)
	
	// State
	let quizzes = $state<Quiz[]>([])
	let course = $state<Course | null>(null)
	let quizStats = $state<Map<string, QuizStatistics>>(new Map())
	let loading = $state(true)
	let loadingStats = $state(false)
	let error = $state<string | null>(null)
	let success = $state<string | null>(null)
	
	// Bulk operations state
	let selectedQuizIds = $state<Set<string>>(new Set())
	let bulkActionInProgress = $state(false)
	
	// Load data
	$effect(() => {
		const currentCourseId = courseId
		
		if (!authState.initialized) return
		
		if (!authState.user || !canManageCourses(authState.user)) {
			goto('/dashboard')
			return
		}
		
		loadData()
	})
	
	async function loadData() {
		loading = true
		error = null
		
		try {
			// Load course and quizzes in parallel
			const [courseData, quizzesData] = await Promise.all([
				CourseService.getCourse(courseId),
				QuizService.getQuizzesByCourse(courseId)
			])
			
			if (!courseData) {
				error = 'Course not found'
				return
			}
			
			course = courseData
			quizzes = quizzesData
			
			// Load statistics for each quiz
			loadingStats = true
			const statsPromises = quizzesData.map(async quiz => {
				try {
					const stats = await QuizService.getQuizStatistics(quiz.id)
					quizStats.set(quiz.id, stats)
				} catch (err) {
					console.error(`Failed to load stats for quiz ${quiz.id}:`, err)
				}
			})
			await Promise.all(statsPromises)
			loadingStats = false
		} catch (err: any) {
			error = err.message || 'Failed to load quizzes'
			console.error('Error loading quizzes:', err)
		} finally {
			loading = false
		}
	}
	
	async function handleTogglePublish(quiz: Quiz) {
		try {
			await QuizService.publishQuiz(quiz.id, !quiz.isPublished)
			success = `Quiz ${quiz.isPublished ? 'unpublished' : 'published'} successfully`
			
			// Update local state
			quizzes = quizzes.map(q => 
				q.id === quiz.id 
					? { ...q, isPublished: !q.isPublished }
					: q
			)
			
			setTimeout(() => success = null, 3000)
		} catch (err: any) {
			error = err.message || 'Failed to update quiz'
			setTimeout(() => error = null, 5000)
		}
	}
	
	async function handleDeleteQuiz(quiz: Quiz) {
		if (!confirm(`Are you sure you want to delete "${quiz.title}"? This action cannot be undone.`)) {
			return
		}
		
		try {
			await QuizService.deleteQuiz(quiz.id)
			success = 'Quiz deleted successfully'
			
			// Update local state
			quizzes = quizzes.filter(q => q.id !== quiz.id)
			
			setTimeout(() => success = null, 3000)
		} catch (err: any) {
			error = err.message || 'Failed to delete quiz'
			setTimeout(() => error = null, 5000)
		}
	}
	
	function handleCreateQuiz() {
		// Navigate directly to quiz builder - lesson will be created automatically
		goto(`/admin/courses/${courseId}/quizzes/new`)
	}
	
	// Bulk operations
	function toggleSelectAll() {
		if (selectedQuizIds.size === quizzes.length) {
			selectedQuizIds.clear()
		} else {
			selectedQuizIds = new Set(quizzes.map(q => q.id))
		}
	}
	
	function toggleSelectQuiz(quizId: string) {
		if (selectedQuizIds.has(quizId)) {
			selectedQuizIds.delete(quizId)
		} else {
			selectedQuizIds.add(quizId)
		}
		selectedQuizIds = selectedQuizIds // Trigger reactivity
	}
	
	async function handleBulkPublish() {
		if (selectedQuizIds.size === 0) return
		
		if (!confirm(`Publish ${selectedQuizIds.size} selected quiz(zes)?`)) {
			return
		}
		
		bulkActionInProgress = true
		error = null
		
		try {
			const promises = Array.from(selectedQuizIds).map(id =>
				QuizService.publishQuiz(id, true)
			)
			await Promise.all(promises)
			
			// Update local state
			quizzes = quizzes.map(q =>
				selectedQuizIds.has(q.id) ? { ...q, isPublished: true } : q
			)
			
			success = `${selectedQuizIds.size} quiz(zes) published successfully`
			selectedQuizIds.clear()
			setTimeout(() => success = null, 3000)
		} catch (err: any) {
			error = err.message || 'Failed to publish quizzes'
			setTimeout(() => error = null, 5000)
		} finally {
			bulkActionInProgress = false
		}
	}
	
	async function handleBulkUnpublish() {
		if (selectedQuizIds.size === 0) return
		
		if (!confirm(`Unpublish ${selectedQuizIds.size} selected quiz(zes)?`)) {
			return
		}
		
		bulkActionInProgress = true
		error = null
		
		try {
			const promises = Array.from(selectedQuizIds).map(id =>
				QuizService.publishQuiz(id, false)
			)
			await Promise.all(promises)
			
			// Update local state
			quizzes = quizzes.map(q =>
				selectedQuizIds.has(q.id) ? { ...q, isPublished: false } : q
			)
			
			success = `${selectedQuizIds.size} quiz(zes) unpublished successfully`
			selectedQuizIds.clear()
			setTimeout(() => success = null, 3000)
		} catch (err: any) {
			error = err.message || 'Failed to unpublish quizzes'
			setTimeout(() => error = null, 5000)
		} finally {
			bulkActionInProgress = false
		}
	}
	
	async function handleBulkDelete() {
		if (selectedQuizIds.size === 0) return
		
		if (!confirm(`Are you sure you want to delete ${selectedQuizIds.size} selected quiz(zes)? This action cannot be undone.`)) {
			return
		}
		
		bulkActionInProgress = true
		error = null
		
		try {
			const promises = Array.from(selectedQuizIds).map(id =>
				QuizService.deleteQuiz(id)
			)
			await Promise.all(promises)
			
			// Update local state
			quizzes = quizzes.filter(q => !selectedQuizIds.has(q.id))
			
			success = `${selectedQuizIds.size} quiz(zes) deleted successfully`
			selectedQuizIds.clear()
			setTimeout(() => success = null, 3000)
		} catch (err: any) {
			error = err.message || 'Failed to delete quizzes'
			setTimeout(() => error = null, 5000)
		} finally {
			bulkActionInProgress = false
		}
	}
	
	function handleBulkExport() {
		if (selectedQuizIds.size === 0) return
		
		const selectedQuizzes = quizzes.filter(q => selectedQuizIds.has(q.id))
		const exportData = {
			version: '1.0',
			exported: new Date().toISOString(),
			courseId,
			courseName: course?.title || 'Unknown',
			quizzes: selectedQuizzes
		}
		
		const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
		const url = URL.createObjectURL(blob)
		const a = document.createElement('a')
		a.href = url
		a.download = `quizzes-${courseId}-${Date.now()}.json`
		document.body.appendChild(a)
		a.click()
		document.body.removeChild(a)
		URL.revokeObjectURL(url)
		
		success = `${selectedQuizIds.size} quiz(zes) exported successfully`
		setTimeout(() => success = null, 3000)
	}
	
	function getDifficultyColor(difficulty?: 'easy' | 'medium' | 'hard'): string {
		switch (difficulty) {
			case 'easy': return 'bg-green-100 text-green-800'
			case 'medium': return 'bg-yellow-100 text-yellow-800'
			case 'hard': return 'bg-red-100 text-red-800'
			default: return 'bg-gray-100 text-gray-800'
		}
	}
	
	function formatDate(date: any): string {
		if (!date) return 'N/A'
		
		try {
			const dateObj = date.toDate ? date.toDate() : new Date(date)
			return dateObj.toLocaleDateString('en-US', {
				year: 'numeric',
				month: 'short',
				day: 'numeric'
			})
		} catch {
			return 'Invalid date'
		}
	}
</script>

<svelte:head>
	<title>Manage Quizzes - {course?.title || 'Loading...'}</title>
	<meta name="description" content="Manage course quizzes" />
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
								<span class="text-gray-900">Quizzes</span>
							</div>
							<h1 class="text-3xl font-bold">Manage Quizzes</h1>
							<p class="text-gray-600 mt-1">
								{quizzes.length} {quizzes.length === 1 ? 'quiz' : 'quizzes'} in this course
							</p>
						</div>
						<div class="flex gap-3">
							<Button 
								variant="outline" 
								onclick={() => goto(`/admin/courses/${courseId}`)}
							>
								Back to Course
							</Button>
							<Button onclick={handleCreateQuiz}>
								<svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
								</svg>
								Create Quiz
							</Button>
						</div>
					</div>
				</div>
			</div>

			<div class="container mx-auto px-4 py-8">
				<!-- Success Message -->
				{#if success}
					<div class="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
						<div class="flex items-center gap-3">
							<svg class="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
							</svg>
							<p class="text-green-800 font-medium">{success}</p>
						</div>
					</div>
				{/if}
				
				<!-- Bulk Actions Toolbar -->
				{#if selectedQuizIds.size > 0}
					<div class="mb-6 p-4 bg-primary-50 border border-primary-200 rounded-lg">
						<div class="flex items-center justify-between gap-4 flex-wrap">
							<div class="flex items-center gap-3">
								<span class="text-sm font-medium text-primary-900">
									{selectedQuizIds.size} quiz{selectedQuizIds.size > 1 ? 'zes' : ''} selected
								</span>
								<button
									onclick={() => selectedQuizIds.clear()}
									class="text-sm text-primary-600 hover:text-primary-800 font-medium"
								>
									Clear selection
								</button>
							</div>
							<div class="flex items-center gap-2">
								<Button
									variant="outline"
									size="sm"
									onclick={handleBulkPublish}
									disabled={bulkActionInProgress}
								>
									<svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
									</svg>
									Publish
								</Button>
								<Button
									variant="outline"
									size="sm"
									onclick={handleBulkUnpublish}
									disabled={bulkActionInProgress}
								>
									<svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
									</svg>
									Unpublish
								</Button>
								<Button
									variant="outline"
									size="sm"
									onclick={handleBulkExport}
									disabled={bulkActionInProgress}
								>
									<svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
									</svg>
									Export JSON
								</Button>
								<Button
									variant="destructive"
									size="sm"
									onclick={handleBulkDelete}
									disabled={bulkActionInProgress}
								>
									<svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
									</svg>
									Delete
								</Button>
							</div>
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

				<div class="max-w-6xl mx-auto">
					{#if quizzes.length === 0}
						<!-- Empty State -->
						<Card>
							<CardContent class="py-16 text-center">
								<div class="flex justify-center mb-4">
									<svg class="w-16 h-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
									</svg>
								</div>
								<h3 class="text-xl font-semibold text-gray-900 mb-2">No quizzes yet</h3>
								<p class="text-gray-600 mb-6 max-w-md mx-auto">
									Create your first quiz to assess student learning with our visual quiz builder.
								</p>
								<Button onclick={handleCreateQuiz}>
									<svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
									</svg>
									Create Your First Quiz
								</Button>
								<div class="mt-6 pt-6 border-t">
									<p class="text-sm text-gray-500">
										You'll select a lesson, then use our drag-and-drop quiz builder to create questions.
									</p>
								</div>
							</CardContent>
						</Card>
					{:else}
						<!-- Select All Header -->
						<div class="mb-4 flex items-center gap-3 p-3 bg-white rounded-lg border">
							<input
								type="checkbox"
								checked={selectedQuizIds.size === quizzes.length}
								indeterminate={selectedQuizIds.size > 0 && selectedQuizIds.size < quizzes.length}
								onchange={toggleSelectAll}
								class="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
							/>
							<span class="text-sm font-medium text-gray-700">
								Select All ({quizzes.length})
							</span>
						</div>
						
						<!-- Quiz List -->
						<div class="space-y-4">
							{#each quizzes as quiz (quiz.id)}
								{@const stats = quizStats.get(quiz.id)}
								<Card>
									<CardContent class="p-6">
										<div class="flex items-start gap-4">
											<!-- Checkbox -->
											<input
												type="checkbox"
												checked={selectedQuizIds.has(quiz.id)}
												onchange={() => toggleSelectQuiz(quiz.id)}
												class="mt-1 w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
											/>
											
											<!-- Quiz Info -->
											<div class="flex-1">
												<div class="flex items-center gap-3 mb-2">
													<h3 class="text-xl font-semibold">{quiz.title}</h3>
													
													<!-- Status Badge -->
													{#if quiz.isPublished}
														<span class="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded">
															Published
														</span>
													{:else}
														<span class="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-600 rounded">
															Draft
														</span>
													{/if}
												</div>
												
												{#if quiz.description}
													<p class="text-gray-600 mb-4">{quiz.description}</p>
												{/if}
												
												<!-- Quiz Configuration -->
												<div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 pb-4 border-b">
													<div class="flex items-center gap-2 text-sm text-gray-600">
														<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
															<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
														</svg>
														<span>{quiz.questions.length} questions</span>
													</div>
													
													<div class="flex items-center gap-2 text-sm text-gray-600">
														<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
															<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
														</svg>
														<span>{quiz.timeLimit ? `${quiz.timeLimit} min` : 'No limit'}</span>
													</div>
													
													<div class="flex items-center gap-2 text-sm text-gray-600">
														<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
															<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
														</svg>
														<span>{quiz.passingScore}% to pass</span>
													</div>
													
													<div class="flex items-center gap-2 text-sm text-gray-600">
														<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
															<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
														</svg>
														<span>{quiz.maxAttempts || 'Unlimited'} attempts</span>
													</div>
												</div>
												
												<!-- Student Statistics -->
												{#if stats && stats.totalAttempts > 0}
													<div class="bg-blue-50 rounded-lg p-4 mb-4">
														<h4 class="text-sm font-semibold text-blue-900 mb-3">Student Performance</h4>
														<div class="grid grid-cols-2 md:grid-cols-4 gap-4">
															<div>
																<div class="text-2xl font-bold text-blue-900">{stats.totalAttempts}</div>
																<div class="text-xs text-blue-700">Total Attempts</div>
															</div>
															<div>
																<div class="text-2xl font-bold text-blue-900">{stats.uniqueUsers}</div>
																<div class="text-xs text-blue-700">Unique Students</div>
															</div>
															<div>
																<div class="text-2xl font-bold text-blue-900">{stats.averageScore.toFixed(1)}%</div>
																<div class="text-xs text-blue-700">Average Score</div>
															</div>
															<div>
																<div class="text-2xl font-bold text-blue-900">{stats.passRate.toFixed(1)}%</div>
																<div class="text-xs text-blue-700">Pass Rate</div>
															</div>
														</div>
													</div>
												{:else if loadingStats}
													<div class="bg-gray-50 rounded-lg p-4 mb-4 text-center text-sm text-gray-500">
														Loading statistics...
													</div>
												{:else}
													<div class="bg-gray-50 rounded-lg p-4 mb-4 text-center text-sm text-gray-500">
														No student attempts yet
													</div>
												{/if}
												
												<!-- Metadata -->
												<div class="flex items-center gap-4 text-xs text-gray-500">
													<span>Created: {formatDate(quiz.createdAt)}</span>
													{#if quiz.updatedAt}
														<span>Updated: {formatDate(quiz.updatedAt)}</span>
													{/if}
													{#if quiz.publishedAt}
														<span>Published: {formatDate(quiz.publishedAt)}</span>
													{/if}
												</div>
											</div>
											
											<!-- Actions -->
											<div class="flex flex-col gap-2 ml-6">
												<Button
													size="sm"
													variant={quiz.isPublished ? 'outline' : 'default'}
													onclick={() => handleTogglePublish(quiz)}
												>
													{quiz.isPublished ? 'Unpublish' : 'Publish'}
												</Button>
												
												<Button
													size="sm"
													variant="outline"
													onclick={() => {
														const projectId = 'open-edu-koosty'
														window.open(
															`https://console.firebase.google.com/project/${projectId}/firestore/data/~2Fquizzes~2F${quiz.id}`,
															'_blank'
														)
													}}
												>
													Edit
												</Button>
												
												<Button
													size="sm"
													variant="outline"
													class="text-red-600 hover:bg-red-50"
													onclick={() => handleDeleteQuiz(quiz)}
												>
													Delete
												</Button>
											</div>
										</div>
									</CardContent>
								</Card>
							{/each}
						</div>
					{/if}
				</div>
			</div>
		</div>
	{/if}
</AuthGuard>
