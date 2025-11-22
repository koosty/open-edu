<script lang="ts">
	import { page } from '$app/stores'
	import { navigate } from '$lib/utils/navigation'
	import { authState } from '$lib/auth.svelte'
	import { canManageCourses } from '$lib/utils/admin'
	import AuthGuard from '$lib/components/AuthGuard.svelte'
	import QuizBuilder from '$lib/components/QuizBuilder.svelte'
	import Loading from '$lib/components/Loading.svelte'
	import DynamicBreadcrumb from '$lib/components/DynamicBreadcrumb.svelte'
	import * as QuizService from '$lib/services/quiz'
	import type { Quiz } from '$lib/types/quiz'
	
	const courseId = $derived($page.params.id as string)
	const quizId = $derived($page.params.quizId as string)
	
	let quiz = $state<Quiz | null>(null)
	let loading = $state(true)
	let isSaving = $state(false)
	let error = $state<string | null>(null)
	
	// Load quiz data
	$effect(() => {
		const _currentCourseId = courseId
		const _currentQuizId = quizId
		
		if (!authState.initialized) return
		
		if (!authState.user || !canManageCourses(authState.user)) {
			navigate('/dashboard')
			return
		}
		
		loadQuiz()
	})
	
	async function loadQuiz() {
		loading = true
		error = null
		
		try {
			const quizData = await QuizService.getQuiz(quizId)
			
			if (!quizData) {
				error = 'Quiz not found'
				return
			}
			
			if (quizData.courseId !== courseId) {
				error = 'Quiz does not belong to this course'
				return
			}
			
			quiz = quizData
		} catch (err: any) {
			error = err.message || 'Failed to load quiz'
			console.error('Error loading quiz:', err)
		} finally {
			loading = false
		}
	}
	
	async function handleSave(quizData: Partial<Quiz>) {
		isSaving = true
		error = null
		
		try {
			await QuizService.updateQuiz(quizId, quizData)
			
			// Navigate back to quiz management
			navigate(`/admin/courses/${courseId}/quizzes`)
		} catch (err: any) {
			error = err.message || 'Failed to update quiz'
			console.error('Error updating quiz:', err)
		} finally {
			isSaving = false
		}
	}
	
	function handleCancel() {
		navigate(`/admin/courses/${courseId}/quizzes`)
	}
</script>

<svelte:head>
	<title>Edit Quiz - {quiz?.title || 'Loading...'}</title>
	<meta name="description" content="Edit quiz" />
</svelte:head>

<AuthGuard>
	{#if loading}
		<div class="flex justify-center items-center min-h-screen">
			<Loading />
		</div>
	{:else if error && !quiz}
		<div class="min-h-screen bg-muted/30 flex items-center justify-center p-4">
			<div class="bg-card rounded-lg shadow-lg p-8 max-w-md text-center">
				<div class="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-4">
					<svg class="w-8 h-8 text-destructive" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
					</svg>
				</div>
				<h2 class="text-2xl font-bold text-destructive mb-4">Error</h2>
				<p class="text-muted-foreground mb-6">{error}</p>
				<button
					onclick={handleCancel}
					class="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
				>
					Back to Quiz Management
				</button>
			</div>
		</div>
	{:else if quiz}
		<div class="min-h-screen bg-muted/30">
			<!-- Header -->
			<div class="bg-card border-b">
				<div class="container mx-auto px-4 py-6">
					<!-- Breadcrumb -->
					<DynamicBreadcrumb 
						items={[
							{ label: 'Admin', href: '/admin' },
							{ label: 'Course', href: `/admin/courses/${courseId}` },
							{ label: 'Quizzes', href: `/admin/courses/${courseId}/quizzes` },
							{ label: 'Edit Quiz', current: true }
						]} 
						class="mb-4"
					/>
					
					<div class="flex items-center justify-between">
						<div>
							<h1 class="text-3xl font-bold">Edit Quiz</h1>
							<p class="text-muted-foreground mt-1">{quiz.title}</p>
						</div>
						<button
							onclick={handleCancel}
							class="px-4 py-2 border border-input rounded-lg hover:bg-muted/30"
						>
							Cancel
						</button>
					</div>
				</div>
			</div>

			<!-- Error Message -->
			{#if error}
				<div class="container mx-auto px-4 py-4">
					<div class="bg-destructive/10 border border-destructive/30 rounded-lg p-4">
						<div class="flex items-center gap-3">
							<svg class="w-5 h-5 text-destructive" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
							</svg>
							<p class="text-destructive">{error}</p>
						</div>
					</div>
				</div>
			{/if}

			<!-- Quiz Builder -->
			<div class="container mx-auto px-4 py-8">
				<QuizBuilder
					courseId={quiz.courseId}
					lessonId={quiz.lessonId}
					initialQuiz={quiz}
					onSave={handleSave}
					onCancel={handleCancel}
					{isSaving}
				/>
			</div>
		</div>
	{/if}
</AuthGuard>
