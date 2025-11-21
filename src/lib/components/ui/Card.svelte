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
	data-slot="card"
	class={cn(
		'flex flex-col gap-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition-shadow duration-200',
		className
	)}
	{...restProps}
>
	{@render children?.()}
</div>