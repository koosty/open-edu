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
	data-slot="card"
	class={cn(
		'bg-card text-card-foreground flex flex-col gap-6 rounded-xl border',
		className
	)}
	{...restProps}
>
	{@render children?.()}
</div>