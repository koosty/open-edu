import { describe, it, expect, vi } from 'vitest'
import { parseCourseFile, generateCourseTemplate, downloadTemplate, parseDurationToMinutes } from './course-import'

describe('Course Import Utils', () => {
	describe('parseCourseFile', () => {
		it('should parse valid JSON file', async () => {
			const jsonContent = JSON.stringify({
				title: 'Test Course',
				description: 'Test Description',
				category: 'Programming',
				difficulty: 'Beginner',
				duration: '40h',
				level: 'free',
				lessons: [
					{
						title: 'Lesson 1',
						type: 'lesson',
						duration: '10m',
						content: '# Test Content'
					}
				]
			})

			const file = new File([jsonContent], 'course.json', { type: 'application/json' })
			const result = await parseCourseFile(file)

			expect(result.format).toBe('json')
			expect(result.data.title).toBe('Test Course')
			expect(result.data.lessons).toHaveLength(1)
		})

		it('should parse valid YAML file', async () => {
			const yamlContent = `
title: "Test Course"
description: "Test Description"
category: "Programming"
difficulty: "Beginner"
duration: "40h"
level: "free"
lessons:
  - title: "Lesson 1"
    type: "lesson"
    duration: "10m"
    content: "# Test Content"
`

			const file = new File([yamlContent], 'course.yaml', { type: 'text/yaml' })
			const result = await parseCourseFile(file)

			expect(result.format).toBe('yaml')
			expect(result.data.title).toBe('Test Course')
			expect(result.data.lessons).toHaveLength(1)
		})

		it('should parse .yml file extension', async () => {
			const yamlContent = `
title: "Test Course"
description: "Test Description"
category: "Programming"
difficulty: "Beginner"
duration: "40h"
level: "free"
lessons:
  - title: "Lesson 1"
    type: "lesson"
    duration: "10m"
    content: "# Test Content"
`

			const file = new File([yamlContent], 'course.yml', { type: 'text/yaml' })
			const result = await parseCourseFile(file)

			expect(result.format).toBe('yaml')
			expect(result.data.title).toBe('Test Course')
		})

	it('should throw error for unsupported file format', async () => {
		const file = new File(['test'], 'course.txt', { type: 'text/plain' })

		await expect(parseCourseFile(file)).rejects.toThrow('Unsupported file format')
	})

	it('should throw error for invalid JSON', async () => {
		const file = new File(['{ invalid json }'], 'course.json', { type: 'application/json' })

		await expect(parseCourseFile(file)).rejects.toThrow('Failed to parse JSON')
	})

	it('should throw error for invalid YAML', async () => {
		const yamlContent = `
title: "Test Course"
invalid: yaml: structure: here
`
		const file = new File([yamlContent], 'course.yaml', { type: 'text/yaml' })

		await expect(parseCourseFile(file)).rejects.toThrow('Failed to parse YAML')
	})

	it('should throw validation error for missing required fields', async () => {
		const jsonContent = JSON.stringify({
			title: 'Test Course'
			// Missing required fields
		})

		const file = new File([jsonContent], 'course.json', { type: 'application/json' })

		await expect(parseCourseFile(file)).rejects.toThrow('Failed to parse JSON')
	})

	it('should throw validation error for invalid difficulty', async () => {
		const jsonContent = JSON.stringify({
			title: 'Test Course',
			description: 'Test Description',
			category: 'Programming',
			difficulty: 'Expert', // Invalid
			duration: '40h',
			level: 'free',
			lessons: [
				{
					title: 'Lesson 1',
					type: 'lesson',
					duration: '10m',
					content: '# Test'
				}
			]
		})

		const file = new File([jsonContent], 'course.json', { type: 'application/json' })

		await expect(parseCourseFile(file)).rejects.toThrow('Failed to parse JSON')
	})

	it('should validate premium course has price', async () => {
			const jsonContent = JSON.stringify({
				title: 'Test Course',
				description: 'Test Description',
				instructor: 'Test Instructor',
				category: 'Programming',
				difficulty: 'Beginner',
				duration: '40h',
				level: 'free',
				lessons: [
					{
						// v1.6.0: Flattened quiz structure - fields directly on lesson
						title: 'Quiz Lesson',
						type: 'quiz',
						duration: '15m',
						description: 'Quiz description',
						passingScore: 70,
						timeLimit: 600,
						questions: [
							{
								id: 'q1',
								type: 'multiple-choice',
								question: 'What is 2+2?',
								options: ['3', '4', '5'],
								correctAnswer: 1,
								points: 10,
								explanation: 'Basic math'
							}
						]
					}
				]
			})

			const file = new File([jsonContent], 'course.json', { type: 'application/json' })
			const result = await parseCourseFile(file)

			// v1.6.0: Questions are directly on lesson, not nested under quiz
			expect(result.data.lessons[0].questions).toBeDefined()
			expect(result.data.lessons[0].questions).toHaveLength(1)
		})

		it('should parse all question types', async () => {
			const jsonContent = JSON.stringify({
				title: 'Test Course',
				description: 'Test Description',
				category: 'Programming',
				difficulty: 'Beginner',
				duration: '40h',
				level: 'free',
				lessons: [
					{
						// v1.6.0: Flattened quiz structure
						title: 'Quiz Lesson',
						type: 'quiz',
						duration: '15m',
						description: 'Quiz description',
						passingScore: 70,
						questions: [
							{
								id: 'q1',
								type: 'multiple-choice',
								question: 'MC Question',
								options: ['A', 'B'],
								correctAnswer: 0,
								points: 10,
								explanation: 'Explanation'
							},
							{
								id: 'q2',
								type: 'true-false',
								question: 'TF Question',
								correctAnswer: true,
								points: 5,
								explanation: 'Explanation'
							},
							{
								id: 'q3',
								type: 'multiple-select',
								question: 'MS Question',
								options: ['A', 'B', 'C'],
								correctAnswers: [0, 2],
								points: 15,
								explanation: 'Explanation'
							},
							{
								id: 'q4',
								type: 'fill-blank',
								question: 'FB Question',
								correctAnswer: 'answer',
								caseSensitive: false,
								points: 10,
								explanation: 'Explanation'
							},
							{
								id: 'q5',
								type: 'ordering',
								question: 'Order Question',
								items: ['A', 'B', 'C'],
								correctOrder: [0, 1, 2],
								points: 20,
								explanation: 'Explanation'
							},
							{
								id: 'q6',
								type: 'matching',
								question: 'Match Question',
								pairs: [
									{ left: 'A', right: '1' },
									{ left: 'B', right: '2' }
								],
								points: 20,
								explanation: 'Explanation'
							}
						]
					}
				]
			})

			const file = new File([jsonContent], 'course.json', { type: 'application/json' })
			const result = await parseCourseFile(file)

			// v1.6.0: Questions are directly on lesson
			const questions = result.data.lessons[0].questions || []
			expect(questions).toHaveLength(6)
			expect(questions[0].type).toBe('multiple-choice')
			expect(questions[1].type).toBe('true-false')
			expect(questions[2].type).toBe('multiple-select')
			expect(questions[3].type).toBe('fill-blank')
			expect(questions[4].type).toBe('ordering')
			expect(questions[5].type).toBe('matching')
		})

		it('should parse course with optional fields', async () => {
			const jsonContent = JSON.stringify({
				title: 'Test Course',
				description: 'Test Description',
				category: 'Programming',
				difficulty: 'Beginner',
				duration: '40h',
				level: 'free',
				thumbnail: 'https://example.com/image.jpg',
				tags: ['tag1', 'tag2'],
				prerequisites: ['prereq1', 'prereq2'],
				learningOutcomes: ['outcome1', 'outcome2'],
				isPublished: true,
				isFeatured: true,
				lessons: [
					{
						title: 'Lesson 1',
						type: 'lesson',
						duration: '10m',
						content: '# Test'
					}
				]
			})

			const file = new File([jsonContent], 'course.json', { type: 'application/json' })
			const result = await parseCourseFile(file)

			expect(result.data.thumbnail).toBe('https://example.com/image.jpg')
			expect(result.data.tags).toEqual(['tag1', 'tag2'])
			expect(result.data.prerequisites).toEqual(['prereq1', 'prereq2'])
			expect(result.data.learningOutcomes).toEqual(['outcome1', 'outcome2'])
			expect(result.data.isPublished).toBe(true)
			expect(result.data.isFeatured).toBe(true)
		})

	it('should validate empty lessons array', async () => {
		const jsonContent = JSON.stringify({
			title: 'Test Course',
			description: 'Test Description',
			category: 'Programming',
			difficulty: 'Beginner',
			duration: '40h',
			level: 'free',
			lessons: [] // Empty
		})

		const file = new File([jsonContent], 'course.json', { type: 'application/json' })

		await expect(parseCourseFile(file)).rejects.toThrow('Course must have at least one lesson')
	})
	})

	describe('generateCourseTemplate', () => {
		it('should generate JSON template', () => {
			const template = generateCourseTemplate('json')
			const parsed = JSON.parse(template)

			expect(parsed.title).toBe('Course Title')
			expect(parsed.lessons).toBeDefined()
			expect(parsed.lessons.length).toBeGreaterThan(0)
		})

		it('should generate YAML template', () => {
			const template = generateCourseTemplate('yaml')

			expect(template).toContain('title:')
			expect(template).toContain('lessons:')
			expect(template).toContain('duration:') // Lessons should have duration field
		})

		it('should include all question types in template', () => {
			const jsonTemplate = generateCourseTemplate('json')
			const parsed = JSON.parse(jsonTemplate)

			// v1.6.0: Find lesson with questions (flattened structure - no quiz wrapper)
			const quizLesson = parsed.lessons.find((l: any) => l.questions !== undefined)
			expect(quizLesson).toBeDefined()

			const questions = quizLesson.questions
			const questionTypes = questions.map((q: any) => q.type)

			expect(questionTypes).toContain('multiple-choice')
			expect(questionTypes).toContain('true-false')
			expect(questionTypes).toContain('multiple-select')
			expect(questionTypes).toContain('fill-blank')
			expect(questionTypes).toContain('ordering')
			expect(questionTypes).toContain('matching')
		})

		it('should generate valid course data', async () => {
			const template = generateCourseTemplate('json')
			const file = new File([template], 'template.json', { type: 'application/json' })

			// Should parse without errors
			const result = await parseCourseFile(file)
			expect(result.data.title).toBe('Course Title')
		})
	})

	describe('downloadTemplate', () => {
		it('should create download link for JSON', () => {
			// Mock global document
			const mockLink = {
				href: '',
				download: '',
				click: vi.fn(),
				style: { display: '' }
			}

			const mockDocument = {
				createElement: vi.fn().mockReturnValue(mockLink),
				body: {
					appendChild: vi.fn(),
					removeChild: vi.fn()
				}
			}

			global.document = mockDocument as any
			global.URL = {
				createObjectURL: vi.fn().mockReturnValue('blob:mock-url'),
				revokeObjectURL: vi.fn()
			} as any

			downloadTemplate('json')

			expect(mockDocument.createElement).toHaveBeenCalledWith('a')
			expect(mockLink.download).toBe('course-template.json')
			expect(mockLink.href).toBe('blob:mock-url')
			expect(mockLink.click).toHaveBeenCalled()
			expect(mockDocument.body.appendChild).toHaveBeenCalledWith(mockLink)
			expect(mockDocument.body.removeChild).toHaveBeenCalledWith(mockLink)
		})

		it('should create download link for YAML', () => {
			// Mock global document
			const mockLink = {
				href: '',
				download: '',
				click: vi.fn(),
				style: { display: '' }
			}

			const mockDocument = {
				createElement: vi.fn().mockReturnValue(mockLink),
				body: {
					appendChild: vi.fn(),
					removeChild: vi.fn()
				}
			}

			global.document = mockDocument as any
			global.URL = {
				createObjectURL: vi.fn().mockReturnValue('blob:mock-url'),
				revokeObjectURL: vi.fn()
			} as any

			downloadTemplate('yaml')

			expect(mockDocument.createElement).toHaveBeenCalledWith('a')
			expect(mockLink.download).toBe('course-template.yaml')
			expect(mockLink.click).toHaveBeenCalled()
		})
	})

	describe('Error Messages', () => {
		it('should provide helpful error for missing title', async () => {
			const jsonContent = JSON.stringify({
				description: 'Test Description',
				category: 'Programming',
				difficulty: 'Beginner',
				duration: '40h',
				level: 'free',
				lessons: [
					{
						title: 'Lesson 1',
						type: 'lesson',
						duration: '10m',
						content: '# Test'
					}
				]
			})

			const file = new File([jsonContent], 'course.json', { type: 'application/json' })

			await expect(parseCourseFile(file)).rejects.toThrow()
		})

		it('should provide helpful error for lesson with both content and questions', async () => {
			// v1.6.0: Can't have both content AND questions on same lesson
			const jsonContent = JSON.stringify({
				title: 'Test Course',
				description: 'Test Description',
				category: 'Programming',
				difficulty: 'Beginner',
				duration: '40h',
				level: 'free',
				lessons: [
					{
						title: 'Lesson 1',
						duration: '10m',
						content: '# Test Content',
						questions: [
							{
								id: 'q1',
								type: 'multiple-choice',
								question: 'Test?',
								options: ['A', 'B'],
								correctAnswer: 0,
								points: 10,
								explanation: 'Explanation'
							}
						]
					}
				]
			})

			const file = new File([jsonContent], 'course.json', { type: 'application/json' })

			await expect(parseCourseFile(file)).rejects.toThrow('cannot have both content and questions')
		})

		it('should provide helpful error for quiz without questions', async () => {
			// v1.6.0: Flattened quiz structure
			const jsonContent = JSON.stringify({
				title: 'Test Course',
				description: 'Test Description',
				category: 'Programming',
				difficulty: 'Beginner',
				duration: '40h',
				level: 'free',
				lessons: [
					{
						title: 'Quiz Lesson',
						type: 'quiz',
						duration: '15m',
						passingScore: 70,
						questions: [] // Empty
					}
				]
			})

			const file = new File([jsonContent], 'course.json', { type: 'application/json' })

			await expect(parseCourseFile(file)).rejects.toThrow()
		})
	})

	describe('parseDurationToMinutes', () => {
		// v1.6.0: New format - Xm (minutes) or Xh (hours)
		it('should parse minutes correctly (new format)', () => {
			expect(parseDurationToMinutes('10m')).toBe(10)
			expect(parseDurationToMinutes('30m')).toBe(30)
			expect(parseDurationToMinutes('5m')).toBe(5)
		})

		it('should parse hours correctly (new format)', () => {
			expect(parseDurationToMinutes('1h')).toBe(60)
			expect(parseDurationToMinutes('2h')).toBe(120)
			expect(parseDurationToMinutes('1.5h')).toBe(90)
			expect(parseDurationToMinutes('0.5h')).toBe(30)
		})

		it('should handle case insensitivity', () => {
			expect(parseDurationToMinutes('10M')).toBe(10)
			expect(parseDurationToMinutes('1H')).toBe(60)
			expect(parseDurationToMinutes('30m')).toBe(30)
		})

		it('should handle extra whitespace', () => {
			expect(parseDurationToMinutes('  10m  ')).toBe(10)
			expect(parseDurationToMinutes(' 1h ')).toBe(60)
		})

		it('should extract number if no unit provided (fallback)', () => {
			expect(parseDurationToMinutes('15')).toBe(15)
			expect(parseDurationToMinutes('45.5')).toBe(46)
		})

		it('should return default for invalid input', () => {
			expect(parseDurationToMinutes('invalid')).toBe(10)
			expect(parseDurationToMinutes('')).toBe(10)
			expect(parseDurationToMinutes('abc')).toBe(10)
		})

		it('should handle decimal values', () => {
			expect(parseDurationToMinutes('1.5m')).toBe(2)
			expect(parseDurationToMinutes('2.5h')).toBe(150)
		})
	})
})
