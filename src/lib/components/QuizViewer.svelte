<!--
	QuizViewer Component
	Handles quiz taking interface for students
-->
<script lang="ts">
	import { Button, Card, CardContent } from '$lib/components/ui'
	import type { Quiz, QuizAnswer } from '$lib/types/quiz'
	import { Clock, AlertCircle, CheckCircle } from 'lucide-svelte'
	
	// Props
	let {
		quiz,
		onSubmit,
		isSubmitting = false,
		previewMode = false,
		onExitPreview
	}: {
		quiz: Quiz
		onSubmit: (answers: QuizAnswer[]) => Promise<void>
		isSubmitting?: boolean
		previewMode?: boolean
		onExitPreview?: () => void
	} = $props()
	
	// State
	let answers = $state<Record<string, string | number | string[] | boolean | null>>({})
	let currentQuestionIndex = $state(0)
	let timeElapsed = $state(0)
	let timerInterval: ReturnType<typeof setInterval> | undefined = $state(undefined)
	let showSubmitConfirm = $state(false)
	let showTimeUpModal = $state(false)
	
	// Derived state
	let currentQuestion = $derived(quiz.questions[currentQuestionIndex])
	let totalQuestions = $derived(quiz.questions.length)
	let answeredCount = $derived(Object.keys(answers).filter(key => answers[key] !== null && answers[key] !== undefined).length)
	let canGoNext = $derived(currentQuestionIndex < totalQuestions - 1)
	let canGoPrevious = $derived(currentQuestionIndex > 0)
	let isLastQuestion = $derived(currentQuestionIndex === totalQuestions - 1)
	let allAnswered = $derived(answeredCount === totalQuestions)
	let timeLimitSeconds = $derived(quiz.timeLimit ? quiz.timeLimit * 60 : undefined)
	let timeRemainingSeconds = $derived(
		timeLimitSeconds ? timeLimitSeconds - timeElapsed : undefined
	)
	
	// Timer warning states
	let timerWarningLevel = $derived.by(() => {
		if (!timeRemainingSeconds || !timeLimitSeconds) return 'none'
		if (timeRemainingSeconds <= 60) return 'critical' // 1 min
		if (timeRemainingSeconds <= 300) return 'warning' // 5 min
		return 'normal'
	})
	
	let timerProgress = $derived.by(() => {
		if (!timeRemainingSeconds || !timeLimitSeconds) return 100
		return (timeRemainingSeconds / timeLimitSeconds) * 100
	})
	
	// Format time display
	function formatTime(seconds: number): string {
		const mins = Math.floor(seconds / 60)
		const secs = seconds % 60
		return `${mins}:${secs.toString().padStart(2, '0')}`
	}
	
	// Start timer
	$effect(() => {
		timerInterval = setInterval(() => {
			timeElapsed++
			
			// Check if time limit exceeded
			if (timeLimitSeconds && timeElapsed >= timeLimitSeconds) {
				handleAutoSubmit()
			}
		}, 1000)
		
		return () => {
			if (timerInterval) clearInterval(timerInterval)
		}
	})
	
	// Navigation
	function goToQuestion(index: number) {
		if (index >= 0 && index < totalQuestions) {
			currentQuestionIndex = index
		}
	}
	
	function goNext() {
		if (canGoNext) {
			currentQuestionIndex++
		}
	}
	
	function goPrevious() {
		if (canGoPrevious) {
			currentQuestionIndex--
		}
	}
	
	// Answer handling
	function setAnswer(questionId: string, value: string | number | string[] | boolean | null) {
		answers[questionId] = value
	}
	
	function toggleMultipleSelect(questionId: string, optionId: string) {
		const current = answers[questionId] as string[] || []
		if (current.includes(optionId)) {
			answers[questionId] = current.filter(id => id !== optionId)
		} else {
			answers[questionId] = [...current, optionId]
		}
	}
	
	// Submit handling
	function handleSubmitClick() {
		if (!allAnswered) {
			showSubmitConfirm = true
		} else {
			handleSubmit()
		}
	}
	
	async function handleSubmit() {
		showSubmitConfirm = false
		
		// In preview mode, don't actually submit
		if (previewMode) {
			alert('Preview mode: Quiz submission is disabled. Click "Reset Preview" to try again or "Exit Preview" to return.')
			return
		}
		
		// Convert answers to QuizAnswer format
		const quizAnswers: QuizAnswer[] = quiz.questions.map((question) => ({
			questionId: question.id,
			questionType: question.type,
			answer: answers[question.id] ?? null,
			isCorrect: false, // Will be calculated by service
			pointsEarned: 0, // Will be calculated by service
			pointsPossible: question.points,
			answeredAt: new Date().toISOString()
		}))
		
		await onSubmit(quizAnswers)
	}
	
	function handleResetPreview() {
		// Reset all state for preview
		answers = {}
		currentQuestionIndex = 0
		timeElapsed = 0
		showSubmitConfirm = false
		showTimeUpModal = false
	}
	
	async function handleAutoSubmit() {
		// Auto-submit when time expires
		if (timerInterval) clearInterval(timerInterval)
		showTimeUpModal = true
		// Auto-submit after showing modal
		setTimeout(async () => {
			showTimeUpModal = false
			await handleSubmit()
		}, 2000)
	}
	
	// Check if question is answered
	function isQuestionAnswered(questionId: string): boolean {
		const answer = answers[questionId]
		return answer !== null && answer !== undefined && answer !== ''
	}
</script>

<div class="quiz-viewer">
	<!-- Preview Mode Banner -->
	{#if previewMode}
		<div class="bg-gradient-to-r from-amber-500 to-orange-500 text-white px-4 py-3 sticky top-0 z-20 shadow-md">
			<div class="max-w-4xl mx-auto flex items-center justify-between gap-4">
				<div class="flex items-center gap-3">
					<div class="bg-white/20 p-2 rounded-lg">
						<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
						</svg>
					</div>
					<div>
						<p class="font-semibold text-sm md:text-base">Preview Mode</p>
						<p class="text-xs text-white/90 hidden md:block">Test the quiz as a student. Submissions are disabled.</p>
					</div>
				</div>
				<div class="flex items-center gap-2">
					<Button
						onclick={handleResetPreview}
						variant="secondary"
						size="sm"
						class="bg-white/20 hover:bg-white/30 text-white border-white/30"
					>
						<svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
						</svg>
						<span class="hidden sm:inline">Reset</span>
					</Button>
					{#if onExitPreview}
						<Button
							onclick={onExitPreview}
							variant="secondary"
							size="sm"
							class="bg-white text-orange-600 hover:bg-white/90"
						>
							<svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
							</svg>
							Exit
						</Button>
					{/if}
				</div>
			</div>
		</div>
	{/if}
	
	<!-- Quiz Header - Mobile Optimized -->
	<div class="quiz-header bg-white border-b border-slate-200 p-4 md:p-6 sticky top-0 z-10 shadow-sm">
		<div class="max-w-4xl mx-auto">
			<!-- Mobile: Stack vertically, Desktop: Side by side -->
			<div class="flex flex-col md:flex-row md:items-center md:justify-between gap-3 md:gap-0 mb-4">
				<div class="flex-1 min-w-0">
					<h2 class="text-lg md:text-2xl font-bold text-slate-900 truncate">{quiz.title}</h2>
					{#if quiz.description}
						<p class="text-sm md:text-base text-slate-600 mt-1 line-clamp-2 md:line-clamp-1">{quiz.description}</p>
					{/if}
				</div>
				
				<div class="flex items-center gap-2 md:gap-4">
					<!-- Enhanced Timer with Visual Warnings - Mobile Optimized -->
					{#if timeLimitSeconds}
						<div class="flex items-center gap-2 md:gap-3 px-3 md:px-4 py-2 rounded-lg transition-all duration-300 {
							timerWarningLevel === 'critical' ? 'bg-red-50 text-red-700 ring-2 ring-red-200 animate-pulse' :
							timerWarningLevel === 'warning' ? 'bg-yellow-50 text-yellow-700 ring-2 ring-yellow-200' :
							'bg-slate-100 text-slate-700'
						}">
							<!-- Circular Progress Indicator - Smaller on mobile -->
							<div class="relative w-8 h-8 md:w-10 md:h-10">
								<svg class="transform -rotate-90" viewBox="0 0 36 36">
									<!-- Background circle -->
									<circle
										cx="18"
										cy="18"
										r="16"
										fill="none"
										class="{timerWarningLevel === 'critical' ? 'stroke-red-200' : timerWarningLevel === 'warning' ? 'stroke-yellow-200' : 'stroke-slate-200'}"
										stroke-width="3"
									/>
									<!-- Progress circle -->
									<circle
										cx="18"
										cy="18"
										r="16"
										fill="none"
										class="{timerWarningLevel === 'critical' ? 'stroke-red-600' : timerWarningLevel === 'warning' ? 'stroke-yellow-600' : 'stroke-primary-600'}"
										stroke-width="3"
										stroke-dasharray="100"
										stroke-dashoffset="{100 - timerProgress}"
										stroke-linecap="round"
										style="transition: stroke-dashoffset 1s linear"
									/>
								</svg>
								<Clock class="w-3 h-3 md:w-4 md:h-4 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
							</div>
							
							<div class="flex flex-col">
								<span class="text-[10px] md:text-xs font-medium opacity-75 hidden md:block">Time Remaining</span>
								<span class="font-mono text-base md:text-lg font-bold leading-none">
									{formatTime(timeRemainingSeconds || 0)}
								</span>
							</div>
							
							{#if timerWarningLevel === 'critical'}
								<span class="text-xs font-semibold hidden md:inline">Hurry!</span>
							{:else if timerWarningLevel === 'warning'}
								<span class="text-xs font-semibold">⚠️</span>
							{/if}
						</div>
					{:else}
						<!-- Elapsed time (no limit) - Mobile Optimized -->
						<div class="flex items-center gap-2 px-3 md:px-4 py-2 rounded-lg bg-slate-100 text-slate-700">
							<Clock class="w-4 h-4 md:w-5 md:h-5" />
							<span class="font-mono font-semibold text-sm md:text-base">
								{formatTime(timeElapsed)}
							</span>
						</div>
					{/if}
					
					<!-- Progress - Mobile Compact -->
					<div class="text-xs md:text-sm whitespace-nowrap">
						<span class="font-semibold text-slate-900">{answeredCount}</span>
						<span class="text-slate-600">/{totalQuestions}</span>
						<span class="hidden md:inline text-slate-600"> answered</span>
					</div>
				</div>
			</div>
			
			<!-- Progress bar -->
			<div class="w-full bg-slate-200 rounded-full h-1.5 md:h-2">
				<div
					class="bg-gradient-to-r from-primary-500 to-primary-600 h-1.5 md:h-2 rounded-full transition-all duration-300"
					style="width: {(answeredCount / totalQuestions) * 100}%"
				></div>
			</div>
		</div>
	</div>
	
	<!-- Quiz Instructions - Mobile Optimized -->
	{#if quiz.instructions}
		<div class="max-w-4xl mx-auto px-4 md:px-6 pt-4 md:pt-6">
			<div class="bg-accent-50 border border-accent-200 rounded-xl p-4 md:p-5 shadow-sm">
				<div class="flex items-start gap-2 md:gap-3">
					<AlertCircle class="w-4 h-4 md:w-5 md:h-5 text-accent-600 mt-0.5 shrink-0" />
					<div class="flex-1 min-w-0">
						<h3 class="text-xs md:text-sm font-semibold text-accent-900">Instructions</h3>
						<p class="text-xs md:text-sm text-accent-700 mt-1 leading-relaxed">{quiz.instructions}</p>
						<div class="flex flex-wrap gap-3 md:gap-4 mt-2 text-[10px] md:text-xs text-accent-600">
							<span class="whitespace-nowrap">Pass: {quiz.passingScore}%</span>
							{#if quiz.timeLimit}
								<span class="whitespace-nowrap">Time: {quiz.timeLimit} min</span>
							{/if}
							{#if quiz.allowMultipleAttempts}
								<span class="whitespace-nowrap">Multiple attempts</span>
							{/if}
						</div>
					</div>
				</div>
			</div>
		</div>
	{/if}
	
	<!-- Question Content - Mobile Optimized -->
	<div class="max-w-4xl mx-auto px-4 md:px-6 py-6 md:py-8">
		{#if currentQuestion}
			<Card class="shadow-lg border-slate-200">
				<CardContent class="p-4 md:p-8">
					<!-- Question Header - Mobile Friendly -->
					<div class="flex items-start gap-3 md:gap-4 mb-4 md:mb-6">
						<div class="w-8 h-8 md:w-10 md:h-10 bg-gradient-to-br from-primary-500 to-primary-600 rounded-full flex items-center justify-center text-xs md:text-sm font-bold text-white shadow-md shrink-0">
							{currentQuestionIndex + 1}
						</div>
						<div class="flex-1 min-w-0">
							<div class="flex flex-wrap items-center gap-2 mb-2">
								<span class="text-[10px] md:text-xs font-semibold text-slate-500 uppercase tracking-wide">
									{currentQuestion.type.replace('_', ' ')}
								</span>
								{#if currentQuestion.difficulty}
									<span class="text-[10px] md:text-xs px-1.5 md:px-2 py-0.5 rounded-full {
										currentQuestion.difficulty === 'easy' ? 'bg-green-100 text-green-700' :
										currentQuestion.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-700' :
										'bg-red-100 text-red-700'
									}">
										{currentQuestion.difficulty}
									</span>
								{/if}
								<span class="text-[10px] md:text-xs text-slate-500 ml-auto">
									{currentQuestion.points} {currentQuestion.points === 1 ? 'pt' : 'pts'}
								</span>
							</div>
							<h3 class="text-base md:text-lg font-semibold text-slate-900 leading-relaxed">
								{currentQuestion.question}
							</h3>
							
							{#if currentQuestion.hint}
								<details class="mt-3">
									<summary class="text-sm text-primary-600 cursor-pointer hover:text-primary-700">
										Show hint
									</summary>
									<p class="text-sm text-slate-600 mt-2 pl-4 border-l-2 border-primary-200">
										{currentQuestion.hint}
									</p>
								</details>
							{/if}
						</div>
					</div>
					
					<!-- Question Image -->
					{#if currentQuestion.image}
						<div class="mb-6">
							<img src={currentQuestion.image} alt="Question illustration" class="w-full rounded-lg shadow-sm" />
						</div>
					{/if}
					
					<!-- Answer Input -->
					<div class="space-y-3">
						{#if currentQuestion.type === 'multiple_choice'}
							<!-- Multiple Choice - Touch Optimized (min 44px height) -->
							{#each currentQuestion.options || [] as option (option.id)}
								<button
									type="button"
									onclick={() => setAnswer(currentQuestion.id, option.id)}
									class="w-full text-left min-h-[44px] p-3 md:p-4 rounded-lg border-2 transition-all duration-200 active:scale-[0.98] {
										answers[currentQuestion.id] === option.id
											? 'border-primary-500 bg-primary-50 shadow-sm'
											: 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
									}"
									disabled={isSubmitting}
								>
									<div class="flex items-center gap-3">
										<div class="w-5 h-5 md:w-6 md:h-6 rounded-full border-2 flex items-center justify-center shrink-0 {
											answers[currentQuestion.id] === option.id
												? 'border-primary-500 bg-primary-500'
												: 'border-slate-300'
										}">
											{#if answers[currentQuestion.id] === option.id}
												<div class="w-2 h-2 md:w-2.5 md:h-2.5 bg-white rounded-full"></div>
											{/if}
										</div>
										<span class="font-medium text-sm md:text-base text-slate-900 leading-snug">{option.text}</span>
									</div>
								</button>
							{/each}
							
						{:else if currentQuestion.type === 'multiple_select'}
							<!-- Multiple Select -->
							<p class="text-sm text-slate-600 mb-3">Select all that apply:</p>
							{#each currentQuestion.options || [] as option (option.id)}
								<button
									type="button"
									onclick={() => toggleMultipleSelect(currentQuestion.id, option.id)}
									class="w-full text-left p-4 rounded-lg border-2 transition-all duration-200 {
										(answers[currentQuestion.id] as string[] || []).includes(option.id)
											? 'border-primary-500 bg-primary-50 shadow-sm'
											: 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
									}"
									disabled={isSubmitting}
								>
									<div class="flex items-center gap-3">
										<div class="w-5 h-5 rounded border-2 flex items-center justify-center {
											(answers[currentQuestion.id] as string[] || []).includes(option.id)
												? 'border-primary-500 bg-primary-500'
												: 'border-slate-300'
										}">
											{#if (answers[currentQuestion.id] as string[] || []).includes(option.id)}
												<CheckCircle class="w-4 h-4 text-white" />
											{/if}
										</div>
										<span class="font-medium text-slate-900">{option.text}</span>
									</div>
								</button>
							{/each}
							
						{:else if currentQuestion.type === 'true_false'}
							<!-- True/False -->
							<div class="grid grid-cols-2 gap-4">
								<button
									type="button"
									onclick={() => setAnswer(currentQuestion.id, true)}
									class="p-6 rounded-lg border-2 transition-all duration-200 {
										answers[currentQuestion.id] === true
											? 'border-green-500 bg-green-50 shadow-sm'
											: 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
									}"
									disabled={isSubmitting}
								>
									<div class="text-center">
										<div class="text-3xl mb-2">✓</div>
										<span class="font-semibold text-slate-900">True</span>
									</div>
								</button>
								<button
									type="button"
									onclick={() => setAnswer(currentQuestion.id, false)}
									class="p-6 rounded-lg border-2 transition-all duration-200 {
										answers[currentQuestion.id] === false
											? 'border-red-500 bg-red-50 shadow-sm'
											: 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
									}"
									disabled={isSubmitting}
								>
									<div class="text-center">
										<div class="text-3xl mb-2">✗</div>
										<span class="font-semibold text-slate-900">False</span>
									</div>
								</button>
							</div>
							
						{:else if currentQuestion.type === 'short_answer' || currentQuestion.type === 'fill_blank'}
							<!-- Short Answer / Fill in Blank -->
							<input
								type="text"
								bind:value={answers[currentQuestion.id]}
								placeholder="Type your answer..."
								class="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition-colors"
								disabled={isSubmitting}
								maxlength={currentQuestion.maxLength}
							/>
							{#if currentQuestion.maxLength}
								<p class="text-xs text-slate-500 mt-1">
									{(answers[currentQuestion.id] as string || '').length} / {currentQuestion.maxLength} characters
								</p>
							{/if}
							
						{:else if currentQuestion.type === 'essay'}
							<!-- Essay -->
							<textarea
								bind:value={answers[currentQuestion.id]}
								placeholder="Write your answer..."
								rows="8"
								class="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition-colors resize-y"
								disabled={isSubmitting}
								minlength={currentQuestion.minLength}
								maxlength={currentQuestion.maxLength}
							></textarea>
							<p class="text-xs text-slate-500 mt-1">
								{(answers[currentQuestion.id] as string || '').length}
								{#if currentQuestion.minLength}
									/ {currentQuestion.minLength} minimum
								{/if}
								{#if currentQuestion.maxLength}
									(max {currentQuestion.maxLength})
								{/if}
								characters
							</p>
						{/if}
					</div>
				</CardContent>
			</Card>
		{/if}
	</div>
	
	<!-- Navigation Footer - Mobile Optimized -->
	<div class="border-t border-slate-200 bg-white p-3 md:p-6 sticky bottom-0 shadow-lg safe-area-bottom">
		<div class="max-w-4xl mx-auto">
			<!-- Question Navigator - Touch Optimized -->
			<div class="flex gap-2 mb-3 md:mb-4 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-hide">
				{#each quiz.questions as question, index (question.id)}
					<button
						type="button"
						onclick={() => goToQuestion(index)}
						class="min-w-[44px] min-h-[44px] w-11 h-11 md:w-10 md:h-10 rounded-lg border-2 shrink-0 transition-all duration-200 font-semibold text-sm active:scale-95 {
							index === currentQuestionIndex
								? 'border-primary-500 bg-primary-500 text-white shadow-sm'
								: isQuestionAnswered(question.id)
								? 'border-green-500 bg-green-50 text-green-700'
								: 'border-slate-300 text-slate-600 hover:border-slate-400'
						}"
					>
						{index + 1}
					</button>
				{/each}
			</div>
			
			<!-- Navigation Buttons - Mobile Optimized (min 44px touch target) -->
			<div class="flex items-center justify-between gap-2 md:gap-3">
				<Button
					variant="outline"
					onclick={goPrevious}
					disabled={!canGoPrevious || isSubmitting}
					class="min-h-[44px] px-4 md:px-6"
				>
					<span class="hidden sm:inline">←</span>
					<span class="sm:ml-2">Prev</span>
				</Button>
				
				<div class="flex gap-2 md:gap-3 flex-1 justify-end">
					{#if isLastQuestion}
						<Button
							onclick={handleSubmitClick}
							disabled={isSubmitting}
							class="min-h-[44px] px-4 md:px-6 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white shadow-md"
						>
							{isSubmitting ? 'Submitting...' : 'Submit Quiz'}
						</Button>
					{:else}
						<Button
							onclick={goNext}
							disabled={!canGoNext || isSubmitting}
							class="min-h-[44px] px-4 md:px-6"
						>
							<span class="sm:mr-2">Next</span>
							<span class="hidden sm:inline">→</span>
						</Button>
					{/if}
				</div>
			</div>
		</div>
	</div>
	
	<!-- Submit Confirmation Modal -->
	{#if showSubmitConfirm}
		<div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
			<div class="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
				<h3 class="text-xl font-bold text-slate-900 mb-2">Submit Quiz?</h3>
				<p class="text-slate-600 mb-4">
					You have answered {answeredCount} out of {totalQuestions} questions.
					{#if answeredCount < totalQuestions}
						Unanswered questions will be marked as incorrect.
					{/if}
				</p>
				<p class="text-sm text-slate-500 mb-6">
					Are you sure you want to submit your answers?
				</p>
				<div class="flex gap-3">
					<Button
						variant="outline"
						onclick={() => showSubmitConfirm = false}
						class="flex-1"
					>
						Review Answers
					</Button>
					<Button
						onclick={handleSubmit}
						class="flex-1 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white"
					>
						Submit Now
					</Button>
				</div>
			</div>
		</div>
	{/if}
	
	<!-- Time's Up Modal -->
	{#if showTimeUpModal}
		<div class="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 animate-in fade-in">
			<div class="bg-white rounded-xl shadow-2xl max-w-md w-full p-8 text-center animate-in zoom-in duration-300">
				<div class="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
					<Clock class="w-8 h-8 text-red-600" />
				</div>
				<h3 class="text-2xl font-bold text-slate-900 mb-2">Time's Up!</h3>
				<p class="text-slate-600 mb-4">
					Your quiz time has expired. Submitting your answers now...
				</p>
				<div class="flex items-center justify-center gap-2 text-sm text-slate-500">
					<div class="w-2 h-2 bg-primary-500 rounded-full animate-pulse"></div>
					<span>Auto-submitting...</span>
				</div>
			</div>
		</div>
	{/if}
</div>

<style>
	.quiz-viewer {
		min-height: 100vh;
		background-color: #f8fafc;
	}
	
	/* Mobile-specific styles */
	.scrollbar-hide {
		-ms-overflow-style: none;
		scrollbar-width: none;
	}
	
	.scrollbar-hide::-webkit-scrollbar {
		display: none;
	}
	
	/* Safe area for mobile devices (notch support) */
	.safe-area-bottom {
		padding-bottom: env(safe-area-inset-bottom);
	}
	
	@keyframes fade-in {
		from { opacity: 0; }
		to { opacity: 1; }
	}
	
	@keyframes zoom-in {
		from { transform: scale(0.9); }
		to { transform: scale(1); }
	}
	
	.animate-in {
		animation-fill-mode: both;
	}
	
	.fade-in {
		animation: fade-in 0.2s ease-out;
	}
	
	.zoom-in {
		animation: zoom-in 0.3s ease-out;
	}
	
	/* Touch feedback */
	@media (hover: none) {
		button:active {
			transform: scale(0.97);
		}
	}
</style>
