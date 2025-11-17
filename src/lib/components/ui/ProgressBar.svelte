<script lang="ts">
	let { 
		value = 0, 
		max = 100, 
		class: className = '', 
		size = 'default',
		variant = 'default',
		showLabel = false,
		animated = false 
	} = $props<{
		value: number
		max?: number
		class?: string
		size?: 'sm' | 'default' | 'lg'
		variant?: 'default' | 'success' | 'warning' | 'danger'
		showLabel?: boolean
		animated?: boolean
	}>()

	// Calculate percentage
	let percentage = $derived(Math.min(100, Math.max(0, (value / max) * 100)))
	
	// Get size class
	function getSizeClass(size: string): string {
		switch (size) {
			case 'sm': return 'h-1'
			case 'lg': return 'h-4'
			default: return 'h-2'
		}
	}
	
	// Get variant class
	function getVariantClass(variant: string): string {
		switch (variant) {
			case 'success': return 'bg-green-500'
			case 'warning': return 'bg-yellow-500'
			case 'danger': return 'bg-red-500'
			default: return 'bg-primary'
		}
	}
	
	// Get label size class
	function getLabelSizeClass(size: string): string {
		switch (size) {
			case 'sm': return 'text-xs'
			case 'lg': return 'text-base'
			default: return 'text-sm'
		}
	}
</script>

<div class="space-y-2">
	{#if showLabel}
		<div class="flex justify-between items-center">
			<span class="{getLabelSizeClass(size)} font-medium text-foreground">
				{Math.round(percentage)}%
			</span>
			<span class="{getLabelSizeClass(size)} text-muted-foreground">
				{value} / {max}
			</span>
		</div>
	{/if}
	
	<div class="w-full bg-muted rounded-full {getSizeClass(size)} {className}">
		<div 
			class="h-full rounded-full transition-all duration-500 ease-out {getVariantClass(variant)} {animated ? 'animate-pulse' : ''}"
			style="width: {percentage}%"
		></div>
	</div>
</div>