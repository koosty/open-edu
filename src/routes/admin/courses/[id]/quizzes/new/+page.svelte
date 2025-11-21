<script lang="ts">
	import { page } from '$app/stores'
	import { goto } from '$app/navigation'
	import { authState } from '$lib/auth.svelte'
	import { canManageCourses } from '$lib/utils/admin'
	import { auth } from '$lib/firebase'
	import AuthGuard from '$lib/components/AuthGuard.svelte'
	import { Button, Card, CardContent, CardHeader, CardTitle, Input } from '$lib/components/ui'
	import QuizBuilder from '$lib/components/QuizBuilder.svelte'
	import * as QuizService from '$lib/services/quiz'
	import type { Quiz } from '$lib/types/quiz'
	
	const courseId = $derived($page.params.id as string)
	
	let isSaving = $state(false)
	let error = $state<string | null>(null)
	let showLessonForm = $state(true)
	
	// Lesson data state
	let lessonTitle = $state('')
	let lessonDescription = $state('')
	let lessonDuration = $state<number | undefined>(undefined)
	
	// Redirect if not authorized
	$effect(() => {
		if (!authState.initialized) return
		
		if (!authState.user || !canManageCourses(authState.user)) {
			goto('/dashboard')
		}
	})
	
	async function handleSave(quizData: Partial<Quiz>) {
		if (!lessonTitle.trim()) {
			error = 'Lesson title is required'
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
			// Create the quiz with lesson using the new service function
			const result = await QuizService.createQuizWithLesson(
				courseId,
				{
					title: lessonTitle,
					description: lessonDescription || undefined,
					duration: lessonDuration
				},
				{
					...quizData,
					createdBy: currentUser.uid,
					isPublished: false
				} as Omit<Quiz, 'id' | 'createdAt' | 'updatedAt' | 'lessonId' | 'courseId'>
			)
			
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
	
	function handleLessonFormContinue() {
		if (!lessonTitle.trim()) {
			error = 'Lesson title is required'
			return
		}
		error = null
		showLessonForm = false
	}
</script>

<svelte:head>
	<title>Create New Quiz</title>
</svelte:head>

<AuthGuard>
	<div class="min-h-screen bg-gray-50">
		{#if error}
			<div class="max-w-6xl mx-auto p-6">
				<div class="bg-red-50 border border-red-300 rounded-lg p-4 mb-6">
					<p class="text-red-800">{error}</p>
				</div>
			</div>
		{/if}
		
		{#if showLessonForm}
			<!-- Step 1: Lesson Information -->
			<div class="max-w-2xl mx-auto p-6">
				<Card>
					<CardHeader>
						<CardTitle>Create Quiz Lesson</CardTitle>
						<p class="text-sm text-gray-600 mt-2">
							First, let's set up the lesson that will contain this quiz. 
							Students will see this information in the course lesson list.
						</p>
					</CardHeader>
					<CardContent class="space-y-4">
						<div>
							<label for="lesson-title" class="block text-sm font-medium mb-2">
								Lesson Title <span class="text-red-500">*</span>
							</label>
							<Input
								id="lesson-title"
								type="text"
								bind:value={lessonTitle}
								placeholder="e.g., Quiz: Introduction to Variables"
								class="w-full"
							/>
							<p class="text-xs text-gray-500 mt-1">
								This will appear in the course table of contents
							</p>
						</div>
						
						<div>
							<label for="lesson-description" class="block text-sm font-medium mb-2">
								Lesson Description
							</label>
							<textarea
								id="lesson-description"
								bind:value={lessonDescription}
								placeholder="Describe what this quiz covers..."
								class="w-full px-3 py-2 border rounded-md resize-none"
								rows="3"
							></textarea>
							<p class="text-xs text-gray-500 mt-1">
								Optional: Brief description visible to students
							</p>
						</div>
						
						<div>
							<label for="lesson-duration" class="block text-sm font-medium mb-2">
								Estimated Duration (minutes)
							</label>
							<input
								id="lesson-duration"
								type="number"
								bind:value={lessonDuration}
								placeholder="15"
								class="w-full px-3 py-2 border rounded-md"
								min="1"
								max="180"
							/>
							<p class="text-xs text-gray-500 mt-1">
								Optional: How long should students expect to spend?
							</p>
						</div>
						
						<div class="flex gap-3 pt-4">
							<Button
								onclick={handleLessonFormContinue}
								disabled={!lessonTitle.trim()}
								class="flex-1"
							>
								Continue to Quiz Builder
							</Button>
							<Button
								variant="outline"
								onclick={handleCancel}
							>
								Cancel
							</Button>
						</div>
					</CardContent>
				</Card>
				
				<!-- Help Text -->
				<div class="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
					<div class="flex gap-3">
						<svg class="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
						</svg>
						<div class="text-sm text-blue-800">
							<p class="font-medium mb-1">New Workflow!</p>
							<p>
								Creating a quiz now automatically creates the lesson it belongs to. 
								You no longer need to pre-create quiz lessons separately.
							</p>
						</div>
					</div>
				</div>
			</div>
		{:else}
			<!-- Step 2: Quiz Builder -->
			<QuizBuilder
				{courseId}
				lessonId=""
				onSave={handleSave}
				onCancel={handleCancel}
				{isSaving}
			/>
		{/if}
	</div>
</AuthGuard>
