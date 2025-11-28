// Course service for Open-EDU v1.6.0
// Handles CRUD operations, queries, and Firebase integration
// v1.6.0: Added metadata management for lessons and quizzes

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
  writeBatch,
} from "firebase/firestore";
import { db } from "$lib/firebase";
import type { Course, Lesson } from "$lib/types";
import type { LessonMetadata, QuizMetadata } from "$lib/types/lesson";
import { buildLessonMetadata, buildQuizMetadata } from "$lib/types/lesson";
import {
  courseSchema,
  createCourseSchema,
  updateCourseSchema,
  type CourseFilter,
  type CourseSort,
  type Pagination,
} from "$lib/validation/course";
import { COLLECTIONS } from "$lib/firebase/collections";
import { convertTimestamps } from "$lib/utils/firestore";
import type { QueryConstraint, DocumentReference } from "firebase/firestore";
import type { CourseImportData, QuizQuestionImportData } from "$lib/validation/course-import";
import { parseDurationToMinutes } from "$lib/utils/course-import";
import type { Quiz, QuizQuestion } from "$lib/types";
import type { QuestionOption } from "$lib/types/quiz";

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
   * v1.6.0: Initializes lessonsMetadata, quizzesMetadata, and count fields
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

      // Prepare course document with v1.6.0 metadata fields
      const courseDoc = {
        ...validatedData,
        id: "", // Will be set by Firestore
        enrolled: 0,
        rating: 0,
        ratingCount: 0,
        lessons: [],
        chapters: [],
        // v1.6.0: Initialize metadata arrays and counts
        lessonsMetadata: [],
        quizzesMetadata: [],
        totalLessons: 0,
        totalQuizzes: 0,
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
   * Delete a course and all related data (cascading delete)
   * Deletes in separate batches to avoid Firestore limits (500 ops/batch, 10 reads in security rules)
   * v1.6.0: Now also deletes lessons from the separate lessons collection
   * Deletes:
   * - Course document
   * - All lessons (from separate collection - v1.6.0)
   * - All enrollments
   * - All course progress records
   * - All quizzes associated with course lessons
   * - All quiz attempts for those quizzes
   * - All notes, bookmarks, highlights
   * - All reading positions
   */
  static async deleteCourse(courseId: string): Promise<void> {
    try {
      let totalDeleteCount = 0;
      const BATCH_SIZE = 50; // Small batches to avoid security rule read limits

      // Helper function to delete documents in batches
      const deleteBatch = async (docs: DocumentReference[], label: string) => {
        if (docs.length === 0) return 0;
        
        let count = 0;
        for (let i = 0; i < docs.length; i += BATCH_SIZE) {
          const batch = writeBatch(db);
          const chunk = docs.slice(i, i + BATCH_SIZE);
          
          chunk.forEach((docRef) => {
            batch.delete(docRef);
            count++;
          });
          
          await batch.commit();
          console.log(`Deleted ${chunk.length} ${label} (${i + chunk.length}/${docs.length})`);
        }
        
        return count;
      };

      console.log(`Starting deletion of course ${courseId}...`);

      // 1. Delete all lessons from separate collection (v1.6.0)
      const lessonsQuery = query(
        collection(db, COLLECTIONS.LESSONS),
        where("courseId", "==", courseId),
      );
      const lessonsSnap = await getDocs(lessonsQuery);
      const lessonRefs = lessonsSnap.docs.map(d => d.ref);
      totalDeleteCount += await deleteBatch(lessonRefs, "lessons");

      // 2. Delete all enrollments for this course
      const enrollmentsQuery = query(
        collection(db, COLLECTIONS.ENROLLMENTS),
        where("courseId", "==", courseId),
      );
      const enrollmentsSnap = await getDocs(enrollmentsQuery);
      const enrollmentRefs = enrollmentsSnap.docs.map(d => d.ref);
      totalDeleteCount += await deleteBatch(enrollmentRefs, "enrollments");

      // 3. Delete all course progress records
      const progressQuery = query(
        collection(db, COLLECTIONS.COURSE_PROGRESS),
        where("courseId", "==", courseId),
      );
      const progressSnap = await getDocs(progressQuery);
      const progressRefs = progressSnap.docs.map(d => d.ref);
      totalDeleteCount += await deleteBatch(progressRefs, "progress records");

      // 4. Delete all quizzes for this course and collect quiz IDs
      const quizzesQuery = query(
        collection(db, COLLECTIONS.QUIZZES),
        where("courseId", "==", courseId),
      );
      const quizzesSnap = await getDocs(quizzesQuery);
      const quizIds = quizzesSnap.docs.map(d => d.id);
      const quizRefs = quizzesSnap.docs.map(d => d.ref);
      totalDeleteCount += await deleteBatch(quizRefs, "quizzes");

      // 5. Delete all quiz attempts for those quizzes
      if (quizIds.length > 0) {
        // Firestore 'in' query has a limit of 30 items
        const chunkSize = 30;
        for (let i = 0; i < quizIds.length; i += chunkSize) {
          const chunk = quizIds.slice(i, i + chunkSize);
          const attemptsQuery = query(
            collection(db, COLLECTIONS.QUIZ_ATTEMPTS),
            where("quizId", "in", chunk),
          );
          const attemptsSnap = await getDocs(attemptsQuery);
          const attemptRefs = attemptsSnap.docs.map(d => d.ref);
          totalDeleteCount += await deleteBatch(attemptRefs, "quiz attempts");
        }
      }

      // 6. Delete notes for this course
      const notesQuery = query(
        collection(db, "notes"),
        where("courseId", "==", courseId),
      );
      const notesSnap = await getDocs(notesQuery);
      const noteRefs = notesSnap.docs.map(d => d.ref);
      totalDeleteCount += await deleteBatch(noteRefs, "notes");

      // 7. Delete bookmarks for this course
      const bookmarksQuery = query(
        collection(db, "bookmarks"),
        where("courseId", "==", courseId),
      );
      const bookmarksSnap = await getDocs(bookmarksQuery);
      const bookmarkRefs = bookmarksSnap.docs.map(d => d.ref);
      totalDeleteCount += await deleteBatch(bookmarkRefs, "bookmarks");

      // 8. Delete highlights for this course
      const highlightsQuery = query(
        collection(db, "highlights"),
        where("courseId", "==", courseId),
      );
      const highlightsSnap = await getDocs(highlightsQuery);
      const highlightRefs = highlightsSnap.docs.map(d => d.ref);
      totalDeleteCount += await deleteBatch(highlightRefs, "highlights");

      // 9. Delete reading positions for this course
      const readingPositionsQuery = query(
        collection(db, "readingPositions"),
        where("courseId", "==", courseId),
      );
      const readingPositionsSnap = await getDocs(readingPositionsQuery);
      const positionRefs = readingPositionsSnap.docs.map(d => d.ref);
      totalDeleteCount += await deleteBatch(positionRefs, "reading positions");

      // 10. Finally, delete the course document itself
      const courseRef = doc(db, COLLECTIONS.COURSES, courseId);
      await deleteDoc(courseRef);
      totalDeleteCount++;

      console.log(
        `✅ Successfully deleted course ${courseId} and ${totalDeleteCount} related documents`,
      );
    } catch (error) {
      console.error("❌ Error deleting course:", error);
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
   * v1.6.0: Uses totalLessons and totalQuizzes from course metadata when available
   */
  static async getCourseStats(courseId: string): Promise<{
    enrollmentCount: number;
    completionRate: number;
    averageProgress: number;
    totalLessons: number;
    totalQuizzes: number;
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

      // v1.6.0: Use denormalized counts when available, fallback to array length
      const totalLessons = course.totalLessons ?? course.lessons.length;
      const totalQuizzes = course.totalQuizzes ?? (course.quizzesMetadata?.length ?? 0);

      return {
        enrollmentCount,
        completionRate,
        averageProgress,
        totalLessons,
        totalQuizzes,
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

  /**
   * Import a course from JSON/YAML data with lessons and quizzes
   * Uses batched writes for better atomicity - all operations succeed or all fail
   * v1.6.0: Also creates lessonsMetadata, quizzesMetadata, and count fields
   */
  static async importCourse(
    data: CourseImportData,
    instructorId: string,
    instructorName: string,
  ): Promise<string> {
    const batch = writeBatch(db);
    let courseId: string | null = null;
    
    try {
      // Generate lesson IDs
      const generateId = () => `${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;

      // Prepare lessons array (without quiz data)
      type LessonDoc = Omit<Lesson, 'quiz' | 'attachments' | 'chapterId'>;
      
      const lessons = data.lessons.map((lesson, index): LessonDoc => {
        const lessonDoc: LessonDoc = {
          id: generateId(),
          courseId: '', // Will be set after course creation
          title: lesson.title,
          order: index + 1, // Auto-generate order based on array position
          duration: parseDurationToMinutes(lesson.duration), // Convert string to minutes
          isRequired: true, // Default to required
          completed: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          description: lesson.description ?? '',
          content: lesson.content ?? '',
          videoUrl: lesson.videoUrl ?? null,
        };

        return lessonDoc;
      });

      // Create course reference with auto-generated ID
      const courseRef = doc(collection(db, COLLECTIONS.COURSES));
      courseId = courseRef.id;
      const finalCourseId: string = courseId;
      
      // Update lessons with courseId
      const lessonsWithCourseId = lessons.map((lesson): LessonDoc => ({
        ...lesson,
        courseId: finalCourseId,
      }));

      // v1.6.0: Build lessonsMetadata array
      // Quiz detection: check type field or presence of questions array
      const lessonsMetadata: LessonMetadata[] = lessonsWithCourseId.map((lesson, index) => {
        const lessonData = data.lessons[index];
        const isQuizLesson = lessonData.type === 'quiz' || !!lessonData.questions;
        return {
          id: lesson.id,
          title: lesson.title,
          ...(lesson.description && { description: lesson.description }), // Only include if defined
          order: lesson.order,
          type: lesson.videoUrl ? 'video' : (isQuizLesson ? 'quiz' : 'content'),
          duration: lesson.duration ?? 0, // Default to 0 if not specified
          hasQuiz: isQuizLesson,
          isRequired: lesson.isRequired,
        };
      });

      // v1.6.0: Track quiz metadata as we create quizzes
      const quizzesMetadata: QuizMetadata[] = [];
      let quizOrder = 0;

      // Create quiz documents and collect metadata
      // v1.6.0: Quiz fields are flattened directly on lesson (no wrapper)
      for (let i = 0; i < data.lessons.length; i++) {
        const lessonData = data.lessons[i];
        const lessonDoc = lessonsWithCourseId[i];

        // v1.6.0: Detect quiz by type or presence of questions array (flattened structure)
        const isQuizLesson = lessonData.type === 'quiz' || (lessonData.questions && lessonData.questions.length > 0);

        if (isQuizLesson && lessonData.questions && lessonData.questions.length > 0) {
          quizOrder++;
          
          // Transform quiz questions to match Quiz type
          // v1.6.0: Questions are directly on lessonData, not lessonData.quiz
          const transformedQuestions = lessonData.questions.map((q: QuizQuestionImportData, qIndex: number): QuizQuestion => {
            // Map import question type to internal type format
            const questionType: QuizQuestion['type'] = 
              q.type === 'multiple-choice' ? 'multiple_choice'
              : q.type === 'true-false' ? 'true_false'
              : q.type === 'multiple-select' ? 'multiple_select'
              : q.type === 'fill-blank' ? 'fill_blank'
              : q.type as QuizQuestion['type'];
            
            // Base question structure
            const baseQuestion: Pick<QuizQuestion, 'id' | 'type' | 'question' | 'points' | 'order'> = {
              id: q.id,
              type: questionType,
              question: q.question,
              points: q.points ?? 1,
              order: qIndex,
            };

            // Transform based on question type
            let transformedQuestion: QuizQuestion;
            
            if (q.type === 'multiple-choice') {
              const options: QuestionOption[] = q.options.map((optText, optIndex) => ({
                id: `opt-${optIndex}`,
                text: optText,
                isCorrect: q.correctAnswer === optIndex,
              }));
              transformedQuestion = {
                ...baseQuestion,
                options,
                correctAnswer: `opt-${q.correctAnswer}`,
                explanation: q.explanation ?? '',
              };
            } else if (q.type === 'multiple-select') {
              const options: QuestionOption[] = q.options.map((optText, optIndex) => ({
                id: `opt-${optIndex}`,
                text: optText,
                isCorrect: q.correctAnswers.includes(optIndex),
              }));
              transformedQuestion = {
                ...baseQuestion,
                options,
                correctAnswer: q.correctAnswers.map(idx => `opt-${idx}`),
                explanation: q.explanation ?? '',
              };
            } else if (q.type === 'true-false') {
              transformedQuestion = {
                ...baseQuestion,
                correctAnswer: q.correctAnswer,
                explanation: q.explanation ?? '',
              };
            } else if (q.type === 'fill-blank') {
              transformedQuestion = {
                ...baseQuestion,
                correctAnswer: q.correctAnswer,
                caseSensitive: q.caseSensitive ?? false,
                explanation: q.explanation ?? '',
              };
            } else if (q.type === 'ordering') {
              const options: QuestionOption[] = q.items.map((item, idx) => ({
                id: `opt-${idx}`,
                text: item,
                isCorrect: false,
              }));
              transformedQuestion = {
                ...baseQuestion,
                options,
                correctAnswer: q.correctOrder.join(','), // Convert to string for storage
                explanation: q.explanation ?? '',
              };
            } else if (q.type === 'matching') {
              transformedQuestion = {
                ...baseQuestion,
                correctAnswer: JSON.stringify(q.pairs), // Serialize matching pairs
                explanation: q.explanation ?? '',
              };
            } else {
              // Fallback for unknown types
              transformedQuestion = {
                ...baseQuestion,
                correctAnswer: '',
              };
            }

            return transformedQuestion;
          });

          // Create quiz reference
          const quizRef = doc(collection(db, COLLECTIONS.QUIZZES));

          // Build quiz data object
          type QuizDoc = Omit<Quiz, 'id' | 'createdAt' | 'updatedAt'> & {
            createdAt: ReturnType<typeof serverTimestamp>;
            updatedAt: ReturnType<typeof serverTimestamp>;
          };
          
          // Build quiz data, excluding undefined optional fields (Firestore doesn't accept undefined)
          // v1.6.0: Quiz fields are flattened - use lesson title/description, settings from lesson
          const quizData: QuizDoc = {
            lessonId: lessonDoc.id,
            courseId: finalCourseId,
            title: lessonData.title, // Use lesson title (no duplicate)
            description: lessonData.description ?? '',
            instructions: lessonData.instructions ?? '',
            questions: transformedQuestions,
            passingScore: lessonData.passingScore ?? 70,
            allowMultipleAttempts: lessonData.allowMultipleAttempts ?? true,
            showCorrectAnswers: lessonData.showCorrectAnswers ?? true,
            showExplanations: lessonData.showExplanations ?? true,
            randomizeQuestions: lessonData.randomizeQuestions ?? false,
            randomizeOptions: lessonData.randomizeOptions ?? false,
            allowReview: lessonData.allowReview ?? true,
            isPublished: data.isPublished ?? false,
            createdBy: instructorId,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            // Only include optional fields if they have values
            ...(lessonData.timeLimit !== undefined && { timeLimit: lessonData.timeLimit }),
            ...(lessonData.maxAttempts !== undefined && { maxAttempts: lessonData.maxAttempts }),
          };

          // Add quiz to batch
          batch.set(quizRef, {
            ...quizData,
            id: quizRef.id,
          });

          // v1.6.0: Build quiz metadata
          quizzesMetadata.push(buildQuizMetadata(
            {
              id: quizRef.id,
              lessonId: lessonDoc.id,
              title: lessonData.title, // Use lesson title
              description: lessonData.description,
              questions: transformedQuestions,
              passingScore: lessonData.passingScore ?? 70,
              timeLimit: lessonData.timeLimit,
            },
            quizOrder
          ));
        }
      }

      // Prepare course document with v1.6.0 metadata
      type CourseDoc = Omit<Course, 'id' | 'createdAt' | 'updatedAt'> & {
        createdAt: ReturnType<typeof serverTimestamp>;
        updatedAt: ReturnType<typeof serverTimestamp>;
      };
      
      // Build course document with reasonable defaults for all fields
      const courseDoc: CourseDoc = {
        title: data.title,
        description: data.description,
        instructor: instructorName,
        instructorId: instructorId,
        thumbnail: data.thumbnail || 'https://placehold.co/400x225/6366f1/white?text=Course',
        category: data.category,
        difficulty: data.difficulty,
        duration: data.duration,
        enrolled: 0,
        rating: 0,
        ratingCount: 0,
        // v1.6.0: No longer store full lessons array - use lessonsMetadata instead
        lessons: [],
        chapters: [],
        tags: data.tags ?? [],
        isPublished: data.isPublished ?? false,
        isFeatured: data.isFeatured ?? false,
        currency: data.currency ?? 'USD',
        level: data.level,
        price: data.price ?? 0, // Default to 0 for free courses
        prerequisites: data.prerequisites ?? [],
        learningOutcomes: data.learningOutcomes ?? [],
        // v1.6.0: Add metadata fields (lightweight, no content)
        lessonsMetadata,
        quizzesMetadata,
        totalLessons: lessonsWithCourseId.length,
        totalQuizzes: quizzesMetadata.length,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      // v1.6.0: Write each lesson to the separate lessons collection
      for (const lesson of lessonsWithCourseId) {
        const lessonRef = doc(db, COLLECTIONS.LESSONS, lesson.id);
        batch.set(lessonRef, {
          ...lesson,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }

      // Add course document with ID to batch
      batch.set(courseRef, {
        ...courseDoc,
        id: finalCourseId,
      });

      // Commit all operations atomically
      await batch.commit();

      return finalCourseId;
    } catch (error) {
      console.error("Error importing course:", error);
      throw error;
    }
  }

  // ============================================
  // v1.6.0 Metadata Helper Methods
  // ============================================

  /**
   * Rebuild lessons metadata from the lessons array
   * Useful for migration or when metadata gets out of sync
   */
  static async rebuildLessonsMetadata(courseId: string): Promise<void> {
    try {
      const course = await this.getCourse(courseId);
      if (!course) throw new Error("Course not found");

      const lessonsMetadata: LessonMetadata[] = course.lessons.map(lesson => 
        buildLessonMetadata(lesson)
      );

      await updateDoc(doc(db, COLLECTIONS.COURSES, courseId), {
        lessonsMetadata,
        totalLessons: lessonsMetadata.length,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error("Error rebuilding lessons metadata:", error);
      throw error;
    }
  }

  /**
   * Rebuild quizzes metadata from the quizzes collection
   * Useful for migration or when metadata gets out of sync
   */
  static async rebuildQuizzesMetadata(courseId: string): Promise<void> {
    try {
      // Query all quizzes for this course
      const quizzesQuery = query(
        collection(db, COLLECTIONS.QUIZZES),
        where("courseId", "==", courseId),
        orderBy("createdAt", "asc"),
      );
      const quizzesSnap = await getDocs(quizzesQuery);
      
      const quizzesMetadata: QuizMetadata[] = quizzesSnap.docs.map((doc, index) => {
        const quiz = doc.data() as Quiz;
        return buildQuizMetadata(
          {
            id: doc.id,
            lessonId: quiz.lessonId,
            title: quiz.title,
            questions: quiz.questions,
            passingScore: quiz.passingScore,
            timeLimit: quiz.timeLimit,
          },
          index + 1
        );
      });

      await updateDoc(doc(db, COLLECTIONS.COURSES, courseId), {
        quizzesMetadata,
        totalQuizzes: quizzesMetadata.length,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error("Error rebuilding quizzes metadata:", error);
      throw error;
    }
  }

  /**
   * Rebuild all metadata (lessons + quizzes) for a course
   * v1.6.0: Use this for migration or data repair
   */
  static async rebuildAllMetadata(courseId: string): Promise<void> {
    await this.rebuildLessonsMetadata(courseId);
    await this.rebuildQuizzesMetadata(courseId);
  }

  /**
   * Get course overview (metadata only, no full lesson content)
   * v1.6.0: Optimized for course listing pages
   */
  static async getCourseOverview(courseId: string): Promise<{
    course: Course;
    lessonsMetadata: LessonMetadata[];
    quizzesMetadata: QuizMetadata[];
    totalLessons: number;
    totalQuizzes: number;
  } | null> {
    try {
      const course = await this.getCourse(courseId);
      if (!course) return null;

      return {
        course,
        lessonsMetadata: course.lessonsMetadata ?? [],
        quizzesMetadata: course.quizzesMetadata ?? [],
        totalLessons: course.totalLessons ?? course.lessons.length,
        totalQuizzes: course.totalQuizzes ?? 0,
      };
    } catch (error) {
      console.error("Error getting course overview:", error);
      throw error;
    }
  }

  /**
   * Update a single lesson's metadata in the course document
   * v1.6.0: Called when lesson title, order, duration, etc. changes
   */
  static async updateLessonMetadata(
    courseId: string,
    lessonId: string,
    updates: Partial<LessonMetadata>
  ): Promise<void> {
    try {
      const courseRef = doc(db, COLLECTIONS.COURSES, courseId);
      const courseSnap = await getDoc(courseRef);
      
      if (!courseSnap.exists()) {
        throw new Error("Course not found");
      }

      const courseData = courseSnap.data();
      const lessonsMetadata = (courseData.lessonsMetadata || []) as LessonMetadata[];
      
      const index = lessonsMetadata.findIndex(m => m.id === lessonId);
      if (index === -1) {
        throw new Error("Lesson metadata not found");
      }

      lessonsMetadata[index] = { ...lessonsMetadata[index], ...updates };

      await updateDoc(courseRef, {
        lessonsMetadata,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error("Error updating lesson metadata:", error);
      throw error;
    }
  }

  /**
   * Update a single quiz's metadata in the course document
   * v1.6.0: Called when quiz title, question count, etc. changes
   */
  static async updateQuizMetadata(
    courseId: string,
    quizId: string,
    updates: Partial<QuizMetadata>
  ): Promise<void> {
    try {
      const courseRef = doc(db, COLLECTIONS.COURSES, courseId);
      const courseSnap = await getDoc(courseRef);
      
      if (!courseSnap.exists()) {
        throw new Error("Course not found");
      }

      const courseData = courseSnap.data();
      const quizzesMetadata = (courseData.quizzesMetadata || []) as QuizMetadata[];
      
      const index = quizzesMetadata.findIndex(m => m.id === quizId);
      if (index === -1) {
        throw new Error("Quiz metadata not found");
      }

      quizzesMetadata[index] = { ...quizzesMetadata[index], ...updates };

      await updateDoc(courseRef, {
        quizzesMetadata,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error("Error updating quiz metadata:", error);
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
  importCourse,
  // v1.6.0 metadata helpers
  rebuildLessonsMetadata,
  rebuildQuizzesMetadata,
  rebuildAllMetadata,
  getCourseOverview,
  updateLessonMetadata,
  updateQuizMetadata,
} = CourseService;
