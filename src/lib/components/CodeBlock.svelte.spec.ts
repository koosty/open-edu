import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render } from 'vitest-browser-svelte'
import { page } from 'vitest/browser'
import CodeBlock from './CodeBlock.svelte'

describe('CodeBlock', () => {
	const sampleCode = `function hello() {
  console.log("Hello, World!");
}`

	beforeEach(() => {
		// Mock clipboard API
		if (typeof navigator !== 'undefined') {
			Object.defineProperty(navigator, 'clipboard', {
				value: {
					writeText: vi.fn(() => Promise.resolve())
				},
				writable: true,
				configurable: true
			})
		}
	})

	it('renders code content', async () => {
		render(CodeBlock, {
			code: sampleCode,
			language: 'javascript'
		})

		const codeElement = page.getByText(/function hello/)
		await expect.element(codeElement).toBeInTheDocument()
	})

	it('displays language label', async () => {
		render(CodeBlock, {
			code: sampleCode,
			language: 'javascript'
		})

		const languageLabel = page.getByText('JAVASCRIPT')
		await expect.element(languageLabel).toBeInTheDocument()
	})

	it('displays filename when provided', async () => {
		render(CodeBlock, {
			code: sampleCode,
			language: 'javascript',
			filename: 'example.js'
		})

		const filename = page.getByText('example.js')
		await expect.element(filename).toBeInTheDocument()
	})

	it('shows line numbers by default', async () => {
		const { container } = render(CodeBlock, {
			code: sampleCode,
			language: 'javascript'
		})

		const lineNumbers = container.querySelectorAll('.line-number')
		expect(lineNumbers.length).toBeGreaterThan(0)
	})

	it('hides line numbers when showLineNumbers is false', async () => {
		const { container } = render(CodeBlock, {
			code: sampleCode,
			language: 'javascript',
			showLineNumbers: false
		})

		const lineNumbers = container.querySelectorAll('.line-number')
		expect(lineNumbers.length).toBe(0)
	})

	it('copies code to clipboard when copy button is clicked', async () => {
		render(CodeBlock, {
			code: sampleCode,
			language: 'javascript'
		})

		const copyButton = page.getByRole('button', { name: /copy code to clipboard/i })
		await copyButton.click()

		expect(navigator.clipboard.writeText).toHaveBeenCalledWith(sampleCode)
		
		// Check for "Copied!" text
		const copiedText = page.getByText('Copied!')
		await expect.element(copiedText).toBeInTheDocument()
	})

	it('shows error state when clipboard copy fails', async () => {
		// Mock clipboard failure
		vi.spyOn(navigator.clipboard, 'writeText').mockRejectedValueOnce(
			new Error('Clipboard access denied')
		)

		render(CodeBlock, {
			code: sampleCode,
			language: 'javascript'
		})

		const copyButton = page.getByRole('button', { name: /copy code to clipboard/i })
		await copyButton.click()

		// Wait for error state to appear
		await new Promise(resolve => setTimeout(resolve, 100))
		
		const errorText = page.getByText('Error')
		await expect.element(errorText).toBeInTheDocument()
	})

	it('applies custom className', async () => {
		const { container } = render(CodeBlock, {
			code: sampleCode,
			language: 'javascript',
			class: 'custom-class'
		})

		const codeBlock = container.querySelector('.code-block-container')
		expect(codeBlock?.classList.contains('custom-class')).toBe(true)
	})

	it('handles empty code gracefully', async () => {
		render(CodeBlock, {
			code: '',
			language: 'javascript'
		})

		const copyButton = page.getByRole('button', { name: /copy code to clipboard/i })
		await expect.element(copyButton).toBeInTheDocument()
	})

	it('handles missing language parameter', async () => {
		render(CodeBlock, {
			code: sampleCode
		})

		const codeLabel = page.getByText('CODE')
		await expect.element(codeLabel).toBeInTheDocument()
	})

	it('formats multi-line code correctly', async () => {
		const multiLineCode = `line 1
line 2
line 3`
		
		const { container } = render(CodeBlock, {
			code: multiLineCode,
			language: 'text'
		})

		// Should show 3 line numbers
		const lineNumbers = container.querySelectorAll('.line-number')
		expect(lineNumbers.length).toBe(3)
	})
})
