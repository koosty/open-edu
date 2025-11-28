// Lesson service for Open-EDU v1.6.0
// Handles CRUD operations for lessons stored in separate collection
// Implements dual-write pattern during migration

import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  serverTimestamp,
  writeBatch,
  increment,
  arrayUnion,
  arrayRemove,
} from "firebase/firestore"
import { db } from "$lib/firebase"
import { COLLECTIONS } from "$lib/firebase/collections"
import { convertTimestamps } from "$lib/utils/firestore"
import { lessonDocumentSchema } from "$lib/firebase/schemas"
import type { Lesson, LessonMetadata } from "$lib/types/lesson"
import { buildLessonMetadata } from "$lib/types/lesson"

/**
 * Lesson Service - v1.6.0 Architecture
 * 
 * Manages lessons in separate `lessons` collection while maintaining
 * metadata sync with parent course document.
 * 
 * Key features:
 * - CRUD operations on lessons collection
 * - Automatic metadata sync to course document
 * - Batch operations for reordering
 * - Query by course, order, etc.
 */
export class LessonService {
  /**
   * Get a single lesson by ID from the lessons collection
   */
  static async getLesson(lessonId: string): Promise<Lesson | null> {
    try {
      const lessonRef = doc(db, COLLECTIONS.LESSONS, lessonId)
      const lessonSnap = await getDoc(lessonRef)

      if (!lessonSnap.exists()) {
        return null
      }

      const data = convertTimestamps({
        id: lessonSnap.id,
        ...lessonSnap.data(),
      })
      return lessonDocumentSchema.parse(data) as Lesson
    } catch (error) {
      console.error("Error getting lesson:", error)
      throw error
    }
  }

  /**
   * Get all lessons for a course, ordered by lesson order
   */
  static async getLessonsByCourse(courseId: string): Promise<Lesson[]> {
    try {
      const q = query(
        collection(db, COLLECTIONS.LESSONS),
        where("courseId", "==", courseId),
        orderBy("order", "asc")
      )

      const snapshot = await getDocs(q)
      const lessons: Lesson[] = []

      snapshot.forEach((doc) => {
        const data = convertTimestamps({ id: doc.id, ...doc.data() })
        lessons.push(lessonDocumentSchema.parse(data) as Lesson)
      })

      return lessons
    } catch (error) {
      console.error("Error getting lessons by course:", error)
      throw error
    }
  }

  /**
   * Create a new lesson in the lessons collection
   * Also updates course metadata for quick access
   */
  static async createLesson(
    lessonData: Omit<Lesson, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<string> {
    try {
      const batch = writeBatch(db)

      // Prepare lesson document
      const lessonDoc = {
        ...lessonData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }

      // Create lesson in lessons collection
      const lessonRef = doc(collection(db, COLLECTIONS.LESSONS))
      batch.set(lessonRef, {
        ...lessonDoc,
        id: lessonRef.id,
      })

      // Build metadata for course document
      const metadata: LessonMetadata = {
        id: lessonRef.id,
        title: lessonData.title,
        ...(lessonData.description && { description: lessonData.description }), // Only include if defined
        order: lessonData.order,
        type: lessonData.videoUrl ? 'video' : (lessonData.quiz ? 'quiz' : 'content'),
        duration: lessonData.duration ?? 0,
        hasQuiz: !!lessonData.quiz,
        isRequired: lessonData.isRequired,
      }

      // Update course document with metadata
      const courseRef = doc(db, COLLECTIONS.COURSES, lessonData.courseId)
      batch.update(courseRef, {
        lessonsMetadata: arrayUnion(metadata),
        totalLessons: increment(1),
        updatedAt: serverTimestamp(),
      })

      await batch.commit()
      return lessonRef.id
    } catch (error) {
      console.error("Error creating lesson:", error)
      throw error
    }
  }

  /**
   * Update an existing lesson
   * Also updates course metadata if title/order/type changed
   */
  static async updateLesson(
    lessonId: string,
    updates: Partial<Omit<Lesson, 'id' | 'courseId' | 'createdAt'>>
  ): Promise<void> {
    try {
      // Get current lesson to access courseId
      const currentLesson = await this.getLesson(lessonId)
      if (!currentLesson) {
        throw new Error("Lesson not found")
      }

      const batch = writeBatch(db)

      // Update lesson document
      const lessonRef = doc(db, COLLECTIONS.LESSONS, lessonId)
      batch.update(lessonRef, {
        ...updates,
        updatedAt: serverTimestamp(),
      })

      // Rebuild metadata with updates
      const updatedLesson = { ...currentLesson, ...updates }
      const newMetadata = buildLessonMetadata(updatedLesson)
      const oldMetadata = buildLessonMetadata(currentLesson)

      // Update course metadata (remove old, add new)
      const courseRef = doc(db, COLLECTIONS.COURSES, currentLesson.courseId)
      batch.update(courseRef, {
        lessonsMetadata: arrayRemove(oldMetadata),
      })
      batch.update(courseRef, {
        lessonsMetadata: arrayUnion(newMetadata),
        updatedAt: serverTimestamp(),
      })

      await batch.commit()
    } catch (error) {
      console.error("Error updating lesson:", error)
      throw error
    }
  }

  /**
   * Delete a lesson from the lessons collection
   * Also removes metadata from course and decrements count
   */
  static async deleteLesson(lessonId: string): Promise<void> {
    try {
      // Get lesson to access courseId and metadata
      const lesson = await this.getLesson(lessonId)
      if (!lesson) {
        throw new Error("Lesson not found")
      }

      const batch = writeBatch(db)

      // Delete lesson document
      const lessonRef = doc(db, COLLECTIONS.LESSONS, lessonId)
      batch.delete(lessonRef)

      // Build metadata to remove from course
      const metadata = buildLessonMetadata(lesson)

      // Update course document
      const courseRef = doc(db, COLLECTIONS.COURSES, lesson.courseId)
      batch.update(courseRef, {
        lessonsMetadata: arrayRemove(metadata),
        totalLessons: increment(-1),
        updatedAt: serverTimestamp(),
      })

      await batch.commit()
    } catch (error) {
      console.error("Error deleting lesson:", error)
      throw error
    }
  }

  /**
   * Batch update lessons - used for reordering
   * Updates all lesson order fields and syncs course metadata
   * 
   * @param courseId - The course ID
   * @param lessons - Array of lessons with updated order fields
   */
  static async batchUpdateLessons(
    courseId: string,
    lessons: Array<{ id: string; order: number; title: string; description?: string; duration?: number; isRequired: boolean; videoUrl?: string | null; quiz?: unknown }>
  ): Promise<void> {
    try {
      const batch = writeBatch(db)

      // Update each lesson document's order
      lessons.forEach((lesson) => {
        const lessonRef = doc(db, COLLECTIONS.LESSONS, lesson.id)
        batch.update(lessonRef, {
          order: lesson.order,
          updatedAt: serverTimestamp(),
        })
      })

      // Rebuild full metadata array for course
      const lessonsMetadata: LessonMetadata[] = lessons.map((lesson) => ({
        id: lesson.id,
        title: lesson.title,
        ...(lesson.description && { description: lesson.description }), // Only include if defined
        order: lesson.order,
        type: lesson.videoUrl ? 'video' : (lesson.quiz ? 'quiz' : 'content') as LessonMetadata['type'],
        duration: lesson.duration ?? 0,
        hasQuiz: !!lesson.quiz,
        isRequired: lesson.isRequired,
      }))

      // Update course with new metadata array
      const courseRef = doc(db, COLLECTIONS.COURSES, courseId)
      batch.update(courseRef, {
        lessonsMetadata,
        totalLessons: lessons.length,
        updatedAt: serverTimestamp(),
      })

      await batch.commit()
    } catch (error) {
      console.error("Error batch updating lessons:", error)
      throw error
    }
  }

  /**
   * Reorder a single lesson within a course
   * Automatically adjusts order of other lessons
   * 
   * @param lessonId - The lesson to move
   * @param newOrder - The new order position (0-based)
   */
  static async reorderLesson(lessonId: string, newOrder: number): Promise<void> {
    try {
      // Get current lesson
      const lesson = await this.getLesson(lessonId)
      if (!lesson) {
        throw new Error("Lesson not found")
      }

      const oldOrder = lesson.order

      // No change needed
      if (oldOrder === newOrder) return

      // Get all lessons for the course
      const lessons = await this.getLessonsByCourse(lesson.courseId)

      // Reorder lessons
      const reorderedLessons = lessons.map((l) => {
        if (l.id === lessonId) {
          return { ...l, order: newOrder }
        }

        // Adjust other lessons' order
        if (oldOrder < newOrder) {
          // Moving down: decrement lessons between old and new position
          if (l.order > oldOrder && l.order <= newOrder) {
            return { ...l, order: l.order - 1 }
          }
        } else {
          // Moving up: increment lessons between new and old position
          if (l.order >= newOrder && l.order < oldOrder) {
            return { ...l, order: l.order + 1 }
          }
        }

        return l
      })

      // Sort by new order
      reorderedLessons.sort((a, b) => a.order - b.order)

      // Batch update all affected lessons
      await this.batchUpdateLessons(lesson.courseId, reorderedLessons)
    } catch (error) {
      console.error("Error reordering lesson:", error)
      throw error
    }
  }

  /**
   * Get lesson count for a course (from course metadata)
   */
  static async getLessonCount(courseId: string): Promise<number> {
    try {
      const courseRef = doc(db, COLLECTIONS.COURSES, courseId)
      const courseSnap = await getDoc(courseRef)

      if (!courseSnap.exists()) {
        return 0
      }

      const data = courseSnap.data()
      return data.totalLessons ?? data.lessons?.length ?? 0
    } catch (error) {
      console.error("Error getting lesson count:", error)
      throw error
    }
  }

  /**
   * Get lessons metadata from course (lightweight, no content)
   * For course overview pages
   */
  static async getLessonsMetadata(courseId: string): Promise<LessonMetadata[]> {
    try {
      const courseRef = doc(db, COLLECTIONS.COURSES, courseId)
      const courseSnap = await getDoc(courseRef)

      if (!courseSnap.exists()) {
        return []
      }

      const data = courseSnap.data()
      return (data.lessonsMetadata ?? []) as LessonMetadata[]
    } catch (error) {
      console.error("Error getting lessons metadata:", error)
      throw error
    }
  }
}

// Re-export for convenience
export const {
  getLesson,
  getLessonsByCourse,
  createLesson,
  updateLesson,
  deleteLesson,
  batchUpdateLessons,
  reorderLesson,
  getLessonCount,
  getLessonsMetadata,
} = LessonService
