<script lang="ts">
	/**
	 * BookmarkButton Component
	 * 
	 * Quick bookmark button for saving reading positions.
	 * Allows optional label and color selection.
	 */
	
	import { NotesService } from '$lib/services/notes'
	import type { CreateBookmarkInput, NoteColor, Bookmark } from '$lib/types/notes'
	import { authState } from '$lib/auth.svelte'
	import { Bookmark as BookmarkIcon, BookmarkCheck, X } from 'lucide-svelte'
	
	interface Props {
		courseId: string
		lessonId: string
		currentHeadingId?: string
		scrollPosition: number
		getCurrentContext?: () => string
		onSuccess?: (bookmarkId: string) => void
		existingBookmark?: Bookmark | null
	}
	
	const {
		courseId,
		lessonId,
		currentHeadingId,
		scrollPosition,
		getCurrentContext,
		onSuccess,
		existingBookmark = null
	}: Props = $props()
	
	// Component state
	let isBookmarked = $state(false)
	let showLabelForm = $state(false)
	let label = $state('')
	let selectedColor = $state<NoteColor>('yellow')
	let isSaving = $state(false)
	let bookmarkId = $state<string | null>(null)
	
	// Color options
	const colors: NoteColor[] = ['yellow', 'green', 'blue', 'purple', 'pink', 'orange', 'red', 'gray']
	
	// Check if bookmark exists at this position
	$effect(() => {
		if (existingBookmark) {
			isBookmarked = true
			bookmarkId = existingBookmark.id
		} else {
			isBookmarked = false
			bookmarkId = null
		}
	})
	
	/**
	 * Toggle bookmark on/off
	 */
	async function toggleBookmark() {
		if (isBookmarked && bookmarkId) {
			// Remove bookmark
			await removeBookmark()
		} else {
			// Show label form
			showLabelForm = true
		}
	}
	
	/**
	 * Save bookmark with optional label
	 */
	async function saveBookmark() {
		if (!authState.user || isSaving) return
		
		isSaving = true
		
		try {
			const bookmarkInput: CreateBookmarkInput = {
				userId: authState.user.id,
				courseId,
				lessonId,
				position: scrollPosition
			}
			
			// Add optional fields only if they have values
			if (label.trim()) {
				bookmarkInput.label = label.trim()
			}
			if (currentHeadingId) {
				bookmarkInput.headingId = currentHeadingId
			}
			const contextText = getCurrentContext?.()
			if (contextText) {
				bookmarkInput.anchorText = contextText
			}
			if (selectedColor) {
				bookmarkInput.color = selectedColor
			}
			
			const id = await NotesService.createBookmark(bookmarkInput)
			
			// Update state
			isBookmarked = true
			bookmarkId = id
			showLabelForm = false
			
			// Reset form
			label = ''
			selectedColor = 'yellow'
			
			// Call success callback
			onSuccess?.(id)
		} catch (error) {
			console.error('Failed to save bookmark:', error)
			alert('Failed to save bookmark. Please try again.')
		} finally {
			isSaving = false
		}
	}
	
	/**
	 * Remove bookmark
	 */
	async function removeBookmark() {
		if (!bookmarkId || isSaving) return
		
		isSaving = true
		
		try {
			await NotesService.deleteBookmark(bookmarkId)
			
			// Update state
			isBookmarked = false
			bookmarkId = null
		} catch (error) {
			console.error('Failed to remove bookmark:', error)
			alert('Failed to remove bookmark. Please try again.')
		} finally {
			isSaving = false
		}
	}
	
	/**
	 * Cancel label form
	 */
	function cancelForm() {
		showLabelForm = false
		label = ''
		selectedColor = 'yellow'
	}
</script>

<!-- Bookmark Button -->
<div class="relative">
	<button
		onclick={toggleBookmark}
		disabled={isSaving}
		class="flex items-center gap-2 px-3 py-2 text-sm rounded-lg border transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed {isBookmarked
			? 'bg-blue-50 border-blue-300 text-blue-700 hover:bg-blue-100 dark:bg-blue-900/20 dark:border-blue-700 dark:text-blue-300 dark:hover:bg-blue-900/30'
			: 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-700'}"
		title={isBookmarked ? 'Remove bookmark' : 'Add bookmark'}
	>
		{#if isBookmarked}
			<BookmarkCheck size={16} />
			<span>Bookmarked</span>
		{:else}
			<BookmarkIcon size={16} />
			<span>Bookmark</span>
		{/if}
	</button>
	
	<!-- Label Form (Popup) -->
	{#if showLabelForm}
		<div class="absolute top-full left-0 mt-2 w-80 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg shadow-lg z-50 p-4">
			<div class="flex items-center justify-between mb-3">
				<h3 class="text-sm font-semibold text-gray-900 dark:text-gray-100">
					Add Bookmark
				</h3>
				<button
					onclick={cancelForm}
					class="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
					aria-label="Close"
				>
					<X size={16} />
				</button>
			</div>
			
			<!-- Optional Label -->
			<div class="mb-3">
				<label for="bookmark-label" class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
					Label (Optional)
				</label>
				<input
					id="bookmark-label"
					type="text"
					bind:value={label}
					placeholder="e.g. Important section"
					maxlength={100}
					class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
				/>
			</div>
			
			<!-- Color Picker -->
			<div class="mb-4">
				<span class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
					Color
				</span>
				<div class="flex gap-2">
					{#each colors as color (color)}
						<button
							type="button"
							onclick={() => (selectedColor = color)}
							class="w-8 h-8 rounded-full border-2 transition-transform duration-200 hover:scale-110"
							class:border-gray-900={selectedColor === color}
							class:border-transparent={selectedColor !== color}
							class:dark:border-white={selectedColor === color}
							class:bg-yellow-400={color === 'yellow'}
							class:bg-green-400={color === 'green'}
							class:bg-blue-400={color === 'blue'}
							class:bg-purple-400={color === 'purple'}
							class:bg-pink-400={color === 'pink'}
							class:bg-orange-400={color === 'orange'}
							class:bg-red-400={color === 'red'}
							class:bg-gray-400={color === 'gray'}
							title={color}
							aria-label={`Select ${color} color`}
						></button>
					{/each}
				</div>
			</div>
			
			<!-- Actions -->
			<div class="flex gap-2">
				<button
					onclick={saveBookmark}
					disabled={isSaving}
					class="flex-1 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
				>
					{isSaving ? 'Saving...' : 'Save Bookmark'}
				</button>
				<button
					onclick={cancelForm}
					disabled={isSaving}
					class="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
				>
					Cancel
				</button>
			</div>
		</div>
	{/if}
</div>

<style>
	/* Ensure popup doesn't get cut off */
	:global(body) {
		overflow-x: hidden;
	}
</style>
