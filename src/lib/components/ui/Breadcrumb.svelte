<script lang="ts">
	import { ChevronRight, Home } from 'lucide-svelte'
	import { base } from '$app/paths'
	
	export interface BreadcrumbItem {
		label: string
		href?: string
		current?: boolean
	}
	
	let { 
		items = [],
		showHome = true,
		separator = 'chevron',
		class: className = ''
	} = $props<{
		items: BreadcrumbItem[]
		showHome?: boolean
		separator?: 'chevron' | 'slash' | 'text'
		class?: string
	}>()
	
	// Add home item if requested
	let breadcrumbItems = $derived(() => {
		const allItems = showHome 
			? [{ label: 'Home', href: `${base}/`, current: false }, ...items]
			: items
		
		// Mark the last item as current
		if (allItems.length > 0) {
			allItems[allItems.length - 1].current = true
		}
		
		return allItems
	})
	
	function renderSeparator() {
		switch (separator) {
			case 'slash':
				return '/'
			case 'text':
				return '>'
			case 'chevron':
			default:
				return null
		}
	}
</script>

<nav aria-label="Breadcrumb" class="flex items-center space-x-1 text-sm {className}">
	<ol class="flex items-center space-x-1">
		{#each breadcrumbItems() as item, index}
			<li class="flex items-center">
				{#if index > 0}
					<span class="mx-2 text-muted-foreground" aria-hidden="true">
						{#if separator === 'chevron'}
							<ChevronRight class="h-4 w-4" />
						{:else}
							{renderSeparator()}
						{/if}
					</span>
				{/if}
				
				{#if item.current || !item.href}
					<span 
						class="text-foreground font-medium" 
						aria-current={item.current ? 'page' : undefined}
					>
						{#if index === 0 && showHome}
							<span class="flex items-center gap-1">
								<Home class="h-4 w-4" />
								{item.label}
							</span>
						{:else}
							{item.label}
						{/if}
					</span>
				{:else}
					<a 
						href={item.href} 
						class="text-muted-foreground hover:text-foreground transition-colors"
					>
						{#if index === 0 && showHome}
							<span class="flex items-center gap-1">
								<Home class="h-4 w-4" />
								{item.label}
							</span>
						{:else}
							{item.label}
						{/if}
					</a>
				{/if}
			</li>
		{/each}
	</ol>
</nav>