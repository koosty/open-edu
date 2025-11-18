// Lesson-related types for Open-EDU v1.1.0
// Based on sample template structure and roadmap requirements

export interface Lesson {
  id: string;
  courseId: string;
  title: string;
  description?: string;
  type: "lesson" | "quiz";
  order: number;
  content?: string; // Markdown content for lessons
  quiz?: Quiz; // Quiz data for quiz lessons
  duration?: number; // Duration in minutes
  isRequired: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Quiz {
  id: string;
  questions: QuizQuestion[];
  timeLimit?: number; // Time limit in minutes
  passingScore: number; // Percentage required to pass
  allowMultipleAttempts: boolean;
  showCorrectAnswers: boolean;
}

export interface QuizQuestion {
  id: string;
  question: string;
  type: "multiple-choice" | "true-false" | "short-answer";
  options?: string[]; // For multiple choice questions
  correctAnswer: number | string; // Index for MC, string for others
  explanation?: string;
  points: number;
}

export interface Chapter {
  id: string;
  courseId: string;
  title: string;
  description?: string;
  order: number;
  lessons: Lesson[];
  isPublished: boolean;
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

export type LessonType = "lesson" | "quiz";
export type QuestionType = "multiple-choice" | "true-false" | "short-answer";
