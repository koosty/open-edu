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
		isSubmitting = false
	}: {
		quiz: Quiz
		onSubmit: (answers: QuizAnswer[]) => Promise<void>
		isSubmitting?: boolean
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
		
		// Convert answers to QuizAnswer format
		const quizAnswers: QuizAnswer[] = quiz.questions.map((question, index) => ({
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
	<!-- Quiz Header -->
	<div class="quiz-header bg-white border-b border-slate-200 p-6 sticky top-0 z-10 shadow-sm">
		<div class="max-w-4xl mx-auto">
			<div class="flex items-center justify-between mb-4">
				<div>
					<h2 class="text-2xl font-bold text-slate-900">{quiz.title}</h2>
					{#if quiz.description}
						<p class="text-slate-600 mt-1">{quiz.description}</p>
					{/if}
				</div>
				
				<div class="flex items-center gap-4">
					<!-- Enhanced Timer with Visual Warnings -->
					{#if timeLimitSeconds}
						<div class="flex items-center gap-3 px-4 py-2 rounded-lg transition-all duration-300 {
							timerWarningLevel === 'critical' ? 'bg-red-50 text-red-700 ring-2 ring-red-200 animate-pulse' :
							timerWarningLevel === 'warning' ? 'bg-yellow-50 text-yellow-700 ring-2 ring-yellow-200' :
							'bg-slate-100 text-slate-700'
						}">
							<!-- Circular Progress Indicator -->
							<div class="relative w-10 h-10">
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
								<Clock class="w-4 h-4 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
							</div>
							
							<div class="flex flex-col">
								<span class="text-xs font-medium opacity-75">Time Remaining</span>
								<span class="font-mono text-lg font-bold leading-none">
									{formatTime(timeRemainingSeconds || 0)}
								</span>
							</div>
							
							{#if timerWarningLevel === 'critical'}
								<span class="text-xs font-semibold">Hurry!</span>
							{:else if timerWarningLevel === 'warning'}
								<span class="text-xs font-semibold">⚠️</span>
							{/if}
						</div>
					{:else}
						<!-- Elapsed time (no limit) -->
						<div class="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-100 text-slate-700">
							<Clock class="w-5 h-5" />
							<span class="font-mono font-semibold">
								{formatTime(timeElapsed)}
							</span>
						</div>
					{/if}
					
					<!-- Progress -->
					<div class="text-sm">
						<span class="font-semibold text-slate-900">{answeredCount}</span>
						<span class="text-slate-600">/{totalQuestions} answered</span>
					</div>
				</div>
			</div>
			
			<!-- Progress bar -->
			<div class="w-full bg-slate-200 rounded-full h-2">
				<div
					class="bg-gradient-to-r from-primary-500 to-primary-600 h-2 rounded-full transition-all duration-300"
					style="width: {(answeredCount / totalQuestions) * 100}%"
				></div>
			</div>
		</div>
	</div>
	
	<!-- Quiz Instructions -->
	{#if quiz.instructions}
		<div class="max-w-4xl mx-auto px-6 pt-6">
			<div class="bg-accent-50 border border-accent-200 rounded-xl p-5 shadow-sm">
				<div class="flex items-start gap-3">
					<AlertCircle class="w-5 h-5 text-accent-600 mt-0.5 shrink-0" />
					<div>
						<h3 class="text-sm font-semibold text-accent-900">Instructions</h3>
						<p class="text-sm text-accent-700 mt-1">{quiz.instructions}</p>
						<div class="flex gap-4 mt-2 text-xs text-accent-600">
							<span>Passing Score: {quiz.passingScore}%</span>
							{#if quiz.timeLimit}
								<span>Time Limit: {quiz.timeLimit} minutes</span>
							{/if}
							{#if quiz.allowMultipleAttempts}
								<span>Multiple attempts allowed</span>
							{/if}
						</div>
					</div>
				</div>
			</div>
		</div>
	{/if}
	
	<!-- Question Content -->
	<div class="max-w-4xl mx-auto px-6 py-8">
		{#if currentQuestion}
			<Card class="shadow-lg border-slate-200">
				<CardContent class="p-8">
					<!-- Question Header -->
					<div class="flex items-start gap-4 mb-6">
						<div class="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-600 rounded-full flex items-center justify-center text-sm font-bold text-white shadow-md shrink-0">
							{currentQuestionIndex + 1}
						</div>
						<div class="flex-1">
							<div class="flex items-center gap-2 mb-2">
								<span class="text-xs font-semibold text-slate-500 uppercase tracking-wide">
									{currentQuestion.type.replace('_', ' ')}
								</span>
								{#if currentQuestion.difficulty}
									<span class="text-xs px-2 py-0.5 rounded-full {
										currentQuestion.difficulty === 'easy' ? 'bg-green-100 text-green-700' :
										currentQuestion.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-700' :
										'bg-red-100 text-red-700'
									}">
										{currentQuestion.difficulty}
									</span>
								{/if}
								<span class="text-xs text-slate-500 ml-auto">
									{currentQuestion.points} {currentQuestion.points === 1 ? 'point' : 'points'}
								</span>
							</div>
							<h3 class="text-lg font-semibold text-slate-900 leading-relaxed">
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
							<!-- Multiple Choice -->
							{#each currentQuestion.options || [] as option (option.id)}
								<button
									type="button"
									onclick={() => setAnswer(currentQuestion.id, option.id)}
									class="w-full text-left p-4 rounded-lg border-2 transition-all duration-200 {
										answers[currentQuestion.id] === option.id
											? 'border-primary-500 bg-primary-50 shadow-sm'
											: 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
									}"
									disabled={isSubmitting}
								>
									<div class="flex items-center gap-3">
										<div class="w-5 h-5 rounded-full border-2 flex items-center justify-center {
											answers[currentQuestion.id] === option.id
												? 'border-primary-500 bg-primary-500'
												: 'border-slate-300'
										}">
											{#if answers[currentQuestion.id] === option.id}
												<div class="w-2 h-2 bg-white rounded-full"></div>
											{/if}
										</div>
										<span class="font-medium text-slate-900">{option.text}</span>
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
	
	<!-- Navigation Footer -->
	<div class="border-t border-slate-200 bg-white p-6 sticky bottom-0 shadow-lg">
		<div class="max-w-4xl mx-auto">
			<!-- Question Navigator -->
			<div class="flex gap-2 mb-4 overflow-x-auto pb-2">
				{#each quiz.questions as question, index (question.id)}
					<button
						type="button"
						onclick={() => goToQuestion(index)}
						class="w-10 h-10 rounded-lg border-2 shrink-0 transition-all duration-200 {
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
			
			<!-- Navigation Buttons -->
			<div class="flex items-center justify-between">
				<Button
					variant="outline"
					onclick={goPrevious}
					disabled={!canGoPrevious || isSubmitting}
				>
					← Previous
				</Button>
				
				<div class="flex gap-3">
					{#if isLastQuestion}
						<Button
							onclick={handleSubmitClick}
							disabled={isSubmitting}
							class="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white shadow-md"
						>
							{isSubmitting ? 'Submitting...' : 'Submit Quiz'}
						</Button>
					{:else}
						<Button
							onclick={goNext}
							disabled={!canGoNext || isSubmitting}
						>
							Next →
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
</style>
