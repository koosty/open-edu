<script lang="ts">
	import { cn } from '$lib/utils'
	import type { HTMLAttributes } from 'svelte/elements'

	type Props = HTMLAttributes<HTMLHeadingElement> & {
		children?: import('svelte').Snippet
	}

	const { 
		class: className,
		children,
		...restProps 
	}: Props = $props()
</script>

<h4
	data-slot="card-title"
	class={cn('leading-none', className)}
	{...restProps}
>
	{@render children?.()}
</h4>