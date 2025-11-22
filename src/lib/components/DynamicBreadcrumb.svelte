<script lang="ts">
	import * as Breadcrumb from '$lib/components/ui/breadcrumb'
	import { ChevronRight, Home } from 'lucide-svelte'
	import { getPath } from '$lib/utils/navigation'
	
	interface BreadcrumbItem {
		label: string
		href?: string
		current?: boolean
	}
	
	interface Props {
		items: BreadcrumbItem[]
		class?: string
	}
	
	let { items, class: className = '' }: Props = $props()
</script>

<nav class="mb-6 {className}" aria-label="Breadcrumb">
	<Breadcrumb.Root>
		<Breadcrumb.List>
			<!-- Home link -->
			<Breadcrumb.Item>
				<Breadcrumb.Link href={getPath('/')} class="flex items-center gap-1.5">
					<Home class="h-4 w-4" />
					<span class="sr-only">Home</span>
				</Breadcrumb.Link>
			</Breadcrumb.Item>
			
		<!-- Dynamic items -->
		{#each items as item (item.label)}
			<Breadcrumb.Separator>
				<ChevronRight class="h-4 w-4" />
			</Breadcrumb.Separator>
			
			<Breadcrumb.Item>
				{#if item.current || !item.href}
					<Breadcrumb.Page class="font-medium">
						{item.label}
					</Breadcrumb.Page>
				{:else}
					<Breadcrumb.Link href={getPath(item.href)}>
						{item.label}
					</Breadcrumb.Link>
				{/if}
			</Breadcrumb.Item>
		{/each}
		</Breadcrumb.List>
	</Breadcrumb.Root>
</nav>
