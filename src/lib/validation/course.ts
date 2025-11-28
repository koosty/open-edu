// Course validation schemas for Open-EDU v1.6.0
// Using Zod for runtime validation and type safety
// v1.6.0: Added metadata schemas for optimized data architecture

import { z } from "zod";

// Core validation schemas
export const lessonAttachmentSchema = z.object({
  id: z.string(),
  lessonId: z.string(),
  name: z.string().min(1, "Attachment name is required"),
  url: z.string().url("Valid URL required"),
  type: z.enum(["pdf", "image", "video", "audio", "document"]),
  size: z.number().positive("File size must be positive"),
  uploadedAt: z.string(),
});

// v1.6.0: Lesson metadata schema (lightweight, stored in course document)
export const lessonMetadataSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().optional(),
  order: z.number().min(0),
  type: z.enum(["content", "quiz", "video"]),
  duration: z.number().default(0), // 0 = not specified
  hasQuiz: z.boolean(),
  isRequired: z.boolean(),
});

// v1.6.0: Quiz metadata schema (lightweight, stored in course document)
export const quizMetadataSchema = z.object({
  id: z.string(),
  lessonId: z.string(),
  title: z.string(),
  description: z.string().optional(),
  questionCount: z.number().min(0),
  passingScore: z.number().min(0).max(100),
  timeLimit: z.number().default(0), // 0 = no time limit
  order: z.number().min(0),
});

// Question Option schema (used in multiple choice questions)
const questionOptionSchema = z.object({
  id: z.string(),
  text: z.string(),
  isCorrect: z.boolean(),
  explanation: z.string().optional(),
});

export const quizQuestionSchema = z.object({
  id: z.string(),
  type: z.enum(["multiple_choice", "multiple_select", "true_false", "short_answer", "essay", "fill_blank"]),
  question: z.string().min(1, "Question is required"),
  options: z.array(questionOptionSchema).optional(),
  correctAnswer: z.union([z.string(), z.number(), z.array(z.string()), z.boolean()]),
  explanation: z.string().optional(),
  points: z
    .number()
    .min(0, "Points must be non-negative")
    .max(100, "Points cannot exceed 100"),
  order: z.number().min(0),
  image: z.string().url().optional(),
  hint: z.string().optional(),
  tags: z.array(z.string()).optional(),
  difficulty: z.enum(["easy", "medium", "hard"]).optional(),
  caseSensitive: z.boolean().optional(),
  acceptableAnswers: z.array(z.string()).optional(),
  maxLength: z.number().optional(),
  minLength: z.number().optional(),
});

export const quizSchema = z.object({
  id: z.string(),
  lessonId: z.string().min(1, "Lesson ID is required"),
  courseId: z.string().min(1, "Course ID is required"),
  title: z.string().min(1, "Quiz title is required"),
  description: z.string().optional(),
  instructions: z.string().optional(),
  questions: z
    .array(quizQuestionSchema)
    .min(1, "Quiz must have at least one question"),
  timeLimit: z.number().positive("Time limit must be positive").optional(),
  passingScore: z
    .number()
    .min(0, "Passing score cannot be negative")
    .max(100, "Passing score cannot exceed 100"),
  allowMultipleAttempts: z.boolean(),
  maxAttempts: z.number().positive("Max attempts must be positive").optional(),
  showCorrectAnswers: z.boolean(),
  showExplanations: z.boolean().optional().default(true), // New field with default
  randomizeQuestions: z.boolean(),
  randomizeOptions: z.boolean(),
  allowReview: z.boolean().optional().default(true), // New field with default
  isPublished: z.boolean().optional().default(false), // New field with default
  createdBy: z.string().optional(), // Optional for backward compatibility
  createdAt: z.string(),
  updatedAt: z.string(),
  publishedAt: z.string().optional(),
});

export const lessonSchema = z
  .object({
    id: z.string(),
    courseId: z.string(),
    title: z
      .string()
      .min(1, "Lesson title is required")
      .max(200, "Title cannot exceed 200 characters"),
    description: z
      .string()
      .max(500, "Description cannot exceed 500 characters")
      .optional(),
    content: z.string().optional(),
    quiz: quizSchema.optional(),
    order: z.number().min(0, "Order must be non-negative"),
    duration: z
      .number()
      .min(1, "Duration must be at least 1 minute")
      .max(600, "Duration cannot exceed 10 hours")
      .optional(),
    completed: z.boolean().optional(),
    chapterId: z.string().optional(),
    isRequired: z.boolean(),
    videoUrl: z.string().url("Valid video URL required").nullable().optional(),
    attachments: z.array(lessonAttachmentSchema).optional(),
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .refine(
    (data) => {
      // Validate that lessons with quiz data don't also have content
      // Lessons should have either content OR quiz, but not necessarily require content
      // if they will have a quiz added separately
      if (data.quiz && data.content) {
        return false; // Can't have both inline quiz and content
      }
      // Allow lessons without content (quiz lessons) or with content (regular lessons)
      return true;
    },
    {
      message: "Lesson cannot have both content and inline quiz data",
      path: ["content"],
    },
  );

export const chapterSchema = z.object({
  id: z.string(),
  courseId: z.string(),
  title: z
    .string()
    .min(1, "Chapter title is required")
    .max(200, "Title cannot exceed 200 characters"),
  description: z
    .string()
    .max(1000, "Description cannot exceed 1000 characters")
    .optional(),
  order: z.number().min(0, "Order must be non-negative"),
  lessons: z.array(lessonSchema),
  isPublished: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const courseSchema = z
  .object({
    id: z.string(),
    title: z
      .string()
      .min(1, "Course title is required")
      .max(200, "Title cannot exceed 200 characters"),
    description: z
      .string()
      .min(10, "Description must be at least 10 characters")
      .max(2000, "Description cannot exceed 2000 characters"),
    instructor: z.string().min(1, "Instructor name is required"),
    instructorId: z.string().min(1, "Instructor ID is required"),
    thumbnail: z.string().transform((val) => {
      // Use placeholder if empty or invalid URL
      if (!val || val.trim() === '') {
        return 'https://placehold.co/400x225/6366f1/white?text=Course'
      }
      try {
        new URL(val)
        return val
      } catch {
        return 'https://placehold.co/400x225/6366f1/white?text=Course'
      }
    }),
    coverImage: z.string().url("Valid cover image URL required").optional(),
    category: z.string().min(1, "Category is required"),
    difficulty: z.enum(["Beginner", "Intermediate", "Advanced"]),
    duration: z.string().min(1, "Duration is required"),
    enrolled: z.number().min(0, "Enrolled count cannot be negative"),
    rating: z
      .number()
      .min(0, "Rating cannot be negative")
      .max(5, "Rating cannot exceed 5"),
    ratingCount: z.number().min(0, "Rating count cannot be negative"),
    lessons: z.array(lessonSchema),
    chapters: z.array(chapterSchema).optional(),
    tags: z.array(z.string().min(1)).max(10, "Cannot have more than 10 tags"),
    isPublished: z.boolean(),
    isFeatured: z.boolean(),
    price: z.number().min(0, "Price cannot be negative").optional(),
    currency: z
      .string()
      .length(3, "Currency must be 3 characters (ISO code)")
      .optional(),
    level: z.enum(["free", "premium"]),
    prerequisites: z.array(z.string()),
    learningOutcomes: z
      .array(z.string().min(1))
      .min(1, "Must have at least one learning outcome")
      .max(10, "Cannot have more than 10 learning outcomes"),
    createdAt: z.string(),
    updatedAt: z.string(),
    publishedAt: z.string().optional(),
    
    // v1.6.0 additions: lightweight metadata for course overview
    lessonsMetadata: z.array(lessonMetadataSchema).optional(),
    quizzesMetadata: z.array(quizMetadataSchema).optional(),
    totalLessons: z.number().min(0).optional(),
    totalQuizzes: z.number().min(0).optional(),
  })
  .refine(
    (data) => {
      // Validate premium courses have price
      if (data.level === "premium") {
        return data.price !== undefined && data.price > 0;
      }
      return true;
    },
    {
      message: "Premium courses must have a positive price",
      path: ["price"],
    },
  )
  .refine(
    (data) => {
      // Validate currency is set for paid courses
      if (data.price && data.price > 0) {
        return data.currency !== undefined;
      }
      return true;
    },
    {
      message: "Paid courses must specify currency",
      path: ["currency"],
    },
  );

// Form validation schemas (for course creation/editing)
export const createCourseSchema = courseSchema
  .omit({
    id: true,
    enrolled: true,
    rating: true,
    ratingCount: true,
    lessons: true,
    chapters: true,
    createdAt: true,
    updatedAt: true,
    publishedAt: true,
  })
  .extend({
    // Override some fields for creation
    isPublished: z.boolean().default(false),
    isFeatured: z.boolean().default(false),
    tags: z.array(z.string().min(1)).max(10).default([]),
    prerequisites: z.array(z.string()).default([]),
  });

export const updateCourseSchema = createCourseSchema.partial().extend({
  id: z.string(), // ID required for updates
  lessons: z.array(lessonSchema).optional(), // Allow updating lessons
});

export const createLessonSchema = lessonSchema
  .omit({
    id: true,
    createdAt: true,
    updatedAt: true,
    completed: true,
    attachments: true,
  })
  .extend({
    isRequired: z.boolean().default(true),
  });

export const updateLessonSchema = createLessonSchema.partial().extend({
  id: z.string(), // ID required for updates
});

export const createChapterSchema = chapterSchema
  .omit({
    id: true,
    lessons: true,
    createdAt: true,
    updatedAt: true,
  })
  .extend({
    isPublished: z.boolean().default(false),
  });

export const updateChapterSchema = createChapterSchema.partial().extend({
  id: z.string(), // ID required for updates
});

// Query and filter schemas
export const courseFilterSchema = z.object({
  category: z.string().optional(),
  categories: z.array(z.string()).optional(), // Multi-select categories
  difficulty: z.enum(["Beginner", "Intermediate", "Advanced"]).optional(),
  difficulties: z
    .array(z.enum(["Beginner", "Intermediate", "Advanced"]))
    .optional(), // Multi-select difficulties
  level: z.enum(["free", "premium"]).optional(),
  levels: z.array(z.enum(["free", "premium"])).optional(), // Multi-select levels
  instructor: z.string().optional(),
  tags: z.array(z.string()).optional(),
  minRating: z.number().min(0).max(5).optional(),
  maxPrice: z.number().min(0).optional(),
  isPublished: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
  search: z.string().optional(),
});

export const courseSortSchema = z.object({
  field: z.enum([
    "title",
    "createdAt",
    "rating",
    "enrolled",
    "price",
    "updatedAt",
  ]),
  direction: z.enum(["asc", "desc"]),
});

export const paginationSchema = z.object({
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(20),
  offset: z.number().min(0).optional(),
});

// Type exports - infer types from schemas
export type Course = z.infer<typeof courseSchema>;
export type CreateCourse = z.infer<typeof createCourseSchema>;
export type UpdateCourse = z.infer<typeof updateCourseSchema>;

export type Lesson = z.infer<typeof lessonSchema>;
export type CreateLesson = z.infer<typeof createLessonSchema>;
export type UpdateLesson = z.infer<typeof updateLessonSchema>;

export type Chapter = z.infer<typeof chapterSchema>;
export type CreateChapter = z.infer<typeof createChapterSchema>;
export type UpdateChapter = z.infer<typeof updateChapterSchema>;

export type Quiz = z.infer<typeof quizSchema>;
export type QuizQuestion = z.infer<typeof quizQuestionSchema>;
export type LessonAttachment = z.infer<typeof lessonAttachmentSchema>;

// v1.6.0 metadata types
export type LessonMetadata = z.infer<typeof lessonMetadataSchema>;
export type QuizMetadata = z.infer<typeof quizMetadataSchema>;

export type CourseFilter = z.infer<typeof courseFilterSchema>;
export type CourseSort = z.infer<typeof courseSortSchema>;
export type Pagination = z.infer<typeof paginationSchema>;
