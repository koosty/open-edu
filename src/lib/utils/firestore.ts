/**
 * Firestore Utilities
 * Helper functions for working with Firestore data
 */

/**
 * Type guard for objects with toDate method (Firestore Timestamp)
 */
export function hasToDate(value: unknown): value is { toDate: () => Date } {
	return (
		value !== null &&
		typeof value === 'object' &&
		'toDate' in value &&
		typeof value.toDate === 'function'
	)
}

/**
 * Convert Firestore Timestamps to ISO strings in an object
 * Recursively processes all properties of the object
 * 
 * @param data - Object containing potential Firestore Timestamp values
 * @returns Object with Timestamps converted to ISO string dates
 * 
 * @example
 * const doc = { createdAt: Timestamp, name: "John" }
 * const converted = convertTimestamps(doc)
 * // { createdAt: "2024-01-01T00:00:00.000Z", name: "John" }
 */
export function convertTimestamps<T extends Record<string, unknown>>(data: T): T {
	if (!data) return data

	const converted = { ...data } as Record<string, unknown>

	// Convert Firestore Timestamps to ISO strings
	Object.keys(converted).forEach((key) => {
		const value = converted[key]
		if (hasToDate(value)) {
			converted[key] = value.toDate().toISOString()
		}
	})

	return converted as T
}
