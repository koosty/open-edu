/**
 * Tests for Certificate Generation Utility
 * Comprehensive test coverage for certificate text, HTML, and sharing functionality
 */

import { describe, test, expect, beforeEach, beforeAll, vi, afterEach } from 'vitest'
import {
	generateTextCertificate,
	generateHTMLCertificate,
	generateShareableURL,
	downloadHTMLCertificate,
	copyTextCertificate,
	type CertificateData
} from './certificate'

// Helper to create mock certificate data
function createMockCertificateData(overrides: Partial<CertificateData> = {}): CertificateData {
	return {
		studentName: 'John Doe',
		courseName: 'Introduction to Programming',
		quizTitle: 'JavaScript Basics Quiz',
		score: 85,
		isPassed: true,
		completedAt: new Date('2024-01-15T10:30:00.000Z'),
		attemptNumber: 1,
		...overrides
	}
}

describe('Certificate Generation Utility', () => {
	// Setup global document mock for all tests
	beforeAll(() => {
		// Mock document.createElement for escapeHtml function
		global.document = {
			createElement: vi.fn((tagName: string) => {
				const element = {
					textContent: '',
					innerHTML: '',
					href: '',
					download: '',
					click: vi.fn()
				}
				// Simulate textContent to innerHTML conversion (escape HTML)
				Object.defineProperty(element, 'textContent', {
					set(value: string) {
						// Simple HTML escaping
						element.innerHTML = value
							.replace(/&/g, '&amp;')
							.replace(/</g, '&lt;')
							.replace(/>/g, '&gt;')
							.replace(/"/g, '&quot;')
							.replace(/'/g, '&#039;')
					}
				})
				return element
			}),
			body: {
				appendChild: vi.fn(),
				removeChild: vi.fn()
			}
		} as any
	})

	describe('generateTextCertificate', () => {
		test('should generate certificate with all required information', () => {
			const data = createMockCertificateData()
			const result = generateTextCertificate(data)

			expect(result).toContain('CERTIFICATE OF COMPLETION')
			expect(result).toContain('JOHN DOE')
			expect(result).toContain('JavaScript Basics Quiz')
			expect(result).toContain('Introduction to Programming')
			expect(result).toContain('Score: 85%')
			expect(result).toContain('PASSED ✓')
			expect(result).toContain('Attempt #1')
			expect(result).toContain('January 15, 2024')
			expect(result).toContain('Open-EDU Learning Platform')
		})

		test('should show COMPLETED status when not passed', () => {
			const data = createMockCertificateData({ isPassed: false, score: 65 })
			const result = generateTextCertificate(data)

			expect(result).toContain('Score: 65%')
			expect(result).toContain('Status: COMPLETED')
			expect(result).not.toContain('PASSED')
		})

		test('should handle different attempt numbers', () => {
			const data = createMockCertificateData({ attemptNumber: 3 })
			const result = generateTextCertificate(data)

			expect(result).toContain('Attempt #3')
		})

		test('should format long names correctly', () => {
			const data = createMockCertificateData({
				studentName: 'Alexander Christopher Montgomery III'
			})
			const result = generateTextCertificate(data)

			expect(result).toContain('ALEXANDER CHRISTOPHER MONTGOMERY III')
		})

		test('should format long course and quiz names correctly', () => {
			const data = createMockCertificateData({
				courseName:
					'Advanced Web Development: Building Scalable Applications with Modern Frameworks',
				quizTitle: 'Comprehensive Final Assessment: React, Node.js, and Database Integration'
			})
			const result = generateTextCertificate(data)

			expect(result).toContain(
				'Advanced Web Development: Building Scalable Applications with Modern Frameworks'
			)
			expect(result).toContain(
				'Comprehensive Final Assessment: React, Node.js, and Database Integration'
			)
		})

		test('should round score to nearest integer', () => {
			const data = createMockCertificateData({ score: 87.6 })
			const result = generateTextCertificate(data)

			expect(result).toContain('Score: 88%')
		})

		test('should include border decorations', () => {
			const data = createMockCertificateData()
			const result = generateTextCertificate(data)

			expect(result).toContain('╔')
			expect(result).toContain('╗')
			expect(result).toContain('╚')
			expect(result).toContain('╝')
			expect(result).toContain('═')
		})
	})

	describe('generateHTMLCertificate', () => {
		test('should generate valid HTML document', () => {
			const data = createMockCertificateData()
			const result = generateHTMLCertificate(data)

			expect(result).toContain('<!DOCTYPE html>')
			expect(result).toContain('<html lang="en">')
			expect(result).toContain('<head>')
			expect(result).toContain('<body>')
			expect(result).toContain('</body>')
			expect(result).toContain('</html>')
		})

		test('should include certificate title in head', () => {
			const data = createMockCertificateData({ studentName: 'Jane Smith' })
			const result = generateHTMLCertificate(data)

			expect(result).toContain('<title>Certificate - Jane Smith</title>')
		})

		test('should include all certificate information', () => {
			const data = createMockCertificateData()
			const result = generateHTMLCertificate(data)

			expect(result).toContain('CERTIFICATE OF COMPLETION')
			expect(result).toContain('John Doe')
			expect(result).toContain('JavaScript Basics Quiz')
			expect(result).toContain('Introduction to Programming')
			expect(result).toContain('85%')
			expect(result).toContain('✓ PASSED')
			expect(result).toContain('#1')
			expect(result).toContain('January 15, 2024')
			expect(result).toContain('Open-EDU Learning Platform')
		})

		test('should show COMPLETED status when not passed', () => {
			const data = createMockCertificateData({ isPassed: false, score: 60 })
			const result = generateHTMLCertificate(data)

			expect(result).toContain('60%')
			expect(result).toContain('COMPLETED')
			expect(result).not.toContain('✓ PASSED')
		})

		test('should include passed badge when passed', () => {
			const data = createMockCertificateData({ isPassed: true })
			const result = generateHTMLCertificate(data)

			expect(result).toContain('🏆')
		})

		test('should include completion badge when not passed', () => {
			const data = createMockCertificateData({ isPassed: false })
			const result = generateHTMLCertificate(data)

			expect(result).toContain('📜')
		})

		test('should escape HTML in student name', () => {
			const data = createMockCertificateData({ studentName: '<script>alert("xss")</script>' })
			const result = generateHTMLCertificate(data)

			// HTML should be escaped - output should contain the escaped version
			expect(result).toContain('&lt;')
			expect(result).toContain('&gt;')
		})

		test('should escape HTML in course name', () => {
			const data = createMockCertificateData({ courseName: 'Course <b>Name</b>' })
			const result = generateHTMLCertificate(data)

			// HTML should be escaped
			expect(result).toContain('&lt;')
			expect(result).toContain('&gt;')
		})

		test('should escape HTML in quiz title', () => {
			const data = createMockCertificateData({ quizTitle: 'Quiz & Test <script>bad</script>' })
			const result = generateHTMLCertificate(data)

			// HTML should be escaped
			expect(result).toContain('&amp;')
			expect(result).toContain('&lt;')
		})

		test('should include CSS styles', () => {
			const data = createMockCertificateData()
			const result = generateHTMLCertificate(data)

			expect(result).toContain('<style>')
			expect(result).toContain('</style>')
			expect(result).toContain('.certificate')
			expect(result).toContain('@media print')
		})

		test('should include gradient background', () => {
			const data = createMockCertificateData()
			const result = generateHTMLCertificate(data)

			expect(result).toContain('linear-gradient')
			expect(result).toContain('#667eea')
			expect(result).toContain('#764ba2')
		})

		test('should round score to nearest integer', () => {
			const data = createMockCertificateData({ score: 92.7 })
			const result = generateHTMLCertificate(data)

			expect(result).toContain('93%')
		})
	})

	describe('generateShareableURL', () => {
		beforeEach(() => {
			// Mock window.location
			Object.defineProperty(global, 'window', {
				value: { location: { origin: 'https://example.com' } },
				writable: true,
				configurable: true
			})
		})

		afterEach(() => {
			vi.clearAllMocks()
		})

		test('should generate URL with all parameters', () => {
			const data = createMockCertificateData()
			const result = generateShareableURL(data)

			expect(result).toContain('https://example.com/certificate?')
			expect(result).toContain('name=John+Doe')
			expect(result).toContain('course=Introduction+to+Programming')
			expect(result).toContain('quiz=JavaScript+Basics+Quiz')
			expect(result).toContain('score=85')
			expect(result).toContain('status=passed')
		})

		test('should show completed status when not passed', () => {
			const data = createMockCertificateData({ isPassed: false })
			const result = generateShareableURL(data)

			expect(result).toContain('status=completed')
			expect(result).not.toContain('status=passed')
		})

		test('should URL encode special characters', () => {
			const data = createMockCertificateData({
				studentName: 'John & Jane',
				courseName: 'Course #1',
				quizTitle: 'Quiz: Part 1'
			})
			const result = generateShareableURL(data)

			expect(result).toContain('name=John+%26+Jane')
			expect(result).toContain('course=Course+%231')
			expect(result).toContain('quiz=Quiz%3A+Part+1')
		})

		test('should round score to nearest integer', () => {
			const data = createMockCertificateData({ score: 78.9 })
			const result = generateShareableURL(data)

			expect(result).toContain('score=79')
		})

		test('should handle missing window object', () => {
			// Remove window mock
			Object.defineProperty(global, 'window', {
				value: undefined,
				writable: true,
				configurable: true
			})

			const data = createMockCertificateData()
			const result = generateShareableURL(data)

			// Should still work, just with empty origin
			expect(result).toContain('/certificate?')
			expect(result).toContain('name=John+Doe')
		})
	})

	describe('downloadHTMLCertificate', () => {
		let createElementSpy: any
		let appendChildSpy: any
		let removeChildSpy: any
		let clickSpy: any
		let createObjectURLSpy: any
		let revokeObjectURLSpy: any

		beforeEach(() => {
			// Mock document methods
			clickSpy = vi.fn()
			const mockAnchor = {
				href: '',
				download: '',
				click: clickSpy
			}

			createElementSpy = vi.spyOn(document, 'createElement').mockReturnValue(mockAnchor as any)
			appendChildSpy = vi.spyOn(document.body, 'appendChild').mockImplementation(() => mockAnchor as any)
			removeChildSpy = vi.spyOn(document.body, 'removeChild').mockImplementation(() => mockAnchor as any)

			// Mock URL methods
			createObjectURLSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-url')
			revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})

			// Mock Blob
			global.Blob = vi.fn() as any
		})

		afterEach(() => {
			vi.clearAllMocks()
		})

		test('should create and download HTML file', () => {
			const data = createMockCertificateData()

			downloadHTMLCertificate(data)

			expect(global.Blob).toHaveBeenCalledWith([expect.any(String)], { type: 'text/html' })
			expect(createObjectURLSpy).toHaveBeenCalled()
			expect(createElementSpy).toHaveBeenCalledWith('a')
			expect(appendChildSpy).toHaveBeenCalled()
			expect(clickSpy).toHaveBeenCalled()
			expect(removeChildSpy).toHaveBeenCalled()
			expect(revokeObjectURLSpy).toHaveBeenCalled()
		})

		test('should use sanitized filename', () => {
			const data = createMockCertificateData({
				studentName: 'John Doe',
				quizTitle: 'JavaScript Basics'
			})

			downloadHTMLCertificate(data)

			const mockAnchor = createElementSpy.mock.results[0].value
			expect(mockAnchor.download).toBe('certificate-john-doe-javascript-basics.html')
		})

		test('should sanitize filename with special characters', () => {
			const data = createMockCertificateData({
				studentName: 'John & Jane!!!',
				quizTitle: 'Quiz #1: Part A/B'
			})

			downloadHTMLCertificate(data)

			const mockAnchor = createElementSpy.mock.results[0].value
			expect(mockAnchor.download).toBe('certificate-john-jane-quiz-1-part-a-b.html')
		})

		test('should remove leading/trailing hyphens from filename', () => {
			const data = createMockCertificateData({
				studentName: '!!!John!!!',
				quizTitle: '---Quiz---'
			})

			downloadHTMLCertificate(data)

			const mockAnchor = createElementSpy.mock.results[0].value
			expect(mockAnchor.download).not.toMatch(/^certificate--/)
			expect(mockAnchor.download).not.toMatch(/--\.html$/)
		})
	})

	describe('copyTextCertificate', () => {
		beforeEach(() => {
			// Mock clipboard API
			Object.assign(navigator, {
				clipboard: {
					writeText: vi.fn().mockResolvedValue(undefined)
				}
			})
		})

		afterEach(() => {
			vi.clearAllMocks()
		})

		test('should copy text certificate to clipboard', async () => {
			const data = createMockCertificateData()

			await copyTextCertificate(data)

			expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
				expect.stringContaining('CERTIFICATE OF COMPLETION')
			)
			expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
				expect.stringContaining('JOHN DOE')
			)
		})

		test('should copy complete certificate text', async () => {
			const data = createMockCertificateData({
				studentName: 'Alice Johnson',
				courseName: 'Data Science Fundamentals',
				quizTitle: 'Statistics Quiz',
				score: 95,
				isPassed: true
			})

			await copyTextCertificate(data)

			const copiedText = (navigator.clipboard.writeText as any).mock.calls[0][0]
			expect(copiedText).toContain('ALICE JOHNSON')
			expect(copiedText).toContain('Data Science Fundamentals')
			expect(copiedText).toContain('Statistics Quiz')
			expect(copiedText).toContain('95%')
			expect(copiedText).toContain('PASSED ✓')
		})

		test('should handle clipboard API errors', async () => {
			// Mock clipboard error
			Object.assign(navigator, {
				clipboard: {
					writeText: vi.fn().mockRejectedValue(new Error('Clipboard access denied'))
				}
			})

			const data = createMockCertificateData()

			await expect(copyTextCertificate(data)).rejects.toThrow('Clipboard access denied')
		})
	})

	describe('Edge Cases', () => {
		test('should handle zero score', () => {
			const data = createMockCertificateData({ score: 0, isPassed: false })
			const textResult = generateTextCertificate(data)
			const htmlResult = generateHTMLCertificate(data)

			expect(textResult).toContain('Score: 0%')
			expect(htmlResult).toContain('0%')
		})

		test('should handle 100% score', () => {
			const data = createMockCertificateData({ score: 100, isPassed: true })
			const textResult = generateTextCertificate(data)
			const htmlResult = generateHTMLCertificate(data)

			expect(textResult).toContain('Score: 100%')
			expect(htmlResult).toContain('100%')
		})

		test('should handle single character names', () => {
			const data = createMockCertificateData({ studentName: 'A' })
			const textResult = generateTextCertificate(data)
			const htmlResult = generateHTMLCertificate(data)

			expect(textResult).toContain('A')
			expect(htmlResult).toContain('A')
		})

		test('should handle unicode characters in names', () => {
			const data = createMockCertificateData({ studentName: '李明 (Li Ming)' })
			const textResult = generateTextCertificate(data)
			const htmlResult = generateHTMLCertificate(data)

			expect(textResult).toContain('李明 (LI MING)')
			expect(htmlResult).toContain('李明 (Li Ming)')
		})

		test('should handle empty strings gracefully', () => {
			const data: CertificateData = {
				studentName: '',
				courseName: '',
				quizTitle: '',
				score: 0,
				isPassed: false,
				completedAt: new Date(),
				attemptNumber: 1
			}

			// Text certificate doesn't use document API
			expect(() => generateTextCertificate(data)).not.toThrow()
			
			// HTML generation uses document.createElement which is mocked
			const htmlResult = generateHTMLCertificate(data)
			expect(htmlResult).toContain('<!DOCTYPE html>')
			
			// URL generation doesn't depend on DOM
			expect(() => generateShareableURL(data)).not.toThrow()
		})

		test('should handle large attempt numbers', () => {
			const data = createMockCertificateData({ attemptNumber: 999 })
			const textResult = generateTextCertificate(data)
			const htmlResult = generateHTMLCertificate(data)

			expect(textResult).toContain('Attempt #999')
			expect(htmlResult).toContain('#999')
		})

		test('should handle dates from different years', () => {
			const data = createMockCertificateData({
				completedAt: new Date('2025-12-31T12:00:00.000Z')
			})
			const result = generateTextCertificate(data)

			// Just check that the year is correct (date format varies by timezone)
			expect(result).toContain('2025')
			expect(result).toContain('December')
		})
	})
})
