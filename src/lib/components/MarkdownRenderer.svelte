<script lang="ts">
	import { parseMarkdown } from '$lib/services/markdown'
	import { onMount } from 'svelte'
	
	// Props
	const {
		content = '',
		class: className = ''
	} = $props<{
		content: string
		class?: string
	}>()
	
	// Rendered HTML state
	let html = $state('')
	let isLoading = $state(true)
	let error = $state<string | null>(null)
	
	// Parse markdown reactively when content changes
	$effect(() => {
		if (!content) {
			html = ''
			isLoading = false
			return
		}
		
		try {
			isLoading = true
			error = null
			html = parseMarkdown(content)
		} catch (err) {
			console.error('Error rendering markdown:', err)
			error = err instanceof Error ? err.message : 'Failed to render content'
			html = ''
		} finally {
			isLoading = false
		}
	})
	
	// Load required CSS for syntax highlighting and math
	onMount(() => {
		// Import highlight.js theme
		if (typeof window !== 'undefined') {
			import('highlight.js/styles/github-dark.css')
			import('katex/dist/katex.min.css')
		}
	})
</script>

{#if isLoading}
	<div class="markdown-loading" role="status" aria-live="polite">
		<div class="loading-spinner"></div>
		<span class="sr-only">Loading content...</span>
	</div>
{:else if error}
	<div class="markdown-error" role="alert">
		<p class="error-message">{error}</p>
	</div>
{:else}
	<div 
		class="markdown-content prose prose-slate dark:prose-invert max-w-none {className}"
		role="article"
	>
		<!-- eslint-disable-next-line svelte/no-at-html-tags -->
		{@html html}
	</div>
{/if}

<style>
	/* Loading state */
	.markdown-loading {
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 2rem;
		min-height: 200px;
	}
	
	.loading-spinner {
		border: 3px solid rgba(0, 0, 0, 0.1);
		border-radius: 50%;
		border-top-color: #3498db;
		width: 40px;
		height: 40px;
		animation: spin 1s linear infinite;
	}
	
	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}
	
	.sr-only {
		position: absolute;
		width: 1px;
		height: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		white-space: nowrap;
		border-width: 0;
	}
	
	/* Error state */
	.markdown-error {
		padding: 1rem;
		background-color: #fee;
		border: 1px solid #fcc;
		border-radius: 0.5rem;
		color: #c33;
	}
	
	.error-message {
		margin: 0;
		font-weight: 500;
	}
	
	/* Markdown content styles */
	.markdown-content {
		line-height: 1.7;
		color: #333;
	}
	
	:global(.dark) .markdown-content {
		color: #e5e7eb;
	}
	
	/* Code blocks from highlight.js */
	.markdown-content :global(pre.hljs) {
		background-color: #1e1e1e;
		border-radius: 0.5rem;
		padding: 1rem;
		overflow-x: auto;
		margin: 1rem 0;
	}
	
	.markdown-content :global(code.inline-code) {
		background-color: #f3f4f6;
		padding: 0.125rem 0.375rem;
		border-radius: 0.25rem;
		font-size: 0.875em;
		font-family: 'Courier New', Courier, monospace;
	}
	
	:global(.dark) .markdown-content :global(code.inline-code) {
		background-color: #374151;
	}
	
	/* Callout blocks */
	.markdown-content :global(.callout) {
		padding: 1rem;
		margin: 1rem 0;
		border-left: 4px solid;
		border-radius: 0.375rem;
	}
	
	.markdown-content :global(.callout-title) {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-weight: 600;
		margin-bottom: 0.5rem;
	}
	
	.markdown-content :global(.callout-note) {
		background-color: #dbeafe;
		border-color: #3b82f6;
	}
	
	.markdown-content :global(.callout-tip) {
		background-color: #d1fae5;
		border-color: #10b981;
	}
	
	.markdown-content :global(.callout-warning) {
		background-color: #fef3c7;
		border-color: #f59e0b;
	}
	
	.markdown-content :global(.callout-important) {
		background-color: #fce7f3;
		border-color: #ec4899;
	}
	
	.markdown-content :global(.callout-caution) {
		background-color: #fee2e2;
		border-color: #ef4444;
	}
	
	/* Dark mode callouts */
	:global(.dark) .markdown-content :global(.callout-note) {
		background-color: #1e3a8a;
	}
	
	:global(.dark) .markdown-content :global(.callout-tip) {
		background-color: #064e3b;
	}
	
	:global(.dark) .markdown-content :global(.callout-warning) {
		background-color: #78350f;
	}
	
	:global(.dark) .markdown-content :global(.callout-important) {
		background-color: #831843;
	}
	
	:global(.dark) .markdown-content :global(.callout-caution) {
		background-color: #7f1d1d;
	}
	
	/* Typography enhancements */
	.markdown-content :global(h1),
	.markdown-content :global(h2),
	.markdown-content :global(h3),
	.markdown-content :global(h4),
	.markdown-content :global(h5),
	.markdown-content :global(h6) {
		font-weight: 700;
		margin-top: 1.5em;
		margin-bottom: 0.5em;
		scroll-margin-top: 4rem; /* For anchor links with fixed header */
	}
	
	.markdown-content :global(h1) {
		font-size: 2.25em;
		border-bottom: 2px solid #e5e7eb;
		padding-bottom: 0.3em;
	}
	
	.markdown-content :global(h2) {
		font-size: 1.875em;
	}
	
	.markdown-content :global(h3) {
		font-size: 1.5em;
	}
	
	.markdown-content :global(a) {
		color: #3b82f6;
		text-decoration: underline;
		transition: color 0.2s;
	}
	
	.markdown-content :global(a:hover) {
		color: #2563eb;
	}
	
	.markdown-content :global(img) {
		max-width: 100%;
		height: auto;
		border-radius: 0.5rem;
		margin: 1rem 0;
	}
	
	.markdown-content :global(table) {
		width: 100%;
		border-collapse: collapse;
		margin: 1rem 0;
	}
	
	.markdown-content :global(th),
	.markdown-content :global(td) {
		padding: 0.75rem;
		border: 1px solid #e5e7eb;
		text-align: left;
	}
	
	.markdown-content :global(th) {
		background-color: #f9fafb;
		font-weight: 600;
	}
	
	:global(.dark) .markdown-content :global(th) {
		background-color: #374151;
	}
	
	:global(.dark) .markdown-content :global(th),
	:global(.dark) .markdown-content :global(td) {
		border-color: #4b5563;
	}
	
	/* KaTeX math rendering */
	.markdown-content :global(.katex) {
		font-size: 1.1em;
	}
	
	.markdown-content :global(.katex-display) {
		margin: 1rem 0;
		overflow-x: auto;
		overflow-y: hidden;
	}
	
	.markdown-content :global(.math-error) {
		color: #ef4444;
		font-family: monospace;
		background-color: #fee2e2;
		padding: 0.25rem 0.5rem;
		border-radius: 0.25rem;
	}
</style>
