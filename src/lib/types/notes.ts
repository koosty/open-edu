/**
 * Note-Taking System Types
 * 
 * Defines data structures for user notes, bookmarks, and highlights
 * within lesson content.
 */

import type { Timestamp } from 'firebase/firestore'

/**
 * Note attached to a specific position in lesson content
 */
export interface Note {
	id: string
	userId: string
	courseId: string
	lessonId: string
	
	// Content
	content: string
	title?: string
	
	// Position in content
	headingId?: string // ID of nearest heading
	anchorText?: string // Text snippet for context
	position: number // Character position or scroll percentage
	
	// Metadata
	createdAt: Timestamp
	updatedAt: Timestamp
	
	// Organization
	tags?: string[]
	color?: NoteColor
	isPrivate: boolean
	
	// Related content
	attachments?: NoteAttachment[]
}

/**
 * Quick bookmark for easy navigation
 */
export interface Bookmark {
	id: string
	userId: string
	courseId: string
	lessonId: string
	
	// Position
	headingId?: string
	anchorText?: string
	position: number
	
	// Optional label
	label?: string
	
	// Metadata
	createdAt: Timestamp
	
	// Quick access color
	color?: NoteColor
}

/**
 * Text highlight with optional annotation
 */
export interface Highlight {
	id: string
	userId: string
	courseId: string
	lessonId: string
	
	// Highlighted text
	text: string
	startOffset: number
	endOffset: number
	
	// Optional note
	note?: string
	
	// Style
	color: NoteColor
	
	// Metadata
	createdAt: Timestamp
	updatedAt?: Timestamp
}

/**
 * Attachment linked to a note
 */
export interface NoteAttachment {
	id: string
	type: 'image' | 'link' | 'file'
	url: string
	name: string
	size?: number // in bytes
}

/**
 * Color options for notes, bookmarks, and highlights
 */
export type NoteColor = 
	| 'yellow'
	| 'green'
	| 'blue'
	| 'purple'
	| 'pink'
	| 'orange'
	| 'red'
	| 'gray'

/**
 * Note filter options
 */
export interface NoteFilters {
	courseId?: string
	lessonId?: string
	tags?: string[]
	color?: NoteColor
	searchQuery?: string
	startDate?: Date
	endDate?: Date
}

/**
 * Note sort options
 */
export type NoteSortBy = 
	| 'createdAt'
	| 'updatedAt'
	| 'position'
	| 'title'

export type NoteSortOrder = 'asc' | 'desc'

/**
 * Paginated notes result
 */
export interface NotesResult {
	notes: Note[]
	total: number
	hasMore: boolean
	nextCursor?: string
}

/**
 * Note creation input (without generated fields)
 */
export type CreateNoteInput = Omit<Note, 'id' | 'createdAt' | 'updatedAt'>

/**
 * Note update input (partial fields)
 */
export type UpdateNoteInput = Partial<Omit<Note, 'id' | 'userId' | 'courseId' | 'lessonId' | 'createdAt'>>

/**
 * Bookmark creation input
 */
export type CreateBookmarkInput = Omit<Bookmark, 'id' | 'createdAt'>

/**
 * Highlight creation input
 */
export type CreateHighlightInput = Omit<Highlight, 'id' | 'createdAt'>

/**
 * Highlight update input
 */
export type UpdateHighlightInput = Partial<Omit<Highlight, 'id' | 'userId' | 'courseId' | 'lessonId' | 'createdAt'>>

/**
 * Note statistics for a user
 */
export interface NoteStats {
	totalNotes: number
	totalBookmarks: number
	totalHighlights: number
	notesByCourse: Record<string, number>
	notesByTag: Record<string, number>
	recentActivity: Array<{
		type: 'note' | 'bookmark' | 'highlight'
		id: string
		timestamp: Timestamp
	}>
}

/**
 * Color theme mapping for UI
 */
export const NOTE_COLORS: Record<NoteColor, { bg: string; border: string; text: string }> = {
	yellow: {
		bg: 'bg-yellow-50 dark:bg-yellow-900/20',
		border: 'border-yellow-300 dark:border-yellow-700',
		text: 'text-yellow-900 dark:text-yellow-100'
	},
	green: {
		bg: 'bg-green-50 dark:bg-green-900/20',
		border: 'border-green-300 dark:border-green-700',
		text: 'text-green-900 dark:text-green-100'
	},
	blue: {
		bg: 'bg-blue-50 dark:bg-blue-900/20',
		border: 'border-blue-300 dark:border-blue-700',
		text: 'text-blue-900 dark:text-blue-100'
	},
	purple: {
		bg: 'bg-purple-50 dark:bg-purple-900/20',
		border: 'border-purple-300 dark:border-purple-700',
		text: 'text-purple-900 dark:text-purple-100'
	},
	pink: {
		bg: 'bg-pink-50 dark:bg-pink-900/20',
		border: 'border-pink-300 dark:border-pink-700',
		text: 'text-pink-900 dark:text-pink-100'
	},
	orange: {
		bg: 'bg-orange-50 dark:bg-orange-900/20',
		border: 'border-orange-300 dark:border-orange-700',
		text: 'text-orange-900 dark:text-orange-100'
	},
	red: {
		bg: 'bg-red-50 dark:bg-red-900/20',
		border: 'border-red-300 dark:border-red-700',
		text: 'text-red-900 dark:text-red-100'
	},
	gray: {
		bg: 'bg-gray-50 dark:bg-gray-900/20',
		border: 'border-gray-300 dark:border-gray-700',
		text: 'text-gray-900 dark:text-gray-100'
	}
}
