<script lang="ts">
	import { page } from '$app/state'
	import { navigate } from '$lib/utils/navigation'
	import { authState } from '$lib/auth.svelte'
	import { canManageCourses } from '$lib/utils/admin'
	import AuthGuard from '$lib/components/AuthGuard.svelte'
	import Loading from '$lib/components/Loading.svelte'
	import QuizViewer from '$lib/components/QuizViewer.svelte'
	import DynamicBreadcrumb from '$lib/components/DynamicBreadcrumb.svelte'
	import * as QuizService from '$lib/services/quiz'
	import type { Quiz, QuizAnswer } from '$lib/types/quiz'
	
	const courseId = $derived(page.params.id as string)
	const quizId = $derived(page.params.quizId as string)
	
	// State
	let quiz = $state<Quiz | null>(null)
	let loading = $state(true)
	let error = $state<string | null>(null)
	
	// Load quiz data
	$effect(() => {
		// Capture reactive dependencies
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
			
			quiz = quizData
		} catch (err: unknown) {
			error = err instanceof Error ? err.message : 'Failed to load quiz'
			console.error('Error loading quiz:', err)
		} finally {
			loading = false
		}
	}
	
	// No-op submit function for preview mode
	async function handlePreviewSubmit(_answers: QuizAnswer[]) {
		// Do nothing - preview mode doesn't save
		// Preview mode: Quiz submission prevented
	}
	
	function handleExitPreview() {
		navigate(`/admin/courses/${courseId}/quizzes`)
	}
</script>

<svelte:head>
	<title>Quiz Preview - {quiz?.title || 'Loading...'}</title>
	<meta name="description" content="Preview quiz as a student" />
</svelte:head>

<AuthGuard>
	{#if loading}
		<div class="flex justify-center items-center min-h-screen">
			<Loading />
		</div>
	{:else if error}
		<div class="min-h-screen bg-muted/30 flex items-center justify-center p-4">
			<div class="bg-card rounded-lg shadow-lg p-6 max-w-md w-full">
				<div class="flex items-center gap-3 text-destructive mb-4">
					<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
					</svg>
					<h2 class="text-lg font-semibold">Error Loading Quiz</h2>
				</div>
				<p class="text-muted-foreground mb-6">{error}</p>
				<div class="flex gap-3">
					<button
						onclick={() => loadQuiz()}
						class="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
					>
						Try Again
					</button>
					<button
						onclick={handleExitPreview}
						class="flex-1 px-4 py-2 bg-muted text-foreground rounded-lg hover:bg-muted/80 transition-colors"
					>
						Go Back
					</button>
				</div>
			</div>
		</div>
	{:else if quiz}
		<div class="min-h-screen bg-muted/30">
			<!-- Breadcrumb -->
			<div class="container mx-auto px-4 pt-6">
				<DynamicBreadcrumb 
					items={[
						{ label: 'Admin', href: '/admin' },
						{ label: 'Course', href: `/admin/courses/${courseId}` },
						{ label: 'Quizzes', href: `/admin/courses/${courseId}/quizzes` },
						{ label: 'Preview', current: true }
					]} 
				/>
			</div>
			
			<QuizViewer
				{quiz}
				onSubmit={handlePreviewSubmit}
				previewMode={true}
				onExitPreview={handleExitPreview}
			/>
		</div>
	{/if}
</AuthGuard>
