<script lang="ts">
	/**
	 * ReadingModeToggle Component
	 * 
	 * Controls for enhancing the reading experience:
	 * - Focus mode (hide sidebar)
	 * - Font size adjustment (4 sizes)
	 */
	
	import { Eye, EyeOff, Type } from 'lucide-svelte'
	
	interface Props {
		focusMode?: boolean
		fontSize?: 'sm' | 'base' | 'lg' | 'xl'
		onFocusModeChange?: (enabled: boolean) => void
		onFontSizeChange?: (size: 'sm' | 'base' | 'lg' | 'xl') => void
	}
	
	let {
		focusMode = $bindable(false),
		fontSize = $bindable<'sm' | 'base' | 'lg' | 'xl'>('base'),
		onFocusModeChange,
		onFontSizeChange
	}: Props = $props()
	
	let showFontMenu = $state(false)
	
	// Font size options
	const fontSizes = [
		{ value: 'sm' as const, label: 'Small', size: '14px' },
		{ value: 'base' as const, label: 'Medium', size: '16px' },
		{ value: 'lg' as const, label: 'Large', size: '18px' },
		{ value: 'xl' as const, label: 'Extra Large', size: '20px' }
	]
	
	/**
	 * Toggle focus mode
	 */
	function toggleFocusMode() {
		focusMode = !focusMode
		onFocusModeChange?.(focusMode)
	}
	
	/**
	 * Change font size
	 */
	function changeFontSize(size: 'sm' | 'base' | 'lg' | 'xl') {
		fontSize = size
		showFontMenu = false
		onFontSizeChange?.(size)
	}
	
	/**
	 * Get current font size label
	 */
	const currentFontLabel = $derived(
		fontSizes.find(f => f.value === fontSize)?.label || 'Medium'
	)
</script>

<div class="reading-mode-toggle flex items-center gap-2">
	<!-- Focus Mode Toggle -->
	<button
		onclick={toggleFocusMode}
		class="control-button"
		title={focusMode ? 'Exit Focus Mode' : 'Enter Focus Mode'}
		aria-label={focusMode ? 'Exit Focus Mode' : 'Enter Focus Mode'}
	>
		{#if focusMode}
			<EyeOff size={18} />
		{:else}
			<Eye size={18} />
		{/if}
		<span class="button-label">
			{focusMode ? 'Exit Focus' : 'Focus'}
		</span>
	</button>
	
	<!-- Font Size Selector -->
	<div class="relative">
		<button
			onclick={() => showFontMenu = !showFontMenu}
			class="control-button"
			title="Font Size"
			aria-label="Font Size"
			aria-expanded={showFontMenu}
		>
			<Type size={18} />
			<span class="button-label">{currentFontLabel}</span>
		</button>
		
		{#if showFontMenu}
			<div class="dropdown-menu">
				{#each fontSizes as size (size.value)}
					<button
						onclick={() => changeFontSize(size.value)}
						class="dropdown-item"
						class:active={fontSize === size.value}
					>
						<span class="font-preview" style="font-size: {size.size}">{size.label}</span>
						{#if fontSize === size.value}
							<svg class="w-4 h-4 ml-auto" fill="currentColor" viewBox="0 0 16 16">
								<path d="M13.854 3.646a.5.5 0 0 1 0 .708l-7 7a.5.5 0 0 1-.708 0l-3.5-3.5a.5.5 0 1 1 .708-.708L6.5 10.293l6.646-6.647a.5.5 0 0 1 .708 0z"/>
							</svg>
						{/if}
					</button>
				{/each}
			</div>
		{/if}
	</div>
</div>

<!-- Click outside to close dropdown -->
<svelte:window
	onclick={(e) => {
		const target = e.target as HTMLElement
		if (!target.closest('.reading-mode-toggle')) {
			showFontMenu = false
		}
	}}
/>

<style>
	.reading-mode-toggle {
		padding: 0.5rem;
		background-color: #ffffff;
		border: 1px solid #e5e7eb;
		border-radius: 0.5rem;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
	}
	
	:global(.dark) .reading-mode-toggle {
		background-color: #1f2937;
		border-color: #374151;
	}
	
	.control-button {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem 0.75rem;
		border: none;
		background: none;
		color: #4b5563;
		font-size: 0.875rem;
		cursor: pointer;
		border-radius: 0.375rem;
		transition: all 0.2s;
	}
	
	.control-button:hover {
		background-color: #f3f4f6;
		color: #111827;
	}
	
	:global(.dark) .control-button {
		color: #9ca3af;
	}
	
	:global(.dark) .control-button:hover {
		background-color: #374151;
		color: #f9fafb;
	}
	
	.button-label {
		display: none;
	}
	
	@media (min-width: 640px) {
		.button-label {
			display: inline;
		}
	}
	
	.dropdown-menu {
		position: absolute;
		top: calc(100% + 0.5rem);
		right: 0;
		z-index: 50;
		min-width: 12rem;
		background-color: #ffffff;
		border: 1px solid #e5e7eb;
		border-radius: 0.5rem;
		box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
		padding: 0.5rem;
	}
	
	:global(.dark) .dropdown-menu {
		background-color: #1f2937;
		border-color: #374151;
	}
	
	.dropdown-item {
		display: flex;
		align-items: center;
		width: 100%;
		padding: 0.5rem 0.75rem;
		border: none;
		background: none;
		color: #374151;
		font-size: 0.875rem;
		text-align: left;
		cursor: pointer;
		border-radius: 0.375rem;
		transition: all 0.2s;
	}
	
	.dropdown-item:hover {
		background-color: #f3f4f6;
		color: #111827;
	}
	
	:global(.dark) .dropdown-item {
		color: #d1d5db;
	}
	
	:global(.dark) .dropdown-item:hover {
		background-color: #374151;
		color: #f9fafb;
	}
	
	.dropdown-item.active {
		background-color: #dbeafe;
		color: #1e40af;
		font-weight: 600;
	}
	
	:global(.dark) .dropdown-item.active {
		background-color: #1e3a8a;
		color: #93c5fd;
	}
	
	.font-preview {
		font-weight: 500;
	}
	
	/* Responsive adjustments */
	@media (max-width: 640px) {
		.reading-mode-toggle {
			padding: 0.375rem;
		}
		
		.control-button {
			padding: 0.375rem 0.5rem;
			font-size: 0.8125rem;
		}
		
		.dropdown-menu {
			min-width: 10rem;
		}
	}
</style>
