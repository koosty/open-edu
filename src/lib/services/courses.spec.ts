/**
 * Tests for CourseService
 * Comprehensive test coverage for all course CRUD operations and queries
 */

import { describe, test, expect, beforeEach, vi } from "vitest";
import { COLLECTIONS } from "$lib/firebase/collections";
import {
  createMockCourse,
  createMockDocSnap,
  createMockQuerySnap,
  mockDocRef,
  mockTimestamp,
  resetFirebaseMocks,
} from "$lib/test-utils/firebase-mocks";

// Mock Firebase functions before importing service
const mockFirestore = {
  collection: vi.fn(),
  doc: vi.fn(),
  getDoc: vi.fn(),
  getDocs: vi.fn(),
  addDoc: vi.fn(),
  updateDoc: vi.fn(),
  deleteDoc: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
  limit: vi.fn(),
  startAfter: vi.fn(),
  writeBatch: vi.fn(),
  serverTimestamp: vi.fn(() => mockTimestamp),
  increment: vi.fn((n) => ({ __increment: n })),
  arrayUnion: vi.fn((items) => ({ __arrayUnion: items })),
  arrayRemove: vi.fn((items) => ({ __arrayRemove: items })),
};

// Mock Firebase before importing service
vi.mock("firebase/firestore", () => mockFirestore);
vi.mock("$lib/firebase", () => ({ db: "mock-db-instance" }));

// Mock validation schemas
vi.mock("$lib/validation/course", () => ({
  courseSchema: { parse: vi.fn((data) => data) },
  createCourseSchema: { parse: vi.fn((data) => data) },
  updateCourseSchema: { parse: vi.fn((data) => data) },
}));

// Now import the service after mocks are set up
const { CourseService } = await import("$lib/services/courses");

describe("CourseService", () => {
  beforeEach(() => {
    // Reset all mocks
    Object.values(mockFirestore).forEach((mock) => {
      if (typeof mock === "function" && "mockReset" in mock) {
        mock.mockReset();
      }
    });

    // Setup default successful operations
    mockFirestore.addDoc.mockResolvedValue(mockDocRef);
    mockFirestore.updateDoc.mockResolvedValue(undefined);
    mockFirestore.deleteDoc.mockResolvedValue(undefined);
    mockFirestore.getDoc.mockResolvedValue(
      createMockDocSnap({}, "test-id", true),
    );
    mockFirestore.getDocs.mockResolvedValue(createMockQuerySnap([]));
  });

  describe("getCourse", () => {
    test("should return course when it exists", async () => {
      const mockCourse = createMockCourse({ id: "course-123" });
      const mockSnap = createMockDocSnap(mockCourse, "course-123", true);

      mockFirestore.doc.mockReturnValue(mockDocRef);
      mockFirestore.getDoc.mockResolvedValue(mockSnap);

      const result = await CourseService.getCourse("course-123");

      expect(mockFirestore.doc).toHaveBeenCalledWith(
        "mock-db-instance",
        COLLECTIONS.COURSES,
        "course-123",
      );
      expect(mockFirestore.getDoc).toHaveBeenCalledWith(mockDocRef);
      expect(result).toEqual(
        expect.objectContaining({
          id: "course-123",
          title: "Test Course",
        }),
      );
    });

    test("should return null when course does not exist", async () => {
      const mockSnap = createMockDocSnap({}, "course-123", false);

      mockFirestore.doc.mockReturnValue(mockDocRef);
      mockFirestore.getDoc.mockResolvedValue(mockSnap);

      const result = await CourseService.getCourse("course-123");

      expect(result).toBeNull();
    });

    test("should handle errors gracefully", async () => {
      const error = new Error("Database connection failed");
      mockFirestore.getDoc.mockRejectedValue(error);

      await expect(CourseService.getCourse("course-123")).rejects.toThrow(
        "Database connection failed",
      );
    });

    test("should convert Firestore timestamps", async () => {
      const courseWithTimestamp = {
        ...createMockCourse(),
        createdAt: mockTimestamp,
        updatedAt: mockTimestamp,
      };
      const mockSnap = createMockDocSnap(
        courseWithTimestamp,
        "course-123",
        true,
      );

      mockFirestore.doc.mockReturnValue(mockDocRef);
      mockFirestore.getDoc.mockResolvedValue(mockSnap);

      const result = await CourseService.getCourse("course-123");

      expect(result?.createdAt).toBe("2024-01-01T00:00:00.000Z");
      expect(result?.updatedAt).toBe("2024-01-01T00:00:00.000Z");
    });
  });

  describe("getCourses", () => {
    test("should return courses with default parameters", async () => {
      const mockCourses = [
        createMockCourse({ id: "course-1" }),
        createMockCourse({ id: "course-2" }),
      ];
      const mockSnap = createMockQuerySnap(mockCourses);

      mockFirestore.collection.mockReturnValue("mock-collection");
      mockFirestore.query.mockReturnValue("mock-query");
      mockFirestore.getDocs.mockResolvedValue(mockSnap);

      const result = await CourseService.getCourses();

      expect(result.courses).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.hasMore).toBe(false);
    });

    test("should apply category filter", async () => {
      const mockCourses = [createMockCourse({ category: "Programming" })];
      const mockSnap = createMockQuerySnap(mockCourses);

      mockFirestore.collection.mockReturnValue("mock-collection");
      mockFirestore.query.mockReturnValue("mock-query");
      mockFirestore.getDocs.mockResolvedValue(mockSnap);
      mockFirestore.where.mockReturnValue("mock-where");

      await CourseService.getCourses({ category: "Programming" });

      expect(mockFirestore.where).toHaveBeenCalledWith(
        "category",
        "==",
        "Programming",
      );
    });

    test("should apply difficulty filter", async () => {
      const mockCourses = [createMockCourse({ difficulty: "Beginner" })];
      const mockSnap = createMockQuerySnap(mockCourses);

      mockFirestore.collection.mockReturnValue("mock-collection");
      mockFirestore.query.mockReturnValue("mock-query");
      mockFirestore.getDocs.mockResolvedValue(mockSnap);
      mockFirestore.where.mockReturnValue("mock-where");

      await CourseService.getCourses({ difficulty: "Beginner" });

      expect(mockFirestore.where).toHaveBeenCalledWith(
        "difficulty",
        "==",
        "Beginner",
      );
    });

    test("should apply level filter", async () => {
      const mockCourses = [createMockCourse({ level: "free" })];
      const mockSnap = createMockQuerySnap(mockCourses);

      mockFirestore.collection.mockReturnValue("mock-collection");
      mockFirestore.query.mockReturnValue("mock-query");
      mockFirestore.getDocs.mockResolvedValue(mockSnap);
      mockFirestore.where.mockReturnValue("mock-where");

      await CourseService.getCourses({ level: "free" });

      expect(mockFirestore.where).toHaveBeenCalledWith("level", "==", "free");
    });

    test("should apply isPublished filter", async () => {
      const mockCourses = [createMockCourse({ isPublished: true })];
      const mockSnap = createMockQuerySnap(mockCourses);

      mockFirestore.collection.mockReturnValue("mock-collection");
      mockFirestore.query.mockReturnValue("mock-query");
      mockFirestore.getDocs.mockResolvedValue(mockSnap);
      mockFirestore.where.mockReturnValue("mock-where");

      await CourseService.getCourses({ isPublished: true });

      expect(mockFirestore.where).toHaveBeenCalledWith(
        "isPublished",
        "==",
        true,
      );
    });

    test("should handle pagination", async () => {
      const mockCourses = Array.from({ length: 5 }, (_, i) =>
        createMockCourse({ id: `course-${i}` }),
      );
      const mockSnap = createMockQuerySnap(mockCourses);

      mockFirestore.collection.mockReturnValue("mock-collection");
      mockFirestore.query.mockReturnValue("mock-query");
      mockFirestore.getDocs.mockResolvedValue(mockSnap);
      mockFirestore.limit.mockReturnValue("mock-limit");

      await CourseService.getCourses(
        {},
        { field: "createdAt", direction: "desc" },
        { page: 1, limit: 5 },
      );

      // CourseService adds +1 to check for hasMore
      expect(mockFirestore.limit).toHaveBeenCalledWith(6);
    });

    test("should handle sorting", async () => {
      const mockCourses = [createMockCourse()];
      const mockSnap = createMockQuerySnap(mockCourses);

      mockFirestore.collection.mockReturnValue("mock-collection");
      mockFirestore.query.mockReturnValue("mock-query");
      mockFirestore.getDocs.mockResolvedValue(mockSnap);
      mockFirestore.orderBy.mockReturnValue("mock-orderBy");

      await CourseService.getCourses({}, { field: "title", direction: "asc" });

      expect(mockFirestore.orderBy).toHaveBeenCalledWith("title", "asc");
    });
  });

  describe("createCourse", () => {
    test("should create a new course successfully", async () => {
      const newCourseData = {
        title: "New Course",
        description: "A new course",
        category: "Programming",
      } as any;

      mockFirestore.collection.mockReturnValue("mock-collection");
      mockFirestore.addDoc.mockResolvedValue({
        ...mockDocRef,
        id: "new-course-id",
      });
      mockFirestore.serverTimestamp.mockReturnValue(mockTimestamp);

      const result = await CourseService.createCourse(
        newCourseData,
        "instructor-123",
      );

      expect(mockFirestore.addDoc).toHaveBeenCalled();
      expect(result).toBe("new-course-id");
    });

    test("should include instructor information in course data", async () => {
      const newCourseData = { title: "New Course" } as any;

      mockFirestore.collection.mockReturnValue("mock-collection");
      mockFirestore.addDoc.mockResolvedValue(mockDocRef);
      mockFirestore.serverTimestamp.mockReturnValue(mockTimestamp);

      await CourseService.createCourse(newCourseData, "instructor-123");

      const addDocCall = mockFirestore.addDoc.mock.calls[0];
      const courseData = addDocCall[1];

      expect(courseData).toMatchObject({
        instructorId: "instructor-123",
        enrolled: 0,
        rating: 0,
        ratingCount: 0,
        lessons: [],
        chapters: [],
      });
    });

    test("should handle creation errors", async () => {
      const error = new Error("Failed to create course");
      mockFirestore.addDoc.mockRejectedValue(error);

      await expect(
        CourseService.createCourse({ title: "Test" } as any, "instructor-123"),
      ).rejects.toThrow("Failed to create course");
    });
  });

  describe("updateCourse", () => {
    test("should update course successfully", async () => {
      const updates = {
        title: "Updated Course",
        description: "Updated description",
      };

      mockFirestore.doc.mockReturnValue(mockDocRef);
      mockFirestore.serverTimestamp.mockReturnValue(mockTimestamp);

      await CourseService.updateCourse("course-123", updates);

      expect(mockFirestore.updateDoc).toHaveBeenCalledWith(
        mockDocRef,
        expect.objectContaining({
          title: "Updated Course",
          description: "Updated description",
          updatedAt: mockTimestamp,
        }),
      );
    });

    test("should handle update errors", async () => {
      const error = new Error("Failed to update course");
      mockFirestore.updateDoc.mockRejectedValue(error);

      await expect(
        CourseService.updateCourse("course-123", { title: "Updated" }),
      ).rejects.toThrow("Failed to update course");
    });
  });

  describe("deleteCourse", () => {
    test("should delete course and all related data successfully", async () => {
      // Mock enrollments query
      const enrollmentsSnap = createMockQuerySnap([
        { id: "enroll-1", courseId: "course-123", userId: "user-1" },
        { id: "enroll-2", courseId: "course-123", userId: "user-2" },
      ]);

      // Mock course progress query
      const progressSnap = createMockQuerySnap([
        { id: "progress-1", courseId: "course-123", userId: "user-1" },
      ]);

      // Mock quizzes query
      const quizzesSnap = createMockQuerySnap([
        { id: "quiz-1", courseId: "course-123" },
        { id: "quiz-2", courseId: "course-123" },
      ]);

      // Mock quiz attempts query
      const attemptsSnap = createMockQuerySnap([
        { id: "attempt-1", quizId: "quiz-1" },
        { id: "attempt-2", quizId: "quiz-2" },
      ]);

      // Mock notes query
      const notesSnap = createMockQuerySnap([
        { id: "note-1", courseId: "course-123" },
      ]);

      // Mock bookmarks query
      const bookmarksSnap = createMockQuerySnap([]);

      // Mock highlights query
      const highlightsSnap = createMockQuerySnap([]);

      // Mock reading positions query
      const readingPositionsSnap = createMockQuerySnap([
        { id: "pos-1", courseId: "course-123" },
      ]);

      // Setup mock sequence for getDocs calls
      mockFirestore.getDocs
        .mockResolvedValueOnce(enrollmentsSnap) // First call: enrollments
        .mockResolvedValueOnce(progressSnap) // Second call: progress
        .mockResolvedValueOnce(quizzesSnap) // Third call: quizzes
        .mockResolvedValueOnce(attemptsSnap) // Fourth call: quiz attempts
        .mockResolvedValueOnce(notesSnap) // Fifth call: notes
        .mockResolvedValueOnce(bookmarksSnap) // Sixth call: bookmarks
        .mockResolvedValueOnce(highlightsSnap) // Seventh call: highlights
        .mockResolvedValueOnce(readingPositionsSnap); // Eighth call: reading positions

      // Mock writeBatch
      const mockBatch = {
        delete: vi.fn(),
        commit: vi.fn().mockResolvedValue(undefined),
      };
      const mockWriteBatch = vi.fn(() => mockBatch);
      mockFirestore.writeBatch = mockWriteBatch;

      mockFirestore.collection.mockReturnValue("mock-collection");
      mockFirestore.query.mockReturnValue("mock-query");
      mockFirestore.where.mockReturnValue("mock-where");
      mockFirestore.doc.mockReturnValue(mockDocRef);

      await CourseService.deleteCourse("course-123");

      // Verify batch was created
      expect(mockWriteBatch).toHaveBeenCalled();

      // Verify all related data was queried
      expect(mockFirestore.getDocs).toHaveBeenCalledTimes(8);

      // Verify batch commit was called
      expect(mockBatch.commit).toHaveBeenCalled();

      // Verify deletions were added to batch (2 enrollments + 1 progress + 2 quizzes + 2 attempts + 1 note + 1 position + 1 course = 10)
      expect(mockBatch.delete).toHaveBeenCalled();
    });

    test("should handle empty related collections", async () => {
      // All empty collections
      const emptySnap = createMockQuerySnap([]);

      mockFirestore.getDocs.mockResolvedValue(emptySnap);
      mockFirestore.deleteDoc.mockResolvedValue(undefined);

      const mockBatch = {
        delete: vi.fn(),
        commit: vi.fn().mockResolvedValue(undefined),
      };
      mockFirestore.writeBatch = vi.fn(() => mockBatch);

      mockFirestore.collection.mockReturnValue("mock-collection");
      mockFirestore.query.mockReturnValue("mock-query");
      mockFirestore.where.mockReturnValue("mock-where");
      mockFirestore.doc.mockReturnValue(mockDocRef);

      await CourseService.deleteCourse("course-123");

      // Should delete the course itself using deleteDoc (not batch)
      expect(mockFirestore.deleteDoc).toHaveBeenCalledWith(mockDocRef);
      // Batch should not be used since all collections are empty
      expect(mockBatch.commit).not.toHaveBeenCalled();
    });

    test("should handle deletion errors", async () => {
      const error = new Error("Failed to delete course");
      mockFirestore.getDocs.mockRejectedValue(error);

      mockFirestore.collection.mockReturnValue("mock-collection");
      mockFirestore.query.mockReturnValue("mock-query");
      mockFirestore.where.mockReturnValue("mock-where");

      const mockBatch = {
        delete: vi.fn(),
        commit: vi.fn(),
      };
      mockFirestore.writeBatch = vi.fn(() => mockBatch);

      await expect(CourseService.deleteCourse("course-123")).rejects.toThrow(
        "Failed to delete course",
      );
    });

    test("should handle large number of quiz attempts (pagination)", async () => {
      // Mock quizzes query - create 35 quizzes (more than 30 to test pagination)
      const quizzes = Array.from({ length: 35 }, (_, i) => ({
        id: `quiz-${i}`,
        courseId: "course-123",
      }));
      const quizzesSnap = createMockQuerySnap(quizzes);

      // Mock quiz attempts for each chunk
      const attemptsSnap = createMockQuerySnap([
        { id: "attempt-1", quizId: "quiz-0" },
      ]);

      // Setup mock sequence
      mockFirestore.getDocs
        .mockResolvedValueOnce(createMockQuerySnap([])) // enrollments
        .mockResolvedValueOnce(createMockQuerySnap([])) // progress
        .mockResolvedValueOnce(quizzesSnap) // quizzes
        .mockResolvedValueOnce(attemptsSnap) // attempts chunk 1
        .mockResolvedValueOnce(attemptsSnap) // attempts chunk 2
        .mockResolvedValueOnce(createMockQuerySnap([])) // notes
        .mockResolvedValueOnce(createMockQuerySnap([])) // bookmarks
        .mockResolvedValueOnce(createMockQuerySnap([])) // highlights
        .mockResolvedValueOnce(createMockQuerySnap([])); // reading positions

      const mockBatch = {
        delete: vi.fn(),
        commit: vi.fn().mockResolvedValue(undefined),
      };
      mockFirestore.writeBatch = vi.fn(() => mockBatch);

      mockFirestore.collection.mockReturnValue("mock-collection");
      mockFirestore.query.mockReturnValue("mock-query");
      mockFirestore.where.mockReturnValue("mock-where");
      mockFirestore.doc.mockReturnValue(mockDocRef);

      await CourseService.deleteCourse("course-123");

      // Verify pagination: 9 queries total (enrollments, progress, quizzes, 2x attempts, notes, bookmarks, highlights, positions)
      expect(mockFirestore.getDocs).toHaveBeenCalledTimes(9);
      expect(mockBatch.commit).toHaveBeenCalled();
    });
  });

  describe("togglePublishStatus", () => {
    test("should toggle publish status to true", async () => {
      mockFirestore.doc.mockReturnValue(mockDocRef);
      mockFirestore.serverTimestamp.mockReturnValue(mockTimestamp);

      await CourseService.togglePublishStatus("course-123", true);

      expect(mockFirestore.updateDoc).toHaveBeenCalledWith(
        mockDocRef,
        expect.objectContaining({
          isPublished: true,
          publishedAt: mockTimestamp,
          updatedAt: mockTimestamp,
        }),
      );
    });

    test("should toggle publish status to false", async () => {
      mockFirestore.doc.mockReturnValue(mockDocRef);
      mockFirestore.serverTimestamp.mockReturnValue(mockTimestamp);

      await CourseService.togglePublishStatus("course-123", false);

      expect(mockFirestore.updateDoc).toHaveBeenCalledWith(
        mockDocRef,
        expect.objectContaining({
          isPublished: false,
          updatedAt: mockTimestamp,
        }),
      );
    });
  });

  describe("getCoursesByInstructor", () => {
    test("should return courses by instructor", async () => {
      const instructorCourses = [
        createMockCourse({ instructorId: "instructor-123" }),
        createMockCourse({ instructorId: "instructor-123" }),
      ];
      const mockSnap = createMockQuerySnap(instructorCourses);

      mockFirestore.collection.mockReturnValue("mock-collection");
      mockFirestore.query.mockReturnValue("mock-query");
      mockFirestore.where.mockReturnValue("mock-where");
      mockFirestore.orderBy.mockReturnValue("mock-orderBy");
      mockFirestore.getDocs.mockResolvedValue(mockSnap);

      const result =
        await CourseService.getCoursesByInstructor("instructor-123");

      expect(mockFirestore.where).toHaveBeenCalledWith(
        "instructorId",
        "==",
        "instructor-123",
      );
      expect(result).toHaveLength(2);
    });
  });

  describe("getFeaturedCourses", () => {
    test("should return featured courses", async () => {
      const featuredCourses = [
        createMockCourse({ isFeatured: true }),
        createMockCourse({ isFeatured: true }),
      ];
      const mockSnap = createMockQuerySnap(featuredCourses);

      mockFirestore.collection.mockReturnValue("mock-collection");
      mockFirestore.query.mockReturnValue("mock-query");
      mockFirestore.where.mockReturnValue("mock-where");
      mockFirestore.orderBy.mockReturnValue("mock-orderBy");
      mockFirestore.limit.mockReturnValue("mock-limit");
      mockFirestore.getDocs.mockResolvedValue(mockSnap);

      const result = await CourseService.getFeaturedCourses(6);

      expect(mockFirestore.where).toHaveBeenCalledWith(
        "isFeatured",
        "==",
        true,
      );
      expect(mockFirestore.limit).toHaveBeenCalledWith(6);
      expect(result).toHaveLength(2);
    });
  });

  describe("searchCourses", () => {
    test("should search courses by title and description", async () => {
      const searchResults = [createMockCourse({ title: "JavaScript Basics" })];
      const mockSnap = createMockQuerySnap(searchResults);

      mockFirestore.collection.mockReturnValue("mock-collection");
      mockFirestore.query.mockReturnValue("mock-query");
      mockFirestore.where.mockReturnValue("mock-where");
      mockFirestore.orderBy.mockReturnValue("mock-orderBy");
      mockFirestore.limit.mockReturnValue("mock-limit");
      mockFirestore.getDocs.mockResolvedValue(mockSnap);

      const result = await CourseService.searchCourses("JavaScript", 20);

      // searchCourses uses a fixed limit of 100 for Firestore, then slices client-side
      expect(mockFirestore.limit).toHaveBeenCalledWith(100);
      expect(result).toHaveLength(1);
    });
  });

  describe("getCourseStats", () => {
    test("should return course statistics", async () => {
      // Mock course retrieval with lessons
      const mockCourseWithLessons = createMockCourse({
        id: "course-123",
        lessons: [
          {
            id: "lesson-1",
            courseId: "course-123",
            title: "Lesson 1",
            
            order: 1,
            isRequired: true,
            createdAt: "2024-01-01T00:00:00.000Z",
            updatedAt: "2024-01-01T00:00:00.000Z",
          },
          {
            id: "lesson-2",
            courseId: "course-123",
            title: "Lesson 2",
            
            order: 2,
            isRequired: true,
            createdAt: "2024-01-01T00:00:00.000Z",
            updatedAt: "2024-01-01T00:00:00.000Z",
          },
        ],
      });
      const courseSnap = createMockDocSnap(
        mockCourseWithLessons,
        "course-123",
        true,
      );

      // Mock enrollments query (for enrollmentCount)
      const mockEnrollments = [{ status: "enrolled" }, { status: "enrolled" }];
      const enrollmentSnap = createMockQuerySnap(mockEnrollments);

      // Mock progress query (for completion stats)
      const mockProgress = [
        { progressPercentage: 100 }, // completed
        { progressPercentage: 50 }, // in progress
        { progressPercentage: 25 }, // in progress
      ];
      const progressSnap = createMockQuerySnap(mockProgress);

      mockFirestore.doc.mockReturnValue(mockDocRef);
      mockFirestore.getDoc.mockResolvedValue(courseSnap);
      mockFirestore.collection.mockReturnValue("mock-collection");
      mockFirestore.query.mockReturnValue("mock-query");
      mockFirestore.where.mockReturnValue("mock-where");

      // First call for enrollments, second call for progress
      mockFirestore.getDocs
        .mockResolvedValueOnce(enrollmentSnap)
        .mockResolvedValueOnce(progressSnap);

      const result = await CourseService.getCourseStats("course-123");

      expect(result).toMatchObject({
        enrollmentCount: 2,
        completionRate: expect.any(Number),
        averageProgress: expect.any(Number),
        totalLessons: 2,
      });
    });
  });

  describe("updateCourseRating", () => {
    test("should update course rating successfully", async () => {
      mockFirestore.doc.mockReturnValue(mockDocRef);

      await CourseService.updateCourseRating("course-123", 4.5);

      expect(mockFirestore.updateDoc).toHaveBeenCalledWith(
        mockDocRef,
        expect.objectContaining({
          rating: 4.5,
        }),
      );
    });

    test("should handle rating update errors", async () => {
      const error = new Error("Failed to update rating");
      mockFirestore.updateDoc.mockRejectedValue(error);

      await expect(
        CourseService.updateCourseRating("course-123", 4.5),
      ).rejects.toThrow("Failed to update rating");
    });
  });

  // Import course functionality is tested in course-import.spec.ts
  describe.skip("importCourse", () => {
    const mockUserId = "user-123";

    beforeEach(() => {
      resetFirebaseMocks();
    });

    test("should import course with lessons only", async () => {
      const courseData = {
        title: "Imported Course",
        description: "Course imported from file",
        category: "Programming",
        difficulty: "Beginner" as const,
        duration: "4 weeks",
        level: "free" as const,
        lessons: [
          {
            title: "Lesson 1",
            duration: "10 min",
            content: "# Lesson 1 Content",
          },
          {
            title: "Lesson 2",
            duration: "15 min",
            content: "# Lesson 2 Content",
          },
        ],
      };

      const mockCourseId = "course-456";
      mockFirestore.addDoc.mockResolvedValue({ id: mockCourseId });
      mockFirestore.doc.mockReturnValue(mockDocRef);
      mockFirestore.updateDoc.mockResolvedValue(undefined);

      const courseId = await CourseService.importCourse(courseData as any, mockUserId, "Test Instructor");

      expect(courseId).toBe(mockCourseId);
      expect(mockFirestore.addDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          title: "Imported Course",
          description: "Course imported from file",
          category: "Programming",
          difficulty: "Beginner",
          duration: "4 weeks",
          level: "free",
          lessons: [],
          instructorId: mockUserId,
        }),
      );

      // Should update with lessons
      expect(mockFirestore.updateDoc).toHaveBeenCalledWith(
        mockDocRef,
        expect.objectContaining({
          lessons: expect.arrayContaining([
            expect.objectContaining({
              title: "Lesson 1",
              
              order: 1,
            }),
            expect.objectContaining({
              title: "Lesson 2",
              
              order: 2,
            }),
          ]),
        }),
      );
    });

    test("should import course with quiz lessons", async () => {
      const courseData = {
        title: "Course with Quiz",
        description: "Course with quiz lesson",
        category: "Programming",
        difficulty: "Beginner" as const,
        duration: "4 weeks",
        level: "free" as const,
        lessons: [
          {
            title: "Regular Lesson",
            duration: "10 min",
            content: "# Lesson Content",
          },
          {
            title: "Quiz Lesson",
            type: "quiz" as const,
            duration: "15 min",
            quiz: {
              title: "Test Quiz",
              description: "Quiz description",
              passingScore: 70,
              timeLimit: 600,
              questions: [
                {
                  id: "q1",
                  type: "multiple-choice" as const,
                  question: "What is 2+2?",
                  options: ["3", "4", "5"],
                  correctAnswer: 1,
                  points: 10,
                  explanation: "Basic math",
                },
              ],
            },
          },
        ],
      };

      const mockCourseId = "course-789";
      const mockQuizId = "quiz-123";
      
      mockFirestore.addDoc
        .mockResolvedValueOnce({ id: mockCourseId }) // Course creation
        .mockResolvedValueOnce({ id: mockQuizId }); // Quiz creation
      
      mockFirestore.doc.mockReturnValue(mockDocRef);
      mockFirestore.updateDoc.mockResolvedValue(undefined);
      mockFirestore.collection.mockReturnValue("mock-collection");

      const courseId = await CourseService.importCourse(courseData as any, mockUserId, "Test Instructor");

      expect(courseId).toBe(mockCourseId);

      // Should create quiz
      expect(mockFirestore.addDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          title: "Test Quiz",
          description: "Quiz description",
          passingScore: 70,
          timeLimit: 600,
          questions: expect.arrayContaining([
            expect.objectContaining({
              id: "q1",
              type: "multiple-choice",
              question: "What is 2+2?",
            }),
          ]),
        }),
      );

      // Lessons should have quiz reference
      expect(mockFirestore.updateDoc).toHaveBeenCalledWith(
        mockDocRef,
        expect.objectContaining({
          lessons: expect.arrayContaining([
            expect.objectContaining({
              title: "Quiz Lesson",
              type: "quiz",
              quizId: mockQuizId,
            }),
          ]),
        }),
      );
    });

    test("should import premium course with price", async () => {
      const courseData = {
        title: "Premium Course",
        description: "Premium course description",
        category: "Programming",
        difficulty: "Advanced" as const,
        duration: "8 weeks",
        level: "premium" as const,
        price: 49.99,
        currency: "USD",
        lessons: [
          {
            title: "Lesson 1",
            duration: "20 min",
            content: "# Premium Content",
          },
        ],
      };

      const mockCourseId = "course-premium";
      mockFirestore.addDoc.mockResolvedValue({ id: mockCourseId });
      mockFirestore.doc.mockReturnValue(mockDocRef);
      mockFirestore.updateDoc.mockResolvedValue(undefined);

      const courseId = await CourseService.importCourse(courseData as any, mockUserId, "Test Instructor");

      expect(courseId).toBe(mockCourseId);
      expect(mockFirestore.addDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          level: "premium",
          price: 49.99,
          currency: "USD",
        }),
      );
    });

    test("should import course with all optional fields", async () => {
      const courseData = {
        title: "Full Course",
        description: "Course with all fields",
        category: "Web Development",
        difficulty: "Intermediate" as const,
        duration: "6 weeks",
        level: "free" as const,
        thumbnail: "https://example.com/image.jpg",
        tags: ["javascript", "web", "frontend"],
        prerequisites: ["HTML basics", "CSS fundamentals"],
        learningOutcomes: ["Build websites", "Master JavaScript"],
        isPublished: true,
        isFeatured: true,
        lessons: [
          {
            title: "Lesson 1",
            duration: "10 min",
            content: "# Content",
          },
        ],
      };

      const mockCourseId = "course-full";
      mockFirestore.addDoc.mockResolvedValue({ id: mockCourseId });
      mockFirestore.doc.mockReturnValue(mockDocRef);
      mockFirestore.updateDoc.mockResolvedValue(undefined);

      const courseId = await CourseService.importCourse(courseData as any, mockUserId, "Test Instructor");

      expect(courseId).toBe(mockCourseId);
      expect(mockFirestore.addDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          thumbnail: "https://example.com/image.jpg",
          tags: ["javascript", "web", "frontend"],
          prerequisites: ["HTML basics", "CSS fundamentals"],
          learningOutcomes: ["Build websites", "Master JavaScript"],
          isPublished: true,
          isFeatured: true,
        }),
      );
    });

    test("should generate unique lesson IDs", async () => {
      const courseData = {
        title: "Test Course",
        description: "Test",
        category: "Programming",
        difficulty: "Beginner" as const,
        duration: "4 weeks",
        level: "free" as const,
        lessons: [
          {
            title: "Lesson 1",
            duration: "10 min",
            content: "# Content 1",
          },
          {
            title: "Lesson 2",
            duration: "10 min",
            content: "# Content 2",
          },
          {
            title: "Lesson 3",
            duration: "10 min",
            content: "# Content 3",
          },
        ],
      };

      const mockCourseId = "course-ids";
      mockFirestore.addDoc.mockResolvedValue({ id: mockCourseId });
      mockFirestore.doc.mockReturnValue(mockDocRef);
      mockFirestore.updateDoc.mockResolvedValue(undefined);

      await CourseService.importCourse(courseData as any, mockUserId, "Test Instructor");

      const updateCall = mockFirestore.updateDoc.mock.calls[0];
      const lessons = updateCall[1].lessons;

      // Check all lessons have IDs
      expect(lessons).toHaveLength(3);
      lessons.forEach((lesson: any) => {
        expect(lesson.id).toBeDefined();
        expect(typeof lesson.id).toBe("string");
        expect(lesson.id.length).toBeGreaterThan(0);
      });

      // Check IDs are unique
      const ids = lessons.map((l: any) => l.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(3);
    });

    test("should maintain lesson order", async () => {
      const courseData = {
        title: "Test Course",
        description: "Test",
        category: "Programming",
        difficulty: "Beginner" as const,
        duration: "4 weeks",
        level: "free" as const,
        lessons: [
          {
            title: "First",
            duration: "10 min",
            content: "# First",
          },
          {
            title: "Second",
            duration: "10 min",
            content: "# Second",
          },
          {
            title: "Third",
            duration: "10 min",
            content: "# Third",
          },
        ],
      };

      const mockCourseId = "course-order";
      mockFirestore.addDoc.mockResolvedValue({ id: mockCourseId });
      mockFirestore.doc.mockReturnValue(mockDocRef);
      mockFirestore.updateDoc.mockResolvedValue(undefined);

      await CourseService.importCourse(courseData as any, mockUserId, "Test Instructor");

      const updateCall = mockFirestore.updateDoc.mock.calls[0];
      const lessons = updateCall[1].lessons;

      expect(lessons[0].order).toBe(1);
      expect(lessons[1].order).toBe(2);
      expect(lessons[2].order).toBe(3);
      expect(lessons[0].title).toBe("First");
      expect(lessons[1].title).toBe("Second");
      expect(lessons[2].title).toBe("Third");
    });

    test("should handle quiz creation failure gracefully", async () => {
      const courseData = {
        title: "Course with Failing Quiz",
        description: "Test",
        category: "Programming",
        difficulty: "Beginner" as const,
        duration: "4 weeks",
        level: "free" as const,
        lessons: [
          {
            title: "Regular Lesson",
            duration: "10 min",
            content: "# Content",
          },
          {
            title: "Quiz Lesson",
            type: "quiz" as const,
            duration: "15 min",
            quiz: {
              title: "Failing Quiz",
              description: "This will fail",
              passingScore: 70,
              questions: [
                {
                  id: "q1",
                  type: "multiple-choice" as const,
                  question: "Test?",
                  options: ["A", "B"],
                  correctAnswer: 0,
                  points: 10,
                  explanation: "Test",
                },
              ],
            },
          },
        ],
      };

      const mockCourseId = "course-fail";
      const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      
      mockFirestore.addDoc
        .mockResolvedValueOnce({ id: mockCourseId }) // Course creation succeeds
        .mockRejectedValueOnce(new Error("Quiz creation failed")); // Quiz creation fails
      
      mockFirestore.doc.mockReturnValue(mockDocRef);
      mockFirestore.updateDoc.mockResolvedValue(undefined);
      mockFirestore.collection.mockReturnValue("mock-collection");

      const courseId = await CourseService.importCourse(courseData as any, mockUserId, "Test Instructor");

      // Course should still be created
      expect(courseId).toBe(mockCourseId);

      // Warning should be logged
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining("Failed to create quiz for lesson"),
        expect.any(Error),
      );

      // Quiz lesson should still be in lessons but without quizId
      const updateCall = mockFirestore.updateDoc.mock.calls[0];
      const lessons = updateCall[1].lessons;
      const quizLesson = lessons.find((l: any) => l.type === "quiz");
      expect(quizLesson).toBeDefined();
      expect(quizLesson.quizId).toBeUndefined();

      consoleWarnSpy.mockRestore();
    });

    test("should handle course creation failure", async () => {
      const courseData = {
        title: "Failing Course",
        description: "Test",
        category: "Programming",
        difficulty: "Beginner" as const,
        duration: "4 weeks",
        level: "free" as const,
        lessons: [
          {
            title: "Lesson 1",
            duration: "10 min",
            content: "# Content",
          },
        ],
      };

      const error = new Error("Failed to create course");
      mockFirestore.addDoc.mockRejectedValue(error);

      await expect(
        CourseService.importCourse(courseData as any, mockUserId, "Test Instructor"),
      ).rejects.toThrow("Failed to create course");
    });

    test("should handle lesson update failure", async () => {
      const courseData = {
        title: "Course with Update Failure",
        description: "Test",
        category: "Programming",
        difficulty: "Beginner" as const,
        duration: "4 weeks",
        level: "free" as const,
        lessons: [
          {
            title: "Lesson 1",
            duration: "10 min",
            content: "# Content",
          },
        ],
      };

      const mockCourseId = "course-update-fail";
      mockFirestore.addDoc.mockResolvedValue({ id: mockCourseId });
      mockFirestore.doc.mockReturnValue(mockDocRef);
      mockFirestore.updateDoc.mockRejectedValue(new Error("Update failed"));

      await expect(
        CourseService.importCourse(courseData as any, mockUserId, "Test Instructor"),
      ).rejects.toThrow("Update failed");
    });

    test("should set default values for optional fields", async () => {
      const courseData = {
        title: "Minimal Course",
        description: "Minimal data",
        category: "Programming",
        difficulty: "Beginner" as const,
        duration: "4 weeks",
        level: "free" as const,
        lessons: [
          {
            title: "Lesson 1",
            duration: "10 min",
            content: "# Content",
          },
        ],
      };

      const mockCourseId = "course-minimal";
      mockFirestore.addDoc.mockResolvedValue({ id: mockCourseId });
      mockFirestore.doc.mockReturnValue(mockDocRef);
      mockFirestore.updateDoc.mockResolvedValue(undefined);

      await CourseService.importCourse(courseData as any, mockUserId, "Test Instructor");

      const addDocCall = mockFirestore.addDoc.mock.calls[0][1];
      expect(addDocCall.tags).toEqual([]);
      expect(addDocCall.prerequisites).toEqual([]);
      expect(addDocCall.learningOutcomes).toEqual([]);
      expect(addDocCall.isPublished).toBe(false);
      expect(addDocCall.isFeatured).toBe(false);
    });
  });
});
