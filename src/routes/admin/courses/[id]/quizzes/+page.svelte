<script lang="ts">
	import { page } from '$app/state'
	import { navigate } from '$lib/utils/navigation'
	import { authState } from '$lib/auth.svelte'
	import { canManageCourses } from '$lib/utils/admin'
	import { getErrorMessage } from '$lib/utils/errors'
	import { Button } from '$lib/components/ui'
	import { Card, CardContent } from '$lib/components/ui'
	import AuthGuard from '$lib/components/AuthGuard.svelte'
	import Loading from '$lib/components/Loading.svelte'
	import type { Timestamp } from 'firebase/firestore'
	import * as QuizService from '$lib/services/quiz'
	import { CourseService } from '$lib/services/courses'
	import type { Course } from '$lib/types'
	import type { Quiz, QuizStatistics } from '$lib/types/quiz'
	import { SvelteSet } from 'svelte/reactivity'
	
	const courseId = $derived(page.params.id as string)
	
	// State
	let quizzes = $state<Quiz[]>([])
	let course = $state<Course | null>(null)
	const quizStats = $state<Map<string, QuizStatistics>>(new Map())
	let loading = $state(true)
	let loadingStats = $state(false)
	let error = $state<string | null>(null)
	let success = $state<string | null>(null)
	
	// Order tracking state (v1.6.0)
	let originalOrder = $state<string[]>([])
	let hasOrderChanged = $derived(
		quizzes.length > 0 && 
		JSON.stringify(quizzes.map(q => q.id)) !== JSON.stringify(originalOrder)
	)
	let savingOrder = $state(false)
	
	// Bulk operations state
	const selectedQuizIds = new SvelteSet<string>()
	let bulkActionInProgress = $state(false)
	
	// Delete modal state
	let showDeleteModal = $state(false)
	let quizToDelete = $state<Quiz | null>(null)
	let isDeleting = $state(false)
	let showBulkDeleteModal = $state(false)
	
	// Load data
	$effect(() => {
		const _currentCourseId = courseId
		
		if (!authState.initialized) return
		
		if (!authState.user || !canManageCourses(authState.user)) {
			navigate('/dashboard')
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
			
			// Sort quizzes by order field (v1.6.0)
			quizzes = quizzesData.sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
			
			// Track original order for change detection
			originalOrder = quizzes.map(q => q.id)
			
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
		} catch (err) {
			error = getErrorMessage(err)
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
		} catch (err) {
			error = getErrorMessage(err)
			setTimeout(() => error = null, 5000)
		}
	}
	
	// Reorder quiz in memory (v1.6.0)
	function handleReorderQuiz(index: number, direction: 'up' | 'down') {
		if (direction === 'up' && index === 0) return
		if (direction === 'down' && index === quizzes.length - 1) return
		
		const newIndex = direction === 'up' ? index - 1 : index + 1
		const temp = quizzes[index]
		quizzes[index] = quizzes[newIndex]
		quizzes[newIndex] = temp
		
		// Update order numbers
		quizzes = quizzes.map((quiz, idx) => ({
			...quiz,
			order: idx + 1
		}))
	}
	
	// Save quiz order to database (v1.6.0)
	async function saveQuizOrder() {
		if (!hasOrderChanged || savingOrder) return
		
		savingOrder = true
		error = null
		
		try {
			await QuizService.batchUpdateQuizzes(courseId, quizzes.map(q => ({
				id: q.id,
				order: q.order ?? 0,
				lessonId: q.lessonId,
				title: q.title,
				questions: q.questions,
				passingScore: q.passingScore,
				timeLimit: q.timeLimit
			})))
			
			// Update original order to match current
			originalOrder = quizzes.map(q => q.id)
			
			success = 'Quiz order saved successfully'
			setTimeout(() => success = null, 3000)
		} catch (err) {
			error = getErrorMessage(err)
			setTimeout(() => error = null, 5000)
		} finally {
			savingOrder = false
		}
	}
	
	function handleDeleteQuiz(quiz: Quiz) {
		quizToDelete = quiz
		showDeleteModal = true
	}
	
	async function confirmDeleteQuiz() {
		if (!quizToDelete) return
		
		isDeleting = true
		error = null
		
		try {
			await QuizService.deleteQuiz(quizToDelete.id)
			success = `Quiz "${quizToDelete.title}" deleted successfully`
			
			// Update local state
			quizzes = quizzes.filter(q => q.id !== quizToDelete!.id)
			
			// Close modal
			showDeleteModal = false
			quizToDelete = null
			
			setTimeout(() => success = null, 3000)
		} catch (err) {
			error = getErrorMessage(err)
			setTimeout(() => error = null, 5000)
		} finally {
			isDeleting = false
		}
	}
	
	function cancelDelete() {
		showDeleteModal = false
		quizToDelete = null
	}
	
	function handleCreateQuiz() {
		// Navigate directly to quiz builder - lesson will be created automatically
		navigate(`/admin/courses/${courseId}/quizzes/new`)
	}
	
	// Bulk operations
	function toggleSelectAll() {
		if (selectedQuizIds.size === quizzes.length) {
			selectedQuizIds.clear()
		} else {
			selectedQuizIds.clear()
			quizzes.forEach(q => selectedQuizIds.add(q.id))
		}
		// SvelteSet is already reactive
	}
	
	function toggleSelectQuiz(quizId: string) {
		if (selectedQuizIds.has(quizId)) {
			selectedQuizIds.delete(quizId)
		} else {
			selectedQuizIds.add(quizId)
		}
		// SvelteSet is already reactive
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
		} catch (err) {
			error = getErrorMessage(err)
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
		} catch (err) {
			error = getErrorMessage(err)
			setTimeout(() => error = null, 5000)
		} finally {
			bulkActionInProgress = false
		}
	}
	
	function handleBulkDelete() {
		if (selectedQuizIds.size === 0) return
		showBulkDeleteModal = true
	}
	
	async function confirmBulkDelete() {
		bulkActionInProgress = true
		error = null
		
		try {
			const count = selectedQuizIds.size
			const promises = Array.from(selectedQuizIds).map(id =>
				QuizService.deleteQuiz(id)
			)
			await Promise.all(promises)
			
			// Update local state
			quizzes = quizzes.filter(q => !selectedQuizIds.has(q.id))
			
			success = `${count} quiz(zes) deleted successfully`
			selectedQuizIds.clear()
			showBulkDeleteModal = false
			setTimeout(() => success = null, 3000)
		} catch (err) {
			error = getErrorMessage(err)
			setTimeout(() => error = null, 5000)
		} finally {
			bulkActionInProgress = false
		}
	}
	
	function cancelBulkDelete() {
		showBulkDeleteModal = false
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
	
	function _getDifficultyColor(difficulty?: 'easy' | 'medium' | 'hard'): string {
		switch (difficulty) {
			case 'easy': return 'bg-secondary/10 text-secondary'
			case 'medium': return 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400'
			case 'hard': return 'bg-destructive/10 text-destructive'
			default: return 'bg-muted text-foreground'
		}
	}
	
	function formatDate(date: Date | Timestamp | string | null | undefined): string {
		if (!date) return 'N/A'
		
		try {
			const dateObj = date instanceof Date ? date : 
				(typeof date === 'object' && 'toDate' in date) ? date.toDate() : 
				new Date(date)
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
		<div class="min-h-screen bg-muted/30 flex items-center justify-center">
			<Card class="max-w-md">
				<CardContent class="p-8 text-center">
					<h2 class="text-2xl font-bold text-destructive mb-4">Error</h2>
					<p class="text-muted-foreground mb-6">{error}</p>
					<Button onclick={() => navigate('/admin')}>
						Back to Admin
					</Button>
				</CardContent>
			</Card>
		</div>
	{:else}
		<div class="min-h-screen bg-muted/30">
			<!-- Header -->
			<div class="bg-background border-b">
				<div class="container mx-auto px-4 py-6">
					<div class="flex items-center justify-between">
						<div>
							<div class="flex items-center gap-3 text-sm text-muted-foreground mb-2">
								<button
									onclick={() => navigate('/admin')}
									class="hover:text-primary"
								>
									Admin
								</button>
								<span>/</span>
								<button
									onclick={() => navigate(`/admin/courses/${courseId}`)}
									class="hover:text-primary"
								>
									{course?.title}
								</button>
								<span>/</span>
								<span class="text-foreground">Quizzes</span>
							</div>
							<h1 class="text-3xl font-bold text-foreground">Manage Quizzes</h1>
							<p class="text-muted-foreground mt-1">
								{quizzes.length} {quizzes.length === 1 ? 'quiz' : 'quizzes'} in this course
							</p>
						</div>
						<div class="flex gap-3">
							<Button 
								variant="outline" 
								onclick={() => navigate(`/admin/courses/${courseId}`)}
							>
								Back to Course
							</Button>
							{#if hasOrderChanged}
								<Button 
									variant="secondary"
									onclick={saveQuizOrder}
									disabled={savingOrder}
								>
									{#if savingOrder}
										<svg class="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
											<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
											<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
										</svg>
										Saving...
									{:else}
										<svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
										</svg>
										Save Order
									{/if}
								</Button>
							{/if}
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
					<div class="mb-6 p-4 bg-secondary/10 border border-secondary/30 rounded-lg">
						<div class="flex items-center gap-3">
							<svg class="w-5 h-5 text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
							</svg>
							<p class="text-secondary font-medium">{success}</p>
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
									class="text-sm text-primary hover:text-primary-800 font-medium"
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
					<div class="mb-6 p-4 bg-destructive/10 border border-destructive/30 rounded-lg">
						<div class="flex items-center gap-3">
							<svg class="w-5 h-5 text-destructive" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
							</svg>
							<p class="text-destructive">{error}</p>
						</div>
					</div>
				{/if}

				<div class="max-w-6xl mx-auto">
					{#if quizzes.length === 0}
						<!-- Empty State -->
						<Card>
							<CardContent class="py-16 text-center">
								<div class="flex justify-center mb-4">
									<svg class="w-16 h-16 text-muted-foreground/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
									</svg>
								</div>
								<h3 class="text-xl font-semibold text-foreground mb-2">No quizzes yet</h3>
								<p class="text-muted-foreground mb-6 max-w-md mx-auto">
									Create your first quiz to assess student learning with our visual quiz builder.
								</p>
								<Button onclick={handleCreateQuiz}>
									<svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
									</svg>
									Create Your First Quiz
								</Button>
								<div class="mt-6 pt-6 border-t">
									<p class="text-sm text-muted-foreground">
										You'll select a lesson, then use our drag-and-drop quiz builder to create questions.
									</p>
								</div>
							</CardContent>
						</Card>
					{:else}
						<!-- Select All Header -->
						<div class="mb-4 flex items-center gap-3 p-3 bg-card rounded-lg border">
							<input
								type="checkbox"
								checked={selectedQuizIds.size === quizzes.length}
								indeterminate={selectedQuizIds.size > 0 && selectedQuizIds.size < quizzes.length}
								onchange={toggleSelectAll}
								class="w-4 h-4 text-primary border-input rounded focus:ring-primary-500"
							/>
							<span class="text-sm font-medium text-foreground">
								Select All ({quizzes.length})
							</span>
						</div>
						
						<!-- Quiz List -->
						<div class="space-y-4">
							{#each quizzes as quiz, index (quiz.id)}
								{@const stats = quizStats.get(quiz.id)}
								<Card>
									<CardContent class="p-6">
										<div class="flex items-start gap-4">
											<!-- Reorder Buttons (v1.6.0) -->
											<div class="flex flex-col gap-1">
												<button
													onclick={() => handleReorderQuiz(index, 'up')}
													disabled={index === 0}
													class="p-1 hover:bg-muted rounded disabled:opacity-30 disabled:cursor-not-allowed"
													aria-label="Move up"
												>
													<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
														<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7" />
													</svg>
												</button>
												<button
													onclick={() => handleReorderQuiz(index, 'down')}
													disabled={index === quizzes.length - 1}
													class="p-1 hover:bg-muted rounded disabled:opacity-30 disabled:cursor-not-allowed"
													aria-label="Move down"
												>
													<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
														<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
													</svg>
												</button>
											</div>
											
											<!-- Checkbox -->
											<input
												type="checkbox"
												checked={selectedQuizIds.has(quiz.id)}
												onchange={() => toggleSelectQuiz(quiz.id)}
												class="mt-1 w-4 h-4 text-primary border-input rounded focus:ring-primary-500"
											/>
											
											<!-- Quiz Info -->
											<div class="flex-1">
												<div class="flex items-center gap-3 mb-2">
													<span class="text-xs font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded">{quiz.order ?? index + 1}</span>
													<h3 class="text-xl font-semibold">{quiz.title}</h3>
													
													<!-- Status Badge -->
													{#if quiz.isPublished}
														<span class="px-2 py-1 text-xs font-medium bg-secondary/10 text-secondary rounded">
															Published
														</span>
													{:else}
														<span class="px-2 py-1 text-xs font-medium bg-muted text-muted-foreground rounded">
															Draft
														</span>
													{/if}
												</div>
												
												{#if quiz.description}
													<p class="text-muted-foreground mb-4">{quiz.description}</p>
												{/if}
												
												<!-- Quiz Configuration -->
												<div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 pb-4 border-b">
													<div class="flex items-center gap-2 text-sm text-muted-foreground">
														<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
															<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
														</svg>
														<span>{quiz.questions.length} questions</span>
													</div>
													
													<div class="flex items-center gap-2 text-sm text-muted-foreground">
														<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
															<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
														</svg>
														<span>{quiz.timeLimit ? `${quiz.timeLimit} min` : 'No limit'}</span>
													</div>
													
													<div class="flex items-center gap-2 text-sm text-muted-foreground">
														<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
															<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
														</svg>
														<span>{quiz.passingScore}% to pass</span>
													</div>
													
													<div class="flex items-center gap-2 text-sm text-muted-foreground">
														<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
															<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
														</svg>
														<span>{quiz.maxAttempts || 'Unlimited'} attempts</span>
													</div>
												</div>
												
												<!-- Student Statistics -->
												{#if stats && stats.totalAttempts > 0}
													<div class="bg-primary/10 rounded-lg p-4 mb-4">
														<h4 class="text-sm font-semibold text-primary mb-3">Student Performance</h4>
														<div class="grid grid-cols-2 md:grid-cols-4 gap-4">
															<div>
																<div class="text-2xl font-bold text-primary">{stats.totalAttempts}</div>
																<div class="text-xs text-primary">Total Attempts</div>
															</div>
															<div>
																<div class="text-2xl font-bold text-primary">{stats.uniqueUsers}</div>
																<div class="text-xs text-primary">Unique Students</div>
															</div>
															<div>
																<div class="text-2xl font-bold text-primary">{stats.averageScore.toFixed(1)}%</div>
																<div class="text-xs text-primary">Average Score</div>
															</div>
															<div>
																<div class="text-2xl font-bold text-primary">{stats.passRate.toFixed(1)}%</div>
																<div class="text-xs text-primary">Pass Rate</div>
															</div>
														</div>
													</div>
												{:else if loadingStats}
													<div class="bg-muted/30 rounded-lg p-4 mb-4 text-center text-sm text-muted-foreground">
														Loading statistics...
													</div>
												{:else}
													<div class="bg-muted/30 rounded-lg p-4 mb-4 text-center text-sm text-muted-foreground">
														No student attempts yet
													</div>
												{/if}
												
												<!-- Metadata -->
												<div class="flex items-center gap-4 text-xs text-muted-foreground">
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
													onclick={() => navigate(`/admin/courses/${courseId}/quizzes/${quiz.id}/preview`)}
												>
													<svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
														<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
														<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
													</svg>
													Preview
												</Button>
												
											<Button
												size="sm"
												variant="outline"
												onclick={() => navigate(`/admin/courses/${courseId}/quizzes/${quiz.id}/edit`)}
											>
												<svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
													<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
												</svg>
												Edit
											</Button>
												
												<Button
													size="sm"
													variant="outline"
													class="text-destructive hover:bg-destructive/10"
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
	
	<!-- Delete Confirmation Modal -->
	{#if showDeleteModal && quizToDelete}
		<div class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
			<div class="bg-card rounded-xl shadow-2xl max-w-md w-full animate-in zoom-in-95 duration-200">
				<!-- Header -->
				<div class="p-6 border-b border-border">
					<div class="flex items-center gap-3">
						<div class="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center flex-shrink-0">
							<svg class="w-6 h-6 text-destructive" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
							</svg>
						</div>
						<div>
							<h3 class="text-lg font-semibold text-foreground">Delete Quiz</h3>
							<p class="text-sm text-muted-foreground">This action cannot be undone</p>
						</div>
					</div>
				</div>
				
				<!-- Content -->
				<div class="p-6">
					<p class="text-foreground mb-4">
						Are you sure you want to delete <span class="font-semibold text-foreground">"{quizToDelete.title}"</span>?
					</p>
					<div class="bg-destructive/10 border border-destructive/30 rounded-lg p-3 text-sm text-destructive">
						<div class="flex items-start gap-2">
							<svg class="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
							</svg>
							<div>
								<p class="font-medium mb-1">This will permanently delete:</p>
								<ul class="list-disc list-inside space-y-0.5 text-destructive">
									<li>The quiz and all questions</li>
									<li>All student attempts and scores</li>
									<li>Quiz analytics and statistics</li>
								</ul>
							</div>
						</div>
					</div>
				</div>
				
				<!-- Actions -->
				<div class="p-6 bg-muted/30 rounded-b-xl flex items-center justify-end gap-3">
					<Button
						variant="outline"
						onclick={cancelDelete}
						disabled={isDeleting}
					>
						Cancel
					</Button>
					<Button
						variant="outline"
						class="bg-destructive text-white hover:bg-destructive/90 border-destructive"
						onclick={confirmDeleteQuiz}
						disabled={isDeleting}
					>
						{#if isDeleting}
							<svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
								<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
								<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
							</svg>
							Deleting...
						{:else}
							<svg class="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
							</svg>
							Delete Quiz
						{/if}
					</Button>
				</div>
			</div>
		</div>
	{/if}
	
	<!-- Bulk Delete Confirmation Modal -->
	{#if showBulkDeleteModal}
		<div class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
			<div class="bg-card rounded-xl shadow-2xl max-w-md w-full animate-in zoom-in-95 duration-200">
				<!-- Header -->
				<div class="p-6 border-b border-border">
					<div class="flex items-center gap-3">
						<div class="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center flex-shrink-0">
							<svg class="w-6 h-6 text-destructive" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
							</svg>
						</div>
						<div>
							<h3 class="text-lg font-semibold text-foreground">Delete Multiple Quizzes</h3>
							<p class="text-sm text-muted-foreground">This action cannot be undone</p>
						</div>
					</div>
				</div>
				
				<!-- Content -->
				<div class="p-6">
					<p class="text-foreground mb-4">
						Are you sure you want to delete <span class="font-semibold text-foreground">{selectedQuizIds.size} selected quiz{selectedQuizIds.size > 1 ? 'zes' : ''}</span>?
					</p>
					<div class="bg-destructive/10 border border-destructive/30 rounded-lg p-3 text-sm text-destructive">
						<div class="flex items-start gap-2">
							<svg class="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
							</svg>
							<div>
								<p class="font-medium mb-1">This will permanently delete for all selected quizzes:</p>
								<ul class="list-disc list-inside space-y-0.5 text-destructive">
									<li>All questions and content</li>
									<li>All student attempts and scores</li>
									<li>All analytics and statistics</li>
								</ul>
							</div>
						</div>
					</div>
				</div>
				
				<!-- Actions -->
				<div class="p-6 bg-muted/30 rounded-b-xl flex items-center justify-end gap-3">
					<Button
						variant="outline"
						onclick={cancelBulkDelete}
						disabled={bulkActionInProgress}
					>
						Cancel
					</Button>
					<Button
						variant="outline"
						class="bg-destructive text-white hover:bg-destructive/90 border-destructive"
						onclick={confirmBulkDelete}
						disabled={bulkActionInProgress}
					>
						{#if bulkActionInProgress}
							<svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
								<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
								<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
							</svg>
							Deleting...
						{:else}
							<svg class="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
							</svg>
							Delete {selectedQuizIds.size} Quiz{selectedQuizIds.size > 1 ? 'zes' : ''}
						{/if}
					</Button>
				</div>
			</div>
		</div>
	{/if}
</AuthGuard>
