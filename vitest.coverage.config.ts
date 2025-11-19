import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vitest/config';
import { sveltekit } from '@sveltejs/kit/vite';

// Special coverage-only configuration for CI/CD pipelines
// This config avoids SSR conflicts by simplifying the test setup
export default defineConfig({
	plugins: [
		tailwindcss(), 
		sveltekit()
		// Codecov plugin disabled in coverage mode to prevent conflicts
	],
	test: {
		expect: { requireAssertions: true },
		testTimeout: 60000, // Increased timeout for coverage analysis
		hookTimeout: 20000, 
		// Single-project mode to avoid SSR conflicts
		environment: 'node',
		include: ['src/**/*.{test,spec}.{js,ts}'],
		exclude: [
			'src/**/*.svelte.{test,spec}.{js,ts}',
			'src/lib/server/**',
			'src/routes/**',  // Exclude SSR routes
			'node_modules/',
			'static/',
			'scripts/',
			'build/',
			'dist/'
		],
		coverage: {
			enabled: true,
			provider: 'v8',
			reporter: ['text', 'json', 'html', 'lcov'],
			exclude: [
				'node_modules/',
				'src/test/',
				'**/*.config.{js,ts}',
				'**/*.spec.{js,ts}',
				'**/*.svelte.spec.{js,ts}',
				'static/',
				'scripts/',
				'.env.*',
				'build/',
				'dist/',
				'sample-templates/',
				'roadmap/',
				'coverage/',
				'src/routes/**',  // Exclude SSR routes
				'src/**/*.svelte',  // Exclude Svelte components
				'src/lib/server/**'  // Exclude server-only code
			],
			include: [
				'src/lib/**/*.{js,ts}'
			],
			// Coverage thresholds for service layer
			/*thresholds: {
				lines: 85,
				functions: 90,
				branches: 80,
				statements: 85
			}*/
		}
	}
});