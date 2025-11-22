<!--
	QuizResults Component
	Displays quiz results with score, feedback, and correct/incorrect answers
-->
<script lang="ts">
	import { Button, Card, CardContent } from '$lib/components/ui'
	import type { Quiz, QuizAttempt } from '$lib/types/quiz'
	import { Trophy, RotateCcw, X, Check, AlertCircle, Share2, Download, Copy, CheckCheck } from 'lucide-svelte'
	import * as Certificate from '$lib/utils/certificate'
	import type { CertificateData } from '$lib/utils/certificate'
	
	// Props
	const {
		quiz,
		attempt,
		showCorrectAnswers = true,
		showExplanations = true,
		allowRetry = false,
		allowShare = true,
		studentName,
		courseName,
		onRetry,
		onContinue
	}: {
		quiz: Quiz
		attempt: QuizAttempt
		showCorrectAnswers?: boolean
		showExplanations?: boolean
		allowRetry?: boolean
		allowShare?: boolean
		studentName?: string
		courseName?: string
		onRetry?: () => void
		onContinue?: () => void
	} = $props()
	
	// Derived state
	const totalQuestions = $derived(quiz.questions.length)
	const correctCount = $derived(attempt.answers.filter(a => a.isCorrect).length)
	const incorrectCount = $derived(totalQuestions - correctCount)
	const scoreColor = $derived(
		attempt.isPassed ? 'text-secondary' : 'text-destructive'
	)
	const scoreBgColor = $derived(
		attempt.isPassed ? 'bg-secondary/10 border-green-200' : 'bg-destructive/10 border-red-200'
	)
	
	// Get question by ID
	function getQuestion(questionId: string) {
		return quiz.questions.find(q => q.id === questionId)
	}
	
	// Get answer text for display
	function getAnswerText(answer: QuizAttempt['answers'][0]): string {
		const question = getQuestion(answer.questionId)
		if (!question) return 'N/A'
		
		if (question.type === 'multiple_choice' && question.options) {
			const option = question.options.find(o => o.id === answer.answer)
			return option?.text || String(answer.answer)
		}
		
		if (question.type === 'multiple_select' && question.options && Array.isArray(answer.answer)) {
			return answer.answer
				.map(id => question.options?.find(o => o.id === id)?.text || id)
				.join(', ')
		}
		
		if (question.type === 'true_false') {
			return answer.answer === true ? 'True' : 'False'
		}
		
		return String(answer.answer || 'Not answered')
	}
	
	// Get correct answer text for display
	function getCorrectAnswerText(question: Quiz['questions'][0]): string {
		if (question.type === 'multiple_choice' && question.options) {
			const option = question.options.find(o => o.id === question.correctAnswer)
			return option?.text || String(question.correctAnswer)
		}
		
		if (question.type === 'multiple_select' && question.options && Array.isArray(question.correctAnswer)) {
			return question.correctAnswer
				.map(id => question.options?.find(o => o.id === id)?.text || id)
				.join(', ')
		}
		
		if (question.type === 'true_false') {
			return question.correctAnswer === true ? 'True' : 'False'
		}
		
		return String(question.correctAnswer)
	}
	
	// Format time
	function formatTime(seconds: number): string {
		const mins = Math.floor(seconds / 60)
		const secs = seconds % 60
		return `${mins}m ${secs}s`
	}
	
	// Get performance message
	function getPerformanceMessage(): { title: string; message: string } {
		if (attempt.score >= 90) {
			return {
				title: 'Outstanding! 🎉',
				message: 'You demonstrated excellent mastery of the material!'
			}
		} else if (attempt.score >= 80) {
			return {
				title: 'Great Job! 🌟',
				message: 'You have a solid understanding of the concepts.'
			}
		} else if (attempt.score >= 70) {
			return {
				title: 'Good Work! ✓',
				message: 'You passed! Keep practicing to improve further.'
			}
		} else if (attempt.score >= 60) {
			return {
				title: 'Almost There!',
				message: 'Review the material and try again. You can do it!'
			}
		} else {
			return {
				title: 'Keep Trying!',
				message: 'Study the material more thoroughly and attempt again.'
			}
		}
	}
	
	const performanceMessage = $derived(getPerformanceMessage())
	
	// Share/Certificate state
	let showShareMenu = $state(false)
	let copySuccess = $state(false)
	
	// Close share menu on outside click
	$effect(() => {
		if (!showShareMenu) return
		
		function handleClick(event: MouseEvent) {
			const target = event.target as HTMLElement
			if (!target.closest('.share-menu-container')) {
				showShareMenu = false
			}
		}
		
		document.addEventListener('click', handleClick)
		return () => document.removeEventListener('click', handleClick)
	})
	
	// Get certificate data
	function getCertificateData(): CertificateData {
		return {
			studentName: studentName || 'Student',
			courseName: courseName || 'Course',
			quizTitle: quiz.title,
			score: attempt.score,
			isPassed: attempt.isPassed,
			completedAt: attempt.submittedAt ? new Date(attempt.submittedAt) : new Date(),
			attemptNumber: attempt.attemptNumber
		}
	}
	
	// Handle share actions
	async function handleCopyText() {
		try {
			await Certificate.copyTextCertificate(getCertificateData())
			copySuccess = true
			setTimeout(() => copySuccess = false, 2000)
		} catch (err) {
			console.error('Failed to copy certificate:', err)
			alert('Failed to copy certificate to clipboard')
		}
	}
	
	function handleDownloadHTML() {
		try {
			Certificate.downloadHTMLCertificate(getCertificateData())
			showShareMenu = false
		} catch (err) {
			console.error('Failed to download certificate:', err)
			alert('Failed to download certificate')
		}
	}
	
	function handleShareURL() {
		const url = Certificate.generateShareableURL(getCertificateData())
		navigator.clipboard.writeText(url).then(() => {
			copySuccess = true
			setTimeout(() => copySuccess = false, 2000)
		}).catch(err => {
			console.error('Failed to copy URL:', err)
			alert('Failed to copy share URL')
		})
	}
</script>

<div class="quiz-results bg-slate-50 min-h-screen py-8">
	<div class="max-w-4xl mx-auto px-6">
		<!-- Results Header -->
		<Card class="shadow-xl border-2 {scoreBgColor} mb-8">
			<CardContent class="p-8">
				<div class="text-center">
					<!-- Icon -->
					<div class="mb-4">
						{#if attempt.isPassed}
							<div class="w-20 h-20 bg-secondary/100 rounded-full flex items-center justify-center mx-auto shadow-lg">
								<Trophy class="w-10 h-10 text-white" />
							</div>
						{:else}
							<div class="w-20 h-20 bg-destructive/100 rounded-full flex items-center justify-center mx-auto shadow-lg">
								<X class="w-10 h-10 text-white" />
							</div>
						{/if}
					</div>
					
					<!-- Performance Message -->
					<h2 class="text-3xl font-bold text-slate-900 mb-2">
						{performanceMessage.title}
					</h2>
					<p class="text-lg text-slate-700 mb-6">
						{performanceMessage.message}
					</p>
					
					<!-- Score Display -->
					<div class="flex items-center justify-center gap-8 mb-6">
						<div>
							<div class="text-5xl font-bold {scoreColor}">
								{Math.round(attempt.score)}%
							</div>
							<div class="text-sm text-slate-600 mt-1">Your Score</div>
						</div>
						
						<div class="h-16 w-px bg-slate-300"></div>
						
						<div>
							<div class="text-3xl font-bold text-slate-700">
								{correctCount}/{totalQuestions}
							</div>
							<div class="text-sm text-slate-600 mt-1">Correct Answers</div>
						</div>
						
						<div class="h-16 w-px bg-slate-300"></div>
						
						<div>
							<div class="text-3xl font-bold text-slate-700">
								{Math.round(attempt.pointsEarned)}/{attempt.totalPoints}
							</div>
							<div class="text-sm text-slate-600 mt-1">Points Earned</div>
						</div>
					</div>
					
					<!-- Stats Grid -->
					<div class="grid grid-cols-3 gap-4 max-w-xl mx-auto">
						<div class="bg-white rounded-lg p-4 shadow-sm">
							<div class="text-sm text-slate-600 mb-1">Time Spent</div>
							<div class="text-lg font-semibold text-slate-900">
								{formatTime(attempt.timeSpent)}
							</div>
						</div>
						
						<div class="bg-white rounded-lg p-4 shadow-sm">
							<div class="text-sm text-slate-600 mb-1">Passing Score</div>
							<div class="text-lg font-semibold text-slate-900">
								{quiz.passingScore}%
							</div>
						</div>
						
						<div class="bg-white rounded-lg p-4 shadow-sm">
							<div class="text-sm text-slate-600 mb-1">Attempt #{attempt.attemptNumber}</div>
							<div class="text-lg font-semibold text-slate-900">
								{attempt.isPassed ? 'Passed' : 'Failed'}
							</div>
						</div>
					</div>
					
					<!-- Action Buttons -->
					<div class="flex gap-4 justify-center mt-8 flex-wrap">
						{#if allowRetry && onRetry}
							<Button
								onclick={onRetry}
								variant="outline"
								class="gap-2"
							>
								<RotateCcw class="w-4 h-4" />
								Try Again
							</Button>
						{/if}
						
						{#if allowShare && attempt.isPassed}
							<div class="relative share-menu-container">
								<Button
									onclick={() => showShareMenu = !showShareMenu}
									variant="outline"
									class="gap-2 bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200 hover:border-blue-300"
								>
									{#if copySuccess}
										<CheckCheck class="w-4 h-4 text-secondary" />
										<span class="text-secondary">Copied!</span>
									{:else}
										<Share2 class="w-4 h-4" />
										Share Certificate
									{/if}
								</Button>
								
								{#if showShareMenu}
									<div class="absolute top-full mt-2 right-0 bg-white rounded-lg shadow-xl border border-border py-2 min-w-[200px] z-10 animate-in fade-in zoom-in-95 duration-150">
										<button
											onclick={handleDownloadHTML}
											class="w-full px-4 py-2 text-left hover:bg-muted/30 flex items-center gap-3 text-sm transition-colors"
										>
											<Download class="w-4 h-4 text-muted-foreground" />
											<span>Download HTML</span>
										</button>
										<button
											onclick={handleCopyText}
											class="w-full px-4 py-2 text-left hover:bg-muted/30 flex items-center gap-3 text-sm transition-colors"
										>
											<Copy class="w-4 h-4 text-muted-foreground" />
											<span>Copy as Text</span>
										</button>
										<button
											onclick={handleShareURL}
											class="w-full px-4 py-2 text-left hover:bg-muted/30 flex items-center gap-3 text-sm transition-colors"
										>
											<Share2 class="w-4 h-4 text-muted-foreground" />
											<span>Copy Share Link</span>
										</button>
									</div>
								{/if}
							</div>
						{/if}
						
						{#if onContinue}
							<Button
								onclick={onContinue}
								class="bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800"
							>
								Continue Learning
							</Button>
						{/if}
					</div>
				</div>
			</CardContent>
		</Card>
		
		<!-- Detailed Results -->
		<div class="space-y-6">
			<div class="flex items-center justify-between">
				<h3 class="text-2xl font-bold text-slate-900">Question Review</h3>
				<div class="flex items-center gap-4 text-sm">
					<div class="flex items-center gap-2">
						<Check class="w-4 h-4 text-secondary" />
						<span class="text-slate-600">{correctCount} Correct</span>
					</div>
					<div class="flex items-center gap-2">
						<X class="w-4 h-4 text-destructive" />
						<span class="text-slate-600">{incorrectCount} Incorrect</span>
					</div>
				</div>
			</div>
			
			{#each attempt.answers as answer, index (answer.questionId)}
				{@const question = getQuestion(answer.questionId)}
				{#if question}
					<Card class="shadow-md border-2 {answer.isCorrect ? 'border-green-200' : 'border-red-200'}">
						<CardContent class="p-6">
							<!-- Question Header -->
							<div class="flex items-start gap-4 mb-4">
								<div class="w-10 h-10 rounded-full flex items-center justify-center shrink-0 {
									answer.isCorrect 
										? 'bg-secondary/100 text-white' 
										: 'bg-destructive/100 text-white'
								}">
									{#if answer.isCorrect}
										<Check class="w-5 h-5" />
									{:else}
										<X class="w-5 h-5" />
									{/if}
								</div>
								
								<div class="flex-1">
									<div class="flex items-center gap-2 mb-2">
										<span class="text-sm font-semibold text-slate-900">Question {index + 1}</span>
										<span class="text-xs px-2 py-0.5 rounded-full {
											answer.isCorrect ? 'bg-green-100 text-secondary' : 'bg-red-100 text-destructive'
										}">
											{answer.isCorrect ? 'Correct' : 'Incorrect'}
										</span>
										<span class="text-xs text-slate-500 ml-auto">
											{answer.pointsEarned}/{answer.pointsPossible} points
										</span>
									</div>
									
									<h4 class="text-base font-medium text-slate-900 mb-3">
										{question.question}
									</h4>
									
									<!-- Your Answer -->
									<div class="bg-slate-50 rounded-lg p-4 mb-3">
										<div class="text-sm font-semibold text-slate-700 mb-1">Your Answer:</div>
										<div class="text-sm text-slate-900">
											{getAnswerText(answer)}
										</div>
									</div>
									
									<!-- Correct Answer -->
									{#if showCorrectAnswers && !answer.isCorrect}
										<div class="bg-secondary/10 rounded-lg p-4 mb-3">
											<div class="text-sm font-semibold text-secondary mb-1">Correct Answer:</div>
											<div class="text-sm text-green-900">
												{getCorrectAnswerText(question)}
											</div>
										</div>
									{/if}
									
									<!-- Explanation -->
									{#if showExplanations && question.explanation}
										<div class="bg-accent-50 border border-accent-200 rounded-lg p-4">
											<div class="flex items-start gap-2">
												<AlertCircle class="w-4 h-4 text-accent-600 mt-0.5 shrink-0" />
												<div>
													<div class="text-sm font-semibold text-accent-900 mb-1">Explanation:</div>
													<div class="text-sm text-accent-800">
														{question.explanation}
													</div>
												</div>
											</div>
										</div>
									{/if}
								</div>
							</div>
						</CardContent>
					</Card>
				{/if}
			{/each}
		</div>
		
		<!-- Bottom Actions -->
		<div class="mt-8 text-center">
			<div class="flex gap-4 justify-center">
				{#if allowRetry && onRetry}
					<Button
						onclick={onRetry}
						variant="outline"
						size="lg"
						class="gap-2"
					>
						<RotateCcw class="w-4 h-4" />
						Retry Quiz
					</Button>
				{/if}
				
				{#if onContinue}
					<Button
						onclick={onContinue}
						size="lg"
						class="bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800"
					>
						Continue to Next Lesson
					</Button>
				{/if}
			</div>
		</div>
	</div>
</div>
