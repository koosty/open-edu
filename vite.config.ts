import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vitest/config';
import { sveltekit } from '@sveltejs/kit/vite';
import { codecovSvelteKitPlugin } from '@codecov/sveltekit-plugin';

export default defineConfig({
	plugins: [
		tailwindcss(), 
		sveltekit(),
		// Add Codecov plugin for bundle analysis - disabled during testing
		...(process.env.NODE_ENV !== 'test' ? [codecovSvelteKitPlugin({
			enableBundleAnalysis: true,
			bundleName: 'open-edu-sveltekit',
			uploadToken: process.env.CODECOV_TOKEN,
			telemetry: false // Privacy-conscious default
		})] : [])
	],
	test: {
		expect: { requireAssertions: true },
		testTimeout: 30000, // 30 seconds timeout per test
		hookTimeout: 10000, // 10 seconds timeout for setup/teardown
		// Simplified single-project configuration to avoid SSR conflicts
		environment: 'node',
		include: ['src/**/*.{test,spec}.{js,ts}'],
		exclude: [
			'src/**/*.svelte.{test,spec}.{js,ts}',
			'src/lib/server/**',
			'node_modules/',
			'static/',
			'scripts/',
			'build/',
			'dist/'
		],
		coverage: {
			// Coverage disabled by default due to SvelteKit SSR conflicts
			// Use npm run test:coverage:simple for coverage reports
			enabled: false,
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
				'coverage/'
			],
			include: [
				'src/lib/**/*.{js,ts}'
				// Exclude SSR routes and Svelte components to prevent SSR conflicts
			]
		}
	}
});