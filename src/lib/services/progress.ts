// Progress tracking service for Open-EDU v1.1.0
// Handles lesson completion, progress updates, and course analytics

import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  query,
  where,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "$lib/firebase";
import type { UserProgress, Course, Lesson } from "$lib/types";
import { COLLECTIONS } from "$lib/firebase/collections";

// Helper to convert Firestore timestamps
function convertTimestamps(data: any): any {
  if (!data) return data;

  const converted = { ...data };

  Object.keys(converted).forEach((key) => {
    if (converted[key]?.toDate && typeof converted[key].toDate === "function") {
      converted[key] = converted[key].toDate().toISOString();
    }
  });

  return converted;
}

export class ProgressService {
  /**
   * Get user's progress for a specific course
   */
  static async getCourseProgress(
    userId: string,
    courseId: string,
  ): Promise<UserProgress | null> {
    try {
      const q = query(
        collection(db, COLLECTIONS.COURSE_PROGRESS),
        where("userId", "==", userId),
        where("courseId", "==", courseId),
      );

      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        return null;
      }

      const doc = snapshot.docs[0];
      const data = convertTimestamps({ id: doc.id, ...doc.data() });
      return data as UserProgress;
    } catch (error) {
      console.error("Error getting course progress:", error);
      throw error;
    }
  }

  /**
   * Start or update lesson progress
   */
  static async startLesson(
    userId: string,
    courseId: string,
    lessonId: string,
  ): Promise<void> {
    try {
      let progress = await this.getCourseProgress(userId, courseId);

      if (!progress) {
        // Check if user is enrolled but has no progress record
        const { EnrollmentService } = await import("./enrollment");
        const isEnrolled = await EnrollmentService.hasAccess(userId, courseId);

        if (!isEnrolled) {
          throw new Error("User not enrolled in course");
        }

        // Create progress record for enrolled user
        await this.createInitialProgressRecord(userId, courseId);
        progress = await this.getCourseProgress(userId, courseId);

        if (!progress) {
          throw new Error("Failed to create progress record");
        }
      }

      const updates: any = {
        currentLesson: lessonId,
        lastAccessedAt: serverTimestamp(),
      };

      // If this is the first lesson access, mark as started
      if (!progress.startedAt) {
        updates.startedAt = serverTimestamp();
      }

      const progressRef = doc(db, COLLECTIONS.COURSE_PROGRESS, progress.id);
      await updateDoc(progressRef, updates);
    } catch (error) {
      console.error("Error starting lesson:", error);
      throw error;
    }
  }

  /**
   * Mark a lesson as completed and update course progress
   */
  static async completeLesson(
    userId: string,
    courseId: string,
    lessonId: string,
    timeSpent: number = 0,
    quizScore?: number,
  ): Promise<void> {
    try {
      let progress = await this.getCourseProgress(userId, courseId);

      if (!progress) {
        // Check if user is enrolled but has no progress record
        const { EnrollmentService } = await import("./enrollment");
        const isEnrolled = await EnrollmentService.hasAccess(userId, courseId);

        if (!isEnrolled) {
          throw new Error("User not enrolled in course");
        }

        // Create progress record for enrolled user
        await this.createInitialProgressRecord(userId, courseId);
        progress = await this.getCourseProgress(userId, courseId);

        if (!progress) {
          throw new Error("Failed to create progress record");
        }
      }

      // Check if lesson is already completed
      if (progress.completedLessons.includes(lessonId)) {
        // Update existing completion with better score if applicable
        if (quizScore !== undefined) {
          const currentScore = progress.quizScores[lessonId];
          if (!currentScore || quizScore > currentScore) {
            const updates = {
              [`quizScores.${lessonId}`]: quizScore,
              lastAccessedAt: serverTimestamp(),
            };

            const progressRef = doc(
              db,
              COLLECTIONS.COURSE_PROGRESS,
              progress.id,
            );
            await updateDoc(progressRef, updates);
          }
        }
        return;
      }

      // Get course to calculate new progress percentage
      const courseRef = doc(db, COLLECTIONS.COURSES, courseId);
      const courseSnap = await getDoc(courseRef);

      if (!courseSnap.exists()) {
        throw new Error("Course not found");
      }

      const course = courseSnap.data() as Course;
      const totalLessons = course.lessons?.length || 0;
      const completedLessons = progress.completedLessons.length + 1;
      const newProgressPercentage =
        totalLessons > 0 ? (completedLessons / totalLessons) * 100 : 0;

      // Prepare updates
      const updates: any = {
        completedLessons: [...progress.completedLessons, lessonId],
        progressPercentage: Math.round(newProgressPercentage * 10) / 10, // Round to 1 decimal
        totalTimeSpent: (progress.totalTimeSpent || 0) + timeSpent,
        lastAccessedAt: serverTimestamp(),
        sessionCount: (progress.sessionCount || 0) + 1,
      };

      // Add quiz score if provided
      if (quizScore !== undefined) {
        updates[`quizScores.${lessonId}`] = quizScore;

        // Calculate new average quiz score
        const allScores = Object.values(progress.quizScores || {}) as number[];
        allScores.push(quizScore);
        const averageQuizScore =
          allScores.reduce((sum, score) => sum + score, 0) / allScores.length;
        updates.averageQuizScore = Math.round(averageQuizScore * 10) / 10;
      }

      // Mark course as completed if all lessons are done
      if (newProgressPercentage >= 100) {
        updates.completedAt = serverTimestamp();
      }

      // Update progress record
      const progressRef = doc(db, COLLECTIONS.COURSE_PROGRESS, progress.id);
      await updateDoc(progressRef, updates);
    } catch (error) {
      console.error("Error completing lesson:", error);
      throw error;
    }
  }

  /**
   * Update quiz attempt
   */
  static async updateQuizAttempt(
    userId: string,
    courseId: string,
    lessonId: string,
    score: number,
    timeSpent: number,
  ): Promise<void> {
    try {
      let progress = await this.getCourseProgress(userId, courseId);

      if (!progress) {
        // Check if user is enrolled but has no progress record
        const { EnrollmentService } = await import("./enrollment");
        const isEnrolled = await EnrollmentService.hasAccess(userId, courseId);

        if (!isEnrolled) {
          throw new Error("User not enrolled in course");
        }

        // Create progress record for enrolled user
        await this.createInitialProgressRecord(userId, courseId);
        progress = await this.getCourseProgress(userId, courseId);

        if (!progress) {
          throw new Error("Failed to create progress record");
        }
      }

      const currentAttempts = progress.quizAttempts?.[lessonId] || 0;
      const currentBestScore = progress.quizScores?.[lessonId] || 0;

      const updates: any = {
        [`quizAttempts.${lessonId}`]: currentAttempts + 1,
        totalTimeSpent: (progress.totalTimeSpent || 0) + timeSpent,
        lastAccessedAt: serverTimestamp(),
      };

      // Update best score if this attempt is better
      if (score > currentBestScore) {
        updates[`quizScores.${lessonId}`] = score;

        // Recalculate average quiz score
        const allScores = Object.values(progress.quizScores || {}) as number[];
        const scoreIndex = allScores.findIndex((_, index) => {
          const lessonIds = Object.keys(progress.quizScores || {});
          return lessonIds[index] === lessonId;
        });

        if (scoreIndex >= 0) {
          allScores[scoreIndex] = score;
        } else {
          allScores.push(score);
        }

        const averageQuizScore =
          allScores.reduce((sum, s) => sum + s, 0) / allScores.length;
        updates.averageQuizScore = Math.round(averageQuizScore * 10) / 10;
      }

      const progressRef = doc(db, COLLECTIONS.COURSE_PROGRESS, progress.id);
      await updateDoc(progressRef, updates);
    } catch (error) {
      console.error("Error updating quiz attempt:", error);
      throw error;
    }
  }

  /**
   * Get lesson completion status
   */
  static async isLessonCompleted(
    userId: string,
    courseId: string,
    lessonId: string,
  ): Promise<boolean> {
    try {
      const progress = await this.getCourseProgress(userId, courseId);
      return progress ? progress.completedLessons.includes(lessonId) : false;
    } catch (error) {
      console.error("Error checking lesson completion:", error);
      return false;
    }
  }

  /**
   * Get user's quiz score for a lesson
   */
  static async getQuizScore(
    userId: string,
    courseId: string,
    lessonId: string,
  ): Promise<number | null> {
    try {
      const progress = await this.getCourseProgress(userId, courseId);
      return progress?.quizScores?.[lessonId] || null;
    } catch (error) {
      console.error("Error getting quiz score:", error);
      return null;
    }
  }

  /**
   * Get detailed progress summary for a course
   */
  static async getProgressSummary(
    userId: string,
    courseId: string,
  ): Promise<{
    progress: UserProgress | null;
    course: Course | null;
    nextLesson: Lesson | null;
    completionRate: number;
  }> {
    try {
      const [progress, courseSnap] = await Promise.all([
        this.getCourseProgress(userId, courseId),
        getDoc(doc(db, COLLECTIONS.COURSES, courseId)),
      ]);

      const course = courseSnap.exists()
        ? ({
            id: courseSnap.id,
            ...convertTimestamps(courseSnap.data()),
          } as Course)
        : null;

      let nextLesson: Lesson | null = null;
      let completionRate = 0;

      if (progress && course?.lessons) {
        // Calculate completion rate
        completionRate =
          (progress.completedLessons.length / course.lessons.length) * 100;

        // Find next uncompleted lesson
        const sortedLessons = [...course.lessons].sort(
          (a, b) => a.order - b.order,
        );
        nextLesson =
          sortedLessons.find(
            (lesson) => !progress.completedLessons.includes(lesson.id),
          ) || null;
      }

      return {
        progress,
        course,
        nextLesson,
        completionRate: Math.round(completionRate * 10) / 10,
      };
    } catch (error) {
      console.error("Error getting progress summary:", error);
      throw error;
    }
  }

  /**
   * Update user activity streak
   */
  static async updateActivityStreak(
    userId: string,
    courseId: string,
  ): Promise<void> {
    try {
      const progress = await this.getCourseProgress(userId, courseId);

      if (!progress) return;

      const now = new Date();
      const lastActiveDate = new Date(
        progress.lastActiveDate || progress.lastAccessedAt,
      );
      const daysDifference = Math.floor(
        (now.getTime() - lastActiveDate.getTime()) / (1000 * 60 * 60 * 24),
      );

      let newStreakDays = progress.streakDays || 0;

      if (daysDifference === 1) {
        // Consecutive day - increment streak
        newStreakDays += 1;
      } else if (daysDifference > 1) {
        // Streak broken - reset to 1
        newStreakDays = 1;
      }
      // If daysDifference === 0, it's the same day, keep current streak

      const updates = {
        streakDays: newStreakDays,
        lastActiveDate: now.toISOString(),
        lastAccessedAt: serverTimestamp(),
      };

      const progressRef = doc(db, COLLECTIONS.COURSE_PROGRESS, progress.id);
      await updateDoc(progressRef, updates);
    } catch (error) {
      console.error("Error updating activity streak:", error);
      // Non-critical error, don't throw
    }
  }

  /**
   * Create initial progress record for a user and course
   */
  static async createInitialProgressRecord(
    userId: string,
    courseId: string,
  ): Promise<void> {
    try {
      const progressData = {
        userId,
        courseId,
        enrolledAt: serverTimestamp(),
        startedAt: null,
        completedAt: null,
        lastAccessedAt: serverTimestamp(),
        completedLessons: [],
        currentChapter: null,
        currentLesson: null,
        progressPercentage: 0,
        overallProgress: 0,
        totalTimeSpent: 0,
        sessionCount: 0,
        averageSessionTime: 0,
        quizScores: {},
        quizAttempts: {},
        averageQuizScore: 0,
        achievements: [],
        totalPoints: 0,
        streakDays: 0,
        lastActiveDate: new Date().toISOString(),
      };

      const docRef = await addDoc(
        collection(db, COLLECTIONS.COURSE_PROGRESS),
        progressData,
      );

      // Update progress ID
      await updateDoc(docRef, { id: docRef.id });
    } catch (error) {
      console.error("Error creating initial progress record:", error);
      throw error;
    }
  }
}

// Re-export for convenience
export const {
  getCourseProgress,
  startLesson,
  completeLesson,
  updateQuizAttempt,
  isLessonCompleted,
  getQuizScore,
  getProgressSummary,
  updateActivityStreak,
} = ProgressService;
