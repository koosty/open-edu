// Unit tests for notes service
// Tests note CRUD operations, bookmarks, and synchronization

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NotesService } from './notes'
import type { CreateNoteInput, CreateBookmarkInput, NoteFilters } from '$lib/types/notes'

// Mock Firebase Firestore
vi.mock('$lib/firebase', () => ({
	db: {}
}))

vi.mock('firebase/firestore', () => ({
	collection: vi.fn((db, name) => ({ _collection: name })),
	doc: vi.fn((db, collection, id) => ({ _id: id, _collection: collection })),
	getDoc: vi.fn(),
	getDocs: vi.fn(),
	addDoc: vi.fn(),
	updateDoc: vi.fn(),
	deleteDoc: vi.fn(),
	query: vi.fn((...args) => ({ _query: args })),
	where: vi.fn((field, op, value) => ({ _where: { field, op, value } })),
	orderBy: vi.fn((field, direction) => ({ _orderBy: { field, direction } })),
	limit: vi.fn((n) => ({ _limit: n })),
	startAfter: vi.fn(),
	serverTimestamp: vi.fn(() => ({ _serverTimestamp: true }))
}))

describe('NotesService - Create Operations', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})
	
	it('should create a new note with required fields', async () => {
		const { addDoc } = await import('firebase/firestore')
		vi.mocked(addDoc).mockResolvedValue({ id: 'note-123' } as any)
		
		const input: CreateNoteInput = {
			userId: 'user-1',
			courseId: 'course-1',
			lessonId: 'lesson-1',
			content: 'This is my note',
			title: 'Important Note',
			isPrivate: true
		}
		
		const noteId = await NotesService.createNote(input)
		
		expect(noteId).toBe('note-123')
		expect(addDoc).toHaveBeenCalled()
	})
	
	it('should handle create note errors', async () => {
		const { addDoc } = await import('firebase/firestore')
		vi.mocked(addDoc).mockRejectedValue(new Error('Firestore error'))
		
		const input: CreateNoteInput = {
			userId: 'user-1',
			courseId: 'course-1',
			lessonId: 'lesson-1',
			content: 'Test note'
		}
		
		await expect(NotesService.createNote(input)).rejects.toThrow('Failed to create note')
	})
})

describe('NotesService - Read Operations', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})
	
	it('should get a note by ID', async () => {
		const { getDoc } = await import('firebase/firestore')
		vi.mocked(getDoc).mockResolvedValue({
			exists: () => true,
			id: 'note-123',
			data: () => ({
				userId: 'user-1',
				courseId: 'course-1',
				lessonId: 'lesson-1',
				content: 'My note content',
				title: 'Test Note',
				isPrivate: true
			})
		} as any)
		
		const note = await NotesService.getNote('note-123')
		
		expect(note).toBeDefined()
		expect(note?.id).toBe('note-123')
		expect(note?.content).toBe('My note content')
	})
	
	it('should return null for non-existent note', async () => {
		const { getDoc } = await import('firebase/firestore')
		vi.mocked(getDoc).mockResolvedValue({
			exists: () => false
		} as any)
		
		const note = await NotesService.getNote('nonexistent')
		
		expect(note).toBeNull()
	})
	
	it('should handle get note errors', async () => {
		const { getDoc } = await import('firebase/firestore')
		vi.mocked(getDoc).mockRejectedValue(new Error('Firestore error'))
		
		await expect(NotesService.getNote('note-123')).rejects.toThrow('Failed to get note')
	})
})

describe('NotesService - Update Operations', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})
	
	it('should update a note', async () => {
		const { updateDoc } = await import('firebase/firestore')
		vi.mocked(updateDoc).mockResolvedValue(undefined)
		
		await NotesService.updateNote('note-123', {
			content: 'Updated content',
			title: 'Updated Title'
		})
		
		expect(updateDoc).toHaveBeenCalled()
	})
	
	it('should handle update note errors', async () => {
		const { updateDoc } = await import('firebase/firestore')
		vi.mocked(updateDoc).mockRejectedValue(new Error('Firestore error'))
		
		await expect(
			NotesService.updateNote('note-123', { content: 'New content' })
		).rejects.toThrow('Failed to update note')
	})
})

describe('NotesService - Delete Operations', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})
	
	it('should delete a note', async () => {
		const { deleteDoc } = await import('firebase/firestore')
		vi.mocked(deleteDoc).mockResolvedValue(undefined)
		
		await NotesService.deleteNote('note-123')
		
		expect(deleteDoc).toHaveBeenCalled()
	})
	
	it('should handle delete note errors', async () => {
		const { deleteDoc } = await import('firebase/firestore')
		vi.mocked(deleteDoc).mockRejectedValue(new Error('Firestore error'))
		
		await expect(NotesService.deleteNote('note-123')).rejects.toThrow('Failed to delete note')
	})
})

describe('NotesService - Bookmarks', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})
	
	it('should create a bookmark', async () => {
		const { addDoc } = await import('firebase/firestore')
		vi.mocked(addDoc).mockResolvedValue({ id: 'bookmark-123' } as any)
		
		const input: CreateBookmarkInput = {
			userId: 'user-1',
			courseId: 'course-1',
			lessonId: 'lesson-1'
		}
		
		const bookmarkId = await NotesService.createBookmark(input)
		
		expect(bookmarkId).toBe('bookmark-123')
		expect(addDoc).toHaveBeenCalled()
	})
	
	it('should get bookmarks for a lesson', async () => {
		const { getDocs } = await import('firebase/firestore')
		
		const mockDocs = [
			{
				id: 'bookmark-1',
				data: () => ({
					userId: 'user-1',
					courseId: 'course-1',
					lessonId: 'lesson-1',
					label: 'Important section'
				})
			},
			{
				id: 'bookmark-2',
				data: () => ({
					userId: 'user-1',
					courseId: 'course-1',
					lessonId: 'lesson-1',
					label: 'Another bookmark'
				})
			}
		]
		
		vi.mocked(getDocs).mockResolvedValue({
			docs: mockDocs,
			forEach: (callback: any) => mockDocs.forEach(callback)
		} as any)
		
		const bookmarks = await NotesService.getLessonBookmarks('user-1', 'course-1', 'lesson-1')
		
		expect(bookmarks).toHaveLength(2)
		expect(bookmarks[0].id).toBe('bookmark-1')
	})
	
	it('should delete a bookmark', async () => {
		const { deleteDoc } = await import('firebase/firestore')
		vi.mocked(deleteDoc).mockResolvedValue(undefined)
		
		await NotesService.deleteBookmark('bookmark-123')
		
		expect(deleteDoc).toHaveBeenCalled()
	})
})

describe('NotesService - Query Filters', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})
	
	it('should apply course filter', async () => {
		const { getDocs } = await import('firebase/firestore')
		vi.mocked(getDocs).mockResolvedValue({ docs: [] } as any)
		
		const filters: NoteFilters = {
			courseId: 'course-1'
		}
		
		await NotesService.getNotes('user-1', filters)
		
		// Verify query was called (implementation detail)
		expect(getDocs).toHaveBeenCalled()
	})
	
	it('should apply lesson filter', async () => {
		const { getDocs } = await import('firebase/firestore')
		vi.mocked(getDocs).mockResolvedValue({ docs: [] } as any)
		
		const filters: NoteFilters = {
			lessonId: 'lesson-1'
		}
		
		await NotesService.getNotes('user-1', filters)
		
		expect(getDocs).toHaveBeenCalled()
	})
	
	it('should apply color filter', async () => {
		const { getDocs } = await import('firebase/firestore')
		vi.mocked(getDocs).mockResolvedValue({ docs: [] } as any)
		
		const filters: NoteFilters = {
			color: 'yellow'
		}
		
		await NotesService.getNotes('user-1', filters)
		
		expect(getDocs).toHaveBeenCalled()
	})
	
	it('should apply tags filter', async () => {
		const { getDocs } = await import('firebase/firestore')
		vi.mocked(getDocs).mockResolvedValue({ docs: [] } as any)
		
		const filters: NoteFilters = {
			tags: ['important', 'review']
		}
		
		await NotesService.getNotes('user-1', filters)
		
		expect(getDocs).toHaveBeenCalled()
	})
})

describe('NotesService - Search', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})
	
	it('should search notes by query', async () => {
		const { getDocs } = await import('firebase/firestore')
		vi.mocked(getDocs).mockResolvedValue({
			docs: [
				{
					id: 'note-1',
					data: () => ({
						userId: 'user-1',
						content: 'This contains the search term',
						title: 'Search Test'
					})
				}
			]
		} as any)
		
		const results = await NotesService.getNotes('user-1', { searchQuery: 'search' })
		
		// Note: Client-side filtering in real implementation
		expect(results).toBeDefined()
		expect(results.notes).toBeDefined()
	})
})

describe('NotesService - Lesson-Specific Queries', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})
	
	it('should get notes for a specific lesson', async () => {
		const { getDocs } = await import('firebase/firestore')
		vi.mocked(getDocs).mockResolvedValue({
			docs: [
				{ id: 'note-1', data: () => ({ isPrivate: true, content: 'Note 1', position: 0 }) },
				{ id: 'note-2', data: () => ({ isPrivate: false, content: 'Note 2', position: 100 }) }
			]
		} as any)
		
		const notes = await NotesService.getLessonNotes('user-1', 'course-1', 'lesson-1')
		
		expect(notes).toBeDefined()
		expect(Array.isArray(notes)).toBe(true)
	})
	
	it('should get bookmarks for a specific lesson', async () => {
		const { getDocs } = await import('firebase/firestore')
		
		const mockDocs = [
			{ id: 'bookmark-1', data: () => ({ label: 'Mark 1' }) },
			{ id: 'bookmark-2', data: () => ({ label: 'Mark 2' }) }
		]
		
		vi.mocked(getDocs).mockResolvedValue({
			docs: mockDocs,
			forEach: (callback: any) => mockDocs.forEach(callback)
		} as any)
		
		const bookmarks = await NotesService.getLessonBookmarks('user-1', 'course-1', 'lesson-1')
		
		expect(Array.isArray(bookmarks)).toBe(true)
	})
})

describe('NotesService - Error Handling', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})
	
	it('should handle network errors gracefully', async () => {
		const { getDocs } = await import('firebase/firestore')
		vi.mocked(getDocs).mockRejectedValue(new Error('Network error'))
		
		await expect(NotesService.getNotes('user-1')).rejects.toThrow()
	})
	
	it('should handle permission errors', async () => {
		const { addDoc } = await import('firebase/firestore')
		vi.mocked(addDoc).mockRejectedValue(new Error('Permission denied'))
		
		const input: CreateNoteInput = {
			userId: 'user-1',
			courseId: 'course-1',
			lessonId: 'lesson-1',
			content: 'Test'
		}
		
		await expect(NotesService.createNote(input)).rejects.toThrow('Failed to create note')
	})
})
