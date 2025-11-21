<!--
	ErrorAlert Component
	User-friendly error messages with actionable suggestions
-->
<script lang="ts">
	import { Button } from '$lib/components/ui'
	import { AlertCircle, RefreshCw, Home, ArrowLeft } from 'lucide-svelte'
	
	let {
		title = 'Something went wrong',
		message,
		errorCode,
		onRetry,
		onGoBack,
		onGoHome,
		showRetry = true,
		showGoBack = false,
		showGoHome = false,
		className = ''
	}: {
		title?: string
		message: string
		errorCode?: string
		onRetry?: () => void | Promise<void>
		onGoBack?: () => void
		onGoHome?: () => void
		showRetry?: boolean
		showGoBack?: boolean
		showGoHome?: boolean
		className?: string
	} = $props()
	
	let retrying = $state(false)
	
	// Generate helpful suggestions based on error message
	const suggestions = $derived.by(() => {
		const msg = message.toLowerCase()
		const hints: string[] = []
		
		if (msg.includes('network') || msg.includes('connection') || msg.includes('offline')) {
			hints.push('Check your internet connection')
			hints.push('Try refreshing the page')
		}
		
		if (msg.includes('not found') || msg.includes('404')) {
			hints.push('The resource may have been moved or deleted')
			hints.push('Check the URL and try again')
		}
		
		if (msg.includes('permission') || msg.includes('unauthorized') || msg.includes('403')) {
			hints.push('You may not have permission to access this resource')
			hints.push('Try signing out and signing in again')
		}
		
		if (msg.includes('timeout') || msg.includes('slow')) {
			hints.push('The server is taking longer than expected')
			hints.push('Try again in a few moments')
		}
		
		if (msg.includes('enrollment') || msg.includes('enroll')) {
			hints.push('Make sure you are enrolled in this course')
			hints.push('Check your course list')
		}
		
		if (msg.includes('quiz') || msg.includes('attempt')) {
			hints.push('Try starting the quiz again')
			hints.push('Contact your instructor if the problem persists')
		}
		
		// Generic fallback suggestions
		if (hints.length === 0) {
			hints.push('Try refreshing the page')
			hints.push('If the problem persists, contact support')
		}
		
		return hints
	})
	
	async function handleRetry() {
		if (!onRetry || retrying) return
		retrying = true
		try {
			await onRetry()
		} finally {
			retrying = false
		}
	}
</script>

<div class="error-alert bg-red-50 border border-red-200 rounded-xl p-4 md:p-6 shadow-sm {className}">
	<div class="flex items-start gap-3 md:gap-4">
		<!-- Error Icon -->
		<div class="w-10 h-10 md:w-12 md:h-12 bg-red-100 rounded-full flex items-center justify-center shrink-0">
			<AlertCircle class="w-5 h-5 md:w-6 md:h-6 text-red-600" />
		</div>
		
		<div class="flex-1 min-w-0">
			<!-- Title -->
			<h3 class="text-base md:text-lg font-semibold text-red-900 mb-1">
				{title}
			</h3>
			
			<!-- Error Message -->
			<p class="text-sm md:text-base text-red-700 leading-relaxed mb-3">
				{message}
			</p>
			
			<!-- Error Code (if provided) -->
			{#if errorCode}
				<p class="text-xs text-red-600 font-mono mb-3">
					Error Code: {errorCode}
				</p>
			{/if}
			
			<!-- Suggestions -->
			{#if suggestions.length > 0}
				<div class="bg-white rounded-lg p-3 md:p-4 border border-red-100 mb-4">
					<p class="text-xs md:text-sm font-semibold text-slate-700 mb-2">
						💡 What you can try:
					</p>
					<ul class="space-y-1.5">
						{#each suggestions as suggestion (suggestion)}
							<li class="text-xs md:text-sm text-slate-600 flex items-start gap-2">
								<span class="text-red-500 mt-0.5">•</span>
								<span>{suggestion}</span>
							</li>
						{/each}
					</ul>
				</div>
			{/if}
			
			<!-- Action Buttons -->
			<div class="flex flex-wrap gap-2 md:gap-3">
				{#if showRetry && onRetry}
					<Button
						onclick={handleRetry}
						disabled={retrying}
						size="sm"
						class="bg-red-600 hover:bg-red-700 text-white"
					>
						<RefreshCw class="w-4 h-4 mr-2 {retrying ? 'animate-spin' : ''}" />
						{retrying ? 'Retrying...' : 'Try Again'}
					</Button>
				{/if}
				
				{#if showGoBack && onGoBack}
					<Button
						onclick={onGoBack}
						variant="outline"
						size="sm"
						class="border-red-300 text-red-700 hover:bg-red-50"
					>
						<ArrowLeft class="w-4 h-4 mr-2" />
						Go Back
					</Button>
				{/if}
				
				{#if showGoHome && onGoHome}
					<Button
						onclick={onGoHome}
						variant="outline"
						size="sm"
						class="border-red-300 text-red-700 hover:bg-red-50"
					>
						<Home class="w-4 h-4 mr-2" />
						Go Home
					</Button>
				{/if}
			</div>
		</div>
	</div>
</div>

<style>
	.error-alert {
		animation: slideIn 0.3s ease-out;
	}
	
	@keyframes slideIn {
		from {
			opacity: 0;
			transform: translateY(-10px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}
</style>
