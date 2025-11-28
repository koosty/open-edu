/**
 * Tests for LessonService
 * Comprehensive test coverage for all lesson CRUD operations
 * Part of v1.6.0 architecture - separate lessons collection
 */

import { describe, test, expect, beforeEach, vi } from "vitest"
import { COLLECTIONS } from "$lib/firebase/collections"
import {
	createMockDocSnap,
	createMockQuerySnap,
	mockDocRef,
	mockTimestamp,
} from "$lib/test-utils/firebase-mocks"
import type { Lesson } from "$lib/types/lesson"

// Mock Firebase functions before importing service
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

// Mock Firebase before importing service
vi.mock("firebase/firestore", () => mockFirestore)
vi.mock("$lib/firebase", () => ({ db: "mock-db-instance" }))

// Mock validation schemas
vi.mock("$lib/firebase/schemas", () => ({
	lessonDocumentSchema: { parse: vi.fn((data) => data) },
}))

// Now import the service after mocks are set up
const { LessonService } = await import("$lib/services/lessons")

// Helper to create mock lesson
const createMockLesson = (overrides: Partial<Lesson> = {}): Lesson => ({
	id: "lesson-123",
	courseId: "course-123",
	title: "Test Lesson",
	content: "# Test Content\n\nThis is test content.",
	order: 1,
	duration: 15,
	isRequired: true,
	createdAt: "2024-01-01T00:00:00.000Z",
	updatedAt: "2024-01-01T00:00:00.000Z",
	...overrides,
})

// Helper to create mock batch
const createMockBatch = () => ({
	set: vi.fn(),
	update: vi.fn(),
	delete: vi.fn(),
	commit: vi.fn().mockResolvedValue(undefined),
})

describe("LessonService", () => {
	let mockBatch: ReturnType<typeof createMockBatch>

	beforeEach(() => {
		// Reset all mocks
		Object.values(mockFirestore).forEach((mock) => {
			if (typeof mock === "function" && "mockReset" in mock) {
				mock.mockReset()
			}
		})

		// Setup default batch mock
		mockBatch = createMockBatch()
		mockFirestore.writeBatch.mockReturnValue(mockBatch)

		// Setup default successful operations
		mockFirestore.getDoc.mockResolvedValue(
			createMockDocSnap({}, "test-id", true)
		)
		mockFirestore.getDocs.mockResolvedValue(createMockQuerySnap([]))
		mockFirestore.doc.mockReturnValue(mockDocRef)
		mockFirestore.collection.mockReturnValue("mock-collection")
		mockFirestore.query.mockReturnValue("mock-query")
		mockFirestore.where.mockReturnValue("mock-where")
		mockFirestore.orderBy.mockReturnValue("mock-orderBy")
		mockFirestore.serverTimestamp.mockReturnValue(mockTimestamp)
	})

	describe("getLesson", () => {
		test("should return lesson when it exists", async () => {
			const mockLesson = createMockLesson({ id: "lesson-123" })
			const mockSnap = createMockDocSnap(mockLesson, "lesson-123", true)

			mockFirestore.doc.mockReturnValue(mockDocRef)
			mockFirestore.getDoc.mockResolvedValue(mockSnap)

			const result = await LessonService.getLesson("lesson-123")

			expect(mockFirestore.doc).toHaveBeenCalledWith(
				"mock-db-instance",
				COLLECTIONS.LESSONS,
				"lesson-123"
			)
			expect(mockFirestore.getDoc).toHaveBeenCalledWith(mockDocRef)
			expect(result).toEqual(
				expect.objectContaining({
					id: "lesson-123",
					title: "Test Lesson",
				})
			)
		})

		test("should return null when lesson does not exist", async () => {
			const mockSnap = createMockDocSnap({}, "lesson-123", false)

			mockFirestore.doc.mockReturnValue(mockDocRef)
			mockFirestore.getDoc.mockResolvedValue(mockSnap)

			const result = await LessonService.getLesson("lesson-123")

			expect(result).toBeNull()
		})

		test("should handle errors gracefully", async () => {
			const error = new Error("Database connection failed")
			mockFirestore.getDoc.mockRejectedValue(error)

			await expect(LessonService.getLesson("lesson-123")).rejects.toThrow(
				"Database connection failed"
			)
		})

		test("should convert Firestore timestamps", async () => {
			const lessonWithTimestamp = {
				...createMockLesson(),
				createdAt: mockTimestamp,
				updatedAt: mockTimestamp,
			}
			const mockSnap = createMockDocSnap(
				lessonWithTimestamp,
				"lesson-123",
				true
			)

			mockFirestore.doc.mockReturnValue(mockDocRef)
			mockFirestore.getDoc.mockResolvedValue(mockSnap)

			const result = await LessonService.getLesson("lesson-123")

			expect(result?.createdAt).toBe("2024-01-01T00:00:00.000Z")
			expect(result?.updatedAt).toBe("2024-01-01T00:00:00.000Z")
		})
	})

	describe("getLessonsByCourse", () => {
		test("should return lessons ordered by order field", async () => {
			const mockLessons = [
				createMockLesson({ id: "lesson-1", order: 1 }),
				createMockLesson({ id: "lesson-2", order: 2 }),
				createMockLesson({ id: "lesson-3", order: 3 }),
			]
			const mockSnap = createMockQuerySnap(mockLessons)

			mockFirestore.getDocs.mockResolvedValue(mockSnap)

			const result = await LessonService.getLessonsByCourse("course-123")

			expect(mockFirestore.where).toHaveBeenCalledWith(
				"courseId",
				"==",
				"course-123"
			)
			expect(mockFirestore.orderBy).toHaveBeenCalledWith("order", "asc")
			expect(result).toHaveLength(3)
			expect(result[0].id).toBe("lesson-1")
			expect(result[1].id).toBe("lesson-2")
			expect(result[2].id).toBe("lesson-3")
		})

		test("should return empty array when no lessons exist", async () => {
			const mockSnap = createMockQuerySnap([])

			mockFirestore.getDocs.mockResolvedValue(mockSnap)

			const result = await LessonService.getLessonsByCourse("course-123")

			expect(result).toEqual([])
		})

		test("should handle errors gracefully", async () => {
			const error = new Error("Query failed")
			mockFirestore.getDocs.mockRejectedValue(error)

			await expect(
				LessonService.getLessonsByCourse("course-123")
			).rejects.toThrow("Query failed")
		})
	})

	describe("createLesson", () => {
		test("should create lesson and update course metadata", async () => {
			const newLessonData = {
				courseId: "course-123",
				title: "New Lesson",
				content: "# New Content",
				order: 1,
				duration: 20,
				isRequired: true,
			}

			// Mock doc to return a ref with ID
			const lessonRef = { ...mockDocRef, id: "new-lesson-id" }
			mockFirestore.doc.mockReturnValue(lessonRef)
			mockFirestore.collection.mockReturnValue("mock-collection")

			const result = await LessonService.createLesson(newLessonData)

			expect(result).toBe("new-lesson-id")
			expect(mockBatch.set).toHaveBeenCalled()
			expect(mockBatch.update).toHaveBeenCalled()
			expect(mockBatch.commit).toHaveBeenCalled()
		})

		test("should include metadata with correct type for content lesson", async () => {
			const newLessonData = {
				courseId: "course-123",
				title: "Content Lesson",
				content: "# Content",
				order: 1,
				duration: 15,
				isRequired: true,
			}

			const lessonRef = { ...mockDocRef, id: "content-lesson-id" }
			mockFirestore.doc.mockReturnValue(lessonRef)

			await LessonService.createLesson(newLessonData)

			// Check arrayUnion was called with correct metadata
			expect(mockFirestore.arrayUnion).toHaveBeenCalledWith(
				expect.objectContaining({
					id: "content-lesson-id",
					title: "Content Lesson",
					type: "content",
					hasQuiz: false,
				})
			)
		})

		test("should include metadata with video type for video lesson", async () => {
			const newLessonData = {
				courseId: "course-123",
				title: "Video Lesson",
				videoUrl: "https://example.com/video.mp4",
				order: 1,
				duration: 30,
				isRequired: true,
			}

			const lessonRef = { ...mockDocRef, id: "video-lesson-id" }
			mockFirestore.doc.mockReturnValue(lessonRef)

			await LessonService.createLesson(newLessonData)

			expect(mockFirestore.arrayUnion).toHaveBeenCalledWith(
				expect.objectContaining({
					type: "video",
				})
			)
		})

		test("should increment totalLessons on course", async () => {
			const newLessonData = {
				courseId: "course-123",
				title: "New Lesson",
				order: 1,
				isRequired: true,
			}

			const lessonRef = { ...mockDocRef, id: "new-lesson-id" }
			mockFirestore.doc.mockReturnValue(lessonRef)

			await LessonService.createLesson(newLessonData)

			expect(mockFirestore.increment).toHaveBeenCalledWith(1)
		})

		test("should handle creation errors", async () => {
			const newLessonData = {
				courseId: "course-123",
				title: "New Lesson",
				order: 1,
				isRequired: true,
			}

			mockBatch.commit.mockRejectedValue(new Error("Batch commit failed"))

			await expect(
				LessonService.createLesson(newLessonData)
			).rejects.toThrow("Batch commit failed")
		})
	})

	describe("updateLesson", () => {
		test("should update lesson and sync course metadata", async () => {
			const existingLesson = createMockLesson({ id: "lesson-123" })
			const mockSnap = createMockDocSnap(existingLesson, "lesson-123", true)

			mockFirestore.getDoc.mockResolvedValue(mockSnap)

			await LessonService.updateLesson("lesson-123", {
				title: "Updated Title",
			})

			expect(mockBatch.update).toHaveBeenCalled()
			expect(mockBatch.commit).toHaveBeenCalled()
		})

		test("should throw error when lesson not found", async () => {
			const mockSnap = createMockDocSnap({}, "lesson-123", false)
			mockFirestore.getDoc.mockResolvedValue(mockSnap)

			await expect(
				LessonService.updateLesson("lesson-123", { title: "Updated" })
			).rejects.toThrow("Lesson not found")
		})

		test("should remove old metadata and add new metadata", async () => {
			const existingLesson = createMockLesson({
				id: "lesson-123",
				title: "Old Title",
			})
			const mockSnap = createMockDocSnap(existingLesson, "lesson-123", true)

			mockFirestore.getDoc.mockResolvedValue(mockSnap)

			await LessonService.updateLesson("lesson-123", {
				title: "New Title",
			})

			expect(mockFirestore.arrayRemove).toHaveBeenCalled()
			expect(mockFirestore.arrayUnion).toHaveBeenCalled()
		})

		test("should handle update errors", async () => {
			const existingLesson = createMockLesson({ id: "lesson-123" })
			const mockSnap = createMockDocSnap(existingLesson, "lesson-123", true)

			mockFirestore.getDoc.mockResolvedValue(mockSnap)
			mockBatch.commit.mockRejectedValue(new Error("Update failed"))

			await expect(
				LessonService.updateLesson("lesson-123", { title: "Updated" })
			).rejects.toThrow("Update failed")
		})
	})

	describe("deleteLesson", () => {
		test("should delete lesson and update course metadata", async () => {
			const existingLesson = createMockLesson({ id: "lesson-123" })
			const mockSnap = createMockDocSnap(existingLesson, "lesson-123", true)

			mockFirestore.getDoc.mockResolvedValue(mockSnap)

			await LessonService.deleteLesson("lesson-123")

			expect(mockBatch.delete).toHaveBeenCalled()
			expect(mockBatch.update).toHaveBeenCalled()
			expect(mockBatch.commit).toHaveBeenCalled()
		})

		test("should decrement totalLessons on course", async () => {
			const existingLesson = createMockLesson({ id: "lesson-123" })
			const mockSnap = createMockDocSnap(existingLesson, "lesson-123", true)

			mockFirestore.getDoc.mockResolvedValue(mockSnap)

			await LessonService.deleteLesson("lesson-123")

			expect(mockFirestore.increment).toHaveBeenCalledWith(-1)
		})

		test("should throw error when lesson not found", async () => {
			const mockSnap = createMockDocSnap({}, "lesson-123", false)
			mockFirestore.getDoc.mockResolvedValue(mockSnap)

			await expect(LessonService.deleteLesson("lesson-123")).rejects.toThrow(
				"Lesson not found"
			)
		})

		test("should remove metadata from course", async () => {
			const existingLesson = createMockLesson({ id: "lesson-123" })
			const mockSnap = createMockDocSnap(existingLesson, "lesson-123", true)

			mockFirestore.getDoc.mockResolvedValue(mockSnap)

			await LessonService.deleteLesson("lesson-123")

			expect(mockFirestore.arrayRemove).toHaveBeenCalled()
		})

		test("should handle deletion errors", async () => {
			const existingLesson = createMockLesson({ id: "lesson-123" })
			const mockSnap = createMockDocSnap(existingLesson, "lesson-123", true)

			mockFirestore.getDoc.mockResolvedValue(mockSnap)
			mockBatch.commit.mockRejectedValue(new Error("Delete failed"))

			await expect(LessonService.deleteLesson("lesson-123")).rejects.toThrow(
				"Delete failed"
			)
		})
	})

	describe("batchUpdateLessons", () => {
		test("should update all lesson documents with new order", async () => {
			const lessons = [
				{ id: "lesson-1", order: 0, title: "Lesson 1", isRequired: true },
				{ id: "lesson-2", order: 1, title: "Lesson 2", isRequired: true },
				{ id: "lesson-3", order: 2, title: "Lesson 3", isRequired: false },
			]

			await LessonService.batchUpdateLessons("course-123", lessons)

			// Should update each lesson document
			expect(mockBatch.update).toHaveBeenCalledTimes(4) // 3 lessons + 1 course
			expect(mockBatch.commit).toHaveBeenCalled()
		})

		test("should rebuild lessonsMetadata array on course", async () => {
			const lessons = [
				{ id: "lesson-1", order: 0, title: "Lesson 1", isRequired: true },
				{ id: "lesson-2", order: 1, title: "Lesson 2", isRequired: true },
			]

			await LessonService.batchUpdateLessons("course-123", lessons)

			// Check that course was updated with lessonsMetadata array
			const courseUpdateCall = mockBatch.update.mock.calls.find(
				(call) =>
					call[1] &&
					"lessonsMetadata" in call[1] &&
					Array.isArray(call[1].lessonsMetadata)
			)
			expect(courseUpdateCall).toBeDefined()
			expect(courseUpdateCall![1].lessonsMetadata).toHaveLength(2)
		})

		test("should update totalLessons count on course", async () => {
			const lessons = [
				{ id: "lesson-1", order: 0, title: "Lesson 1", isRequired: true },
				{ id: "lesson-2", order: 1, title: "Lesson 2", isRequired: true },
				{ id: "lesson-3", order: 2, title: "Lesson 3", isRequired: true },
			]

			await LessonService.batchUpdateLessons("course-123", lessons)

			const courseUpdateCall = mockBatch.update.mock.calls.find(
				(call) => call[1] && "totalLessons" in call[1]
			)
			expect(courseUpdateCall).toBeDefined()
			expect(courseUpdateCall![1].totalLessons).toBe(3)
		})

		test("should handle empty lessons array", async () => {
			await LessonService.batchUpdateLessons("course-123", [])

			// Should still update course with empty metadata
			expect(mockBatch.update).toHaveBeenCalledTimes(1) // Only course update
			expect(mockBatch.commit).toHaveBeenCalled()
		})

		test("should handle batch commit errors", async () => {
			const lessons = [
				{ id: "lesson-1", order: 0, title: "Lesson 1", isRequired: true },
			]

			mockBatch.commit.mockRejectedValue(new Error("Batch failed"))

			await expect(
				LessonService.batchUpdateLessons("course-123", lessons)
			).rejects.toThrow("Batch failed")
		})

		test("should set correct lesson type based on videoUrl and quiz", async () => {
			const lessons = [
				{
					id: "lesson-1",
					order: 0,
					title: "Content Lesson",
					isRequired: true,
				},
				{
					id: "lesson-2",
					order: 1,
					title: "Video Lesson",
					isRequired: true,
					videoUrl: "https://example.com/video.mp4",
				},
				{
					id: "lesson-3",
					order: 2,
					title: "Quiz Lesson",
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

	describe("reorderLesson", () => {
		test("should reorder lesson moving down", async () => {
			const existingLesson = createMockLesson({
				id: "lesson-1",
				courseId: "course-123",
				order: 0,
			})
			const allLessons = [
				createMockLesson({ id: "lesson-1", order: 0 }),
				createMockLesson({ id: "lesson-2", order: 1 }),
				createMockLesson({ id: "lesson-3", order: 2 }),
			]

			const lessonSnap = createMockDocSnap(existingLesson, "lesson-1", true)
			const lessonsSnap = createMockQuerySnap(allLessons)

			mockFirestore.getDoc.mockResolvedValue(lessonSnap)
			mockFirestore.getDocs.mockResolvedValue(lessonsSnap)

			await LessonService.reorderLesson("lesson-1", 2)

			expect(mockBatch.update).toHaveBeenCalled()
			expect(mockBatch.commit).toHaveBeenCalled()
		})

		test("should reorder lesson moving up", async () => {
			const existingLesson = createMockLesson({
				id: "lesson-3",
				courseId: "course-123",
				order: 2,
			})
			const allLessons = [
				createMockLesson({ id: "lesson-1", order: 0 }),
				createMockLesson({ id: "lesson-2", order: 1 }),
				createMockLesson({ id: "lesson-3", order: 2 }),
			]

			const lessonSnap = createMockDocSnap(existingLesson, "lesson-3", true)
			const lessonsSnap = createMockQuerySnap(allLessons)

			mockFirestore.getDoc.mockResolvedValue(lessonSnap)
			mockFirestore.getDocs.mockResolvedValue(lessonsSnap)

			await LessonService.reorderLesson("lesson-3", 0)

			expect(mockBatch.update).toHaveBeenCalled()
			expect(mockBatch.commit).toHaveBeenCalled()
		})

		test("should do nothing when order is unchanged", async () => {
			const existingLesson = createMockLesson({
				id: "lesson-1",
				courseId: "course-123",
				order: 1,
			})

			const lessonSnap = createMockDocSnap(existingLesson, "lesson-1", true)
			mockFirestore.getDoc.mockResolvedValue(lessonSnap)

			await LessonService.reorderLesson("lesson-1", 1)

			// Should not call getDocs for all lessons since no change needed
			expect(mockFirestore.getDocs).not.toHaveBeenCalled()
		})

		test("should throw error when lesson not found", async () => {
			const mockSnap = createMockDocSnap({}, "lesson-123", false)
			mockFirestore.getDoc.mockResolvedValue(mockSnap)

			await expect(
				LessonService.reorderLesson("lesson-123", 2)
			).rejects.toThrow("Lesson not found")
		})
	})

	describe("getLessonCount", () => {
		test("should return totalLessons from course", async () => {
			const courseData = { totalLessons: 10 }
			const mockSnap = createMockDocSnap(courseData, "course-123", true)

			mockFirestore.getDoc.mockResolvedValue(mockSnap)

			const result = await LessonService.getLessonCount("course-123")

			expect(result).toBe(10)
		})

		test("should fallback to lessons array length", async () => {
			const courseData = {
				lessons: [{ id: "l1" }, { id: "l2" }, { id: "l3" }],
			}
			const mockSnap = createMockDocSnap(courseData, "course-123", true)

			mockFirestore.getDoc.mockResolvedValue(mockSnap)

			const result = await LessonService.getLessonCount("course-123")

			expect(result).toBe(3)
		})

		test("should return 0 when course does not exist", async () => {
			const mockSnap = createMockDocSnap({}, "course-123", false)
			mockFirestore.getDoc.mockResolvedValue(mockSnap)

			const result = await LessonService.getLessonCount("course-123")

			expect(result).toBe(0)
		})

		test("should handle errors gracefully", async () => {
			mockFirestore.getDoc.mockRejectedValue(new Error("Read failed"))

			await expect(
				LessonService.getLessonCount("course-123")
			).rejects.toThrow("Read failed")
		})
	})

	describe("getLessonsMetadata", () => {
		test("should return lessonsMetadata from course", async () => {
			const courseData = {
				lessonsMetadata: [
					{ id: "l1", title: "Lesson 1", order: 0 },
					{ id: "l2", title: "Lesson 2", order: 1 },
				],
			}
			const mockSnap = createMockDocSnap(courseData, "course-123", true)

			mockFirestore.getDoc.mockResolvedValue(mockSnap)

			const result = await LessonService.getLessonsMetadata("course-123")

			expect(result).toHaveLength(2)
			expect(result[0].title).toBe("Lesson 1")
			expect(result[1].title).toBe("Lesson 2")
		})

		test("should return empty array when no metadata exists", async () => {
			const courseData = {}
			const mockSnap = createMockDocSnap(courseData, "course-123", true)

			mockFirestore.getDoc.mockResolvedValue(mockSnap)

			const result = await LessonService.getLessonsMetadata("course-123")

			expect(result).toEqual([])
		})

		test("should return empty array when course does not exist", async () => {
			const mockSnap = createMockDocSnap({}, "course-123", false)
			mockFirestore.getDoc.mockResolvedValue(mockSnap)

			const result = await LessonService.getLessonsMetadata("course-123")

			expect(result).toEqual([])
		})

		test("should handle errors gracefully", async () => {
			mockFirestore.getDoc.mockRejectedValue(new Error("Read failed"))

			await expect(
				LessonService.getLessonsMetadata("course-123")
			).rejects.toThrow("Read failed")
		})
	})
})
