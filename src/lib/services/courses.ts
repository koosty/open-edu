// Course service for Open-EDU v1.1.0
// Handles CRUD operations, queries, and Firebase integration

import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  limit as firestoreLimit,
} from "firebase/firestore";
import { db } from "$lib/firebase";
import type { Course } from "$lib/types";
import {
  courseSchema,
  createCourseSchema,
  updateCourseSchema,
  type CourseFilter,
  type CourseSort,
  type Pagination,
} from "$lib/validation/course";
import { COLLECTIONS } from "$lib/firebase/collections";
import { hasToDate } from "$lib/utils/errors";
import type { QueryConstraint } from "firebase/firestore";

// Helper to convert Firestore timestamps to ISO strings
function convertTimestamps<T extends Record<string, unknown>>(data: T): T {
  if (!data) return data;

  const converted = { ...data } as Record<string, unknown>;

  // Convert Firestore Timestamps to ISO strings
  Object.keys(converted).forEach((key) => {
    const value = converted[key];
    if (hasToDate(value)) {
      converted[key] = value.toDate().toISOString();
    }
  });

  return converted as T;
}

// Course CRUD Operations
export class CourseService {
  /**
   * Get a single course by ID
   */
  static async getCourse(courseId: string): Promise<Course | null> {
    try {
      const courseRef = doc(db, COLLECTIONS.COURSES, courseId);
      const courseSnap = await getDoc(courseRef);

      if (!courseSnap.exists()) {
        return null;
      }

      const data = convertTimestamps({
        id: courseSnap.id,
        ...courseSnap.data(),
      });
      return courseSchema.parse(data);
    } catch (error) {
      console.error("Error getting course:", error);
      throw error;
    }
  }

  /**
   * Get multiple courses with filtering, sorting, and pagination
   */
  static async getCourses(
    filters: CourseFilter = {},
    sort: CourseSort = { field: "createdAt", direction: "desc" },
    pagination: Pagination = { page: 1, limit: 20 },
  ): Promise<{
    courses: Course[];
    total: number;
    hasMore: boolean;
    nextCursor?: string;
  }> {
    try {
      const courseQuery = collection(db, COLLECTIONS.COURSES);
      const queryConstraints: QueryConstraint[] = [];

      // Apply filters - prioritize categories due to Firestore query limitations
      if (filters.categories && filters.categories.length > 0) {
        queryConstraints.push(where("category", "in", filters.categories));
      } else if (filters.category) {
        queryConstraints.push(where("category", "==", filters.category));
      }

      // Note: Firestore doesn't allow multiple 'in' queries, so we'll handle
      // difficulties and levels with client-side filtering if categories are already filtered
      const needsClientSideFiltering =
        filters.categories &&
        filters.categories.length > 0 &&
        ((filters.difficulties && filters.difficulties.length > 0) ||
          (filters.levels && filters.levels.length > 0));

      if (!needsClientSideFiltering) {
        if (filters.difficulties && filters.difficulties.length > 0) {
          queryConstraints.push(
            where("difficulty", "in", filters.difficulties),
          );
        } else if (filters.difficulty) {
          queryConstraints.push(where("difficulty", "==", filters.difficulty));
        }

        if (filters.levels && filters.levels.length > 0) {
          queryConstraints.push(where("level", "in", filters.levels));
        } else if (filters.level) {
          queryConstraints.push(where("level", "==", filters.level));
        }
      }

      if (filters.instructor) {
        queryConstraints.push(where("instructor", "==", filters.instructor));
      }
      if (filters.isPublished !== undefined) {
        queryConstraints.push(where("isPublished", "==", filters.isPublished));
      }
      if (filters.isFeatured !== undefined) {
        queryConstraints.push(where("isFeatured", "==", filters.isFeatured));
      }
      if (filters.minRating) {
        queryConstraints.push(where("rating", ">=", filters.minRating));
      }
      if (filters.maxPrice) {
        queryConstraints.push(where("price", "<=", filters.maxPrice));
      }
      if (filters.tags && filters.tags.length > 0) {
        queryConstraints.push(
          where("tags", "array-contains-any", filters.tags),
        );
      }

      // Apply sorting
      queryConstraints.push(orderBy(sort.field, sort.direction));

      // Apply pagination - if searching, get more results for client-side filtering
      const fetchLimit = filters.search
        ? Math.max(pagination.limit * 3, 50)
        : pagination.limit + 1;
      queryConstraints.push(firestoreLimit(fetchLimit));

      const q = query(courseQuery, ...queryConstraints);
      const snapshot = await getDocs(q);

      const allCourses: Course[] = [];
      let hasMoreDocs = false;

      snapshot.docs.forEach((doc, index) => {
        if (index < fetchLimit - 1) {
          const data = convertTimestamps({ id: doc.id, ...doc.data() });
          allCourses.push(courseSchema.parse(data));
        } else if (!filters.search) {
          // Only set hasMore for non-search queries
          hasMoreDocs = true;
        }
      });

      // Apply client-side search filter (Firestore doesn't support full-text search)
      let filteredCourses = allCourses;
      if (filters.search) {
        const searchTerm = filters.search.toLowerCase();
        filteredCourses = allCourses.filter(
          (course) =>
            course.title.toLowerCase().includes(searchTerm) ||
            course.description.toLowerCase().includes(searchTerm) ||
            course.instructor.toLowerCase().includes(searchTerm) ||
            course.tags.some((tag) => tag.toLowerCase().includes(searchTerm)),
        );
      }

      // Apply additional client-side filtering for difficulties and levels when categories are filtered
      if (needsClientSideFiltering) {
        filteredCourses = filteredCourses.filter((course) => {
          // Apply difficulty filter
          const difficultyMatch =
            !filters.difficulties ||
            filters.difficulties.length === 0 ||
            filters.difficulties.includes(course.difficulty);

          // Apply level filter
          const levelMatch =
            !filters.levels ||
            filters.levels.length === 0 ||
            filters.levels.includes(course.level);

          return difficultyMatch && levelMatch;
        });
      }

      // Apply pagination to filtered results
      const startIndex = (pagination.page - 1) * pagination.limit;
      const endIndex = startIndex + pagination.limit;
      const paginatedCourses = filteredCourses.slice(startIndex, endIndex);
      const hasMore = filters.search
        ? endIndex < filteredCourses.length
        : hasMoreDocs;

      return {
        courses: paginatedCourses,
        total: filteredCourses.length,
        hasMore,
        nextCursor: undefined,
      };
    } catch (error) {
      console.error("Error getting courses:", error);
      throw error;
    }
  }

  /**
   * Create a new course
   */
  static async createCourse(
    courseData: Omit<Course, 'id' | 'enrolled' | 'rating' | 'ratingCount' | 'lessons' | 'chapters' | 'createdAt' | 'updatedAt'>,
    instructorId: string,
  ): Promise<string> {
    try {
      // Validate input
      const validatedData = createCourseSchema.parse({
        ...courseData,
        instructorId,
      });

      // Prepare course document
      const courseDoc = {
        ...validatedData,
        id: "", // Will be set by Firestore
        enrolled: 0,
        rating: 0,
        ratingCount: 0,
        lessons: [],
        chapters: [],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      // Add to Firestore
      const docRef = await addDoc(
        collection(db, COLLECTIONS.COURSES),
        courseDoc,
      );

      // Update the document with its own ID
      await updateDoc(docRef, { id: docRef.id });

      return docRef.id;
    } catch (error) {
      console.error("Error creating course:", error);
      throw error;
    }
  }

  /**
   * Update an existing course
   */
  static async updateCourse(courseId: string, updates: Partial<Course>): Promise<void> {
    try {
      // Validate updates
      const validatedUpdates = updateCourseSchema.parse({
        id: courseId,
        ...updates,
      });

      // Recursively remove undefined values (Firestore doesn't accept them)
      const cleanUndefined = <T>(obj: T): T => {
        if (Array.isArray(obj)) {
          return obj.map(cleanUndefined) as T;
        }
        if (obj !== null && typeof obj === 'object') {
          return Object.fromEntries(
            Object.entries(obj)
              .filter(([_, value]) => value !== undefined)
              .map(([key, value]) => [key, cleanUndefined(value)])
          ) as T;
        }
        return obj;
      };

      const cleanedUpdates = cleanUndefined(validatedUpdates);

      const courseRef = doc(db, COLLECTIONS.COURSES, courseId);
      await updateDoc(courseRef, {
        ...cleanedUpdates,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error("Error updating course:", error);
      throw error;
    }
  }

  /**
   * Delete a course
   */
  static async deleteCourse(courseId: string): Promise<void> {
    try {
      const courseRef = doc(db, COLLECTIONS.COURSES, courseId);
      await deleteDoc(courseRef);
    } catch (error) {
      console.error("Error deleting course:", error);
      throw error;
    }
  }

  /**
   * Publish/unpublish a course
   */
  static async togglePublishStatus(
    courseId: string,
    isPublished: boolean,
  ): Promise<void> {
    try {
      const courseRef = doc(db, COLLECTIONS.COURSES, courseId);
      const updateData: Record<string, unknown> = {
        isPublished,
        updatedAt: serverTimestamp(),
      };

      if (isPublished) {
        updateData.publishedAt = serverTimestamp();
      }

      await updateDoc(courseRef, updateData);
    } catch (error) {
      console.error("Error toggling publish status:", error);
      throw error;
    }
  }

  /**
   * Get courses by instructor
   */
  static async getCoursesByInstructor(instructorId: string): Promise<Course[]> {
    try {
      const q = query(
        collection(db, COLLECTIONS.COURSES),
        where("instructorId", "==", instructorId),
        orderBy("createdAt", "desc"),
      );

      const snapshot = await getDocs(q);
      const courses: Course[] = [];

      snapshot.forEach((doc) => {
        const data = convertTimestamps({ id: doc.id, ...doc.data() });
        courses.push(courseSchema.parse(data));
      });

      return courses;
    } catch (error) {
      console.error("Error getting courses by instructor:", error);
      throw error;
    }
  }

  /**
   * Get featured courses
   */
  static async getFeaturedCourses(limitCount = 6): Promise<Course[]> {
    try {
      const q = query(
        collection(db, COLLECTIONS.COURSES),
        where("isFeatured", "==", true),
        where("isPublished", "==", true),
        orderBy("rating", "desc"),
        firestoreLimit(limitCount),
      );

      const snapshot = await getDocs(q);
      const courses: Course[] = [];

      snapshot.forEach((doc) => {
        const data = convertTimestamps({ id: doc.id, ...doc.data() });
        courses.push(courseSchema.parse(data));
      });

      return courses;
    } catch (error) {
      console.error("Error getting featured courses:", error);
      throw error;
    }
  }

  /**
   * Search courses by title or description
   */
  static async searchCourses(
    searchTerm: string,
    limitCount = 20,
  ): Promise<Course[]> {
    try {
      // Get all published courses first (Firestore limitation)
      const q = query(
        collection(db, COLLECTIONS.COURSES),
        where("isPublished", "==", true),
        orderBy("rating", "desc"),
        firestoreLimit(100), // Reasonable limit for client-side filtering
      );

      const snapshot = await getDocs(q);
      const courses: Course[] = [];

      snapshot.forEach((doc) => {
        const data = convertTimestamps({ id: doc.id, ...doc.data() });
        courses.push(courseSchema.parse(data));
      });

      // Client-side filtering
      const searchTermLower = searchTerm.toLowerCase();
      return courses
        .filter(
          (course) =>
            course.title.toLowerCase().includes(searchTermLower) ||
            course.description.toLowerCase().includes(searchTermLower) ||
            course.instructor.toLowerCase().includes(searchTermLower) ||
            course.tags.some((tag) =>
              tag.toLowerCase().includes(searchTermLower),
            ),
        )
        .slice(0, limitCount);
    } catch (error) {
      console.error("Error searching courses:", error);
      throw error;
    }
  }

  /**
   * Get course statistics
   */
  static async getCourseStats(courseId: string): Promise<{
    enrollmentCount: number;
    completionRate: number;
    averageProgress: number;
    totalLessons: number;
  }> {
    try {
      // Get course details
      const course = await this.getCourse(courseId);
      if (!course) throw new Error("Course not found");

      // Get enrollment count
      const enrollmentQuery = query(
        collection(db, COLLECTIONS.ENROLLMENTS),
        where("courseId", "==", courseId),
        where("status", "==", "enrolled"),
      );
      const enrollmentSnapshot = await getDocs(enrollmentQuery);
      const enrollmentCount = enrollmentSnapshot.size;

      // Get completion statistics
      const progressQuery = query(
        collection(db, COLLECTIONS.COURSE_PROGRESS),
        where("courseId", "==", courseId),
      );
      const progressSnapshot = await getDocs(progressQuery);

      let totalProgress = 0;
      let completedCount = 0;

      progressSnapshot.forEach((doc) => {
        const data = doc.data();
        totalProgress += data.progressPercentage || 0;
        if (data.progressPercentage === 100) {
          completedCount++;
        }
      });

      const averageProgress =
        progressSnapshot.size > 0 ? totalProgress / progressSnapshot.size : 0;
      const completionRate =
        enrollmentCount > 0 ? (completedCount / enrollmentCount) * 100 : 0;

      return {
        enrollmentCount,
        completionRate,
        averageProgress,
        totalLessons: course.lessons.length,
      };
    } catch (error) {
      console.error("Error getting course stats:", error);
      throw error;
    }
  }

  /**
   * Update course rating
   */
  static async updateCourseRating(
    courseId: string,
    newRating: number,
  ): Promise<void> {
    try {
      const courseRef = doc(db, COLLECTIONS.COURSES, courseId);
      const courseSnap = await getDoc(courseRef);

      if (!courseSnap.exists()) {
        throw new Error("Course not found");
      }

      const currentData = courseSnap.data();
      const currentRating = currentData.rating || 0;
      const currentCount = currentData.ratingCount || 0;

      // Calculate new average rating
      const totalRating = currentRating * currentCount + newRating;
      const newCount = currentCount + 1;
      const newAverageRating = totalRating / newCount;

      await updateDoc(courseRef, {
        rating: Math.round(newAverageRating * 10) / 10, // Round to 1 decimal
        ratingCount: newCount,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error("Error updating course rating:", error);
      throw error;
    }
  }
}

// Re-export for convenience
export const {
  getCourse,
  getCourses,
  createCourse,
  updateCourse,
  deleteCourse,
  togglePublishStatus,
  getCoursesByInstructor,
  getFeaturedCourses,
  searchCourses,
  getCourseStats,
  updateCourseRating,
} = CourseService;
