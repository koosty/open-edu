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
				'warn',
				{
					argsIgnorePattern: '^_|^unused',
					varsIgnorePattern: '^_|^unused',
					caughtErrorsIgnorePattern: '^_|^unused'
				}
			],
			
			// Code quality rules - enforced in v1.5.0
			'@typescript-eslint/no-explicit-any': 'warn',
			'no-useless-escape': 'warn',
			'no-case-declarations': 'warn',
			'prefer-const': 'warn',
			
		// Svelte-specific rules
		'svelte/no-navigation-without-resolve': 'off', // v1.5.0: Disabled - using custom navigation helpers
		'svelte/prefer-svelte-reactivity': 'warn',
		'svelte/require-each-key': 'warn'
		}
	},
	{
		files: ['**/*.spec.ts', '**/*.spec.js', '**/*.test.ts', '**/*.test.js', '**/test-utils/**/*.ts'],
		rules: {
			// Allow any in test files
			'@typescript-eslint/no-explicit-any': 'off'
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
		},
		rules: {
			// Disable prefer-const in Svelte files - false positive with $props() destructuring
			'prefer-const': 'off'
		}
	}
);
