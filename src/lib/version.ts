/**
 * Version and build information utilities
 * Provides version, build ID, and environment details for the application
 */

// Get version from package.json (Vite supports JSON imports)
import pkg from '../../package.json'

export const VERSION = pkg.version || 'unknown'

// Build ID from environment variable (set during build)
// Falls back to 'dev' for local development
export const BUILD_ID = import.meta.env.VITE_BUILD_ID || 'dev'

// Build date from environment variable
export const BUILD_DATE = import.meta.env.VITE_BUILD_DATE || new Date().toISOString()

// Current environment (development, production, etc.)
export const ENVIRONMENT = import.meta.env.MODE || 'development'

/**
 * Get all version information as an object
 */
export function getVersionInfo() {
	return {
		version: VERSION,
		buildId: BUILD_ID,
		buildDate: BUILD_DATE,
		environment: ENVIRONMENT
	}
}

/**
 * Format build ID for display (truncate if git hash)
 */
export function formatBuildId(id: string = BUILD_ID): string {
	if (id === 'dev') return id
	// If it looks like a git hash, show first 7 characters
	if (id.length > 10) return id.substring(0, 7)
	return id
}
