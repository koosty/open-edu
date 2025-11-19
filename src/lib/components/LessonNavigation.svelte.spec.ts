import { describe, it, expect, vi } from 'vitest'
import { render } from 'vitest-browser-svelte'
import { page } from 'vitest/browser'
import LessonNavigation from './LessonNavigation.svelte'
import type { Lesson } from '$lib/types'

// Mock lessons for testing
const mockPreviousLesson: Lesson = {
	id: 'lesson-1',
	courseId: 'course-1',
	title: 'Introduction to JavaScript',
	description: 'Learn the basics',
	type: 'lesson',
	order: 1,
	content: '# Introduction',
	isRequired: true,
	createdAt: '2024-01-01T00:00:00.000Z',
	updatedAt: '2024-01-01T00:00:00.000Z'
}

const mockNextLesson: Lesson = {
	id: 'lesson-3',
	courseId: 'course-1',
	title: 'Functions and Scope',
	description: 'Learn about functions',
	type: 'lesson',
	order: 3,
	content: '# Functions',
	isRequired: true,
	createdAt: '2024-01-03T00:00:00.000Z',
	updatedAt: '2024-01-03T00:00:00.000Z'
}

describe('LessonNavigation', () => {
	describe('Rendering with both prev and next', () => {
		it('should render previous and next buttons', async () => {
			const onNavigate = vi.fn()
			
			render(LessonNavigation, {
				props: {
					previousLesson: mockPreviousLesson,
					nextLesson: mockNextLesson,
					currentLessonIndex: 1,
					totalLessons: 3,
					onNavigate
				}
			})

			const prevButton = await page.getByLabelText(/previous lesson/i)
			const nextButton = await page.getByLabelText(/next lesson/i)
			
			await expect.element(prevButton).toBeInTheDocument()
			await expect.element(nextButton).toBeInTheDocument()
		})

		it('should display progress indicator', async () => {
			render(LessonNavigation, {
				props: {
					previousLesson: mockPreviousLesson,
					nextLesson: mockNextLesson,
					currentLessonIndex: 1,
					totalLessons: 3,
					onNavigate: vi.fn()
				}
			})

			const progress = await page.getByText('2 / 3')
			await expect.element(progress).toBeInTheDocument()
		})
	})

	describe('Rendering on first lesson', () => {
		it('should not render previous button', async () => {
			render(LessonNavigation, {
				props: {
					previousLesson: null,
					nextLesson: mockNextLesson,
					currentLessonIndex: 0,
					totalLessons: 3,
					onNavigate: vi.fn()
				}
			})

			const prevButton = page.getByLabelText(/previous lesson/i)
			await expect.element(prevButton).not.toBeInTheDocument()

			const nextButton = await page.getByLabelText(/next lesson/i)
			await expect.element(nextButton).toBeInTheDocument()
		})
	})

	describe('Rendering on last lesson', () => {
		it('should not render next button', async () => {
			render(LessonNavigation, {
				props: {
					previousLesson: mockPreviousLesson,
					nextLesson: null,
					currentLessonIndex: 2,
					totalLessons: 3,
					onNavigate: vi.fn()
				}
			})

			const prevButton = await page.getByLabelText(/previous lesson/i)
			await expect.element(prevButton).toBeInTheDocument()

			const nextButton = page.getByLabelText(/next lesson/i)
			await expect.element(nextButton).not.toBeInTheDocument()
		})

		it('should render "Course Complete" button when completed', async () => {
			const onCourseComplete = vi.fn()

			render(LessonNavigation, {
				props: {
					previousLesson: mockPreviousLesson,
					nextLesson: null,
					currentLessonIndex: 2,
					totalLessons: 3,
					isCompleted: true,
					onNavigate: vi.fn(),
					onCourseComplete
				}
			})

			const courseCompleteButton = await page.getByLabelText(/view course completion/i)
			await expect.element(courseCompleteButton).toBeInTheDocument()
		})
	})

	describe('Mark Complete button', () => {
		it('should render when lesson is not completed', async () => {
			const onComplete = vi.fn()

			render(LessonNavigation, {
				props: {
					previousLesson: mockPreviousLesson,
					nextLesson: mockNextLesson,
					currentLessonIndex: 1,
					totalLessons: 3,
					isCompleted: false,
					showMarkComplete: true,
					onNavigate: vi.fn(),
					onComplete
				}
			})

			const completeButton = await page.getByLabelText(/mark lesson as complete/i)
			await expect.element(completeButton).toBeInTheDocument()
		})

		it('should not render when lesson is completed', async () => {
			render(LessonNavigation, {
				props: {
					previousLesson: mockPreviousLesson,
					nextLesson: mockNextLesson,
					currentLessonIndex: 1,
					totalLessons: 3,
					isCompleted: true,
					onNavigate: vi.fn(),
					onComplete: vi.fn()
				}
			})

			const completeButton = page.getByLabelText(/mark lesson as complete/i)
			await expect.element(completeButton).not.toBeInTheDocument()
		})

		it('should be disabled when completing', async () => {
			render(LessonNavigation, {
				props: {
					previousLesson: mockPreviousLesson,
					nextLesson: mockNextLesson,
					currentLessonIndex: 1,
					totalLessons: 3,
					isCompleted: false,
					completing: true,
					showMarkComplete: true,
					onNavigate: vi.fn(),
					onComplete: vi.fn()
				}
			})

			const completeButton = await page.getByLabelText(/mark lesson as complete/i)
			await expect.element(completeButton).toBeDisabled()
		})
	})

	describe('Navigation behavior', () => {
		it('should call onNavigate with previous lesson when clicked', async () => {
			const onNavigate = vi.fn()

			render(LessonNavigation, {
				props: {
					previousLesson: mockPreviousLesson,
					nextLesson: mockNextLesson,
					currentLessonIndex: 1,
					totalLessons: 3,
					onNavigate
				}
			})

			const prevButton = await page.getByLabelText(/previous lesson/i)
			await prevButton.click()

			expect(onNavigate).toHaveBeenCalledWith(mockPreviousLesson)
			expect(onNavigate).toHaveBeenCalledTimes(1)
		})

		it('should call onNavigate with next lesson when clicked', async () => {
			const onNavigate = vi.fn()

			render(LessonNavigation, {
				props: {
					previousLesson: mockPreviousLesson,
					nextLesson: mockNextLesson,
					currentLessonIndex: 1,
					totalLessons: 3,
					canNavigateNext: true,
					onNavigate
				}
			})

			const nextButton = await page.getByLabelText(/next lesson/i)
			await nextButton.click()

			expect(onNavigate).toHaveBeenCalledWith(mockNextLesson)
			expect(onNavigate).toHaveBeenCalledTimes(1)
		})

		it('should disable next button when canNavigateNext is false', async () => {
			render(LessonNavigation, {
				props: {
					previousLesson: mockPreviousLesson,
					nextLesson: mockNextLesson,
					currentLessonIndex: 1,
					totalLessons: 3,
					canNavigateNext: false,
					onNavigate: vi.fn()
				}
			})

			const nextButton = await page.getByLabelText(/next lesson/i)
			await expect.element(nextButton).toBeDisabled()
		})

		it('should call onComplete when mark complete button clicked', async () => {
			const onComplete = vi.fn()

			render(LessonNavigation, {
				props: {
					previousLesson: mockPreviousLesson,
					nextLesson: mockNextLesson,
					currentLessonIndex: 1,
					totalLessons: 3,
					isCompleted: false,
					showMarkComplete: true,
					onNavigate: vi.fn(),
					onComplete
				}
			})

			const completeButton = await page.getByLabelText(/mark lesson as complete/i)
			await completeButton.click()

			expect(onComplete).toHaveBeenCalledTimes(1)
		})
	})

	describe('Accessibility', () => {
		it('should have proper aria-label on navigation element', async () => {
			const { container } = render(LessonNavigation, {
				props: {
					previousLesson: mockPreviousLesson,
					nextLesson: mockNextLesson,
					currentLessonIndex: 1,
					totalLessons: 3,
					onNavigate: vi.fn()
				}
			})

			const nav = container.querySelector('nav')
			expect(nav?.getAttribute('aria-label')).toBe('Lesson navigation')
		})

		it('should have proper aria-label on progress indicator', async () => {
			render(LessonNavigation, {
				props: {
					previousLesson: mockPreviousLesson,
					nextLesson: mockNextLesson,
					currentLessonIndex: 1,
					totalLessons: 3,
					onNavigate: vi.fn()
				}
			})

			const progressIndicator = await page.getByLabelText(/lesson 2 of 3/i)
			await expect.element(progressIndicator).toBeInTheDocument()
		})
	})
})
