<script lang="ts">
	import { page } from '$app/stores'
	import { goto } from '$app/navigation'
	import { authState } from '$lib/auth.svelte'
	import { canManageCourses } from '$lib/utils/admin'
	import AuthGuard from '$lib/components/AuthGuard.svelte'
	import QuizBuilder from '$lib/components/QuizBuilder.svelte'
	import Loading from '$lib/components/Loading.svelte'
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
		const currentCourseId = courseId
		const currentQuizId = quizId
		
		if (!authState.initialized) return
		
		if (!authState.user || !canManageCourses(authState.user)) {
			goto('/dashboard')
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
			goto(`/admin/courses/${courseId}/quizzes`)
		} catch (err: any) {
			error = err.message || 'Failed to update quiz'
			console.error('Error updating quiz:', err)
		} finally {
			isSaving = false
		}
	}
	
	function handleCancel() {
		goto(`/admin/courses/${courseId}/quizzes`)
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
		<div class="min-h-screen bg-gray-50 flex items-center justify-center p-4">
			<div class="bg-white rounded-lg shadow-lg p-8 max-w-md text-center">
				<div class="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
					<svg class="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
					</svg>
				</div>
				<h2 class="text-2xl font-bold text-red-600 mb-4">Error</h2>
				<p class="text-gray-600 mb-6">{error}</p>
				<button
					onclick={handleCancel}
					class="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
				>
					Back to Quiz Management
				</button>
			</div>
		</div>
	{:else if quiz}
		<div class="min-h-screen bg-gray-50">
			<!-- Header -->
			<div class="bg-white border-b">
				<div class="container mx-auto px-4 py-6">
					<div class="flex items-center justify-between">
						<div>
							<div class="flex items-center gap-3 text-sm text-gray-600 mb-2">
								<button
									onclick={() => goto('/admin')}
									class="hover:text-primary-600"
								>
									Admin
								</button>
								<span>/</span>
								<button
									onclick={() => goto(`/admin/courses/${courseId}`)}
									class="hover:text-primary-600"
								>
									Course
								</button>
								<span>/</span>
								<button
									onclick={() => goto(`/admin/courses/${courseId}/quizzes`)}
									class="hover:text-primary-600"
								>
									Quizzes
								</button>
								<span>/</span>
								<span class="text-gray-900">Edit Quiz</span>
							</div>
							<h1 class="text-3xl font-bold">Edit Quiz</h1>
							<p class="text-gray-600 mt-1">{quiz.title}</p>
						</div>
						<button
							onclick={handleCancel}
							class="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
						>
							Cancel
						</button>
					</div>
				</div>
			</div>

			<!-- Error Message -->
			{#if error}
				<div class="container mx-auto px-4 py-4">
					<div class="bg-red-50 border border-red-200 rounded-lg p-4">
						<div class="flex items-center gap-3">
							<svg class="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
							</svg>
							<p class="text-red-800">{error}</p>
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
