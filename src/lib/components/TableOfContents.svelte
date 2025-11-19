<script lang="ts">
	import { extractHeadings } from '$lib/services/markdown'
	
	// Props
	let {
		markdown = '',
		activeId = '',
		maxLevel = 3,
		class: className = ''
	} = $props<{
		markdown: string
		activeId?: string
		maxLevel?: number
		class?: string
	}>()
	
	// Make activeId reactive
	let currentActiveId = $state(activeId)
	
	// Extract headings from markdown
	const headings = $derived(
		extractHeadings(markdown).filter(h => h.level <= maxLevel)
	)
	
	// Check if there are any headings
	const hasHeadings = $derived(headings.length > 0)
	
	// Scroll to heading when clicked
	function scrollToHeading(id: string) {
		const element = document.getElementById(id)
		if (element) {
			const offset = 80 // Offset for fixed header
			const elementPosition = element.getBoundingClientRect().top + window.scrollY
			const offsetPosition = elementPosition - offset
			
			window.scrollTo({
				top: offsetPosition,
				behavior: 'smooth'
			})
			
			// Update activeId
			currentActiveId = id
		}
	}
	
	// Generate indent class based on heading level
	function getIndentClass(level: number): string {
		switch (level) {
			case 1:
				return 'toc-level-1'
			case 2:
				return 'toc-level-2'
			case 3:
				return 'toc-level-3'
			case 4:
				return 'toc-level-4'
			case 5:
				return 'toc-level-5'
			case 6:
				return 'toc-level-6'
			default:
				return ''
		}
	}
</script>

{#if hasHeadings}
	<nav class="table-of-contents {className}" aria-label="Table of contents">
		<ul class="toc-list">
			{#each headings as heading (heading.id)}
				<li class="toc-item {getIndentClass(heading.level)}">
					<button
						type="button"
						class="toc-link"
						class:active={currentActiveId === heading.id}
						onclick={() => scrollToHeading(heading.id)}
						aria-current={currentActiveId === heading.id ? 'location' : undefined}
					>
						{heading.text}
					</button>
				</li>
			{/each}
		</ul>
	</nav>
{:else}
	<div class="toc-empty" role="status">
		<p class="toc-empty-message">No headings found</p>
	</div>
{/if}

<style>
	.table-of-contents {
		background-color: #f9fafb;
		border: 1px solid #e5e7eb;
		border-radius: 0.5rem;
		padding: 1.5rem;
		position: sticky;
		top: 5rem;
		max-height: calc(100vh - 6rem);
		overflow-y: auto;
	}
	
	:global(.dark) .table-of-contents {
		background-color: #1f2937;
		border-color: #374151;
	}
	
	.toc-list {
		list-style: none;
		margin: 0;
		padding: 0;
	}
	
	.toc-item {
		margin: 0;
		padding: 0;
	}
	
	.toc-link {
		display: block;
		width: 100%;
		text-align: left;
		padding: 0.5rem 0.75rem;
		border: none;
		background: none;
		color: #6b7280;
		font-size: 0.875rem;
		line-height: 1.5;
		cursor: pointer;
		border-radius: 0.375rem;
		transition: all 0.2s;
		text-decoration: none;
		border-left: 2px solid transparent;
	}
	
	.toc-link:hover {
		background-color: #e5e7eb;
		color: #111827;
	}
	
	:global(.dark) .toc-link {
		color: #9ca3af;
	}
	
	:global(.dark) .toc-link:hover {
		background-color: #374151;
		color: #f9fafb;
	}
	
	.toc-link.active {
		color: #3b82f6;
		font-weight: 600;
		background-color: #dbeafe;
		border-left-color: #3b82f6;
	}
	
	:global(.dark) .toc-link.active {
		color: #60a5fa;
		background-color: #1e3a8a;
		border-left-color: #60a5fa;
	}
	
	/* Indentation based on heading level */
	.toc-level-1 {
		padding-left: 0;
	}
	
	.toc-level-2 {
		padding-left: 0.75rem;
	}
	
	.toc-level-3 {
		padding-left: 1.5rem;
	}
	
	.toc-level-4 {
		padding-left: 2.25rem;
	}
	
	.toc-level-5 {
		padding-left: 3rem;
	}
	
	.toc-level-6 {
		padding-left: 3.75rem;
	}
	
	/* Smaller font size for deeper levels */
	.toc-level-4 .toc-link,
	.toc-level-5 .toc-link,
	.toc-level-6 .toc-link {
		font-size: 0.8125rem;
	}
	
	/* Empty state */
	.toc-empty {
		padding: 1rem;
		text-align: center;
	}
	
	.toc-empty-message {
		margin: 0;
		color: #9ca3af;
		font-size: 0.875rem;
		font-style: italic;
	}
	
	/* Scrollbar styling */
	.table-of-contents::-webkit-scrollbar {
		width: 0.375rem;
	}
	
	.table-of-contents::-webkit-scrollbar-track {
		background-color: #f3f4f6;
		border-radius: 0.375rem;
	}
	
	:global(.dark) .table-of-contents::-webkit-scrollbar-track {
		background-color: #374151;
	}
	
	.table-of-contents::-webkit-scrollbar-thumb {
		background-color: #d1d5db;
		border-radius: 0.375rem;
	}
	
	:global(.dark) .table-of-contents::-webkit-scrollbar-thumb {
		background-color: #4b5563;
	}
	
	.table-of-contents::-webkit-scrollbar-thumb:hover {
		background-color: #9ca3af;
	}
	
	:global(.dark) .table-of-contents::-webkit-scrollbar-thumb:hover {
		background-color: #6b7280;
	}
	
	/* Responsive adjustments */
	@media (max-width: 1024px) {
		.table-of-contents {
			position: relative;
			top: 0;
			max-height: none;
			margin-bottom: 2rem;
		}
	}
	
	@media (max-width: 640px) {
		.table-of-contents {
			padding: 1rem;
		}
		
		.toc-link {
			font-size: 0.8125rem;
			padding: 0.375rem 0.5rem;
		}
		
		/* Reduce indentation on mobile */
		.toc-level-2 {
			padding-left: 0.5rem;
		}
		
		.toc-level-3 {
			padding-left: 1rem;
		}
		
		.toc-level-4 {
			padding-left: 1.5rem;
		}
		
		.toc-level-5,
		.toc-level-6 {
			padding-left: 2rem;
		}
	}
</style>
