/**
 * Theme Management Utility
 * Handles theme switching and persistence for Open-EDU
 */

export type ThemeName = 'default' | 'academic' | 'warm'

export interface Theme {
	name: ThemeName
	label: string
	description: string
	colors: {
		primary: string
		secondary: string
		accent: string
	}
}

/**
 * Available themes
 */
export const themes: Record<ThemeName, Theme> = {
	default: {
		name: 'default',
		label: 'Progressive Education',
		description: 'Trust, intelligence, and professionalism',
		colors: {
			primary: '#2563eb', // Blue 600
			secondary: '#10b981', // Emerald 500
			accent: '#f59e0b' // Amber 500
		}
	},
	academic: {
		name: 'academic',
		label: 'Modern Academic',
		description: 'Creativity and deep thinking',
		colors: {
			primary: '#6366f1', // Indigo 500
			secondary: '#ec4899', // Pink 500
			accent: '#8b5cf6' // Violet 500
		}
	},
	warm: {
		name: 'warm',
		label: 'Warm Approachable',
		description: 'Openness and enthusiasm',
		colors: {
			primary: '#0ea5e9', // Sky 500
			secondary: '#f97316', // Orange 500
			accent: '#14b8a6' // Teal 500
		}
	}
}

const THEME_STORAGE_KEY = 'open-edu-theme'

/**
 * Get current theme from localStorage or default
 */
export function getCurrentTheme(): ThemeName {
	if (typeof window === 'undefined') {
		return 'default'
	}

	const stored = localStorage.getItem(THEME_STORAGE_KEY) as ThemeName | null
	return stored && stored in themes ? stored : 'default'
}

/**
 * Set theme and persist to localStorage
 */
export function setTheme(themeName: ThemeName): void {
	if (typeof window === 'undefined') {
		return
	}

	// Validate theme exists
	if (!(themeName in themes)) {
		console.warn(`Theme "${themeName}" not found, using default`)
		themeName = 'default'
	}

	// Apply theme to document
	if (themeName === 'default') {
		document.documentElement.removeAttribute('data-theme')
	} else {
		document.documentElement.setAttribute('data-theme', themeName)
	}

	// Persist to localStorage
	localStorage.setItem(THEME_STORAGE_KEY, themeName)

	// Dispatch custom event for components that need to react
	window.dispatchEvent(
		new CustomEvent('theme-change', {
			detail: { theme: themeName }
		})
	)
}

/**
 * Initialize theme on app load
 */
export function initTheme(): void {
	if (typeof window === 'undefined') {
		return
	}

	const currentTheme = getCurrentTheme()
	setTheme(currentTheme)
}

/**
 * Toggle between themes (cycles through all available themes)
 */
export function toggleTheme(): void {
	const current = getCurrentTheme()
	const themeNames: ThemeName[] = ['default', 'academic', 'warm']
	const currentIndex = themeNames.indexOf(current)
	const nextIndex = (currentIndex + 1) % themeNames.length
	setTheme(themeNames[nextIndex])
}

/**
 * Get all available themes as an array
 */
export function getAllThemes(): Theme[] {
	return Object.values(themes)
}
