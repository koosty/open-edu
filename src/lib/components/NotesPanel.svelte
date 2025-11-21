<script lang="ts">
	/**
	 * NotesPanel Component
	 * 
	 * Sidebar panel displaying all notes and bookmarks for the current lesson.
	 * Features: search, filter by tags/color, jump to positions, edit/delete.
	 */
	
	import { NotesService } from '$lib/services/notes'
	import { authState } from '$lib/auth.svelte'
	import type { Note, Bookmark, NoteColor } from '$lib/types/notes'
	import { NOTE_COLORS } from '$lib/types/notes'
	import { Search, StickyNote, Bookmark as BookmarkIcon } from 'lucide-svelte'
	import { SvelteSet } from 'svelte/reactivity'
	
	interface Props {
		courseId: string
		lessonId: string
		onJumpToNote?: (note: Note) => void
		onJumpToBookmark?: (bookmark: Bookmark) => void
		onEditNote?: (note: Note) => void
		onDeleteNote?: (noteId: string) => void
		onDeleteBookmark?: (bookmarkId: string) => void
	}
	
	const {
		courseId,
		lessonId,
		onJumpToNote,
		onJumpToBookmark,
		onEditNote,
		onDeleteNote,
		onDeleteBookmark
	}: Props = $props()
	
	// Component state
	let notes = $state<Note[]>([])
	let bookmarks = $state<Bookmark[]>([])
	let loading = $state(true)
	let error = $state<string | null>(null)
	let searchQuery = $state('')
	let activeTab = $state<'all' | 'notes' | 'bookmarks'>('all')
	let selectedColor = $state<NoteColor | 'all'>('all')
	const expandedNotes = new SvelteSet<string>()
	
	// Load notes and bookmarks
	$effect(() => {
		if (authState.initialized && authState.user) {
			loadData()
		}
	})
	
	async function loadData() {
		loading = true
		error = null
		
		try {
			const [notesData, bookmarksData] = await Promise.all([
				NotesService.getLessonNotes(authState.user!.id, courseId, lessonId),
				NotesService.getLessonBookmarks(authState.user!.id, courseId, lessonId)
			])
			
			notes = notesData
			bookmarks = bookmarksData
		} catch (e) {
			console.error('Failed to load notes/bookmarks:', e)
			// Check if it's a missing index error
			const errorMessage = String(e)
			if (errorMessage.includes('index') || errorMessage.includes('requires an index')) {
				error = 'Firestore indexes are being created. Please wait a few minutes and refresh.'
			} else {
				error = 'Failed to load notes'
			}
		} finally {
			loading = false
		}
	}
	
	// Filtered notes based on search and filters
	const filteredNotes = $derived.by(() => {
		let result = notes
		
		// Filter by search query
		if (searchQuery.trim()) {
			const query = searchQuery.toLowerCase()
			result = result.filter(note => 
				note.content.toLowerCase().includes(query) ||
				note.title?.toLowerCase().includes(query) ||
				note.tags?.some(tag => tag.toLowerCase().includes(query))
			)
		}
		
		// Filter by color
		if (selectedColor !== 'all') {
			result = result.filter(note => note.color === selectedColor)
		}
		
		return result
	})
	
	// Filtered bookmarks
	const filteredBookmarks = $derived.by(() => {
		let result = bookmarks
		
		// Filter by search query
		if (searchQuery.trim()) {
			const query = searchQuery.toLowerCase()
			result = result.filter(bookmark => 
				bookmark.label?.toLowerCase().includes(query) ||
				bookmark.anchorText?.toLowerCase().includes(query)
			)
		}
		
		// Filter by color
		if (selectedColor !== 'all') {
			result = result.filter(bookmark => bookmark.color === selectedColor)
		}
		
		return result
	})
	
	// Total counts
	const totalNotes = $derived(filteredNotes.length)
	const totalBookmarks = $derived(filteredBookmarks.length)
	const showNotes = $derived(activeTab === 'all' || activeTab === 'notes')
	const showBookmarks = $derived(activeTab === 'all' || activeTab === 'bookmarks')
	
	/**
	 * Toggle note expansion
	 */
	function toggleNote(noteId: string) {
		if (expandedNotes.has(noteId)) {
			expandedNotes.delete(noteId)
		} else {
			expandedNotes.add(noteId)
		}
		// SvelteSet is already reactive, no need to reassign
	}
	
	/**
	 * Jump to note position
	 */
	function handleJumpToNote(note: Note) {
		if (note.headingId) {
			const element = document.getElementById(note.headingId)
			if (element) {
				const offset = 100
				const elementPosition = element.getBoundingClientRect().top + window.scrollY
				const offsetPosition = elementPosition - offset
				
				window.scrollTo({
					top: offsetPosition,
					behavior: 'smooth'
				})
			}
		} else if (note.position) {
			// Scroll to approximate position
			const contentHeight = document.documentElement.scrollHeight
			const scrollPosition = (note.position / 100) * contentHeight
			
			window.scrollTo({
				top: scrollPosition,
				behavior: 'smooth'
			})
		}
		
		onJumpToNote?.(note)
	}
	
	/**
	 * Jump to bookmark position
	 */
	function handleJumpToBookmark(bookmark: Bookmark) {
		if (bookmark.headingId) {
			const element = document.getElementById(bookmark.headingId)
			if (element) {
				const offset = 100
				const elementPosition = element.getBoundingClientRect().top + window.scrollY
				const offsetPosition = elementPosition - offset
				
				window.scrollTo({
					top: offsetPosition,
					behavior: 'smooth'
				})
			}
		} else if (bookmark.position) {
			const contentHeight = document.documentElement.scrollHeight
			const scrollPosition = (bookmark.position / 100) * contentHeight
			
			window.scrollTo({
				top: scrollPosition,
				behavior: 'smooth'
			})
		}
		
		onJumpToBookmark?.(bookmark)
	}
	
	/**
	 * Delete note with confirmation
	 */
	async function handleDeleteNote(noteId: string, event: Event) {
		event.stopPropagation()
		
		if (!confirm('Are you sure you want to delete this note?')) {
			return
		}
		
		try {
			await NotesService.deleteNote(noteId)
			notes = notes.filter(n => n.id !== noteId)
			onDeleteNote?.(noteId)
		} catch (e) {
			console.error('Failed to delete note:', e)
			alert('Failed to delete note')
		}
	}
	
	/**
	 * Delete bookmark with confirmation
	 */
	async function handleDeleteBookmark(bookmarkId: string, event: Event) {
		event.stopPropagation()
		
		if (!confirm('Are you sure you want to delete this bookmark?')) {
			return
		}
		
		try {
			await NotesService.deleteBookmark(bookmarkId)
			bookmarks = bookmarks.filter(b => b.id !== bookmarkId)
			onDeleteBookmark?.(bookmarkId)
		} catch (e) {
			console.error('Failed to delete bookmark:', e)
			alert('Failed to delete bookmark')
		}
	}
	
	/**
	 * Format date
	 */
	function formatDate(timestamp: unknown): string {
		if (!timestamp) return ''
		const date = (timestamp as { toDate?: () => Date }).toDate ? (timestamp as { toDate: () => Date }).toDate() : new Date(timestamp as string | number | Date)
		const now = new Date()
		const diffMs = now.getTime() - date.getTime()
		const diffMins = Math.floor(diffMs / 60000)
		
		if (diffMins < 1) return 'Just now'
		if (diffMins < 60) return `${diffMins}m ago`
		
		const diffHours = Math.floor(diffMins / 60)
		if (diffHours < 24) return `${diffHours}h ago`
		
		const diffDays = Math.floor(diffHours / 24)
		if (diffDays < 7) return `${diffDays}d ago`
		
		return date.toLocaleDateString()
	}
	
	/**
	 * Truncate text
	 */
	function truncate(text: string, maxLength: number): string {
		if (text.length <= maxLength) return text
		return text.substring(0, maxLength) + '...'
	}
</script>

<div class="notes-panel h-full flex flex-col">
	<!-- Search & Filters -->
	<div class="p-4 border-b border-gray-200 dark:border-gray-700">
		<!-- Search -->
		<div class="relative">
			<Search size={16} class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
			<input
				type="text"
				bind:value={searchQuery}
				placeholder="Search notes..."
				class="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
			/>
		</div>
		
		<!-- Tabs -->
		<div class="flex gap-1 mt-3">
			<button
				onclick={() => activeTab = 'all'}
				class="flex-1 px-3 py-1.5 text-xs font-medium rounded transition-colors {activeTab === 'all' 
					? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' 
					: 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'}"
			>
				All ({totalNotes + totalBookmarks})
			</button>
			<button
				onclick={() => activeTab = 'notes'}
				class="flex-1 px-3 py-1.5 text-xs font-medium rounded transition-colors {activeTab === 'notes' 
					? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' 
					: 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'}"
			>
				Notes ({totalNotes})
			</button>
			<button
				onclick={() => activeTab = 'bookmarks'}
				class="flex-1 px-3 py-1.5 text-xs font-medium rounded transition-colors {activeTab === 'bookmarks' 
					? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' 
					: 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'}"
			>
				Bookmarks ({totalBookmarks})
			</button>
		</div>
		
		<!-- Color Filter -->
		<div class="mt-3">
			<div class="flex gap-1.5 items-center">
				<button
					onclick={() => selectedColor = 'all'}
					class="w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all {selectedColor === 'all' 
						? 'border-gray-900 dark:border-white bg-gray-200 dark:bg-gray-700' 
						: 'border-gray-300 dark:border-gray-600 hover:border-gray-400'}"
					title="All colors"
				>
					{#if selectedColor === 'all'}
						<svg class="w-3 h-3" fill="currentColor" viewBox="0 0 16 16">
							<path d="M13.854 3.646a.5.5 0 0 1 0 .708l-7 7a.5.5 0 0 1-.708 0l-3.5-3.5a.5.5 0 1 1 .708-.708L6.5 10.293l6.646-6.647a.5.5 0 0 1 .708 0z"/>
						</svg>
					{/if}
				</button>
			{#each Object.keys(NOTE_COLORS) as color (color)}
				<button
					onclick={() => selectedColor = color as NoteColor}
					class="w-6 h-6 rounded-full border-2 transition-all {selectedColor === color 
						? 'border-gray-900 dark:border-white scale-110' 
						: 'border-transparent hover:scale-105'}
						{color === 'yellow' ? 'bg-yellow-400' : ''}
						{color === 'green' ? 'bg-green-400' : ''}
						{color === 'blue' ? 'bg-blue-400' : ''}
						{color === 'purple' ? 'bg-purple-400' : ''}
						{color === 'pink' ? 'bg-pink-400' : ''}
						{color === 'orange' ? 'bg-orange-400' : ''}
						{color === 'red' ? 'bg-red-400' : ''}
						{color === 'gray' ? 'bg-gray-400' : ''}"
					title={color}
				></button>
			{/each}
			</div>
		</div>
	</div>
	
	<!-- Content -->
	<div class="flex-1 overflow-y-auto">
		{#if loading}
			<div class="p-4 text-center text-sm text-gray-500 dark:text-gray-400">
				Loading...
			</div>
		{:else if error}
			<div class="p-4 text-center text-sm text-red-600 dark:text-red-400">
				{error}
			</div>
		{:else if totalNotes === 0 && totalBookmarks === 0}
			<div class="p-4 text-center text-sm text-gray-500 dark:text-gray-400">
				{searchQuery ? 'No results found' : 'No notes or bookmarks yet'}
			</div>
		{:else}
			<div class="divide-y divide-gray-200 dark:divide-gray-700">
				<!-- Notes Section -->
				{#if showNotes && filteredNotes.length > 0}
					{#each filteredNotes as note (note.id)}
						<div class="p-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
							<button
								onclick={() => toggleNote(note.id)}
								class="w-full text-left"
							>
								<div class="flex items-start gap-2">
									<div class="w-1 h-full {NOTE_COLORS[note.color || 'yellow'].bg} rounded-full mt-1"></div>
									<div class="flex-1 min-w-0">
										<div class="flex items-start justify-between gap-2 mb-1">
											<div class="flex items-center gap-2">
												<StickyNote size={14} class="text-gray-400 shrink-0" />
												{#if note.title}
													<h4 class="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
														{note.title}
													</h4>
												{/if}
											</div>
											<span class="text-xs text-gray-500 dark:text-gray-400 shrink-0">
												{formatDate(note.createdAt)}
											</span>
										</div>
										
										<p class="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">
											{expandedNotes.has(note.id) ? note.content : truncate(note.content, 100)}
										</p>
										
										{#if note.tags && note.tags.length > 0}
											<div class="flex flex-wrap gap-1 mt-2">
												{#each note.tags as tag (tag)}
													<span class="px-2 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded">
														{tag}
													</span>
												{/each}
											</div>
										{/if}
										
										{#if note.anchorText}
											<p class="text-xs text-gray-500 dark:text-gray-400 italic mt-1 truncate">
												📍 {note.anchorText}
											</p>
										{/if}
									</div>
								</div>
							</button>
							
							<!-- Actions -->
							<div class="flex gap-2 mt-2 ml-3">
								<button
									onclick={() => handleJumpToNote(note)}
									class="text-xs text-blue-600 dark:text-blue-400 hover:underline"
								>
									Jump to section
								</button>
								{#if onEditNote}
									<button
										onclick={(e) => {
											e.stopPropagation()
											onEditNote(note)
										}}
										class="text-xs text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
									>
										Edit
									</button>
								{/if}
								<button
									onclick={(e) => handleDeleteNote(note.id, e)}
									class="text-xs text-red-600 dark:text-red-400 hover:underline"
								>
									Delete
								</button>
							</div>
						</div>
					{/each}
				{/if}
				
				<!-- Bookmarks Section -->
				{#if showBookmarks && filteredBookmarks.length > 0}
					{#each filteredBookmarks as bookmark (bookmark.id)}
						<div class="p-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
							<button
								onclick={() => handleJumpToBookmark(bookmark)}
								class="w-full text-left"
							>
								<div class="flex items-start gap-2">
									<div class="w-1 h-full {NOTE_COLORS[bookmark.color || 'yellow'].bg} rounded-full mt-1"></div>
									<div class="flex-1 min-w-0">
										<div class="flex items-start justify-between gap-2 mb-1">
											<div class="flex items-center gap-2">
												<BookmarkIcon size={14} class="text-gray-400 shrink-0" />
												<h4 class="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
													{bookmark.label || 'Bookmark'}
												</h4>
											</div>
											<span class="text-xs text-gray-500 dark:text-gray-400 shrink-0">
												{formatDate(bookmark.createdAt)}
											</span>
										</div>
										
										{#if bookmark.anchorText}
											<p class="text-xs text-gray-600 dark:text-gray-400 truncate">
												📍 {bookmark.anchorText}
											</p>
										{/if}
									</div>
								</div>
							</button>
							
							<!-- Actions -->
							<div class="flex gap-2 mt-2 ml-3">
								<button
									onclick={(e) => handleDeleteBookmark(bookmark.id, e)}
									class="text-xs text-red-600 dark:text-red-400 hover:underline"
								>
									Delete
								</button>
							</div>
						</div>
					{/each}
				{/if}
			</div>
		{/if}
	</div>
</div>

<style>
	.notes-panel {
		font-size: 14px;
	}
	
	.line-clamp-2 {
		display: -webkit-box;
		-webkit-line-clamp: 2;
		line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}
</style>
