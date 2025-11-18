// Progress tracking types for Open-EDU v1.1.0
// Covers course progress, lesson completion, and user activity

// Progress tracking types for Open-EDU v1.1.0
// Covers course progress, lesson completion, and user activity

export interface CourseProgress {
  id: string;
  userId: string;
  courseId: string;
  enrolledAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  lastAccessedAt: Date;

  // Progress metrics
  completedLessons: string[]; // Array of lesson IDs
  currentChapter?: string;
  currentLesson?: string;
  progressPercentage: number; // 0-100

  // Time tracking
  totalTimeSpent: number; // in minutes

  // Quiz and assessment tracking
  quizScores: Record<string, number>; // lessonId -> score percentage
  averageQuizScore?: number;

  // Engagement metrics
  loginCount: number;
  lastLoginDate?: Date;
  streakDays: number; // consecutive days of activity
}

export interface LessonProgress {
  id: string;
  userId: string;
  lessonId: string;
  courseId: string;

  // Completion tracking
  isCompleted: boolean;
  completedAt?: Date;
  firstAccessedAt: Date;
  lastAccessedAt: Date;

  // Time and engagement
  timeSpent: number; // in minutes
  accessCount: number;

  // Quiz specific (if lesson type is quiz)
  quizAttempts: number;
  bestScore?: number;
  latestScore?: number;
  quizCompletedAt?: Date;
}

export interface UserActivity {
  id: string;
  userId: string;
  type: ActivityType;
  entityId: string; // courseId, lessonId, etc.
  entityType: "course" | "lesson" | "quiz" | "achievement";
  timestamp: Date;
  metadata?: Record<string, any>; // Additional activity-specific data
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  category: AchievementCategory;
  criteria: AchievementCriteria;
  points: number;
  isActive: boolean;
}

export interface UserAchievement {
  id: string;
  userId: string;
  achievementId: string;
  unlockedAt: Date;
  progress?: number; // For progressive achievements
}

// Progress Analytics and Reports
export interface ProgressAnalytics {
  userId: string;
  periodStart: Date;
  periodEnd: Date;

  // Course metrics
  coursesEnrolled: number;
  coursesCompleted: number;
  coursesInProgress: number;

  // Lesson metrics
  lessonsCompleted: number;
  totalLessons: number;
  averageLessonTime: number;

  // Quiz performance
  quizzesCompleted: number;
  averageQuizScore: number;
  perfectScores: number;

  // Engagement metrics
  totalTimeSpent: number;
  activeDays: number;
  longestStreak: number;

  // Achievement tracking
  achievementsUnlocked: number;
  totalPoints: number;
}

export interface ProgressSummary {
  course: {
    id: string;
    title: string;
    totalLessons: number;
  };
  progress: {
    completedLessons: number;
    percentage: number;
    timeSpent: number;
    lastAccessed: Date;
  };
  nextLesson?: {
    id: string;
    title: string;
    chapterTitle: string;
  };
  recentActivity: UserActivity[];
}

// Enums and Types
export type ActivityType =
  | "course_enrolled"
  | "course_completed"
  | "lesson_started"
  | "lesson_completed"
  | "quiz_attempted"
  | "quiz_completed"
  | "achievement_unlocked"
  | "login"
  | "logout";

export type AchievementCategory =
  | "completion"
  | "performance"
  | "engagement"
  | "milestones"
  | "special";

export interface AchievementCriteria {
  type:
    | "lesson_count"
    | "course_count"
    | "quiz_score"
    | "streak_days"
    | "time_spent"
    | "perfect_scores";
  target: number;
  period?: "day" | "week" | "month" | "all_time";
}

// Progress calculation helpers
export interface ProgressCalculation {
  totalLessons: number;
  completedLessons: number;
  percentage: number;
  estimatedTimeToComplete?: number; // in hours
  nextMilestone?: {
    type: "chapter" | "course";
    name: string;
    lessonsRemaining: number;
  };
}
