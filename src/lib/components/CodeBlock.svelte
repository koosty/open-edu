<script lang="ts">
	import Button from '$lib/components/ui/Button.svelte'
	
	// Props
	let {
		code = '',
		language = '',
		filename = '',
		showLineNumbers = true,
		class: className = ''
	} = $props<{
		code: string
		language?: string
		filename?: string
		showLineNumbers?: boolean
		class?: string
	}>()
	
	// State
	let copyStatus = $state<'idle' | 'copied' | 'error'>('idle')
	let copyTimeout: ReturnType<typeof setTimeout> | undefined = $state(undefined)
	
	// Copy to clipboard handler
	async function copyToClipboard() {
		try {
			await navigator.clipboard.writeText(code)
			copyStatus = 'copied'
			
			// Reset after 2 seconds
			if (copyTimeout) clearTimeout(copyTimeout)
			copyTimeout = setTimeout(() => {
				copyStatus = 'idle'
			}, 2000)
		} catch (err) {
			console.error('Failed to copy code:', err)
			copyStatus = 'error'
			
			// Reset after 2 seconds
			if (copyTimeout) clearTimeout(copyTimeout)
			copyTimeout = setTimeout(() => {
				copyStatus = 'idle'
			}, 2000)
		}
	}
	
	// Format language for display
	const displayLanguage = $derived(
		language ? language.toUpperCase() : 'CODE'
	)
	
	// Lines of code for line numbers
	const lines = $derived(code.split('\n'))
</script>

<div class="code-block-container {className}">
	<!-- Header with language and copy button -->
	<div class="code-block-header">
		<div class="code-block-info">
			{#if filename}
				<span class="code-filename" title="Filename">
					{filename}
				</span>
			{/if}
			<span class="code-language">{displayLanguage}</span>
		</div>
		
		<Button
			variant="ghost"
			size="sm"
			onclick={copyToClipboard}
			aria-label="Copy code to clipboard"
			class="copy-button"
		>
			{#if copyStatus === 'copied'}
				<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<polyline points="20 6 9 17 4 12"></polyline>
				</svg>
				<span>Copied!</span>
			{:else if copyStatus === 'error'}
				<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<circle cx="12" cy="12" r="10"></circle>
					<line x1="12" y1="8" x2="12" y2="12"></line>
					<line x1="12" y1="16" x2="12.01" y2="16"></line>
				</svg>
				<span>Error</span>
			{:else}
				<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
					<path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
				</svg>
				<span>Copy</span>
			{/if}
		</Button>
	</div>
	
	<!-- Code content -->
	<div class="code-block-content">
		{#if showLineNumbers}
			<div class="line-numbers" aria-hidden="true">
				{#each lines as _, index}
					<span class="line-number">{index + 1}</span>
				{/each}
			</div>
		{/if}
		
		<pre class="code-pre"><code class="code-content">{code}</code></pre>
	</div>
</div>

<style>
	.code-block-container {
		border-radius: 0.5rem;
		overflow: hidden;
		border: 1px solid #e5e7eb;
		background-color: #1e1e1e;
		margin: 1rem 0;
		font-family: 'Courier New', Courier, monospace;
	}
	
	:global(.dark) .code-block-container {
		border-color: #374151;
	}
	
	/* Header */
	.code-block-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.5rem 1rem;
		background-color: #2d2d2d;
		border-bottom: 1px solid #3e3e3e;
	}
	
	.code-block-info {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}
	
	.code-filename {
		font-size: 0.875rem;
		color: #d4d4d4;
		font-weight: 500;
	}
	
	.code-language {
		font-size: 0.75rem;
		color: #858585;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		font-weight: 600;
	}
	
	/* Copy button styling */
	.code-block-header :global(button.copy-button) {
		height: 2rem;
		padding: 0 0.75rem;
		font-size: 0.8125rem;
		color: #d4d4d4;
		transition: all 0.2s;
	}
	
	.code-block-header :global(button.copy-button:hover) {
		background-color: #3e3e3e;
		color: #fff;
	}
	
	.icon {
		width: 1rem;
		height: 1rem;
	}
	
	/* Code content */
	.code-block-content {
		display: flex;
		overflow-x: auto;
		background-color: #1e1e1e;
	}
	
	.line-numbers {
		display: flex;
		flex-direction: column;
		padding: 1rem 0;
		background-color: #252525;
		border-right: 1px solid #3e3e3e;
		user-select: none;
		min-width: 3rem;
		text-align: right;
	}
	
	.line-number {
		padding: 0 0.75rem;
		color: #858585;
		font-size: 0.875rem;
		line-height: 1.5;
		font-family: 'Courier New', Courier, monospace;
	}
	
	.code-pre {
		flex: 1;
		margin: 0;
		padding: 1rem;
		overflow-x: auto;
		background-color: transparent;
	}
	
	.code-content {
		display: block;
		color: #d4d4d4;
		font-size: 0.875rem;
		line-height: 1.5;
		font-family: 'Courier New', Courier, monospace;
		white-space: pre;
		word-wrap: normal;
		overflow-wrap: normal;
	}
	
	/* Scrollbar styling */
	.code-block-content::-webkit-scrollbar,
	.code-pre::-webkit-scrollbar {
		height: 0.5rem;
	}
	
	.code-block-content::-webkit-scrollbar-track,
	.code-pre::-webkit-scrollbar-track {
		background-color: #2d2d2d;
	}
	
	.code-block-content::-webkit-scrollbar-thumb,
	.code-pre::-webkit-scrollbar-thumb {
		background-color: #4a4a4a;
		border-radius: 0.25rem;
	}
	
	.code-block-content::-webkit-scrollbar-thumb:hover,
	.code-pre::-webkit-scrollbar-thumb:hover {
		background-color: #5a5a5a;
	}
	
	/* Responsive adjustments */
	@media (max-width: 640px) {
		.code-block-header {
			padding: 0.375rem 0.75rem;
		}
		
		.line-numbers {
			min-width: 2.5rem;
		}
		
		.line-number {
			padding: 0 0.5rem;
			font-size: 0.8125rem;
		}
		
		.code-pre {
			padding: 0.75rem;
		}
		
		.code-content {
			font-size: 0.8125rem;
		}
		
		.code-filename {
			display: none; /* Hide filename on small screens */
		}
	}
</style>
