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
	data-slot="card-content"
	class={cn('', className)}
	{...restProps}
>
	{@render children?.()}
</div>