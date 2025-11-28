/**
 * Error Handling Utilities
 * Type-safe error handling helpers for Open-EDU
 */

// Track which deprecation warnings have been shown (to avoid spam)
const shownDeprecationWarnings = new Set<string>()

/**
 * Log a deprecation warning (only once per key)
 * Used during v1.6.0 migration to warn about legacy `course.lessons` usage
 * @param key - Unique identifier for this warning (shown only once)
 * @param message - The deprecation message
 */
export function deprecationWarning(key: string, message: string): void {
	if (shownDeprecationWarnings.has(key)) return
	shownDeprecationWarnings.add(key)
	console.warn(`[DEPRECATED] ${message}`)
}

/**
 * @deprecated Use LessonService.getLessonsByCourse() instead
 * Warn when accessing course.lessons array (v1.6.0 migration)
 */
export function warnLegacyLessonsAccess(source: string): void {
	deprecationWarning(
		`lessons-array-${source}`,
		`Accessing course.lessons array from "${source}". ` +
		`Use LessonService.getLessonsByCourse() instead. ` +
		`The course.lessons array will be removed in v2.0.0.`
	)
}

/**
 * Extract error message from unknown error type
 */
export function getErrorMessage(error: unknown): string {
	if (error instanceof Error) {
		return error.message
	}
	if (typeof error === 'string') {
		return error
	}
	if (error && typeof error === 'object' && 'message' in error) {
		return String(error.message)
	}
	return 'An unknown error occurred'
}

/**
 * Check if error is a Firebase error
 */
export function isFirebaseError(error: unknown): error is { code: string; message: string } {
	return (
		error !== null &&
		typeof error === 'object' &&
		'code' in error &&
		'message' in error
	)
}

/**
 * Get user-friendly error message for Firebase errors
 */
export function getFirebaseErrorMessage(error: unknown): string {
	if (!isFirebaseError(error)) {
		return getErrorMessage(error)
	}

	// Map common Firebase error codes to user-friendly messages
	const errorMessages: Record<string, string> = {
		'auth/user-not-found': 'No account found with this email',
		'auth/wrong-password': 'Incorrect password',
		'auth/invalid-email': 'Invalid email address',
		'auth/email-already-in-use': 'An account with this email already exists',
		'auth/weak-password': 'Password should be at least 6 characters',
		'auth/network-request-failed': 'Network error. Please check your connection',
		'permission-denied': 'You do not have permission to perform this action',
		'not-found': 'The requested resource was not found',
		'already-exists': 'This resource already exists',
		'unavailable': 'Service temporarily unavailable. Please try again',
	}

	return errorMessages[error.code] || error.message
}
