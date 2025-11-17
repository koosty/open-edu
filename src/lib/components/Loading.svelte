<script lang="ts">
	import { LoaderCircle } from 'lucide-svelte'
	
	type Props = {
		size?: 'sm' | 'md' | 'lg'
		message?: string
		fullScreen?: boolean
		className?: string
	}
	
	let { 
		size = 'md',
		message = 'Loading...',
		fullScreen = false,
		className = ''
	}: Props = $props()

	const sizeClasses = {
		sm: 'h-4 w-4',
		md: 'h-6 w-6',
		lg: 'h-8 w-8'
	}

	const containerClass = fullScreen 
		? 'min-h-screen flex items-center justify-center'
		: 'flex items-center justify-center p-4'
</script>

<div class="{containerClass} {className}">
	<div class="text-center space-y-3">
		<LoaderCircle class="{sizeClasses[size]} animate-spin text-primary mx-auto" />
		{#if message}
			<p class="text-sm text-muted-foreground">{message}</p>
		{/if}
	</div>
</div>