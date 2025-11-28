// Lesson-related types for Open-EDU v1.6.0
// Based on sample template structure and roadmap requirements
// Updated for v1.6.0 architecture: separate lessons collection + metadata

import type { Quiz } from './quiz'

/**
 * Full lesson document stored in separate `lessons` collection (v1.6.0)
 * Contains all content - fetched only when viewing individual lesson
 */
export interface Lesson {
  id: string;
  courseId: string;
  title: string;
  description?: string;
  order: number;
  content?: string; // Markdown content for lessons
  quiz?: Quiz; // Quiz data for quiz lessons (populated when loaded)
  duration?: number; // Duration in minutes
  isRequired: boolean;
  videoUrl?: string | null; // v1.6.0: Allow null for Firestore compatibility
  attachments?: LessonAttachment[];
  chapterId?: string; // Reference to parent chapter
  createdAt: string;
  updatedAt: string;
}

/**
 * Lightweight lesson metadata stored in course document (v1.6.0)
 * Used for course overview pages - no content, just enough for listing
 * ~250 bytes per lesson vs ~50KB for full lesson
 */
export interface LessonMetadata {
  id: string;
  title: string;
  description?: string; // Brief description for course overview
  order: number;
  type: 'content' | 'quiz' | 'video'; // Lesson type for UI icons
  duration: number; // Duration in minutes (0 if not specified)
  hasQuiz: boolean; // Quick check without fetching quiz collection
  isRequired: boolean;
}

/**
 * Lightweight quiz metadata stored in course document (v1.6.0)
 * Used for course overview - shows quiz info without fetching full quiz
 */
export interface QuizMetadata {
  id: string;
  lessonId: string;
  title: string;
  description?: string; // Brief description for course overview
  questionCount: number;
  passingScore: number;
  timeLimit: number; // in seconds (0 = no time limit)
  order: number; // For ordering quizzes in course view
}

/**
 * Lesson attachment stored with lesson
 */
export interface LessonAttachment {
  id: string;
  lessonId: string;
  name: string;
  url: string;
  type: 'pdf' | 'image' | 'video' | 'audio' | 'document';
  size: number; // in bytes
  uploadedAt: string;
}

export interface Chapter {
  id: string;
  courseId: string;
  title: string;
  description?: string;
  order: number;
  lessonIds: string[]; // Reference to lesson IDs (v1.6.0: lessons stored separately)
  isPublished: boolean;
}

/**
 * Helper functions for building metadata from full entities
 */
export function buildLessonMetadata(lesson: Lesson): LessonMetadata {
  return {
    id: lesson.id,
    title: lesson.title,
    ...(lesson.description && { description: lesson.description }), // Only include if defined
    order: lesson.order,
    type: lesson.videoUrl ? 'video' : (lesson.quiz ? 'quiz' : 'content'),
    duration: lesson.duration ?? 0, // Default to 0 minutes if not specified
    hasQuiz: !!lesson.quiz,
    isRequired: lesson.isRequired
  }
}

export function buildQuizMetadata(quiz: { id: string; lessonId: string; title: string; description?: string; questions: unknown[]; passingScore: number; timeLimit?: number }, order: number): QuizMetadata {
  return {
    id: quiz.id,
    lessonId: quiz.lessonId,
    title: quiz.title,
    ...(quiz.description && { description: quiz.description }), // Only include if defined
    questionCount: quiz.questions.length,
    passingScore: quiz.passingScore,
    timeLimit: quiz.timeLimit ?? 0, // Default to 0 (no time limit) if not specified
    order
  }
}

// For lesson navigation and structure
export interface LessonNavigation {
  currentLesson: Lesson;
  previousLesson?: Lesson;
  nextLesson?: Lesson;
  currentChapter: Chapter;
  courseTitle: string;
}

// For lesson completion tracking
export interface LessonCompletion {
  lessonId: string;
  userId: string;
  completedAt: Date;
  timeSpent: number; // in minutes
  quizScore?: number; // percentage if lesson is a quiz
  quizAttempts?: number;
}


