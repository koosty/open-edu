/**
 * Integration Tests for Lesson and Quiz Reordering
 * Part of v1.6.0 architecture - ARCH-019a/019b
 * Tests the complete reordering workflow including metadata synchronization
 */

import { describe, test, expect, beforeEach, vi } from "vitest"
import {
	createMockDocSnap,
	mockDocRef,
	mockTimestamp,
} from "$lib/test-utils/firebase-mocks"
import type { Lesson } from "$lib/types/lesson"
import type { Quiz } from "$lib/types/quiz"

// Mock Firebase functions
const mockFirestore = {
	collection: vi.fn(),
	doc: vi.fn(),
	getDoc: vi.fn(),
	getDocs: vi.fn(),
	query: vi.fn(),
	where: vi.fn(),
	orderBy: vi.fn(),
	writeBatch: vi.fn(),
	serverTimestamp: vi.fn(() => mockTimestamp),
	increment: vi.fn((n) => ({ __increment: n })),
	arrayUnion: vi.fn((items) => ({ __arrayUnion: items })),
	arrayRemove: vi.fn((items) => ({ __arrayRemove: items })),
}

// Mock Firebase before importing services
vi.mock("firebase/firestore", () => mockFirestore)
vi.mock("$lib/firebase", () => ({ db: "mock-db-instance" }))

// Mock validation schemas
vi.mock("$lib/firebase/schemas", () => ({
	lessonDocumentSchema: { parse: vi.fn((data) => data) },
}))

// Import services after mocks
const { LessonService } = await import("$lib/services/lessons")
const { batchUpdateQuizzes } = await import("$lib/services/quiz")

// Helper to create mock lesson
const createMockLesson = (overrides: Partial<Lesson> = {}): Lesson => ({
	id: "lesson-123",
	courseId: "course-123",
	title: "Test Lesson",
	content: "# Test Content",
	order: 0,
	duration: 15,
	isRequired: true,
	createdAt: "2024-01-01T00:00:00.000Z",
	updatedAt: "2024-01-01T00:00:00.000Z",
	...overrides,
})

// Helper to create mock quiz with required order for batch updates
type QuizWithOrder = Quiz & { order: number }
const createMockQuiz = (overrides: Partial<Quiz> & { order: number }): QuizWithOrder =>
	({
		id: "quiz-123",
		courseId: "course-123",
		lessonId: "lesson-123",
		title: "Test Quiz",
		questions: [],
		passingScore: 70,
		timeLimit: 600,
		isPublished: false,
		createdAt: "2024-01-01T00:00:00.000Z",
		updatedAt: "2024-01-01T00:00:00.000Z",
		...overrides, // order comes from overrides (required)
	}) as QuizWithOrder

// Helper to create mock batch
const createMockBatch = () => ({
	set: vi.fn(),
	update: vi.fn(),
	delete: vi.fn(),
	commit: vi.fn().mockResolvedValue(undefined),
})

describe("Lesson Reordering Integration Tests - ARCH-019a", () => {
	let mockBatch: ReturnType<typeof createMockBatch>

	beforeEach(() => {
		// Reset all mocks
		Object.values(mockFirestore).forEach((mock) => {
			if (typeof mock === "function" && "mockReset" in mock) {
				mock.mockReset()
			}
		})

		mockBatch = createMockBatch()
		mockFirestore.writeBatch.mockReturnValue(mockBatch)
		mockFirestore.doc.mockReturnValue(mockDocRef)
		mockFirestore.collection.mockReturnValue("mock-collection")
		mockFirestore.query.mockReturnValue("mock-query")
		mockFirestore.where.mockReturnValue("mock-where")
		mockFirestore.orderBy.mockReturnValue("mock-orderBy")
		mockFirestore.serverTimestamp.mockReturnValue(mockTimestamp)
	})

	describe("Batch Save Operations", () => {
		test("should update multiple lessons order in a single batch", async () => {
			const lessons = [
				{ id: "lesson-1", order: 2, title: "Lesson 1", isRequired: true },
				{ id: "lesson-2", order: 0, title: "Lesson 2", isRequired: true },
				{ id: "lesson-3", order: 1, title: "Lesson 3", isRequired: true },
			]

			await LessonService.batchUpdateLessons("course-123", lessons)

			// Should call update for each lesson + course
			expect(mockBatch.update).toHaveBeenCalledTimes(4)
			expect(mockBatch.commit).toHaveBeenCalledTimes(1)
		})

		test("should maintain atomicity - all updates in single commit", async () => {
			const lessons = Array.from({ length: 10 }, (_, i) => ({
				id: `lesson-${i}`,
				order: 9 - i, // Reverse order
				title: `Lesson ${i}`,
				isRequired: true,
			}))

			await LessonService.batchUpdateLessons("course-123", lessons)

			// All 10 lessons + 1 course update, but only 1 commit
			expect(mockBatch.update).toHaveBeenCalledTimes(11)
			expect(mockBatch.commit).toHaveBeenCalledTimes(1)
		})

		test("should rollback all changes if batch fails", async () => {
			const lessons = [
				{ id: "lesson-1", order: 0, title: "Lesson 1", isRequired: true },
				{ id: "lesson-2", order: 1, title: "Lesson 2", isRequired: true },
			]

			mockBatch.commit.mockRejectedValue(new Error("Network error"))

			await expect(
				LessonService.batchUpdateLessons("course-123", lessons)
			).rejects.toThrow("Network error")

			// Updates were added but commit failed - atomic rollback
			expect(mockBatch.update).toHaveBeenCalled()
			expect(mockBatch.commit).toHaveBeenCalled()
		})
	})

	describe("Metadata Synchronization", () => {
		test("should sync lessonsMetadata array to course document", async () => {
			const lessons = [
				{
					id: "lesson-1",
					order: 0,
					title: "First",
					isRequired: true,
					duration: 10,
				},
				{
					id: "lesson-2",
					order: 1,
					title: "Second",
					isRequired: false,
					duration: 20,
				},
			]

			await LessonService.batchUpdateLessons("course-123", lessons)

			// Find the course update call
			const courseUpdateCall = mockBatch.update.mock.calls.find(
				(call) =>
					call[1] &&
					"lessonsMetadata" in call[1] &&
					Array.isArray(call[1].lessonsMetadata)
			)

			expect(courseUpdateCall).toBeDefined()
			const metadata = courseUpdateCall![1].lessonsMetadata

			expect(metadata).toHaveLength(2)
			expect(metadata[0]).toMatchObject({
				id: "lesson-1",
				title: "First",
				order: 0,
				isRequired: true,
			})
			expect(metadata[1]).toMatchObject({
				id: "lesson-2",
				title: "Second",
				order: 1,
				isRequired: false,
			})
		})

		test("should update totalLessons count on course", async () => {
			const lessons = Array.from({ length: 5 }, (_, i) => ({
				id: `lesson-${i}`,
				order: i,
				title: `Lesson ${i}`,
				isRequired: true,
			}))

			await LessonService.batchUpdateLessons("course-123", lessons)

			const courseUpdateCall = mockBatch.update.mock.calls.find(
				(call) => call[1] && "totalLessons" in call[1]
			)

			expect(courseUpdateCall).toBeDefined()
			expect(courseUpdateCall![1].totalLessons).toBe(5)
		})

		test("should preserve lesson type in metadata", async () => {
			const lessons = [
				{
					id: "lesson-1",
					order: 0,
					title: "Content",
					isRequired: true,
				},
				{
					id: "lesson-2",
					order: 1,
					title: "Video",
					isRequired: true,
					videoUrl: "https://example.com/video.mp4",
				},
				{
					id: "lesson-3",
					order: 2,
					title: "Quiz",
					isRequired: true,
					quiz: { id: "quiz-1" },
				},
			]

			await LessonService.batchUpdateLessons("course-123", lessons)

			const courseUpdateCall = mockBatch.update.mock.calls.find(
				(call) =>
					call[1] &&
					"lessonsMetadata" in call[1] &&
					Array.isArray(call[1].lessonsMetadata)
			)
			const metadata = courseUpdateCall![1].lessonsMetadata

			expect(metadata[0].type).toBe("content")
			expect(metadata[1].type).toBe("video")
			expect(metadata[2].type).toBe("quiz")
		})
	})

	describe("Concurrent Edit Scenarios", () => {
		test("should handle reordering during lesson content edit", async () => {
			// Simulate lesson content being edited while reorder happens
			const lesson = createMockLesson({ id: "lesson-1", order: 0 })
			const lessonSnap = createMockDocSnap(lesson, "lesson-1", true)

			mockFirestore.getDoc.mockResolvedValue(lessonSnap)

			// Update content via regular update
			await LessonService.updateLesson("lesson-1", {
				content: "# Updated Content",
			})

			expect(mockBatch.update).toHaveBeenCalled()
			expect(mockBatch.commit).toHaveBeenCalled()
		})

		test("should use batch writes to prevent race conditions", async () => {
			const lessons = [
				{ id: "lesson-1", order: 1, title: "Lesson 1", isRequired: true },
				{ id: "lesson-2", order: 0, title: "Lesson 2", isRequired: true },
			]

			// Simulate two concurrent reorder operations
			const promise1 = LessonService.batchUpdateLessons("course-123", lessons)
			const promise2 = LessonService.batchUpdateLessons("course-123", [
				{ id: "lesson-1", order: 0, title: "Lesson 1", isRequired: true },
				{ id: "lesson-2", order: 1, title: "Lesson 2", isRequired: true },
			])

			await Promise.all([promise1, promise2])

			// Both should complete (in real Firestore, last write wins)
			expect(mockBatch.commit).toHaveBeenCalledTimes(2)
		})
	})

	describe("Large Course Performance", () => {
		test("should handle reordering 50+ lessons", async () => {
			const lessons = Array.from({ length: 50 }, (_, i) => ({
				id: `lesson-${i}`,
				order: 49 - i, // Reverse all
				title: `Lesson ${i}`,
				isRequired: true,
			}))

			const startTime = Date.now()
			await LessonService.batchUpdateLessons("course-123", lessons)
			const duration = Date.now() - startTime

			// Should complete quickly (mocked, but validates structure)
			expect(duration).toBeLessThan(1000)
			expect(mockBatch.update).toHaveBeenCalledTimes(51) // 50 lessons + 1 course
			expect(mockBatch.commit).toHaveBeenCalledTimes(1)
		})

		test("should handle reordering 100 lessons", async () => {
			const lessons = Array.from({ length: 100 }, (_, i) => ({
				id: `lesson-${i}`,
				order: i,
				title: `Lesson ${i}`,
				isRequired: true,
			}))

			await LessonService.batchUpdateLessons("course-123", lessons)

			expect(mockBatch.update).toHaveBeenCalledTimes(101)
			expect(mockBatch.commit).toHaveBeenCalledTimes(1)
		})
	})

	describe("Order Persistence", () => {
		test("should persist order across page reloads", async () => {
			const lessons = [
				{ id: "lesson-1", order: 2, title: "Moved to end", isRequired: true },
				{
					id: "lesson-2",
					order: 0,
					title: "Moved to start",
					isRequired: true,
				},
				{ id: "lesson-3", order: 1, title: "Middle", isRequired: true },
			]

			await LessonService.batchUpdateLessons("course-123", lessons)

			// Verify each lesson was updated with correct order
			const lessonUpdates = mockBatch.update.mock.calls.filter(
				(call) => call[1] && "order" in call[1] && !("lessonsMetadata" in call[1])
			)

			expect(lessonUpdates).toHaveLength(3)

			// Each lesson should have its order updated
			const orders = lessonUpdates.map((call) => call[1].order)
			expect(orders).toContain(0)
			expect(orders).toContain(1)
			expect(orders).toContain(2)
		})
	})
})

describe("Quiz Reordering Integration Tests - ARCH-019b", () => {
	let mockBatch: ReturnType<typeof createMockBatch>

	beforeEach(() => {
		Object.values(mockFirestore).forEach((mock) => {
			if (typeof mock === "function" && "mockReset" in mock) {
				mock.mockReset()
			}
		})

		mockBatch = createMockBatch()
		mockFirestore.writeBatch.mockReturnValue(mockBatch)
		mockFirestore.doc.mockReturnValue(mockDocRef)
		mockFirestore.collection.mockReturnValue("mock-collection")
		mockFirestore.query.mockReturnValue("mock-query")
		mockFirestore.where.mockReturnValue("mock-where")
		mockFirestore.orderBy.mockReturnValue("mock-orderBy")
		mockFirestore.serverTimestamp.mockReturnValue(mockTimestamp)
	})

	describe("Quiz Reorder Workflow", () => {
		test("should update quiz order and sync metadata", async () => {
			const quizzes = [
				createMockQuiz({ id: "quiz-1", order: 1, title: "Quiz 1" }),
				createMockQuiz({ id: "quiz-2", order: 0, title: "Quiz 2" }),
			]

			await batchUpdateQuizzes("course-123", quizzes)

			expect(mockBatch.update).toHaveBeenCalled()
			expect(mockBatch.commit).toHaveBeenCalled()
		})

		test("should update quizzesMetadata array on course", async () => {
			const quizzes = [
				createMockQuiz({
					id: "quiz-1",
					order: 0,
					title: "First Quiz",
					passingScore: 70,
				}),
				createMockQuiz({
					id: "quiz-2",
					order: 1,
					title: "Second Quiz",
					passingScore: 80,
				}),
			]

			await batchUpdateQuizzes("course-123", quizzes)

			// Find the course update call with quizzesMetadata
			const courseUpdateCall = mockBatch.update.mock.calls.find(
				(call) =>
					call[1] &&
					"quizzesMetadata" in call[1] &&
					Array.isArray(call[1].quizzesMetadata)
			)

			expect(courseUpdateCall).toBeDefined()
			const metadata = courseUpdateCall![1].quizzesMetadata

			expect(metadata).toHaveLength(2)
			expect(metadata[0].title).toBe("First Quiz")
			expect(metadata[1].title).toBe("Second Quiz")
		})

		test("should update totalQuizzes count", async () => {
			const quizzes = Array.from({ length: 5 }, (_, i) =>
				createMockQuiz({ id: `quiz-${i}`, order: i, title: `Quiz ${i}` })
			)

			await batchUpdateQuizzes("course-123", quizzes)

			const courseUpdateCall = mockBatch.update.mock.calls.find(
				(call) => call[1] && "totalQuizzes" in call[1]
			)

			expect(courseUpdateCall).toBeDefined()
			expect(courseUpdateCall![1].totalQuizzes).toBe(5)
		})
	})

	describe("Mixed Lesson + Quiz Reordering", () => {
		test("should handle independent lesson and quiz reordering", async () => {
			// This simulates instructor reordering both lessons and quizzes in same session
			const lessons = [
				{ id: "lesson-1", order: 1, title: "Lesson 1", isRequired: true },
				{ id: "lesson-2", order: 0, title: "Lesson 2", isRequired: true },
			]

			const quizzes = [
				createMockQuiz({ id: "quiz-1", order: 1, title: "Quiz 1" }),
				createMockQuiz({ id: "quiz-2", order: 0, title: "Quiz 2" }),
			]

			// Both operations should succeed independently
			await Promise.all([
				LessonService.batchUpdateLessons("course-123", lessons),
				batchUpdateQuizzes("course-123", quizzes),
			])

			// Both batches committed
			expect(mockBatch.commit).toHaveBeenCalledTimes(2)
		})
	})

	describe("Quiz Order Persistence", () => {
		test("should persist quiz order correctly", async () => {
			const quizzes = [
				createMockQuiz({ id: "quiz-3", order: 0, title: "Now First" }),
				createMockQuiz({ id: "quiz-1", order: 1, title: "Now Second" }),
				createMockQuiz({ id: "quiz-2", order: 2, title: "Now Third" }),
			]

			await batchUpdateQuizzes("course-123", quizzes)

			// Verify quiz documents were updated
			const quizUpdates = mockBatch.update.mock.calls.filter(
				(call) =>
					call[1] && "order" in call[1] && !("quizzesMetadata" in call[1])
			)

			expect(quizUpdates).toHaveLength(3)
		})

		test("should handle empty quiz array", async () => {
			await batchUpdateQuizzes("course-123", [])

			// Should still update course with empty metadata
			expect(mockBatch.update).toHaveBeenCalledTimes(1)
			expect(mockBatch.commit).toHaveBeenCalled()

			const courseUpdateCall = mockBatch.update.mock.calls[0]
			expect(courseUpdateCall[1].quizzesMetadata).toEqual([])
			expect(courseUpdateCall[1].totalQuizzes).toBe(0)
		})
	})
})

describe("Error Recovery Tests", () => {
	let mockBatch: ReturnType<typeof createMockBatch>

	beforeEach(() => {
		Object.values(mockFirestore).forEach((mock) => {
			if (typeof mock === "function" && "mockReset" in mock) {
				mock.mockReset()
			}
		})

		mockBatch = createMockBatch()
		mockFirestore.writeBatch.mockReturnValue(mockBatch)
		mockFirestore.doc.mockReturnValue(mockDocRef)
		mockFirestore.serverTimestamp.mockReturnValue(mockTimestamp)
	})

	test("should propagate batch commit errors to caller", async () => {
		const lessons = [
			{ id: "lesson-1", order: 0, title: "Lesson 1", isRequired: true },
		]

		mockBatch.commit.mockRejectedValue(new Error("Permission denied"))

		await expect(
			LessonService.batchUpdateLessons("course-123", lessons)
		).rejects.toThrow("Permission denied")
	})

	test("should handle network timeout errors", async () => {
		const lessons = [
			{ id: "lesson-1", order: 0, title: "Lesson 1", isRequired: true },
		]

		mockBatch.commit.mockRejectedValue(new Error("Network timeout"))

		await expect(
			LessonService.batchUpdateLessons("course-123", lessons)
		).rejects.toThrow("Network timeout")
	})
})
