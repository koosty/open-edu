// Import Quiz types from dedicated quiz module (v1.4.0)
import type { Quiz, QuizQuestion, QuestionType } from './types/quiz';

export type { Quiz, QuizQuestion, QuestionType };

export interface User {
  id: string;
  email: string;
  displayName: string | null;
  photoURL: string | null;
  emailVerified: boolean;
  createdAt: string;
  lastLoginAt: string;

  // v1.1.0 additions for course management
  role: "student" | "instructor" | "admin";
  enrolledCourses: string[]; // Array of course IDs
  completedCourses: string[]; // Array of course IDs
  achievements: string[]; // Array of achievement IDs
  totalPoints: number;
  streakDays: number;
  preferences: {
    notifications: boolean;
    theme: "light" | "dark" | "system";
    language: string;
  };
}

export interface Course {
  id: string;
  title: string;
  description: string;
  instructor: string;
  instructorId: string; // Reference to instructor's user ID
  thumbnail: string;
  coverImage?: string;
  category: string;
  difficulty: "Beginner" | "Intermediate" | "Advanced";
  duration: string; // e.g., "8 weeks"
  enrolled: number; // Total enrollment count
  rating: number;
  ratingCount: number; // Number of ratings
  lessons: Lesson[];
  chapters?: Chapter[]; // Optional chapter organization
  tags: string[];
  isPublished: boolean;
  isFeatured: boolean;
  price?: number; // For paid courses
  currency?: string;
  level: "free" | "premium";
  prerequisites: string[];
  learningOutcomes: string[];
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
}

export interface Lesson {
  id: string;
  courseId: string;
  title: string;
  description?: string;
  content?: string;
  quiz?: Quiz;
  order: number;
  duration?: number; // Duration in minutes instead of string
  completed?: boolean;
  chapterId?: string; // Reference to parent chapter
  isRequired: boolean;
  videoUrl?: string;
  attachments?: LessonAttachment[];
  createdAt: string;
  updatedAt: string;
}

export interface Chapter {
  id: string;
  courseId: string;
  title: string;
  description?: string;
  order: number;
  lessons: Lesson[];
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LessonAttachment {
  id: string;
  lessonId: string;
  name: string;
  url: string;
  type: "pdf" | "image" | "video" | "audio" | "document";
  size: number; // in bytes
  uploadedAt: string;
}

export interface UserProgress {
  id: string;
  userId: string;
  courseId: string;
  enrolledAt: string;
  startedAt?: string;
  completedAt?: string;
  lastAccessedAt: string;

  // Progress tracking
  completedLessons: string[]; // Array of lesson IDs
  currentChapter?: string;
  currentLesson?: string;
  progressPercentage: number; // 0-100

  // Time and engagement
  totalTimeSpent: number; // in minutes
  sessionCount: number;
  averageSessionTime: number; // in minutes

  // Quiz performance
  quizScores: Record<string, number>; // lessonId -> best score percentage
  quizAttempts: Record<string, number>; // lessonId -> attempt count
  averageQuizScore: number;

  // Achievements and gamification
  achievements: string[]; // Array of achievement IDs
  totalPoints: number;
  streakDays: number;
  lastActiveDate: string;
}

export interface Enrollment {
  id: string;
  userId: string;
  courseId: string;
  enrolledAt: string;
  status: "enrolled" | "active" | "completed" | "paused" | "dropped";
  completedAt?: string;
  certificateIssued: boolean;
  certificateUrl?: string;
  enrollmentSource: "direct" | "invitation" | "bulk" | "trial";
  paymentStatus?: "pending" | "paid" | "failed" | "refunded";
  notes?: string;
}
