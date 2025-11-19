/**
 * Analytics Types for Content Analytics (CMS-003)
 * Instructor-facing analytics for understanding student engagement
 */

export interface LessonAnalytics {
	lessonId: string
	lessonTitle: string
	courseId: string

	// Engagement metrics
	totalViews: number // Total number of times lesson was opened
	uniqueStudents: number // Number of unique students who viewed
	completionRate: number // Percentage of students who completed (0-100)
	averageTimeSpent: number // Average time in seconds
	medianTimeSpent: number // Median time in seconds

	// Progress distribution
	progressDistribution: {
		'0-25%': number // Number of students in each quartile
		'26-50%': number
		'51-75%': number
		'76-100%': number
	}

	// Reading behavior
	averageScrollDepth: number // Average scroll percentage
	dropOffPoints: DropOffPoint[] // Where students commonly stop reading
	mostReadSections: SectionEngagement[] // Sections with highest engagement

	// Notes and bookmarks (engagement indicators)
	totalNotes: number
	totalBookmarks: number
	averageNotesPerStudent: number

	// Time-based analysis
	peakEngagementHours: number[] // Hours of day (0-23) with most activity
	lastUpdated: string
}

export interface DropOffPoint {
	sectionId: string
	sectionTitle: string
	percentage: number // Percentage of content (0-100)
	studentCount: number // Number of students who stopped here
	dropOffRate: number // Percentage of total viewers who dropped off
}

export interface SectionEngagement {
	sectionId: string
	sectionTitle: string
	averageTimeSpent: number
	rereadCount: number // How many times students return to this section
	noteCount: number
	bookmarkCount: number
	engagementScore: number // Composite score (0-100)
}

export interface CourseAnalytics {
	courseId: string
	courseTitle: string

	// Overall engagement
	totalEnrolled: number
	activeStudents: number // Students active in last 7 days
	completionRate: number // Percentage who completed course
	averageCourseProgress: number // Average progress across all students (0-100)

	// Time metrics
	averageCourseTime: number // Average time to complete (seconds)
	medianCourseTime: number
	averageSessionDuration: number

	// Lesson-level summary
	lessonsAnalytics: LessonAnalyticsSummary[]

	// Student retention
	retentionByWeek: RetentionData[]

	// Popular content
	mostPopularLessons: PopularLesson[]
	leastEngagingLessons: PopularLesson[]

	lastUpdated: string
}

export interface LessonAnalyticsSummary {
	lessonId: string
	lessonTitle: string
	order: number
	completionRate: number
	averageTimeSpent: number
	uniqueStudents: number
	engagementScore: number // Composite score (0-100)
}

export interface RetentionData {
	weekNumber: number
	activeStudents: number
	retentionRate: number // Percentage of original enrollees still active
	newEnrollments: number
}

export interface PopularLesson {
	lessonId: string
	lessonTitle: string
	order: number
	views: number
	completionRate: number
	averageRating?: number
	engagementScore: number
}

export interface StudentEngagementSummary {
	userId: string
	userName: string
	courseId: string

	// Progress
	progressPercentage: number
	completedLessons: number
	totalLessons: number

	// Time
	totalTimeSpent: number
	lastActive: string
	daysSinceLastActive: number

	// Engagement indicators
	totalNotes: number
	totalBookmarks: number
	averageScrollDepth: number

	// Activity level
	activityLevel: 'high' | 'medium' | 'low' | 'inactive'
	atRisk: boolean // True if student might drop out
}

export interface AnalyticsFilters {
	dateFrom?: string
	dateTo?: string
	lessonIds?: string[]
	minCompletionRate?: number
	maxCompletionRate?: number
}

export interface AnalyticsTimeRange {
	label: string
	days: number
	from: Date
	to: Date
}

// Helper type for aggregation results
export interface AggregationResult {
	count: number
	sum: number
	average: number
	median: number
	min: number
	max: number
}
