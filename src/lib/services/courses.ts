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
  writeBatch,
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
import { convertTimestamps } from "$lib/utils/firestore";
import type { QueryConstraint, DocumentReference } from "firebase/firestore";
import type { CourseImportData, QuizQuestionImportData } from "$lib/validation/course-import";
import { parseDurationToMinutes } from "$lib/utils/course-import";
import type { Lesson, Quiz, QuizQuestion } from "$lib/types";
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
   * Delete a course and all related data (cascading delete)
   * Deletes in separate batches to avoid Firestore limits (500 ops/batch, 10 reads in security rules)
   * Deletes:
   * - Course document
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

      // 1. Delete all enrollments for this course
      const enrollmentsQuery = query(
        collection(db, COLLECTIONS.ENROLLMENTS),
        where("courseId", "==", courseId),
      );
      const enrollmentsSnap = await getDocs(enrollmentsQuery);
      const enrollmentRefs = enrollmentsSnap.docs.map(d => d.ref);
      totalDeleteCount += await deleteBatch(enrollmentRefs, "enrollments");

      // 2. Delete all course progress records
      const progressQuery = query(
        collection(db, COLLECTIONS.COURSE_PROGRESS),
        where("courseId", "==", courseId),
      );
      const progressSnap = await getDocs(progressQuery);
      const progressRefs = progressSnap.docs.map(d => d.ref);
      totalDeleteCount += await deleteBatch(progressRefs, "progress records");

      // 3. Delete all quizzes for this course and collect quiz IDs
      const quizzesQuery = query(
        collection(db, COLLECTIONS.QUIZZES),
        where("courseId", "==", courseId),
      );
      const quizzesSnap = await getDocs(quizzesQuery);
      const quizIds = quizzesSnap.docs.map(d => d.id);
      const quizRefs = quizzesSnap.docs.map(d => d.ref);
      totalDeleteCount += await deleteBatch(quizRefs, "quizzes");

      // 4. Delete all quiz attempts for those quizzes
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

      // 5. Delete notes for this course
      const notesQuery = query(
        collection(db, "notes"),
        where("courseId", "==", courseId),
      );
      const notesSnap = await getDocs(notesQuery);
      const noteRefs = notesSnap.docs.map(d => d.ref);
      totalDeleteCount += await deleteBatch(noteRefs, "notes");

      // 6. Delete bookmarks for this course
      const bookmarksQuery = query(
        collection(db, "bookmarks"),
        where("courseId", "==", courseId),
      );
      const bookmarksSnap = await getDocs(bookmarksQuery);
      const bookmarkRefs = bookmarksSnap.docs.map(d => d.ref);
      totalDeleteCount += await deleteBatch(bookmarkRefs, "bookmarks");

      // 7. Delete highlights for this course
      const highlightsQuery = query(
        collection(db, "highlights"),
        where("courseId", "==", courseId),
      );
      const highlightsSnap = await getDocs(highlightsQuery);
      const highlightRefs = highlightsSnap.docs.map(d => d.ref);
      totalDeleteCount += await deleteBatch(highlightRefs, "highlights");

      // 8. Delete reading positions for this course
      const readingPositionsQuery = query(
        collection(db, "readingPositions"),
        where("courseId", "==", courseId),
      );
      const readingPositionsSnap = await getDocs(readingPositionsQuery);
      const positionRefs = readingPositionsSnap.docs.map(d => d.ref);
      totalDeleteCount += await deleteBatch(positionRefs, "reading positions");

      // 9. Finally, delete the course document itself
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

  /**
   * Import a course from JSON/YAML data with lessons and quizzes
   * Uses batched writes for better atomicity - all operations succeed or all fail
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
          description: lesson.description,
          content: lesson.content,
          videoUrl: lesson.videoUrl,
        };

        return lessonDoc;
      });

      // Prepare course document
      type CourseDoc = Omit<Course, 'id' | 'createdAt' | 'updatedAt'> & {
        createdAt: ReturnType<typeof serverTimestamp>;
        updatedAt: ReturnType<typeof serverTimestamp>;
      };
      
      const courseDoc: CourseDoc = {
        title: data.title,
        description: data.description,
        instructor: instructorName,
        instructorId: instructorId,
        thumbnail: data.thumbnail ?? '',
        category: data.category,
        difficulty: data.difficulty,
        duration: data.duration,
        enrolled: 0,
        rating: 0,
        ratingCount: 0,
        lessons: lessons,
        chapters: [],
        tags: data.tags ?? [],
        isPublished: data.isPublished ?? false,
        isFeatured: data.isFeatured ?? false,
        currency: data.currency ?? 'USD',
        level: data.level,
        price: data.price,
        prerequisites: data.prerequisites ?? [],
        learningOutcomes: data.learningOutcomes ?? [],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      // Create course reference with auto-generated ID
      const courseRef = doc(collection(db, COLLECTIONS.COURSES));
      courseId = courseRef.id;

      // Update lessons with courseId (courseId is guaranteed to be non-null here)
      const finalCourseId: string = courseId;
      
      const lessonsWithCourseId = lessons.map((lesson): LessonDoc => ({
        ...lesson,
        courseId: finalCourseId,
      }));

      // Add course document with ID and updated lessons to batch
      batch.set(courseRef, {
        ...courseDoc,
        id: finalCourseId,
        lessons: lessonsWithCourseId,
      });

      // Create quiz documents in the same batch
      for (let i = 0; i < data.lessons.length; i++) {
        const lessonData = data.lessons[i];
        const lessonDoc = lessonsWithCourseId[i];

        if (lessonData.quiz) {
          // Transform quiz questions to match Quiz type
          const transformedQuestions = lessonData.quiz.questions.map((q: QuizQuestionImportData, qIndex: number): QuizQuestion => {
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
              points: q.points,
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
                explanation: q.explanation,
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
                explanation: q.explanation,
              };
            } else if (q.type === 'true-false') {
              transformedQuestion = {
                ...baseQuestion,
                correctAnswer: q.correctAnswer,
                explanation: q.explanation,
              };
            } else if (q.type === 'fill-blank') {
              transformedQuestion = {
                ...baseQuestion,
                correctAnswer: q.correctAnswer,
                caseSensitive: q.caseSensitive,
                explanation: q.explanation,
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
                explanation: q.explanation,
              };
            } else if (q.type === 'matching') {
              transformedQuestion = {
                ...baseQuestion,
                correctAnswer: JSON.stringify(q.pairs), // Serialize matching pairs
                explanation: q.explanation,
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

          // Build quiz data object
          type QuizDoc = Omit<Quiz, 'id' | 'createdAt' | 'updatedAt'> & {
            createdAt: ReturnType<typeof serverTimestamp>;
            updatedAt: ReturnType<typeof serverTimestamp>;
          };
          
          const quizData: QuizDoc = {
            lessonId: lessonDoc.id,
            courseId: finalCourseId,
            title: lessonData.quiz.title,
            description: lessonData.quiz.description,
            instructions: lessonData.quiz.instructions,
            questions: transformedQuestions,
            timeLimit: lessonData.quiz.timeLimit,
            passingScore: lessonData.quiz.passingScore ?? 70,
            allowMultipleAttempts: lessonData.quiz.allowMultipleAttempts ?? true,
            maxAttempts: lessonData.quiz.maxAttempts,
            showCorrectAnswers: lessonData.quiz.showCorrectAnswers ?? true,
            showExplanations: lessonData.quiz.showExplanations ?? true,
            randomizeQuestions: lessonData.quiz.randomizeQuestions ?? false,
            randomizeOptions: lessonData.quiz.randomizeOptions ?? false,
            allowReview: lessonData.quiz.allowReview ?? true,
            isPublished: data.isPublished ?? false,
            createdBy: instructorId,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          };

          // Create quiz reference and add to batch
          const quizRef = doc(collection(db, COLLECTIONS.QUIZZES));
          batch.set(quizRef, {
            ...quizData,
            id: quizRef.id,
          });
        }
      }

      // Commit all operations atomically
      await batch.commit();

      return finalCourseId;
    } catch (error) {
      console.error("Error importing course:", error);
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
} = CourseService;
