<script lang="ts">
	import { cn } from '$lib/utils'
	import type { HTMLAttributes } from 'svelte/elements'

	type Props = HTMLAttributes<HTMLParagraphElement> & {
		children?: import('svelte').Snippet
	}

	let { 
		class: className,
		children,
		...restProps 
	}: Props = $props()
</script>

<p
	data-slot="card-description"
	class={cn('text-muted-foreground', className)}
	{...restProps}
>
	{@render children?.()}
</p>