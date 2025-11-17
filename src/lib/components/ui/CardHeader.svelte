<script lang="ts">
	import { cn } from '$lib/utils'
	import type { HTMLAttributes } from 'svelte/elements'

	type Props = HTMLAttributes<HTMLDivElement> & {
		children?: import('svelte').Snippet
	}

	let { 
		class: className,
		children,
		...restProps 
	}: Props = $props()
</script>

<div
	data-slot="card-header"
	class={cn(
		'@container/card-header grid auto-rows-min grid-rows-[auto_auto] items-start gap-1.5 px-6 pt-6 has-data-[slot=card-action]:grid-cols-[1fr_auto] [.border-b]:pb-6',
		className
	)}
	{...restProps}
>
	{@render children?.()}
</div>