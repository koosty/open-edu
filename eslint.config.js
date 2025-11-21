import { fileURLToPath } from 'node:url';
import { includeIgnoreFile } from '@eslint/compat';
import js from '@eslint/js';
import svelte from 'eslint-plugin-svelte';
import { defineConfig } from 'eslint/config';
import globals from 'globals';
import ts from 'typescript-eslint';
import svelteConfig from './svelte.config.js';

const gitignorePath = fileURLToPath(new URL('./.gitignore', import.meta.url));

export default defineConfig(
	includeIgnoreFile(gitignorePath),
	{
		ignores: [
			'**/*.spec.ts',
			'**/*.test.ts',
			'**/*.spec.js',
			'**/*.test.js'
		]
	},
	js.configs.recommended,
	...ts.configs.recommended,
	...svelte.configs.recommended,
	{
		languageOptions: {
			globals: { ...globals.browser, ...globals.node }
		},
		rules: {
			// typescript-eslint strongly recommend that you do not use the no-undef lint rule on TypeScript projects.
			// see: https://typescript-eslint.io/troubleshooting/faqs/eslint/#i-get-errors-from-the-no-undef-rule-about-global-variables-not-being-defined-even-though-there-are-no-typescript-errors
			"no-undef": 'off',
			
			// Allow unused variables that start with underscore or 'unused'
			'@typescript-eslint/no-unused-vars': [
				'warn', // Changed from 'error' to 'warn' for v1.4.0
				{
					argsIgnorePattern: '^_|^unused',
					varsIgnorePattern: '^_|^unused',
					caughtErrorsIgnorePattern: '^_|^unused'
				}
			],
			
			// Relaxed rules for v1.4.0 - to be addressed in v1.5.0/v2.0.0
			// These are code quality issues, not breaking bugs
			'@typescript-eslint/no-explicit-any': 'warn', // ~40 occurrences - gradual typing improvement
			'no-useless-escape': 'warn', // 4 occurrences in markdown service
			'no-case-declarations': 'warn', // 2 occurrences in quiz service
			'prefer-const': 'warn', // 2 occurrences - minor improvements
			
		// Svelte-specific relaxed rules for v1.4.0
		'svelte/no-navigation-without-resolve': 'off', // v1.5.0: Disabled - using custom navigation helpers (getPath/navigate)
		'svelte/prefer-svelte-reactivity': 'warn', // 2 occurrences - SvelteSet usage
		'svelte/require-each-key': 'warn' // ~10 occurrences in analytics pages
		}
	},
	{
		files: [
			'**/*.svelte',
			'**/*.svelte.ts',
			'**/*.svelte.js'
		],
		languageOptions: {
			parserOptions: {
				projectService: true,
				extraFileExtensions: ['.svelte'],
				parser: ts.parser,
				svelteConfig
			}
		}
	}
);
