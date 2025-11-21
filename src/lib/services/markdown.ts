// Markdown service for Open-EDU v1.2.0
// Handles markdown parsing, syntax highlighting, and sanitization

import { marked } from 'marked'
import type { Tokens } from 'marked'
import hljs from 'highlight.js'
import * as katex from 'katex'
import DOMPurify from 'isomorphic-dompurify'

// Configure marked options
marked.setOptions({
	gfm: true, // GitHub Flavored Markdown
	breaks: true // Convert line breaks to <br>
})

// Custom renderer for code blocks with syntax highlighting
const renderer = new marked.Renderer()

// Override code renderer to add syntax highlighting
renderer.code = function ({ text, lang }: Tokens.Code): string {
	const validLanguage = lang && hljs.getLanguage(lang) ? lang : 'plaintext'
	const highlighted = hljs.highlight(text, { language: validLanguage }).value
	
	return `<pre class="hljs language-${validLanguage}"><code>${highlighted}</code></pre>`
}

// Override inline code renderer
renderer.codespan = function ({ text }: Tokens.Codespan): string {
	return `<code class="inline-code">${text}</code>`
}

// Override heading renderer to add IDs for TOC navigation
renderer.heading = function ({ text, depth }: Tokens.Heading): string {
	// Generate ID from heading text (same logic as extractHeadings)
	const id = text
		.toLowerCase()
		.replace(/[^\w\s-]/g, '')
		.replace(/\s+/g, '-')
	
	return `<h${depth} id="${id}">${text}</h${depth}>`
}

// Override blockquote renderer for callouts (like > [!NOTE])
renderer.blockquote = function ({ text }: Tokens.Blockquote): string {
	// Check for callout syntax: > [!TYPE]
	const calloutMatch = text.match(/^\s*<p>\[!(NOTE|TIP|WARNING|IMPORTANT|CAUTION)\](.*?)<\/p>/i)
	
	if (calloutMatch) {
		const [, type, content] = calloutMatch
		const typeClass = type.toLowerCase()
		const icon = getCalloutIcon(type)
		
		return `<div class="callout callout-${typeClass}" role="alert">
			<div class="callout-title">
				${icon}
				<span>${type}</span>
			</div>
			<div class="callout-content">${content.trim()}</div>
		</div>`
	}
	
	return `<blockquote>${text}</blockquote>`
}

// Get icon for callout type
function getCalloutIcon(type: string): string {
	const icons: Record<string, string> = {
		NOTE: '📝',
		TIP: '💡',
		WARNING: '⚠️',
		IMPORTANT: '❗',
		CAUTION: '🚨'
	}
	return icons[type] || '📌'
}

// Apply custom renderer
marked.use({ renderer })

/**
 * Parse markdown to HTML with syntax highlighting
 */
export function parseMarkdown(markdown: string): string {
	if (!markdown || typeof markdown !== 'string') {
		return ''
	}
	
	try {
		// Parse markdown to HTML
		let html = marked.parse(markdown) as string
		
		// Process math expressions (KaTeX)
		html = processMathExpressions(html)
		
		// Sanitize HTML to prevent XSS attacks
		html = sanitizeHtml(html)
		
		return html
	} catch (error) {
		console.error('Error parsing markdown:', error)
		return `<p class="error">Failed to render content</p>`
	}
}

/**
 * Process LaTeX math expressions with KaTeX
 * Supports both inline ($...$) and block ($$...$$) math
 */
function processMathExpressions(html: string): string {
	// Process block math ($$...$$)
	html = html.replace(/\$\$([\s\S]+?)\$\$/g, (match, math) => {
		try {
			return katex.renderToString(math.trim(), {
				displayMode: true,
				throwOnError: false,
				output: 'html'
			})
		} catch (error) {
			console.error('KaTeX error (block):', error)
			return `<span class="math-error">${match}</span>`
		}
	})
	
	// Process inline math ($...$)
	html = html.replace(/\$([^$\n]+?)\$/g, (match, math) => {
		try {
			return katex.renderToString(math.trim(), {
				displayMode: false,
				throwOnError: false,
				output: 'html'
			})
		} catch (error) {
			console.error('KaTeX error (inline):', error)
			return `<span class="math-error">${match}</span>`
		}
	})
	
	return html
}

/**
 * Sanitize HTML to prevent XSS attacks
 * Allows safe HTML elements and attributes for rich content
 */
function sanitizeHtml(html: string): string {
	return DOMPurify.sanitize(html, {
		ALLOWED_TAGS: [
			// Text content
			'p', 'br', 'span', 'strong', 'em', 'u', 's', 'code', 'pre',
			// Headings
			'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
			// Lists
			'ul', 'ol', 'li',
			// Links and media
			'a', 'img', 'video', 'audio', 'source',
			// Tables
			'table', 'thead', 'tbody', 'tr', 'th', 'td',
			// Semantic
			'blockquote', 'div', 'section', 'article', 'aside',
			// Code highlighting classes
			'mark', 'del', 'ins', 'sub', 'sup',
			// Math (KaTeX)
			'math', 'semantics', 'mrow', 'msup', 'msub', 'mfrac', 'annotation'
		],
		ALLOWED_ATTR: [
			'href', 'src', 'alt', 'title', 'class', 'id',
			'target', 'rel', 'width', 'height', 'style',
			'controls', 'autoplay', 'loop', 'muted',
			'colspan', 'rowspan', 'aria-*', 'data-*', 'role'
		],
		ALLOWED_URI_REGEXP: /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|sms|cid|xmpp):|[^a-z]|[a-z+.-]+(?:[^a-z+.-:]|$))/i
	})
}

/**
 * Extract headings from markdown for table of contents
 * Returns array of { level, text, id } objects
 */
export function extractHeadings(markdown: string): Array<{
	level: number
	text: string
	id: string
}> {
	const headings: Array<{ level: number; text: string; id: string }> = []
	const headingRegex = /^(#{1,6})\s+(.+)$/gm
	
	let match
	while ((match = headingRegex.exec(markdown)) !== null) {
		const level = match[1].length
		const text = match[2].trim()
		const id = text
			.toLowerCase()
			.replace(/[^\w\s-]/g, '')
			.replace(/\s+/g, '-')
		
		headings.push({ level, text, id })
	}
	
	return headings
}

/**
 * Estimate reading time in minutes
 * Based on average reading speed of 200 words per minute
 */
export function estimateReadingTime(markdown: string): number {
	if (!markdown) return 0
	
	// Remove markdown syntax and count words
	const plainText = markdown
		.replace(/```[\s\S]*?```/g, '') // Remove code blocks
		.replace(/`[^`]+`/g, '') // Remove inline code
		.replace(/[#*_[\]()]/g, '') // Remove markdown syntax
		.trim()
	
	const wordCount = plainText.split(/\s+/).length
	const readingTime = Math.ceil(wordCount / 200)
	
	return readingTime
}

/**
 * Get a preview/excerpt from markdown
 * Returns first N characters of plain text
 */
export function getMarkdownPreview(markdown: string, maxLength = 200): string {
	if (!markdown) return ''
	
	// Strip markdown syntax
	const plainText = markdown
		.replace(/```[\s\S]*?```/g, '') // Remove code blocks
		.replace(/`[^`]+`/g, '') // Remove inline code
		.replace(/[#*_[\]()]/g, '') // Remove markdown syntax
		.replace(/\n+/g, ' ') // Replace newlines with spaces
		.trim()
	
	if (plainText.length <= maxLength) {
		return plainText
	}
	
	return plainText.substring(0, maxLength).trim() + '...'
}
