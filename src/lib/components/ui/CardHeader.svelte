<script lang="ts">
	import { cn } from '$lib/utils'
	import type { HTMLAttributes } from 'svelte/elements'

	type Props = HTMLAttributes<HTMLDivElement> & {
		children?: import('svelte').Snippet
	}

	const { 
		class: className,
		children,
		...restProps 
	}: Props = $props()
</script>

<div
	data-slot="card-header"
	class={cn(
		'grid auto-rows-min grid-rows-[auto_auto] items-start gap-2',
		className
	)}
	{...restProps}
>
	{@render children?.()}
</div>