import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vitest/config';
import { playwright } from '@vitest/browser-playwright';
import { sveltekit } from '@sveltejs/kit/vite';
import { codecovSvelteKitPlugin } from '@codecov/sveltekit-plugin';

export default defineConfig({
	plugins: [
		tailwindcss(), 
		sveltekit(),
		// Add Codecov plugin for bundle analysis
		codecovSvelteKitPlugin({
			enableBundleAnalysis: true,
			bundleName: 'open-edu-sveltekit',
			uploadToken: process.env.CODECOV_TOKEN,
			telemetry: false // Privacy-conscious default
		})
	],
	test: {
		expect: { requireAssertions: true },
		testTimeout: 30000, // 30 seconds timeout per test
		hookTimeout: 10000, // 10 seconds timeout for setup/teardown
		coverage: {
			enabled: true,
			provider: 'v8', // V8 is recommended for modern Node.js
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
				'src/lib/**/*.{js,ts}',
				'src/routes/**/*.{js,ts}',
				'src/**/*.svelte'
			]
			// Note: Thresholds disabled until we add integration tests
			// Will be re-enabled as test coverage improves
		},
		projects: [
			{
				extends: './vite.config.ts',
				test: {
					name: 'client',
					browser: {
						enabled: true,
						provider: playwright(),
						instances: [{ browser: 'chromium', headless: true }]
					},
					include: ['src/**/*.svelte.{test,spec}.{js,ts}'],
					exclude: ['src/lib/server/**'],
					env: {
						NODE_ENV: 'test'
					}
				}
			},
			{
				extends: './vite.config.ts',
				test: {
					name: 'server',
					environment: 'node',
					include: ['src/**/*.{test,spec}.{js,ts}'],
					exclude: ['src/**/*.svelte.{test,spec}.{js,ts}'],
					env: {
						NODE_ENV: 'test'
					}
				}
			}
		]
	}
});
