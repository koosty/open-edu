import { paraglideVitePlugin } from '@inlang/paraglide-js';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vitest/config';
import { sveltekit } from '@sveltejs/kit/vite';
import { codecovSvelteKitPlugin } from '@codecov/sveltekit-plugin';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';

// Read version from package.json
const packageJson = JSON.parse(readFileSync(fileURLToPath(new URL('./package.json', import.meta.url)), 'utf-8'));

export default defineConfig({
	plugins: [
		tailwindcss(),
		sveltekit(),
		// Add Codecov plugin for bundle analysis - disabled during testing
		...process.env.NODE_ENV !== 'test'
			? [
				codecovSvelteKitPlugin({
					enableBundleAnalysis: true,
					bundleName: 'open-edu-sveltekit',
					uploadToken: process.env.CODECOV_TOKEN,
					telemetry: false // Privacy-conscious default
				})
			]
			: [],
		paraglideVitePlugin({
			project: './project.inlang',
			outdir: './src/lib/paraglide'
		})
	],
	define: {
		// Inject version from package.json into the app
		'import.meta.env.VITE_APP_VERSION': JSON.stringify(packageJson.version)
	},
	test: {
		expect: { requireAssertions: true },
		testTimeout: 30000, // 30 seconds timeout per test
		hookTimeout: 10000, // 10 seconds timeout for setup/teardown
		// Only run non-browser tests (Svelte component tests need browser mode)
		include: ['src/**/*.{test,spec}.{js,ts}'],
		exclude: [
			'src/**/*.svelte.{test,spec}.{js,ts}', // Browser mode tests excluded
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
			include: ['src/lib/**/*.{js,ts}'] // Exclude SSR routes and Svelte components to prevent SSR conflicts
		}
	}
});
