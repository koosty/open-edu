<script lang="ts">
	import { cva, type VariantProps } from 'class-variance-authority'
	import { cn } from '$lib/utils'
	import type { HTMLButtonAttributes } from 'svelte/elements'

	const buttonVariants = cva(
		'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-all duration-200 disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] [&_svg]:pointer-events-none [&_svg:not([class*=\'size-\'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2',
		{
			variants: {
				variant: {
					default: 'bg-primary-600 text-white hover:bg-primary-700 active:bg-primary-800',
					destructive:
						'bg-error-600 text-white hover:bg-error-700 active:bg-error-800',
					outline:
						'border-2 border-primary-600 text-primary-600 bg-transparent hover:bg-primary-50 active:bg-primary-100',
					secondary: 'bg-secondary-600 text-white hover:bg-secondary-700 active:bg-secondary-800',
					ghost: 'text-slate-700 hover:bg-slate-100 active:bg-slate-200',
					link: 'text-primary-600 underline-offset-4 hover:underline hover:text-primary-700'
				},
				size: {
					default: 'h-10 px-6 py-2.5 has-[>svg]:px-4',
					sm: 'h-8 rounded-lg gap-1.5 px-4 py-2 has-[>svg]:px-3',
					lg: 'h-12 rounded-lg px-8 py-3 text-base has-[>svg]:px-6',
					icon: 'size-10 rounded-lg'
				}
			},
			defaultVariants: {
				variant: 'default',
				size: 'default'
			}
		}
	)

	type Props = HTMLButtonAttributes & 
		VariantProps<typeof buttonVariants> & {
			children?: import('svelte').Snippet
		}

	let { 
		class: className, 
		variant, 
		size, 
		children,
		...restProps 
	}: Props = $props()
</script>

<button
	data-slot="button"
	class={cn(buttonVariants({ variant, size }), className)}
	{...restProps}
>
	{@render children?.()}
</button>