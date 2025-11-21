<!--
	Skeleton Component
	Animated loading placeholder for content
-->
<script lang="ts">
	const {
		variant = 'default',
		width = '100%',
		height = 'auto',
		circle = false,
		className = ''
	}: {
		variant?: 'default' | 'text' | 'heading' | 'avatar' | 'button' | 'card'
		width?: string
		height?: string
		circle?: boolean
		className?: string
	} = $props()
	
	// Preset dimensions based on variant
	const variantClasses = $derived.by(() => {
		switch (variant) {
			case 'text':
				return 'h-4 rounded'
			case 'heading':
				return 'h-8 rounded'
			case 'avatar':
				return 'w-12 h-12 rounded-full'
			case 'button':
				return 'h-10 rounded-lg'
			case 'card':
				return 'h-48 rounded-xl'
			default:
				return 'h-4 rounded'
		}
	})
	
	const sizeStyle = $derived.by(() => {
		let style = ''
		if (width !== '100%') style += `width: ${width}; `
		if (height !== 'auto') style += `height: ${height}; `
		return style
	})
</script>

<div
	class="skeleton animate-pulse bg-slate-200 dark:bg-slate-700 {variantClasses} {circle ? 'rounded-full' : ''} {className}"
	style={sizeStyle}
	role="status"
	aria-live="polite"
	aria-label="Loading..."
></div>

<style>
	.skeleton {
		background: linear-gradient(
			90deg,
			rgb(226 232 240 / 1) 0%,
			rgb(203 213 225 / 1) 50%,
			rgb(226 232 240 / 1) 100%
		);
		background-size: 200% 100%;
		animation: shimmer 1.5s ease-in-out infinite;
	}
	
	:global(.dark) .skeleton {
		background: linear-gradient(
			90deg,
			rgb(51 65 85 / 1) 0%,
			rgb(71 85 105 / 1) 50%,
			rgb(51 65 85 / 1) 100%
		);
		background-size: 200% 100%;
	}
	
	@keyframes shimmer {
		0% {
			background-position: 200% 0;
		}
		100% {
			background-position: -200% 0;
		}
	}
</style>
