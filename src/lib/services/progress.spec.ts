import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  createMockProgress,
  createMockCourse,
} from "$lib/test-utils/firebase-mocks";

// Mock Firebase functions
const mockGetDocs = vi.fn();
const mockGetDoc = vi.fn();
const mockUpdateDoc = vi.fn();
const mockCollection = vi.fn();
const mockDoc = vi.fn();
const mockQuery = vi.fn();
const mockWhere = vi.fn();
const mockServerTimestamp = vi.fn();

// Mock Firebase modules
vi.mock("firebase/firestore", () => ({
  collection: mockCollection,
  doc: mockDoc,
  getDoc: mockGetDoc,
  getDocs: mockGetDocs,
  updateDoc: mockUpdateDoc,
  query: mockQuery,
  where: mockWhere,
  serverTimestamp: mockServerTimestamp,
}));

vi.mock("$lib/firebase", () => ({
  db: {},
}));

vi.mock("$lib/firebase/collections", () => ({
  COLLECTIONS: {
    COURSE_PROGRESS: "course_progress",
    COURSES: "courses",
  },
}));

const { ProgressService } = await import("./progress");

describe("ProgressService", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Set up default mock returns
    mockCollection.mockReturnValue({});
    mockDoc.mockReturnValue({});
    mockQuery.mockReturnValue({});
    mockWhere.mockReturnValue({});
    mockServerTimestamp.mockReturnValue({
      toDate: () => new Date("2024-01-01T00:00:00.000Z"),
      toJSON: () => "2024-01-01T00:00:00.000Z",
      seconds: 1704067200,
      nanoseconds: 0,
    });
  });

  describe("getCourseProgress", () => {
    it("should get user progress for a course successfully", async () => {
      const mockProgress = createMockProgress();
      mockGetDocs.mockResolvedValue({
        empty: false,
        docs: [
          {
            id: "progress-123",
            data: () => mockProgress,
          },
        ],
      });

      const result = await ProgressService.getCourseProgress(
        "user123",
        "course123",
      );

      expect(result).toEqual({
        ...mockProgress,
        id: "progress-123",
      });
      expect(mockQuery).toHaveBeenCalled();
      expect(mockGetDocs).toHaveBeenCalled();
    });

    it("should return null when no progress found", async () => {
      mockGetDocs.mockResolvedValue({
        empty: true,
        docs: [],
      });

      const result = await ProgressService.getCourseProgress(
        "user123",
        "course123",
      );

      expect(result).toBeNull();
    });

    it("should handle errors when getting progress", async () => {
      mockGetDocs.mockRejectedValue(new Error("Database connection failed"));

      await expect(
        ProgressService.getCourseProgress("user123", "course123"),
      ).rejects.toThrow("Database connection failed");
    });
  });

  describe("startLesson", () => {
    it("should start a lesson successfully", async () => {
      const mockProgress = createMockProgress();

      // Mock getCourseProgress
      mockGetDocs.mockResolvedValue({
        empty: false,
        docs: [
          {
            id: "progress123",
            data: () => mockProgress,
          },
        ],
      });

      await ProgressService.startLesson("user123", "course123", "lesson456");

      expect(mockUpdateDoc).toHaveBeenCalledWith(
        expect.anything(), // doc reference
        expect.objectContaining({
          currentLesson: "lesson456",
          lastAccessedAt: expect.anything(),
        }),
      );
    });

    it("should mark course as started on first lesson access", async () => {
      const mockProgress = createMockProgress({
        startedAt: undefined, // Not started yet
      });

      mockGetDocs.mockResolvedValue({
        empty: false,
        docs: [
          {
            id: "progress123",
            data: () => mockProgress,
          },
        ],
      });

      await ProgressService.startLesson("user123", "course123", "lesson456");

      expect(mockUpdateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          currentLesson: "lesson456",
          startedAt: expect.anything(),
          lastAccessedAt: expect.anything(),
        }),
      );
    });

    it("should throw error if user not enrolled", async () => {
      mockGetDocs.mockResolvedValue({
        empty: true,
        docs: [],
      });

      await expect(
        ProgressService.startLesson("user123", "course123", "lesson456"),
      ).rejects.toThrow("User not enrolled in course");
    });

    it("should handle errors when starting lesson", async () => {
      mockGetDocs.mockRejectedValue(new Error("Database error"));

      await expect(
        ProgressService.startLesson("user123", "course123", "lesson456"),
      ).rejects.toThrow("Database error");
    });
  });

  describe("completeLesson", () => {
    it("should complete a lesson successfully", async () => {
      const mockProgress = createMockProgress({
        completedLessons: [],
        totalTimeSpent: 100,
        sessionCount: 5,
      });

      const mockCourse = createMockCourse({
        lessons: [
          { id: "lesson1", title: "Lesson 1", order: 1, content: "Content 1" },
          { id: "lesson2", title: "Lesson 2", order: 2, content: "Content 2" },
        ] as any,
      });

      // Mock getCourseProgress
      mockGetDocs.mockResolvedValue({
        empty: false,
        docs: [
          {
            id: "progress123",
            data: () => mockProgress,
          },
        ],
      });

      // Mock course fetch
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => mockCourse,
      });

      await ProgressService.completeLesson(
        "user123",
        "course123",
        "lesson1",
        30,
        85,
      );

      expect(mockUpdateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          completedLessons: ["lesson1"],
          progressPercentage: 50.0, // 1 of 2 lessons = 50%
          totalTimeSpent: 130, // 100 + 30
          sessionCount: 6, // 5 + 1
          "quizScores.lesson1": 85,
          averageQuizScore: 85.0,
        }),
      );
    });

    it("should mark course as completed when all lessons done", async () => {
      const mockProgress = createMockProgress({
        completedLessons: ["lesson1"], // Already completed one
        totalTimeSpent: 100,
      });

      const mockCourse = createMockCourse({
        lessons: [
          { id: "lesson1", title: "Lesson 1", order: 1, content: "Content 1" },
          { id: "lesson2", title: "Lesson 2", order: 2, content: "Content 2" },
        ] as any,
      });

      mockGetDocs.mockResolvedValue({
        empty: false,
        docs: [
          {
            id: "progress123",
            data: () => mockProgress,
          },
        ],
      });

      mockGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => mockCourse,
      });

      await ProgressService.completeLesson(
        "user123",
        "course123",
        "lesson2",
        45,
      );

      expect(mockUpdateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          completedLessons: ["lesson1", "lesson2"],
          progressPercentage: 100.0,
          completedAt: expect.anything(),
        }),
      );
    });

    it("should update existing completion with better quiz score", async () => {
      const mockProgress = createMockProgress({
        completedLessons: ["lesson1"], // Already completed
        quizScores: { lesson1: 75 }, // Previous score
      });

      mockGetDocs.mockResolvedValue({
        empty: false,
        docs: [
          {
            id: "progress123",
            data: () => mockProgress,
          },
        ],
      });

      await ProgressService.completeLesson(
        "user123",
        "course123",
        "lesson1",
        0,
        90,
      );

      expect(mockUpdateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          "quizScores.lesson1": 90,
          lastAccessedAt: expect.anything(),
        }),
      );
    });

    it("should not update quiz score if new score is lower", async () => {
      const mockProgress = createMockProgress({
        completedLessons: ["lesson1"],
        quizScores: { lesson1: 90 }, // Higher previous score
      });

      mockGetDocs.mockResolvedValue({
        empty: false,
        docs: [
          {
            id: "progress123",
            data: () => mockProgress,
          },
        ],
      });

      await ProgressService.completeLesson(
        "user123",
        "course123",
        "lesson1",
        0,
        75,
      );

      // Should not call updateDoc for lower score
      expect(mockUpdateDoc).not.toHaveBeenCalled();
    });

    it("should throw error if user not enrolled", async () => {
      mockGetDocs.mockResolvedValue({
        empty: true,
        docs: [],
      });

      await expect(
        ProgressService.completeLesson("user123", "course123", "lesson1"),
      ).rejects.toThrow("User not enrolled in course");
    });

    it("should throw error if course not found", async () => {
      const mockProgress = createMockProgress();

      mockGetDocs.mockResolvedValue({
        empty: false,
        docs: [
          {
            id: "progress123",
            data: () => mockProgress,
          },
        ],
      });

      mockGetDoc.mockResolvedValue({
        exists: () => false,
      });

      await expect(
        ProgressService.completeLesson("user123", "course123", "lesson1"),
      ).rejects.toThrow("Course not found");
    });

    it("should handle completion errors", async () => {
      mockGetDocs.mockRejectedValue(new Error("Update failed"));

      await expect(
        ProgressService.completeLesson("user123", "course123", "lesson1"),
      ).rejects.toThrow("Update failed");
    });
  });

  describe("updateQuizAttempt", () => {
    it("should update quiz attempt successfully", async () => {
      const mockProgress = createMockProgress({
        quizAttempts: { lesson1: 2 },
        quizScores: { lesson1: 75, lesson2: 80 },
        totalTimeSpent: 200,
      });

      mockGetDocs.mockResolvedValue({
        empty: false,
        docs: [
          {
            id: "progress123",
            data: () => mockProgress,
          },
        ],
      });

      await ProgressService.updateQuizAttempt(
        "user123",
        "course123",
        "lesson1",
        85,
        30,
      );

      expect(mockUpdateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          "quizAttempts.lesson1": 3, // 2 + 1
          "quizScores.lesson1": 85, // Better than 75
          totalTimeSpent: 230, // 200 + 30
          averageQuizScore: 82.5, // (85 + 80) / 2
        }),
      );
    });

    it("should not update score if new attempt is worse", async () => {
      const mockProgress = createMockProgress({
        quizAttempts: { lesson1: 1 },
        quizScores: { lesson1: 90 },
        totalTimeSpent: 100,
      });

      mockGetDocs.mockResolvedValue({
        empty: false,
        docs: [
          {
            id: "progress123",
            data: () => mockProgress,
          },
        ],
      });

      await ProgressService.updateQuizAttempt(
        "user123",
        "course123",
        "lesson1",
        75,
        20,
      );

      expect(mockUpdateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          "quizAttempts.lesson1": 2,
          totalTimeSpent: 120,
          // Should not include quizScores.lesson1 or averageQuizScore
        }),
      );
    });

    it("should handle first quiz attempt for lesson", async () => {
      const mockProgress = createMockProgress({
        quizAttempts: {},
        quizScores: {},
        totalTimeSpent: 50,
      });

      mockGetDocs.mockResolvedValue({
        empty: false,
        docs: [
          {
            id: "progress123",
            data: () => mockProgress,
          },
        ],
      });

      await ProgressService.updateQuizAttempt(
        "user123",
        "course123",
        "lesson1",
        88,
        25,
      );

      expect(mockUpdateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          "quizAttempts.lesson1": 1, // 0 + 1
          "quizScores.lesson1": 88,
          totalTimeSpent: 75,
          averageQuizScore: 88.0,
        }),
      );
    });

    it("should throw error if user not enrolled", async () => {
      mockGetDocs.mockResolvedValue({
        empty: true,
        docs: [],
      });

      await expect(
        ProgressService.updateQuizAttempt(
          "user123",
          "course123",
          "lesson1",
          85,
          30,
        ),
      ).rejects.toThrow("User not enrolled in course");
    });

    it("should handle quiz update errors", async () => {
      mockGetDocs.mockRejectedValue(new Error("Quiz update failed"));

      await expect(
        ProgressService.updateQuizAttempt(
          "user123",
          "course123",
          "lesson1",
          85,
          30,
        ),
      ).rejects.toThrow("Quiz update failed");
    });
  });

  describe("isLessonCompleted", () => {
    it("should return true for completed lesson", async () => {
      const mockProgress = createMockProgress({
        completedLessons: ["lesson1", "lesson2"],
      });

      mockGetDocs.mockResolvedValue({
        empty: false,
        docs: [
          {
            id: "progress123",
            data: () => mockProgress,
          },
        ],
      });

      const result = await ProgressService.isLessonCompleted(
        "user123",
        "course123",
        "lesson1",
      );

      expect(result).toBe(true);
    });

    it("should return false for incomplete lesson", async () => {
      const mockProgress = createMockProgress({
        completedLessons: ["lesson2"],
      });

      mockGetDocs.mockResolvedValue({
        empty: false,
        docs: [
          {
            id: "progress123",
            data: () => mockProgress,
          },
        ],
      });

      const result = await ProgressService.isLessonCompleted(
        "user123",
        "course123",
        "lesson1",
      );

      expect(result).toBe(false);
    });

    it("should return false when no progress found", async () => {
      mockGetDocs.mockResolvedValue({
        empty: true,
        docs: [],
      });

      const result = await ProgressService.isLessonCompleted(
        "user123",
        "course123",
        "lesson1",
      );

      expect(result).toBe(false);
    });

    it("should return false on errors", async () => {
      mockGetDocs.mockRejectedValue(new Error("Database error"));

      const result = await ProgressService.isLessonCompleted(
        "user123",
        "course123",
        "lesson1",
      );

      expect(result).toBe(false);
    });
  });

  describe("getQuizScore", () => {
    it("should return quiz score for completed lesson", async () => {
      const mockProgress = createMockProgress({
        quizScores: { lesson1: 87, lesson2: 92 },
      });

      mockGetDocs.mockResolvedValue({
        empty: false,
        docs: [
          {
            id: "progress123",
            data: () => mockProgress,
          },
        ],
      });

      const result = await ProgressService.getQuizScore(
        "user123",
        "course123",
        "lesson1",
      );

      expect(result).toBe(87);
    });

    it("should return null for lesson without quiz score", async () => {
      const mockProgress = createMockProgress({
        quizScores: { lesson2: 92 },
      });

      mockGetDocs.mockResolvedValue({
        empty: false,
        docs: [
          {
            id: "progress123",
            data: () => mockProgress,
          },
        ],
      });

      const result = await ProgressService.getQuizScore(
        "user123",
        "course123",
        "lesson1",
      );

      expect(result).toBeNull();
    });

    it("should return null when no progress found", async () => {
      mockGetDocs.mockResolvedValue({
        empty: true,
        docs: [],
      });

      const result = await ProgressService.getQuizScore(
        "user123",
        "course123",
        "lesson1",
      );

      expect(result).toBeNull();
    });

    it("should return null on errors", async () => {
      mockGetDocs.mockRejectedValue(new Error("Score fetch error"));

      const result = await ProgressService.getQuizScore(
        "user123",
        "course123",
        "lesson1",
      );

      expect(result).toBeNull();
    });
  });

  describe("getProgressSummary", () => {
    it("should return complete progress summary", async () => {
      const mockProgress = createMockProgress({
        completedLessons: ["lesson1"],
      });

      const mockCourse = createMockCourse({
        lessons: [
          { id: "lesson1", title: "Lesson 1", order: 1, content: "Content 1" },
          { id: "lesson2", title: "Lesson 2", order: 2, content: "Content 2" },
          { id: "lesson3", title: "Lesson 3", order: 3, content: "Content 3" },
        ] as any,
      });

      // Mock Promise.all results
      mockGetDocs.mockResolvedValue({
        empty: false,
        docs: [
          {
            id: "progress-123",
            data: () => mockProgress,
          },
        ],
      });

      mockGetDoc.mockResolvedValue({
        exists: () => true,
        id: "course-123",
        data: () => mockCourse,
      });

      const result = await ProgressService.getProgressSummary(
        "user123",
        "course123",
      );

      expect(result.progress).toEqual(
        expect.objectContaining({
          id: "progress-123",
          completedLessons: ["lesson1"],
        }),
      );
      expect(result.course).toEqual(
        expect.objectContaining({
          id: "course-123",
        }),
      );
      expect(result.nextLesson).toEqual(
        expect.objectContaining({
          id: "lesson2", // Next uncompleted lesson
          order: 2,
        }),
      );
      expect(result.completionRate).toBe(33.3);
    });

    it("should handle case with no next lesson (all completed)", async () => {
      const mockProgress = createMockProgress({
        completedLessons: ["lesson1", "lesson2"],
      });

      const mockCourse = createMockCourse({
        lessons: [
          { id: "lesson1", title: "Lesson 1", order: 1, content: "Content 1" },
          { id: "lesson2", title: "Lesson 2", order: 2, content: "Content 2" },
        ] as any,
      });

      mockGetDocs.mockResolvedValue({
        empty: false,
        docs: [
          {
            id: "progress123",
            data: () => mockProgress,
          },
        ],
      });

      mockGetDoc.mockResolvedValue({
        exists: () => true,
        id: "course123",
        data: () => mockCourse,
      });

      const result = await ProgressService.getProgressSummary(
        "user123",
        "course123",
      );

      expect(result.nextLesson).toBeNull();
      expect(result.completionRate).toBe(100.0);
    });

    it("should handle missing progress", async () => {
      const mockCourse = createMockCourse();

      mockGetDocs.mockResolvedValue({
        empty: true,
        docs: [],
      });

      mockGetDoc.mockResolvedValue({
        exists: () => true,
        id: "course-123",
        data: () => mockCourse,
      });

      const result = await ProgressService.getProgressSummary(
        "user123",
        "course123",
      );

      expect(result.progress).toBeNull();
      expect(result.course).toEqual(
        expect.objectContaining({
          id: "course-123",
        }),
      );
      expect(result.nextLesson).toBeNull();
      expect(result.completionRate).toBe(0);
    });

    it("should handle missing course", async () => {
      mockGetDocs.mockResolvedValue({
        empty: true,
        docs: [],
      });

      mockGetDoc.mockResolvedValue({
        exists: () => false,
      });

      const result = await ProgressService.getProgressSummary(
        "user123",
        "course123",
      );

      expect(result).toEqual({
        progress: null,
        course: null,
        nextLesson: null,
        completionRate: 0,
      });
    });

    it("should handle summary fetch errors", async () => {
      mockGetDocs.mockRejectedValue(new Error("Summary fetch failed"));

      await expect(
        ProgressService.getProgressSummary("user123", "course123"),
      ).rejects.toThrow("Summary fetch failed");
    });
  });

  describe("updateActivityStreak", () => {
    it("should increment streak for consecutive day", async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const mockProgress = createMockProgress({
        streakDays: 5,
        lastActiveDate: yesterday.toISOString().split("T")[0], // YYYY-MM-DD format
        lastAccessedAt: yesterday.toISOString(),
      });

      mockGetDocs.mockResolvedValue({
        empty: false,
        docs: [
          {
            id: "progress123",
            data: () => mockProgress,
          },
        ],
      });

      await ProgressService.updateActivityStreak("user123", "course123");

      expect(mockUpdateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          streakDays: 6, // 5 + 1
          lastActiveDate: expect.any(String),
          lastAccessedAt: expect.anything(),
        }),
      );
    });

    it("should reset streak after gap", async () => {
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

      const mockProgress = createMockProgress({
        streakDays: 10,
        lastActiveDate: threeDaysAgo.toISOString().split("T")[0],
        lastAccessedAt: threeDaysAgo.toISOString(),
      });

      mockGetDocs.mockResolvedValue({
        empty: false,
        docs: [
          {
            id: "progress123",
            data: () => mockProgress,
          },
        ],
      });

      await ProgressService.updateActivityStreak("user123", "course123");

      expect(mockUpdateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          streakDays: 1, // Reset to 1
          lastActiveDate: expect.any(String),
          lastAccessedAt: expect.anything(),
        }),
      );
    });

    it("should maintain streak for same day", async () => {
      const today = new Date();

      const mockProgress = createMockProgress({
        streakDays: 7,
        lastActiveDate: today.toISOString().split("T")[0],
        lastAccessedAt: today.toISOString(),
      });

      mockGetDocs.mockResolvedValue({
        empty: false,
        docs: [
          {
            id: "progress123",
            data: () => mockProgress,
          },
        ],
      });

      await ProgressService.updateActivityStreak("user123", "course123");

      expect(mockUpdateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          streakDays: 7, // Keep same
          lastActiveDate: expect.any(String),
          lastAccessedAt: expect.anything(),
        }),
      );
    });

    it("should handle missing progress gracefully", async () => {
      mockGetDocs.mockResolvedValue({
        empty: true,
        docs: [],
      });

      // Should not throw error
      await expect(
        ProgressService.updateActivityStreak("user123", "course123"),
      ).resolves.not.toThrow();

      expect(mockUpdateDoc).not.toHaveBeenCalled();
    });

    it("should handle streak update errors gracefully", async () => {
      const mockProgress = createMockProgress();

      mockGetDocs.mockResolvedValue({
        empty: false,
        docs: [
          {
            id: "progress123",
            data: () => mockProgress,
          },
        ],
      });

      mockUpdateDoc.mockRejectedValue(new Error("Streak update failed"));

      // Should not throw error (non-critical)
      await expect(
        ProgressService.updateActivityStreak("user123", "course123"),
      ).resolves.not.toThrow();
    });
  });
});
