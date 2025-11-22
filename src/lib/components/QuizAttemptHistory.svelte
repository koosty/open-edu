<!--
	QuizAttemptHistory Component
	Displays student's past quiz attempts with scores and details
-->
<script lang="ts">
	import { Card, CardContent, Button } from '$lib/components/ui'
	import type { QuizAttempt } from '$lib/types/quiz'
	import { Clock, Trophy, Calendar } from 'lucide-svelte'
	
	// Props
	const {
		attempts,
		quiz,
		onViewResults
	}: {
		attempts: QuizAttempt[]
		quiz: { passingScore: number }
		onViewResults: (attemptId: string) => void
	} = $props()
	
	// Sort attempts by date (newest first)
	const sortedAttempts = $derived.by(() => {
		return [...attempts].sort((a, b) => 
			new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
		)
	})
	
	// Find best attempt
	const bestAttempt = $derived.by(() => {
		if (attempts.length === 0) return null
		return attempts.reduce((best, current) => 
			(current.score > best.score) ? current : best
		)
	})
	
	// Format date
	function formatDate(dateString: string): string {
		const date = new Date(dateString)
		return date.toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		})
	}
	
	// Format duration
	function formatDuration(seconds: number): string {
		const mins = Math.floor(seconds / 60)
		const secs = seconds % 60
		return `${mins}m ${secs}s`
	}
	
	// Check if passed
	function isPassed(score: number): boolean {
		return score >= quiz.passingScore
	}
</script>

<div class="quiz-attempt-history">
	{#if sortedAttempts.length === 0}
		<!-- No attempts yet -->
		<Card class="border-slate-200">
			<CardContent class="p-8 text-center">
				<div class="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
					<Clock class="w-8 h-8 text-slate-400" />
				</div>
				<h3 class="text-lg font-semibold text-slate-900 mb-2">No Attempts Yet</h3>
				<p class="text-slate-600">
					You haven't taken this quiz yet. Start your first attempt to see your results here.
				</p>
			</CardContent>
		</Card>
	{:else}
		<!-- Attempt history header -->
		<div class="mb-6">
			<h3 class="text-xl font-bold text-slate-900 mb-2">Your Quiz Attempts</h3>
			<p class="text-slate-600">
				You've taken this quiz {sortedAttempts.length} {sortedAttempts.length === 1 ? 'time' : 'times'}.
				{#if bestAttempt}
					Your best score is <span class="font-semibold text-primary-600">{bestAttempt.score}%</span>.
				{/if}
			</p>
		</div>
		
		<!-- Attempts list -->
		<div class="space-y-4">
			{#each sortedAttempts as attempt, index (attempt.id)}
				<Card class="border-slate-200 hover:border-slate-300 transition-colors">
					<CardContent class="p-6">
						<div class="flex items-start gap-4">
							<!-- Attempt number badge -->
							<div class="w-12 h-12 bg-gradient-to-br from-primary-500 to-primary-600 rounded-full flex items-center justify-center text-white font-bold shrink-0 shadow-md">
								#{sortedAttempts.length - index}
							</div>
							
							<div class="flex-1 min-w-0">
								<!-- Score and status -->
								<div class="flex items-center gap-3 mb-2">
									<span class="text-3xl font-bold {
										isPassed(attempt.score) ? 'text-green-600' : 'text-red-600'
									}">
										{attempt.score}%
									</span>
									
									{#if attempt.id === bestAttempt?.id}
										<span class="flex items-center gap-1 px-2 py-1 bg-yellow-500/10 text-yellow-700 rounded-full text-xs font-semibold">
											<Trophy class="w-3 h-3" />
											Best Score
										</span>
									{/if}
									
									<span class="px-2 py-1 rounded-full text-xs font-semibold {
										isPassed(attempt.score)
											? 'bg-secondary/10 text-green-700'
											: 'bg-destructive/10 text-red-700'
									}">
										{isPassed(attempt.score) ? '✓ Passed' : '✗ Failed'}
									</span>
								</div>
								
								<!-- Attempt details -->
								<div class="flex flex-wrap gap-4 text-sm text-slate-600 mb-3">
									<div class="flex items-center gap-1">
										<Calendar class="w-4 h-4" />
										<span>{formatDate(attempt.startedAt)}</span>
									</div>
									
									{#if attempt.timeSpent}
										<div class="flex items-center gap-1">
											<Clock class="w-4 h-4" />
											<span>{formatDuration(attempt.timeSpent)}</span>
										</div>
									{/if}
									
									<div>
										<span class="font-medium">{attempt.answers.filter(a => a.isCorrect).length}</span>
										<span>/{attempt.answers.length} correct</span>
									</div>
								</div>
								
								<!-- View results button -->
								<Button
									variant="outline"
									size="sm"
									onclick={() => onViewResults(attempt.id)}
									class="text-xs"
								>
									View Results
								</Button>
							</div>
						</div>
					</CardContent>
				</Card>
			{/each}
		</div>
		
		<!-- Summary stats -->
		{#if sortedAttempts.length > 1}
			<Card class="border-slate-200 bg-slate-50 mt-6">
				<CardContent class="p-6">
					<h4 class="text-sm font-semibold text-slate-700 mb-3">Summary Statistics</h4>
					<div class="grid grid-cols-2 md:grid-cols-4 gap-4">
						<div>
							<div class="text-2xl font-bold text-slate-900">
								{sortedAttempts.length}
							</div>
							<div class="text-xs text-slate-600">Total Attempts</div>
						</div>
						<div>
							<div class="text-2xl font-bold text-green-600">
								{sortedAttempts.filter(a => isPassed(a.score)).length}
							</div>
							<div class="text-xs text-slate-600">Passed</div>
						</div>
						<div>
							<div class="text-2xl font-bold text-primary-600">
								{bestAttempt?.score}%
							</div>
							<div class="text-xs text-slate-600">Best Score</div>
						</div>
						<div>
							<div class="text-2xl font-bold text-slate-900">
								{Math.round(sortedAttempts.reduce((sum, a) => sum + a.score, 0) / sortedAttempts.length)}%
							</div>
							<div class="text-xs text-slate-600">Average Score</div>
						</div>
					</div>
				</CardContent>
			</Card>
		{/if}
	{/if}
</div>
