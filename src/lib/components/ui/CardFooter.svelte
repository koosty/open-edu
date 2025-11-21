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
	data-slot="card-footer"
	class={cn('flex items-center px-6 pb-6 [.border-t]:pt-6', className)}
	{...restProps}
>
	{@render children?.()}
</div>