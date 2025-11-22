<script lang="ts">
	import { Button, Input, Textarea, Label, Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui'
	import { NotesService } from '$lib/services/notes'
	import { authState } from '$lib/auth.svelte'
	import type { Note, NoteColor, CreateNoteInput } from '$lib/types/notes'
	import { NOTE_COLORS } from '$lib/types/notes'
	
	interface Props {
		courseId: string
		lessonId: string
		onNoteCreated?: (noteId: string) => void
		onNoteUpdated?: (note: Note) => void
		existingNote?: Note | null
		currentHeadingId?: string
		scrollPosition?: number
	}
	
	const {
		courseId,
		lessonId,
		onNoteCreated,
		onNoteUpdated,
		existingNote = null,
		currentHeadingId = '',
		scrollPosition = 0
	}: Props = $props()
	
	// UI state
	let isOpen = $state(false)
	let saving = $state(false)
	let error = $state<string | null>(null)
	
	// Form state
	let title = $state('')
	let content = $state('')
	let selectedColor: NoteColor = $state('yellow')
	let tags = $state<string[]>([])
	let tagInput = $state('')
	let isPrivate = $state(true)
	
	// Edit mode
	const isEditMode = $derived(!!existingNote)
	
	// Initialize form with existing note data
	$effect(() => {
		if (existingNote) {
			title = existingNote.title || ''
			content = existingNote.content
			selectedColor = existingNote.color || 'yellow'
			tags = existingNote.tags || []
			isPrivate = existingNote.isPrivate
			isOpen = false // Don't auto-open for existing notes
		}
	})
	
	// Get current position context
	function getCurrentContext(): string | undefined {
		if (!currentHeadingId) return undefined
		
		// Try to get heading text from DOM
		const headingElement = document.getElementById(currentHeadingId)
		return headingElement?.textContent || currentHeadingId
	}
	
	// Add tag
	function addTag() {
		const trimmed = tagInput.trim()
		if (trimmed && !tags.includes(trimmed)) {
			tags = [...tags, trimmed]
			tagInput = ''
		}
	}
	
	// Remove tag
	function removeTag(tag: string) {
		tags = tags.filter(t => t !== tag)
	}
	
	// Handle tag input keydown
	function handleTagKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter') {
			e.preventDefault()
			addTag()
		}
	}
	
	// Open widget
	function openWidget() {
		if (!authState.user) {
			error = 'You must be logged in to create notes'
			return
		}
		isOpen = true
		error = null
	}
	
	// Close widget
	function closeWidget() {
		if (!isEditMode) {
			// Reset form when closing (but not in edit mode)
			title = ''
			content = ''
			selectedColor = 'yellow'
			tags = []
			tagInput = ''
			isPrivate = true
		}
		isOpen = false
		error = null
	}
	
	// Save note
	async function saveNote() {
		if (!authState.user) {
			error = 'You must be logged in to save notes'
			return
		}
		
		if (!content.trim()) {
			error = 'Note content is required'
			return
		}
		
		saving = true
		error = null
		
		try {
			if (isEditMode && existingNote) {
				// Update existing note
				await NotesService.updateNote(existingNote.id, {
					title: title.trim() || undefined,
					content: content.trim(),
					color: selectedColor,
					tags: tags.length > 0 ? tags : undefined,
					isPrivate
				})
				
				// Call update callback
				if (onNoteUpdated) {
					const updatedNote = await NotesService.getNote(existingNote.id)
					if (updatedNote) {
						onNoteUpdated(updatedNote)
					}
				}
			} else {
				// Create new note
				const noteInput: CreateNoteInput = {
					userId: authState.user.id,
					courseId,
					lessonId,
					content: content.trim(),
					position: scrollPosition,
					isPrivate
				}
				
				// Only add optional fields if they have values
				if (title.trim()) {
					noteInput.title = title.trim()
				}
				if (currentHeadingId) {
					noteInput.headingId = currentHeadingId
				}
				const contextText = getCurrentContext()
				if (contextText) {
					noteInput.anchorText = contextText
				}
				if (selectedColor) {
					noteInput.color = selectedColor
				}
				if (tags.length > 0) {
					noteInput.tags = tags
				}
				
				const noteId = await NotesService.createNote(noteInput)
				
				// Call success callback
				if (onNoteCreated) {
					onNoteCreated(noteId)
				}
				
				// Reset form after successful creation
				title = ''
				content = ''
				selectedColor = 'yellow'
				tags = []
				tagInput = ''
			}
			
			closeWidget()
		} catch (err) {
			console.error('Error saving note:', err)
			error = 'Failed to save note. Please try again.'
		} finally {
			saving = false
		}
	}
	
	// Delete note (only in edit mode)
	async function deleteNote() {
		if (!existingNote) return
		
		if (!confirm('Are you sure you want to delete this note?')) {
			return
		}
		
		saving = true
		error = null
		
		try {
			await NotesService.deleteNote(existingNote.id)
			closeWidget()
		} catch (err) {
			console.error('Error deleting note:', err)
			error = 'Failed to delete note. Please try again.'
		} finally {
			saving = false
		}
	}
	
	const colorOptions: NoteColor[] = ['yellow', 'green', 'blue', 'purple', 'pink', 'orange', 'red', 'gray']
</script>

<!-- Floating Action Button -->
{#if !isEditMode}
	<button
		onclick={openWidget}
		class="fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center group"
		aria-label="Add note"
	>
		<svg
			class="w-6 h-6 transition-transform duration-200 group-hover:scale-110"
			fill="none"
			stroke="currentColor"
			viewBox="0 0 24 24"
		>
			<path
				stroke-linecap="round"
				stroke-linejoin="round"
				stroke-width="2"
				d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
			/>
		</svg>
	</button>
{/if}

<!-- Note Form Modal -->
{#if isOpen}
	<!-- Backdrop -->
	<div
		class="fixed inset-0 bg-black/50 z-50 animate-fade-in"
		onclick={closeWidget}
		role="presentation"
	></div>
	
	<!-- Modal -->
	<div class="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
		<Card class="w-full max-w-2xl pointer-events-auto animate-slide-up">
			<CardHeader class="border-b border-border dark:border-gray-700">
				<div class="flex items-center justify-between">
					<CardTitle>{isEditMode ? 'Edit Note' : 'Add Note'}</CardTitle>
					<button
						onclick={closeWidget}
						class="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
						aria-label="Close"
					>
						<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
						</svg>
					</button>
				</div>
			</CardHeader>
			
			<CardContent class="p-6 space-y-4">
				<!-- Error message -->
				{#if error}
					<div class="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-800 dark:text-red-200">
						{error}
					</div>
				{/if}
				
				<!-- Title (optional) -->
				<div>
					<label for="note-title" class="block text-sm font-medium mb-2">
						Title <span class="text-gray-500">(optional)</span>
					</label>
					<Input
						id="note-title"
						bind:value={title}
						placeholder="Add a title for your note..."
						disabled={saving}
					/>
				</div>
				
		<!-- Content (required) -->
		<div>
			<Label for="note-content" class="mb-2">
				Content <span class="text-red-500">*</span>
			</Label>
			<Textarea
					id="note-content"
					bind:value={content}
					placeholder="Write your note here..."
					rows={6}
					class="w-full resize-none"
					disabled={saving}
					required
				/>
			</div>
				
				<!-- Color picker -->
				<div>
					<span class="block text-sm font-medium mb-2">Color</span>
					<div class="flex flex-wrap gap-2">
						{#each colorOptions as color (color)}
							<button
								type="button"
								onclick={() => selectedColor = color}
								class="w-10 h-10 rounded-lg border-2 transition-all duration-200 {NOTE_COLORS[color].bg} {selectedColor === color ? NOTE_COLORS[color].border + ' scale-110' : 'border-transparent hover:scale-105'}"
								aria-label={`Select ${color} color`}
								disabled={saving}
							>
								{#if selectedColor === color}
									<svg class="w-6 h-6 m-auto {NOTE_COLORS[color].text}" fill="currentColor" viewBox="0 0 24 24">
										<path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
									</svg>
								{/if}
							</button>
						{/each}
					</div>
				</div>
				
				<!-- Tags -->
				<div>
					<label for="note-tags" class="block text-sm font-medium mb-2">
						Tags <span class="text-gray-500">(optional)</span>
					</label>
					
					{#if tags.length > 0}
						<div class="flex flex-wrap gap-2 mb-2">
							{#each tags as tag (tag)}
								<span class="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded-full text-sm">
									{tag}
									<button
										type="button"
										onclick={() => removeTag(tag)}
										class="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
										aria-label={`Remove ${tag} tag`}
										disabled={saving}
									>
										<svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
											<path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
										</svg>
									</button>
								</span>
							{/each}
						</div>
					{/if}
					
					<div class="flex gap-2">
						<Input
							id="note-tags"
							bind:value={tagInput}
							placeholder="Add tags (press Enter)"
							onkeydown={handleTagKeydown}
							disabled={saving}
							class="flex-1"
						/>
						<Button
							variant="outline"
							size="sm"
							onclick={addTag}
							disabled={!tagInput.trim() || saving}
						>
							Add
						</Button>
					</div>
				</div>
				
				<!-- Privacy toggle -->
				<div class="flex items-center gap-2">
					<input
						type="checkbox"
						id="note-private"
						bind:checked={isPrivate}
						class="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
						disabled={saving}
					/>
					<label for="note-private" class="text-sm">
						Private note (only visible to you)
					</label>
				</div>
				
				<!-- Context info -->
				{#if currentHeadingId}
					<div class="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-sm text-blue-800 dark:text-blue-200">
						<div class="flex items-start gap-2">
							<svg class="w-4 h-4 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
								<path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" />
							</svg>
							<div>
								<p class="font-medium">Note location</p>
								<p class="text-xs mt-1 opacity-80">
									This note will be linked to: <strong>{getCurrentContext() || currentHeadingId}</strong>
								</p>
							</div>
						</div>
					</div>
				{/if}
				
				<!-- Action buttons -->
				<div class="flex items-center justify-between pt-4 border-t border-border dark:border-gray-700">
					<div>
						{#if isEditMode}
							<Button
								variant="outline"
								size="sm"
								onclick={deleteNote}
								disabled={saving}
								class="text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
							>
								Delete
							</Button>
						{/if}
					</div>
					<div class="flex gap-2">
						<Button
							variant="outline"
							onclick={closeWidget}
							disabled={saving}
						>
							Cancel
						</Button>
						<Button
							onclick={saveNote}
							disabled={saving || !content.trim()}
						>
							{#if saving}
								Saving...
							{:else}
								{isEditMode ? 'Update' : 'Save Note'}
							{/if}
						</Button>
					</div>
				</div>
			</CardContent>
		</Card>
	</div>
{/if}

<style>
	@keyframes fade-in {
		from { opacity: 0; }
		to { opacity: 1; }
	}
	
	@keyframes slide-up {
		from {
			opacity: 0;
			transform: translateY(20px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}
	
	.animate-fade-in {
		animation: fade-in 200ms ease-out;
	}
	
	.animate-slide-up {
		animation: slide-up 300ms ease-out;
	}
</style>
