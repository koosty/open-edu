<!--
	AutoSaveIndicator Component
	Shows saving status with "Saving...", "Saved ✓", and error states
-->
<script lang="ts">
	import { CheckCircle, AlertCircle, LoaderCircle } from 'lucide-svelte'
	
	let {
		status = $bindable<'idle' | 'saving' | 'saved' | 'error'>('idle'),
		lastSaved = $bindable<Date | null>(null),
		errorMessage = '',
		className = ''
	}: {
		status?: 'idle' | 'saving' | 'saved' | 'error'
		lastSaved?: Date | null
		errorMessage?: string
		className?: string
	} = $props()
	
	/**
	 * Format the last saved timestamp
	 */
	const formatLastSaved = $derived.by(() => {
		if (!lastSaved) return ''
		
		const now = new Date()
		const diff = now.getTime() - lastSaved.getTime()
		
		// Less than 1 minute
		if (diff < 60000) {
			return 'Just now'
		}
		
		// Less than 1 hour
		if (diff < 3600000) {
			const minutes = Math.floor(diff / 60000)
			return `${minutes} minute${minutes > 1 ? 's' : ''} ago`
		}
		
		// Less than 24 hours
		if (diff < 86400000) {
			const hours = Math.floor(diff / 3600000)
			return `${hours} hour${hours > 1 ? 's' : ''} ago`
		}
		
		// Show date
		return lastSaved.toLocaleDateString()
	})
	
	/**
	 * Get status text and colors
	 */
	const statusConfig = $derived.by(() => {
		switch (status) {
			case 'saving':
				return {
					text: 'Saving...',
					color: 'text-blue-600',
					bgColor: 'bg-blue-50',
					borderColor: 'border-blue-200'
				}
			case 'saved':
				return {
					text: 'Saved',
					color: 'text-green-600',
					bgColor: 'bg-green-50',
					borderColor: 'border-green-200'
				}
			case 'error':
				return {
					text: 'Save failed',
					color: 'text-red-600',
					bgColor: 'bg-red-50',
					borderColor: 'border-red-200'
				}
			default:
				return null
		}
	})
	
	/**
	 * Show indicator if not idle
	 */
	const showIndicator = $derived(status !== 'idle')
</script>

{#if showIndicator && statusConfig}
	<div
		class="fixed top-20 right-4 z-50 flex items-center gap-2 px-4 py-2 rounded-lg border shadow-lg transition-all duration-300 {statusConfig.bgColor} {statusConfig.borderColor} {className}"
		role="status"
		aria-live="polite"
	>
		<!-- Icon with animation for saving state -->
		{#if status === 'saving'}
			<LoaderCircle class="w-4 h-4 {statusConfig.color} animate-spin" />
		{:else if status === 'saved'}
			<CheckCircle class="w-4 h-4 {statusConfig.color}" />
		{:else if status === 'error'}
			<AlertCircle class="w-4 h-4 {statusConfig.color}" />
		{/if}
		
		<!-- Status text -->
		<div class="flex flex-col">
			<span class="text-sm font-medium {statusConfig.color}">
				{statusConfig.text}
			</span>
			
			{#if status === 'saved' && formatLastSaved}
				<span class="text-xs text-slate-500">
					{formatLastSaved}
				</span>
			{/if}
			
			{#if status === 'error' && errorMessage}
				<span class="text-xs text-red-600">
					{errorMessage}
				</span>
			{/if}
		</div>
	</div>
{/if}

<style>
	/* Slide in from right animation */
	@keyframes slideIn {
		from {
			transform: translateX(100%);
			opacity: 0;
		}
		to {
			transform: translateX(0);
			opacity: 1;
		}
	}
	
	div[role="status"] {
		animation: slideIn 0.3s ease-out;
	}
</style>
