/**
 * Notes Service
 * 
 * Manages user notes, bookmarks, and highlights with Firebase Firestore integration.
 */

import {
	collection,
	doc,
	getDoc,
	getDocs,
	addDoc,
	updateDoc,
	deleteDoc,
	query,
	where,
	orderBy,
	limit,
	startAfter,
	type QueryConstraint,
	serverTimestamp,
	type DocumentSnapshot
} from 'firebase/firestore'
import { db } from '$lib/firebase'
import type {
	Note,
	Bookmark,
	Highlight,
	CreateNoteInput,
	UpdateNoteInput,
	CreateBookmarkInput,
	CreateHighlightInput,
	UpdateHighlightInput,
	NoteFilters,
	NoteSortBy,
	NoteSortOrder,
	NotesResult,
	NoteStats
} from '$lib/types/notes'

// Collection names
const NOTES_COLLECTION = 'notes'
const BOOKMARKS_COLLECTION = 'bookmarks'
const HIGHLIGHTS_COLLECTION = 'highlights'

/**
 * Notes Service Class
 */
export class NotesService {
	/**
	 * Create a new note
	 */
	static async createNote(input: CreateNoteInput): Promise<string> {
		try {
			const noteData = {
				...input,
				createdAt: serverTimestamp(),
				updatedAt: serverTimestamp()
			}

			const docRef = await addDoc(collection(db, NOTES_COLLECTION), noteData)
			return docRef.id
		} catch (error) {
			console.error('Error creating note:', error)
			throw new Error('Failed to create note')
		}
	}

	/**
	 * Get a note by ID
	 */
	static async getNote(noteId: string): Promise<Note | null> {
		try {
			const docRef = doc(db, NOTES_COLLECTION, noteId)
			const docSnap = await getDoc(docRef)

			if (!docSnap.exists()) {
				return null
			}

			return {
				id: docSnap.id,
				...docSnap.data()
			} as Note
		} catch (error) {
			console.error('Error getting note:', error)
			throw new Error('Failed to get note')
		}
	}

	/**
	 * Update a note
	 */
	static async updateNote(noteId: string, input: UpdateNoteInput): Promise<void> {
		try {
			const docRef = doc(db, NOTES_COLLECTION, noteId)
			await updateDoc(docRef, {
				...input,
				updatedAt: serverTimestamp()
			})
		} catch (error) {
			console.error('Error updating note:', error)
			throw new Error('Failed to update note')
		}
	}

	/**
	 * Delete a note
	 */
	static async deleteNote(noteId: string): Promise<void> {
		try {
			const docRef = doc(db, NOTES_COLLECTION, noteId)
			await deleteDoc(docRef)
		} catch (error) {
			console.error('Error deleting note:', error)
			throw new Error('Failed to delete note')
		}
	}

	/**
	 * Get notes with filters and pagination
	 */
	static async getNotes(
		userId: string,
		filters: NoteFilters = {},
		sortBy: NoteSortBy = 'createdAt',
		sortOrder: NoteSortOrder = 'desc',
		pageSize: number = 20,
		lastDoc?: DocumentSnapshot
	): Promise<NotesResult> {
		try {
			const constraints: QueryConstraint[] = [
				where('userId', '==', userId)
			]

			// Apply filters
			if (filters.courseId) {
				constraints.push(where('courseId', '==', filters.courseId))
			}
			if (filters.lessonId) {
				constraints.push(where('lessonId', '==', filters.lessonId))
			}
			if (filters.tags && filters.tags.length > 0) {
				constraints.push(where('tags', 'array-contains-any', filters.tags))
			}
			if (filters.color) {
				constraints.push(where('color', '==', filters.color))
			}

			// Apply sorting
			constraints.push(orderBy(sortBy, sortOrder))
			constraints.push(limit(pageSize + 1)) // Fetch one extra to check if there are more

			// Apply pagination
			if (lastDoc) {
				constraints.push(startAfter(lastDoc))
			}

			const q = query(collection(db, NOTES_COLLECTION), ...constraints)
			const snapshot = await getDocs(q)

			const notes: Note[] = []
			const docs = snapshot.docs

			// Check if there are more results
			const hasMore = docs.length > pageSize
			const resultsToReturn = hasMore ? docs.slice(0, pageSize) : docs

			for (const docSnap of resultsToReturn) {
				notes.push({
					id: docSnap.id,
					...docSnap.data()
				} as Note)
			}

			// Apply search filter (client-side for now)
			let filteredNotes = notes
			if (filters.searchQuery) {
				const searchLower = filters.searchQuery.toLowerCase()
				filteredNotes = notes.filter(
					(note) =>
						note.content.toLowerCase().includes(searchLower) ||
						note.title?.toLowerCase().includes(searchLower)
				)
			}

			return {
				notes: filteredNotes,
				total: filteredNotes.length,
				hasMore,
				nextCursor: hasMore ? docs[pageSize - 1].id : undefined
			}
		} catch (error) {
			console.error('Error getting notes:', error)
			throw new Error('Failed to get notes')
		}
	}

	/**
	 * Get notes for a specific lesson
	 */
	static async getLessonNotes(
		userId: string,
		courseId: string,
		lessonId: string
	): Promise<Note[]> {
		const result = await this.getNotes(
			userId,
			{ courseId, lessonId },
			'position',
			'asc',
			100
		)
		return result.notes
	}

	// --- Bookmark Methods ---

	/**
	 * Create a new bookmark
	 */
	static async createBookmark(input: CreateBookmarkInput): Promise<string> {
		try {
			const bookmarkData = {
				...input,
				createdAt: serverTimestamp()
			}

			const docRef = await addDoc(collection(db, BOOKMARKS_COLLECTION), bookmarkData)
			return docRef.id
		} catch (error) {
			console.error('Error creating bookmark:', error)
			throw new Error('Failed to create bookmark')
		}
	}

	/**
	 * Get bookmarks for a lesson
	 */
	static async getLessonBookmarks(
		userId: string,
		courseId: string,
		lessonId: string
	): Promise<Bookmark[]> {
		try {
			const q = query(
				collection(db, BOOKMARKS_COLLECTION),
				where('userId', '==', userId),
				where('courseId', '==', courseId),
				where('lessonId', '==', lessonId),
				orderBy('position', 'asc')
			)

			const snapshot = await getDocs(q)
			const bookmarks: Bookmark[] = []

			snapshot.forEach((doc) => {
				bookmarks.push({
					id: doc.id,
					...doc.data()
				} as Bookmark)
			})

			return bookmarks
		} catch (error) {
			console.error('Error getting bookmarks:', error)
			throw new Error('Failed to get bookmarks')
		}
	}

	/**
	 * Delete a bookmark
	 */
	static async deleteBookmark(bookmarkId: string): Promise<void> {
		try {
			const docRef = doc(db, BOOKMARKS_COLLECTION, bookmarkId)
			await deleteDoc(docRef)
		} catch (error) {
			console.error('Error deleting bookmark:', error)
			throw new Error('Failed to delete bookmark')
		}
	}

	// --- Highlight Methods ---

	/**
	 * Create a new highlight
	 */
	static async createHighlight(input: CreateHighlightInput): Promise<string> {
		try {
			const highlightData = {
				...input,
				createdAt: serverTimestamp()
			}

			const docRef = await addDoc(collection(db, HIGHLIGHTS_COLLECTION), highlightData)
			return docRef.id
		} catch (error) {
			console.error('Error creating highlight:', error)
			throw new Error('Failed to create highlight')
		}
	}

	/**
	 * Update a highlight
	 */
	static async updateHighlight(highlightId: string, input: UpdateHighlightInput): Promise<void> {
		try {
			const docRef = doc(db, HIGHLIGHTS_COLLECTION, highlightId)
			await updateDoc(docRef, {
				...input,
				updatedAt: serverTimestamp()
			})
		} catch (error) {
			console.error('Error updating highlight:', error)
			throw new Error('Failed to update highlight')
		}
	}

	/**
	 * Get highlights for a lesson
	 */
	static async getLessonHighlights(
		userId: string,
		courseId: string,
		lessonId: string
	): Promise<Highlight[]> {
		try {
			const q = query(
				collection(db, HIGHLIGHTS_COLLECTION),
				where('userId', '==', userId),
				where('courseId', '==', courseId),
				where('lessonId', '==', lessonId),
				orderBy('startOffset', 'asc')
			)

			const snapshot = await getDocs(q)
			const highlights: Highlight[] = []

			snapshot.forEach((doc) => {
				highlights.push({
					id: doc.id,
					...doc.data()
				} as Highlight)
			})

			return highlights
		} catch (error) {
			console.error('Error getting highlights:', error)
			throw new Error('Failed to get highlights')
		}
	}

	/**
	 * Delete a highlight
	 */
	static async deleteHighlight(highlightId: string): Promise<void> {
		try {
			const docRef = doc(db, HIGHLIGHTS_COLLECTION, highlightId)
			await deleteDoc(docRef)
		} catch (error) {
			console.error('Error deleting highlight:', error)
			throw new Error('Failed to delete highlight')
		}
	}

	// --- Statistics Methods ---

	/**
	 * Get note statistics for a user
	 */
	static async getNoteStats(userId: string): Promise<NoteStats> {
		try {
			// Get all notes
			const notesQuery = query(
				collection(db, NOTES_COLLECTION),
				where('userId', '==', userId)
			)
			const notesSnapshot = await getDocs(notesQuery)

			// Get all bookmarks
			const bookmarksQuery = query(
				collection(db, BOOKMARKS_COLLECTION),
				where('userId', '==', userId)
			)
			const bookmarksSnapshot = await getDocs(bookmarksQuery)

			// Get all highlights
			const highlightsQuery = query(
				collection(db, HIGHLIGHTS_COLLECTION),
				where('userId', '==', userId)
			)
			const highlightsSnapshot = await getDocs(highlightsQuery)

			// Calculate stats
			const notesByCourse: Record<string, number> = {}
			const notesByTag: Record<string, number> = {}
			const recentActivity: NoteStats['recentActivity'] = []

			notesSnapshot.forEach((doc) => {
				const note = doc.data() as Note
				
				// Count by course
				notesByCourse[note.courseId] = (notesByCourse[note.courseId] || 0) + 1
				
				// Count by tags
				if (note.tags) {
					note.tags.forEach((tag) => {
						notesByTag[tag] = (notesByTag[tag] || 0) + 1
					})
				}
				
				// Add to recent activity
				recentActivity.push({
					type: 'note',
					id: doc.id,
					timestamp: note.createdAt
				})
			})

			// Add bookmarks to recent activity
			bookmarksSnapshot.forEach((doc) => {
				const bookmark = doc.data() as Bookmark
				recentActivity.push({
					type: 'bookmark',
					id: doc.id,
					timestamp: bookmark.createdAt
				})
			})

			// Add highlights to recent activity
			highlightsSnapshot.forEach((doc) => {
				const highlight = doc.data() as Highlight
				recentActivity.push({
					type: 'highlight',
					id: doc.id,
					timestamp: highlight.createdAt
				})
			})

			// Sort recent activity by timestamp (most recent first)
			recentActivity.sort((a, b) => {
				const aTime = a.timestamp.toMillis()
				const bTime = b.timestamp.toMillis()
				return bTime - aTime
			})

			return {
				totalNotes: notesSnapshot.size,
				totalBookmarks: bookmarksSnapshot.size,
				totalHighlights: highlightsSnapshot.size,
				notesByCourse,
				notesByTag,
				recentActivity: recentActivity.slice(0, 10) // Return last 10 activities
			}
		} catch (error) {
			console.error('Error getting note stats:', error)
			throw new Error('Failed to get note statistics')
		}
	}
}
