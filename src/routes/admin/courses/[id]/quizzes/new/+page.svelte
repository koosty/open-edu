<script lang="ts">
	import { page } from '$app/stores'
	import { goto } from '$app/navigation'
	import { authState } from '$lib/auth.svelte'
	import { canManageCourses } from '$lib/utils/admin'
	import { auth } from '$lib/firebase'
	import AuthGuard from '$lib/components/AuthGuard.svelte'
	import QuizBuilder from '$lib/components/QuizBuilder.svelte'
	import * as QuizService from '$lib/services/quiz'
	import type { Quiz } from '$lib/types/quiz'
	
	let courseId = $derived($page.params.id as string)
	let lessonId = $derived($page.url.searchParams.get('lessonId') || '')
	
	let isSaving = $state(false)
	let error = $state<string | null>(null)
	
	// Redirect if not authorized
	$effect(() => {
		if (!authState.initialized) return
		
		if (!authState.user || !canManageCourses(authState.user)) {
			goto('/dashboard')
		}
	})
	
	async function handleSave(quizData: Partial<Quiz>) {
		if (!lessonId) {
			error = 'Lesson ID is required. Please select a lesson first.'
			return
		}
		
		// Get current user from Firebase Auth directly
		const currentUser = auth.currentUser
		if (!currentUser) {
			error = 'You must be logged in to create a quiz.'
			return
		}
		
		isSaving = true
		error = null
		
		try {
			// Create the quiz with createdBy field for security rules
			const newQuiz = await QuizService.createQuiz({
				...quizData,
				courseId,
				lessonId,
				createdBy: currentUser.uid,
				isPublished: false
			} as Omit<Quiz, 'id' | 'createdAt' | 'updatedAt'>)
			
			// Navigate back to quiz management
			await goto(`/admin/courses/${courseId}/quizzes`)
		} catch (err: any) {
			error = err.message || 'Failed to create quiz'
			console.error('Error creating quiz:', err)
		} finally {
			isSaving = false
		}
	}
	
	function handleCancel() {
		goto(`/admin/courses/${courseId}/quizzes`)
	}
</script>

<AuthGuard>
	<div class="min-h-screen bg-gray-50">
		{#if error}
			<div class="max-w-6xl mx-auto p-6">
				<div class="bg-red-50 border border-red-300 rounded-lg p-4 mb-6">
					<p class="text-red-800">{error}</p>
				</div>
			</div>
		{/if}
		
		{#if !lessonId}
			<div class="max-w-6xl mx-auto p-6">
				<div class="bg-yellow-50 border border-yellow-300 rounded-lg p-6">
					<h2 class="text-lg font-semibold text-yellow-900 mb-2">Lesson Required</h2>
					<p class="text-yellow-800 mb-4">
						You must select a lesson before creating a quiz. Quizzes are linked to specific lessons in your course.
					</p>
					<div class="flex gap-3">
						<button
							onclick={() => goto(`/admin/courses/${courseId}/lessons`)}
							class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
						>
							Go to Lessons
						</button>
						<button
							onclick={handleCancel}
							class="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
						>
							Cancel
						</button>
					</div>
				</div>
			</div>
		{:else}
			<QuizBuilder
				{courseId}
				{lessonId}
				onSave={handleSave}
				onCancel={handleCancel}
				{isSaving}
			/>
		{/if}
	</div>
</AuthGuard>
