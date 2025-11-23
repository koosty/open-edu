// Enrollment service for Open-EDU v1.1.0
// Handles user enrollments, access verification, and enrollment management

import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "$lib/firebase";
import type { Enrollment } from "$lib/types";
import { COLLECTIONS } from "$lib/firebase/collections";
import { convertTimestamps } from "$lib/utils/firestore";

// Enrollment Service
export class EnrollmentService {
  /**
   * Enroll a user in a course
   */
  static async enrollUser(userId: string, courseId: string): Promise<string> {
    try {
      // Check if user is already enrolled
      const existingEnrollment = await this.getEnrollment(userId, courseId);
      if (existingEnrollment) {
        throw new Error("User is already enrolled in this course");
      }

      // Check if course exists and is published
      const courseRef = doc(db, COLLECTIONS.COURSES, courseId);
      const courseSnap = await getDoc(courseRef);

      if (!courseSnap.exists()) {
        throw new Error("Course not found");
      }

      const courseData = courseSnap.data();
      if (!courseData.isPublished) {
        throw new Error("Course is not published");
      }

      // Create enrollment record
      const enrollmentData = {
        userId,
        courseId,
        enrolledAt: serverTimestamp(),
        status: "enrolled",
        completedAt: null,
        certificateIssued: false,
        certificateUrl: null,
        enrollmentSource: "direct",
        paymentStatus: courseData.level === "premium" ? "pending" : "paid",
        notes: "",
      };

      const docRef = await addDoc(
        collection(db, COLLECTIONS.ENROLLMENTS),
        enrollmentData,
      );

      // Update enrollment ID
      await updateDoc(docRef, { id: docRef.id });

      // Increment course enrollment count
      await updateDoc(courseRef, {
        enrolled: (courseData.enrolled || 0) + 1,
        updatedAt: serverTimestamp(),
      });

      // Create initial progress record
      await this.createInitialProgress(userId, courseId);

      return docRef.id;
    } catch (error) {
      console.error("Error enrolling user:", error);
      throw error;
    }
  }

  /**
   * Unenroll a user from a course
   */
  static async unenrollUser(userId: string, courseId: string): Promise<void> {
    try {
      const enrollment = await this.getEnrollment(userId, courseId);
      if (!enrollment) {
        throw new Error("User is not enrolled in this course");
      }

      // Update enrollment status
      const enrollmentRef = doc(db, COLLECTIONS.ENROLLMENTS, enrollment.id);
      await updateDoc(enrollmentRef, {
        status: "dropped",
        updatedAt: serverTimestamp(),
      });

      // Decrement course enrollment count
      const courseRef = doc(db, COLLECTIONS.COURSES, courseId);
      const courseSnap = await getDoc(courseRef);

      if (courseSnap.exists()) {
        const courseData = courseSnap.data();
        await updateDoc(courseRef, {
          enrolled: Math.max(0, (courseData.enrolled || 1) - 1),
          updatedAt: serverTimestamp(),
        });
      }
    } catch (error) {
      console.error("Error unenrolling user:", error);
      throw error;
    }
  }

  /**
   * Get enrollment record for a user and course
   */
  static async getEnrollment(
    userId: string,
    courseId: string,
  ): Promise<Enrollment | null> {
    try {
      const q = query(
        collection(db, COLLECTIONS.ENROLLMENTS),
        where("userId", "==", userId),
        where("courseId", "==", courseId),
        where("status", "in", ["enrolled", "active", "completed"]),
      );

      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        return null;
      }

      const doc = snapshot.docs[0];
      const data = convertTimestamps({ id: doc.id, ...doc.data() });
      return data as Enrollment;
    } catch (error) {
      console.error("Error getting enrollment:", error);
      throw error;
    }
  }

  /**
   * Get all enrollments for a user
   */
  static async getUserEnrollments(userId: string): Promise<Enrollment[]> {
    try {
      const q = query(
        collection(db, COLLECTIONS.ENROLLMENTS),
        where("userId", "==", userId),
        where("status", "in", ["enrolled", "active", "completed"]),
        orderBy("enrolledAt", "desc"),
      );

      const snapshot = await getDocs(q);
      const enrollments: Enrollment[] = [];

      snapshot.forEach((doc) => {
        const data = convertTimestamps({ id: doc.id, ...doc.data() });
        enrollments.push(data as Enrollment);
      });

      return enrollments;
    } catch (error) {
      console.error("Error getting user enrollments:", error);
      throw error;
    }
  }

  /**
   * Get all enrollments for a course
   */
  static async getCourseEnrollments(courseId: string): Promise<Enrollment[]> {
    try {
      const q = query(
        collection(db, COLLECTIONS.ENROLLMENTS),
        where("courseId", "==", courseId),
        where("status", "in", ["enrolled", "active", "completed"]),
        orderBy("enrolledAt", "desc"),
      );

      const snapshot = await getDocs(q);
      const enrollments: Enrollment[] = [];

      snapshot.forEach((doc) => {
        const data = convertTimestamps({ id: doc.id, ...doc.data() });
        enrollments.push(data as Enrollment);
      });

      return enrollments;
    } catch (error) {
      console.error("Error getting course enrollments:", error);
      throw error;
    }
  }

  /**
   * Check if user has access to a course
   */
  static async hasAccess(userId: string, courseId: string): Promise<boolean> {
    try {
      const enrollment = await this.getEnrollment(userId, courseId);
      return (
        enrollment !== null &&
        ["enrolled", "active", "completed"].includes(enrollment.status)
      );
    } catch (error) {
      console.error("Error checking course access:", error);
      return false;
    }
  }

  /**
   * Mark course as completed for a user
   */
  static async completeCourse(userId: string, courseId: string): Promise<void> {
    try {
      const enrollment = await this.getEnrollment(userId, courseId);
      if (!enrollment) {
        throw new Error("User is not enrolled in this course");
      }

      const enrollmentRef = doc(db, COLLECTIONS.ENROLLMENTS, enrollment.id);
      await updateDoc(enrollmentRef, {
        status: "completed",
        completedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // Update progress to 100%
      await this.updateProgress(userId, courseId, { progressPercentage: 100 });
    } catch (error) {
      console.error("Error completing course:", error);
      throw error;
    }
  }

  /**
   * Create initial progress record for a new enrollment
   */
  private static async createInitialProgress(
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

      await addDoc(collection(db, COLLECTIONS.COURSE_PROGRESS), progressData);
    } catch (error) {
      console.error("Error creating initial progress:", error);
      throw error;
    }
  }

  /**
   * Update user progress
   */
  private static async updateProgress(
    userId: string,
    courseId: string,
    updates: Record<string, unknown>,
  ): Promise<void> {
    try {
      const q = query(
        collection(db, COLLECTIONS.COURSE_PROGRESS),
        where("userId", "==", userId),
        where("courseId", "==", courseId),
      );

      const snapshot = await getDocs(q);

      if (!snapshot.empty) {
        const doc = snapshot.docs[0];
        await updateDoc(doc.ref, {
          ...updates,
          lastAccessedAt: serverTimestamp(),
        });
      }
    } catch (error) {
      console.error("Error updating progress:", error);
      throw error;
    }
  }

  /**
   * Get enrollment statistics for a course
   */
  static async getEnrollmentStats(courseId: string): Promise<{
    totalEnrollments: number;
    activeEnrollments: number;
    completedEnrollments: number;
    dropRate: number;
    completionRate: number;
  }> {
    try {
      const q = query(
        collection(db, COLLECTIONS.ENROLLMENTS),
        where("courseId", "==", courseId),
      );

      const snapshot = await getDocs(q);

      let totalEnrollments = 0;
      let activeEnrollments = 0;
      let completedEnrollments = 0;
      let droppedEnrollments = 0;

      snapshot.forEach((doc) => {
        const data = doc.data();
        totalEnrollments++;

        switch (data.status) {
          case "enrolled":
          case "active":
            activeEnrollments++;
            break;
          case "completed":
            completedEnrollments++;
            break;
          case "dropped":
            droppedEnrollments++;
            break;
        }
      });

      const dropRate =
        totalEnrollments > 0
          ? (droppedEnrollments / totalEnrollments) * 100
          : 0;
      const completionRate =
        totalEnrollments > 0
          ? (completedEnrollments / totalEnrollments) * 100
          : 0;

      return {
        totalEnrollments,
        activeEnrollments,
        completedEnrollments,
        dropRate,
        completionRate,
      };
    } catch (error) {
      console.error("Error getting enrollment stats:", error);
      throw error;
    }
  }

  /**
   * Issue certificate for completed course
   */
  static async issueCertificate(
    userId: string,
    courseId: string,
    certificateUrl: string,
  ): Promise<void> {
    try {
      const enrollment = await this.getEnrollment(userId, courseId);
      if (!enrollment) {
        throw new Error("User is not enrolled in this course");
      }

      if (enrollment.status !== "completed") {
        throw new Error("Course must be completed to issue certificate");
      }

      const enrollmentRef = doc(db, COLLECTIONS.ENROLLMENTS, enrollment.id);
      await updateDoc(enrollmentRef, {
        certificateIssued: true,
        certificateUrl,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error("Error issuing certificate:", error);
      throw error;
    }
  }
}

// Re-export for convenience
export const {
  enrollUser,
  unenrollUser,
  getEnrollment,
  getUserEnrollments,
  getCourseEnrollments,
  hasAccess,
  completeCourse,
  getEnrollmentStats,
  issueCertificate,
} = EnrollmentService;
