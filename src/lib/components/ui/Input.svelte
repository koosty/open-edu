<script lang="ts">
	import { cn } from '$lib/utils'
	import type { HTMLInputAttributes } from 'svelte/elements'

	type Props = HTMLInputAttributes & {
		class?: string
		value?: string
	}

	let { 
		class: className, 
		type = 'text',
		value = $bindable(''),
		...restProps 
	}: Props = $props()
</script>

<input
	{type}
	bind:value
	data-slot="input"
	class={cn(
		'w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 transition-all duration-200',
		'placeholder:text-slate-400',
		'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 focus:border-transparent',
		'disabled:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50',
		'file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium',
		className
	)}
	{...restProps}
/>