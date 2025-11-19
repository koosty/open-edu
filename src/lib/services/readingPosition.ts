/**
 * Reading Position Service
 * 
 * Auto-saves and restores reading position for lessons.
 * Integrates with ReadingProgressTracker to persist scroll position and state.
 */

import { db } from '$lib/firebase'
import { collection, doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore'
import type { ReadingProgressState } from './readingProgress'

export interface ReadingPosition {
	userId: string
	courseId: string
	lessonId: string
	scrollPercentage: number
	scrollTop: number
	activeHeadingId: string | null
	sectionsCompleted: string[]
	timeSpent: number
	lastPosition: number // Character position in content
	updatedAt: Date
}

export interface SavePositionOptions {
	debounceMs?: number // Debounce save operations (default: 2000ms)
	minProgressDelta?: number // Minimum scroll % change to trigger save (default: 5)
}

/**
 * Auto-save manager for reading position
 */
export class ReadingPositionManager {
	private userId: string
	private courseId: string
	private lessonId: string
	private options: SavePositionOptions
	private saveTimer: ReturnType<typeof setTimeout> | null = null
	private lastSavedProgress: number = 0
	private isSaving: boolean = false

	constructor(
		userId: string,
		courseId: string,
		lessonId: string,
		options: SavePositionOptions = {}
	) {
		this.userId = userId
		this.courseId = courseId
		this.lessonId = lessonId
		this.options = {
			debounceMs: 2000,
			minProgressDelta: 5,
			...options
		}
	}

	/**
	 * Schedule a save operation (debounced)
	 */
	scheduleSave(progressState: ReadingProgressState): void {
		// Check if progress has changed enough to warrant a save
		const progressDelta = Math.abs(progressState.scrollPercentage - this.lastSavedProgress)
		if (progressDelta < this.options.minProgressDelta! && this.lastSavedProgress > 0) {
			return
		}

		// Clear existing timer
		if (this.saveTimer) {
			clearTimeout(this.saveTimer)
		}

		// Schedule new save
		this.saveTimer = setTimeout(() => {
			this.save(progressState)
		}, this.options.debounceMs)
	}

	/**
	 * Immediately save reading position
	 */
	async save(progressState: ReadingProgressState): Promise<void> {
		if (this.isSaving) return

		this.isSaving = true

		try {
			const position: Omit<ReadingPosition, 'updatedAt'> = {
				userId: this.userId,
				courseId: this.courseId,
				lessonId: this.lessonId,
				scrollPercentage: progressState.scrollPercentage,
				scrollTop: progressState.scrollTop,
				activeHeadingId: progressState.activeHeadingId,
				sectionsCompleted: progressState.sectionsCompleted,
				timeSpent: progressState.timeSpent,
				lastPosition: progressState.scrollTop
			}

			await saveReadingPosition(position)
			this.lastSavedProgress = progressState.scrollPercentage

		} catch (error) {
			console.error('Error saving reading position:', error)
		} finally {
			this.isSaving = false
		}
	}

	/**
	 * Cancel pending save operations
	 */
	cancel(): void {
		if (this.saveTimer) {
			clearTimeout(this.saveTimer)
			this.saveTimer = null
		}
	}

	/**
	 * Force save immediately and cancel pending operations
	 */
	async flush(progressState: ReadingProgressState): Promise<void> {
		this.cancel()
		await this.save(progressState)
	}
}

/**
 * Save reading position to Firestore
 */
export async function saveReadingPosition(
	position: Omit<ReadingPosition, 'updatedAt'>
): Promise<void> {
	const positionId = `${position.userId}_${position.lessonId}`
	const positionRef = doc(collection(db, 'readingPositions'), positionId)

	await setDoc(
		positionRef,
		{
			...position,
			updatedAt: serverTimestamp()
		},
		{ merge: true }
	)
}

/**
 * Load saved reading position from Firestore
 */
export async function loadReadingPosition(
	userId: string,
	lessonId: string
): Promise<ReadingPosition | null> {
	try {
		const positionId = `${userId}_${lessonId}`
		const positionRef = doc(collection(db, 'readingPositions'), positionId)
		const positionSnap = await getDoc(positionRef)

		if (!positionSnap.exists()) {
			return null
		}

		const data = positionSnap.data()
		return {
			userId: data.userId,
			courseId: data.courseId,
			lessonId: data.lessonId,
			scrollPercentage: data.scrollPercentage || 0,
			scrollTop: data.scrollTop || 0,
			activeHeadingId: data.activeHeadingId || null,
			sectionsCompleted: data.sectionsCompleted || [],
			timeSpent: data.timeSpent || 0,
			lastPosition: data.lastPosition || 0,
			updatedAt: data.updatedAt?.toDate() || new Date()
		}
	} catch (error) {
		console.error('Error loading reading position:', error)
		return null
	}
}

/**
 * Restore scroll position in the browser
 * @param scrollTop The scroll position to restore
 * @param smooth Whether to use smooth scrolling (default: true)
 */
export function restoreScrollPosition(scrollTop: number, smooth: boolean = true): void {
	if (typeof window === 'undefined') return

	// Wait for content to load before scrolling
	setTimeout(() => {
		window.scrollTo({
			top: scrollTop,
			behavior: smooth ? 'smooth' : 'auto'
		})
	}, 100)
}

/**
 * Delete reading position (e.g., when lesson is completed)
 */
export async function deleteReadingPosition(userId: string, lessonId: string): Promise<void> {
	try {
		const positionId = `${userId}_${lessonId}`
		const positionRef = doc(collection(db, 'readingPositions'), positionId)
		await setDoc(positionRef, { deleted: true, deletedAt: serverTimestamp() }, { merge: true })
	} catch (error) {
		console.error('Error deleting reading position:', error)
	}
}

/**
 * Check if a reading position should be restored
 * Returns false if position is too old or near completion
 */
export function shouldRestorePosition(position: ReadingPosition | null): boolean {
	if (!position) return false

	// Don't restore if already near the end (>90%)
	if (position.scrollPercentage > 90) return false

	// Don't restore if position is too old (>7 days)
	const daysSinceUpdate = (Date.now() - position.updatedAt.getTime()) / (1000 * 60 * 60 * 24)
	if (daysSinceUpdate > 7) return false

	return true
}
