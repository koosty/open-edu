<script lang="ts">
	import { parseMarkdown } from '$lib/services/markdown'
	import { onMount } from 'svelte'
	import { mode } from 'mode-watcher'
	
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
	
	// Track loaded theme to avoid duplicate imports
	let currentTheme = $state<'light' | 'dark' | null>(null)
	
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
	
	// Load highlight.js theme based on current mode
	function loadHighlightTheme(themeMode: 'light' | 'dark' | undefined) {
		if (typeof window === 'undefined') return
		if (!themeMode) return
		if (currentTheme === themeMode) return // Already loaded
		
		// Remove previous theme stylesheet if it exists
		const existingLink = document.querySelector('link[data-highlight-theme]')
		if (existingLink) {
			existingLink.remove()
		}
		
		// Determine theme file
		const themeFile = themeMode === 'dark' 
			? 'github-dark.css'
			: 'github.css'
		
		// Create and append new stylesheet link
		const link = document.createElement('link')
		link.rel = 'stylesheet'
		link.href = `https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/${themeFile}`
		link.setAttribute('data-highlight-theme', themeMode)
		document.head.appendChild(link)
		
		currentTheme = themeMode
	}
	
	// Load initial themes on mount
	onMount(() => {
		if (typeof window !== 'undefined') {
			import('katex/dist/katex.min.css')
			loadHighlightTheme(mode.current)
		}
	})
	
	// Watch for theme changes and reload highlight.js theme
	$effect(() => {
		loadHighlightTheme(mode.current)
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
		class="markdown-content {className}"
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
		border: 3px solid hsl(var(--muted));
		border-radius: 50%;
		border-top-color: hsl(var(--primary));
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
		background-color: hsl(var(--destructive) / 0.1);
		border: 1px solid hsl(var(--destructive) / 0.3);
		border-radius: 0.5rem;
		color: hsl(var(--destructive));
	}
	
	.error-message {
		margin: 0;
		font-weight: 500;
	}
	
	/* Markdown content styles */
	.markdown-content {
		line-height: 1.7;
		color: hsl(var(--foreground));
		background: transparent; /* Inherit background from parent */
	}
	
	/* Code blocks from highlight.js - let highlight.js theme handle the background */
	.markdown-content :global(pre.hljs) {
		border-radius: 0.5rem;
		padding: 1rem;
		overflow-x: auto;
		margin: 1rem 0;
	}
	
	.markdown-content :global(code.inline-code) {
		background-color: hsl(var(--muted));
		padding: 0.125rem 0.375rem;
		border-radius: 0.25rem;
		font-size: 0.875em;
		font-family: 'Courier New', Courier, monospace;
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
		border-bottom: 2px solid hsl(var(--border));
		padding-bottom: 0.3em;
	}
	
	:global(.dark) .markdown-content :global(h1) {
		border-bottom-color: hsl(var(--border));
	}
	
	.markdown-content :global(h2) {
		font-size: 1.875em;
	}
	
	.markdown-content :global(h3) {
		font-size: 1.5em;
	}
	
	.markdown-content :global(a) {
		color: hsl(var(--primary));
		text-decoration: underline;
		transition: color 0.2s;
	}
	
	.markdown-content :global(a:hover) {
		opacity: 0.8;
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
		border: 1px solid hsl(var(--border));
		text-align: left;
	}
	
	.markdown-content :global(th) {
		background-color: hsl(var(--muted));
		font-weight: 600;
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
		color: hsl(var(--destructive));
		font-family: monospace;
		background-color: hsl(var(--destructive) / 0.1);
		padding: 0.25rem 0.5rem;
		border-radius: 0.25rem;
	}
</style>
