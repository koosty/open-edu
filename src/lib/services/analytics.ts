/**
 * Content Analytics Service (CMS-003)
 * Aggregates and analyzes student engagement data for instructors
 */

import {
	collection,
	doc,
	getDocs,
	getDoc,
	query,
	where
} from 'firebase/firestore'
import { db } from '$lib/firebase'
import { COLLECTIONS } from '$lib/firebase/collections'
import type {
	LessonAnalytics,
	CourseAnalytics,
	StudentEngagementSummary,
	DropOffPoint,
	SectionEngagement,
	LessonAnalyticsSummary,
	PopularLesson,
	RetentionData,
	AnalyticsFilters
} from '$lib/types/analytics'
import type { Course, UserProgress, User } from '$lib/types'

// Helper to convert Firestore timestamps
function convertTimestamp(timestamp: any): string {
	if (!timestamp) return new Date().toISOString()
	if (timestamp.toDate && typeof timestamp.toDate === 'function') {
		return timestamp.toDate().toISOString()
	}
	return timestamp
}

/**
 * Calculate statistical median
 */
function calculateMedian(values: number[]): number {
	if (values.length === 0) return 0
	const sorted = [...values].sort((a, b) => a - b)
	const mid = Math.floor(sorted.length / 2)
	return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid]
}

/**
 * Calculate engagement score based on multiple factors
 * Returns 0-100 score
 */
function calculateEngagementScore(metrics: {
	completionRate: number
	averageTimeSpent: number
	noteCount: number
	bookmarkCount: number
	scrollDepth: number
}): number {
	const weights = {
		completion: 0.4,
		time: 0.2,
		notes: 0.15,
		bookmarks: 0.15,
		scroll: 0.1
	}

	// Normalize time spent (assume 10 minutes is "good")
	const normalizedTime = Math.min(metrics.averageTimeSpent / (10 * 60), 1) * 100

	const score =
		metrics.completionRate * weights.completion +
		normalizedTime * weights.time +
		Math.min(metrics.noteCount * 10, 100) * weights.notes +
		Math.min(metrics.bookmarkCount * 20, 100) * weights.bookmarks +
		metrics.scrollDepth * weights.scroll

	return Math.round(score)
}

export class AnalyticsService {
	/**
	 * Get comprehensive analytics for a specific lesson
	 */
	static async getLessonAnalytics(
		courseId: string,
		lessonId: string,
		_filters?: AnalyticsFilters
	): Promise<LessonAnalytics> {
		try {
			// Get course to get lesson details
			const courseDoc = await getDoc(doc(db, COLLECTIONS.COURSES, courseId))
			if (!courseDoc.exists()) {
				throw new Error('Course not found')
			}

			const course = courseDoc.data() as Course
			const lesson = course.lessons?.find((l) => l.id === lessonId)
			if (!lesson) {
				throw new Error('Lesson not found')
			}

			// Get all progress records for this course
			const progressQuery = query(
				collection(db, COLLECTIONS.COURSE_PROGRESS),
				where('courseId', '==', courseId)
			)
			const progressDocs = await getDocs(progressQuery)

			// Get reading positions for this lesson
			const readingPositionsQuery = query(
				collection(db, 'readingPositions'),
				where('lessonId', '==', lessonId)
			)
			const readingPositionsDocs = await getDocs(readingPositionsQuery)

			// Get notes and bookmarks for this lesson
			const [notesDocs, bookmarksDocs] = await Promise.all([
				getDocs(query(collection(db, 'notes'), where('lessonId', '==', lessonId))),
				getDocs(query(collection(db, 'bookmarks'), where('lessonId', '==', lessonId)))
			])

			// Process data
			const studentsWhoViewed = new Set<string>()
			const completedStudents = new Set<string>()
			const timeSpentValues: number[] = []
			const scrollDepthValues: number[] = []
			const progressBuckets = {
				'0-25%': 0,
				'26-50%': 0,
				'51-75%': 0,
				'76-100%': 0
			}

			// Analyze progress data
			progressDocs.forEach((doc) => {
				const progress = doc.data() as UserProgress
				if (progress.completedLessons?.includes(lessonId)) {
					completedStudents.add(progress.userId)
					studentsWhoViewed.add(progress.userId)
				}
			})

			// Analyze reading positions
			readingPositionsDocs.forEach((doc) => {
				const position = doc.data()
				studentsWhoViewed.add(position.userId)

				if (position.timeSpent) {
					timeSpentValues.push(position.timeSpent)
				}

				if (position.scrollPercentage !== undefined) {
					scrollDepthValues.push(position.scrollPercentage)

					// Categorize progress
					const pct = position.scrollPercentage
					if (pct <= 25) progressBuckets['0-25%']++
					else if (pct <= 50) progressBuckets['26-50%']++
					else if (pct <= 75) progressBuckets['51-75%']++
					else progressBuckets['76-100%']++
				}
			})

			// Calculate metrics
			const uniqueStudents = studentsWhoViewed.size
			const totalViews = readingPositionsDocs.size
			const completionRate =
				uniqueStudents > 0 ? (completedStudents.size / uniqueStudents) * 100 : 0

			const averageTimeSpent =
				timeSpentValues.length > 0
					? timeSpentValues.reduce((sum, v) => sum + v, 0) / timeSpentValues.length
					: 0

			const medianTimeSpent = calculateMedian(timeSpentValues)
			const averageScrollDepth =
				scrollDepthValues.length > 0
					? scrollDepthValues.reduce((sum, v) => sum + v, 0) / scrollDepthValues.length
					: 0

			// Notes and bookmarks
			const totalNotes = notesDocs.size
			const totalBookmarks = bookmarksDocs.size
			const averageNotesPerStudent = uniqueStudents > 0 ? totalNotes / uniqueStudents : 0

			// Drop-off points (simplified - would need more detailed data in production)
			const dropOffPoints: DropOffPoint[] = []

			// Most read sections (simplified - would need heading-level tracking)
			const mostReadSections: SectionEngagement[] = []

			// Peak engagement hours (would need timestamp analysis)
			const peakEngagementHours: number[] = []

			return {
				lessonId,
				lessonTitle: lesson.title,
				courseId,
				totalViews,
				uniqueStudents,
				completionRate: Math.round(completionRate * 10) / 10,
				averageTimeSpent: Math.round(averageTimeSpent),
				medianTimeSpent: Math.round(medianTimeSpent),
				progressDistribution: progressBuckets,
				averageScrollDepth: Math.round(averageScrollDepth * 10) / 10,
				dropOffPoints,
				mostReadSections,
				totalNotes,
				totalBookmarks,
				averageNotesPerStudent: Math.round(averageNotesPerStudent * 10) / 10,
				peakEngagementHours,
				lastUpdated: new Date().toISOString()
			}
		} catch (error) {
			console.error('Error getting lesson analytics:', error)
			throw error
		}
	}

	/**
	 * Get comprehensive analytics for an entire course
	 */
	static async getCourseAnalytics(
		courseId: string,
		_filters?: AnalyticsFilters
	): Promise<CourseAnalytics> {
		try {
			// Get course details
			const courseDoc = await getDoc(doc(db, COLLECTIONS.COURSES, courseId))
			if (!courseDoc.exists()) {
				throw new Error('Course not found')
			}

			const course = courseDoc.data() as Course

			// Get all progress records for this course
			const progressQuery = query(
				collection(db, COLLECTIONS.COURSE_PROGRESS),
				where('courseId', '==', courseId)
			)
			const progressDocs = await getDocs(progressQuery)

			// Get enrollments
			const enrollmentsQuery = query(
				collection(db, COLLECTIONS.ENROLLMENTS),
				where('courseId', '==', courseId)
			)
			const enrollmentsDocs = await getDocs(enrollmentsQuery)

			// Process progress data
			const totalEnrolled = enrollmentsDocs.size
			const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
			let activeStudents = 0
			let completedStudents = 0
			const courseProgressValues: number[] = []
			const courseTimeValues: number[] = []
			const sessionDurations: number[] = []

			progressDocs.forEach((doc) => {
				const progress = doc.data() as UserProgress

				// Count active students
				const lastActive = new Date(convertTimestamp(progress.lastAccessedAt))
				if (lastActive >= sevenDaysAgo) {
					activeStudents++
				}

				// Count completed students
				if (progress.progressPercentage >= 100 || progress.completedAt) {
					completedStudents++
				}

				// Collect metrics
				courseProgressValues.push(progress.progressPercentage || 0)

				if (progress.totalTimeSpent) {
					courseTimeValues.push(progress.totalTimeSpent * 60) // Convert to seconds
				}

				if (progress.averageSessionTime) {
					sessionDurations.push(progress.averageSessionTime * 60) // Convert to seconds
				}
			})

			// Calculate summary metrics
			const completionRate =
				totalEnrolled > 0 ? (completedStudents / totalEnrolled) * 100 : 0

			const averageCourseProgress =
				courseProgressValues.length > 0
					? courseProgressValues.reduce((sum, v) => sum + v, 0) / courseProgressValues.length
					: 0

			const averageCourseTime =
				courseTimeValues.length > 0
					? courseTimeValues.reduce((sum, v) => sum + v, 0) / courseTimeValues.length
					: 0

			const medianCourseTime = calculateMedian(courseTimeValues)

			const averageSessionDuration =
				sessionDurations.length > 0
					? sessionDurations.reduce((sum, v) => sum + v, 0) / sessionDurations.length
					: 0

			// Get lesson-level analytics (summary only for performance)
			const lessonsAnalytics: LessonAnalyticsSummary[] = await Promise.all(
				(course.lessons || []).map(async (lesson) => {
					try {
						const lessonData = await this.getLessonAnalytics(courseId, lesson.id)

						const engagementScore = calculateEngagementScore({
							completionRate: lessonData.completionRate,
							averageTimeSpent: lessonData.averageTimeSpent,
							noteCount: lessonData.totalNotes,
							bookmarkCount: lessonData.totalBookmarks,
							scrollDepth: lessonData.averageScrollDepth
						})

						return {
							lessonId: lesson.id,
							lessonTitle: lesson.title,
							order: lesson.order,
							completionRate: lessonData.completionRate,
							averageTimeSpent: lessonData.averageTimeSpent,
							uniqueStudents: lessonData.uniqueStudents,
							engagementScore
						}
				} catch (_error) {
					// Return default data if lesson analytics fails
					return {
							lessonId: lesson.id,
							lessonTitle: lesson.title,
							order: lesson.order,
							completionRate: 0,
							averageTimeSpent: 0,
							uniqueStudents: 0,
							engagementScore: 0
						}
					}
				})
			)

			// Sort for popular/least engaging
			const sortedByEngagement = [...lessonsAnalytics].sort(
				(a, b) => b.engagementScore - a.engagementScore
			)

			const mostPopularLessons: PopularLesson[] = sortedByEngagement.slice(0, 5).map((l) => ({
				lessonId: l.lessonId,
				lessonTitle: l.lessonTitle,
				order: l.order,
				views: l.uniqueStudents,
				completionRate: l.completionRate,
				engagementScore: l.engagementScore
			}))

			const leastEngagingLessons: PopularLesson[] = sortedByEngagement
				.slice(-5)
				.reverse()
				.map((l) => ({
					lessonId: l.lessonId,
					lessonTitle: l.lessonTitle,
					order: l.order,
					views: l.uniqueStudents,
					completionRate: l.completionRate,
					engagementScore: l.engagementScore
				}))

			// Retention by week (simplified - would need more detailed tracking)
			const retentionByWeek: RetentionData[] = []

			return {
				courseId,
				courseTitle: course.title,
				totalEnrolled,
				activeStudents,
				completionRate: Math.round(completionRate * 10) / 10,
				averageCourseProgress: Math.round(averageCourseProgress * 10) / 10,
				averageCourseTime: Math.round(averageCourseTime),
				medianCourseTime: Math.round(medianCourseTime),
				averageSessionDuration: Math.round(averageSessionDuration),
				lessonsAnalytics,
				retentionByWeek,
				mostPopularLessons,
				leastEngagingLessons,
				lastUpdated: new Date().toISOString()
			}
		} catch (error) {
			console.error('Error getting course analytics:', error)
			throw error
		}
	}

	/**
	 * Get student engagement summaries for a course
	 */
	static async getStudentEngagement(
		courseId: string,
		_filters?: AnalyticsFilters
	): Promise<StudentEngagementSummary[]> {
		try {
			// Get course
			const courseDoc = await getDoc(doc(db, COLLECTIONS.COURSES, courseId))
			if (!courseDoc.exists()) {
				throw new Error('Course not found')
			}
			const course = courseDoc.data() as Course
			const totalLessons = course.lessons?.length || 0

			// Get all progress records
			const progressQuery = query(
				collection(db, COLLECTIONS.COURSE_PROGRESS),
				where('courseId', '==', courseId)
			)
			const progressDocs = await getDocs(progressQuery)

			// Get users
			const userIds = progressDocs.docs.map((doc) => doc.data().userId)
			const users = await Promise.all(
				userIds.map(async (userId) => {
					try {
						const userDoc = await getDoc(doc(db, COLLECTIONS.USERS, userId))
						return userDoc.exists() ? { id: userDoc.id, ...userDoc.data() } : null
					} catch {
						return null
					}
				})
			)

			const usersMap = new Map(users.filter(Boolean).map((u) => [u!.id, u as User]))

			// Process each student
			const summaries: StudentEngagementSummary[] = await Promise.all(
				progressDocs.docs.map(async (progressDoc) => {
					const progress = progressDoc.data() as UserProgress
					const user = usersMap.get(progress.userId)

					// Get reading positions for scroll depth
					const readingQuery = query(
						collection(db, 'readingPositions'),
						where('userId', '==', progress.userId),
						where('courseId', '==', courseId)
					)
					const readingDocs = await getDocs(readingQuery)

					const scrollDepths = readingDocs.docs.map((doc) => doc.data().scrollPercentage || 0)
					const averageScrollDepth =
						scrollDepths.length > 0
							? scrollDepths.reduce((sum, v) => sum + v, 0) / scrollDepths.length
							: 0

					// Get notes and bookmarks
					const [notesDocs, bookmarksDocs] = await Promise.all([
						getDocs(
							query(
								collection(db, 'notes'),
								where('userId', '==', progress.userId),
								where('courseId', '==', courseId)
							)
						),
						getDocs(
							query(
								collection(db, 'bookmarks'),
								where('userId', '==', progress.userId),
								where('courseId', '==', courseId)
							)
						)
					])

					// Calculate activity level
					const lastActive = new Date(convertTimestamp(progress.lastAccessedAt))
					const daysSinceLastActive = Math.floor(
						(Date.now() - lastActive.getTime()) / (1000 * 60 * 60 * 24)
					)

					let activityLevel: 'high' | 'medium' | 'low' | 'inactive'
					if (daysSinceLastActive <= 2) activityLevel = 'high'
					else if (daysSinceLastActive <= 7) activityLevel = 'medium'
					else if (daysSinceLastActive <= 30) activityLevel = 'low'
					else activityLevel = 'inactive'

					// Determine at-risk status
					const atRisk =
						daysSinceLastActive > 14 &&
						progress.progressPercentage < 50 &&
						progress.progressPercentage > 5

					return {
						userId: progress.userId,
						userName: user?.displayName || user?.email || 'Unknown',
						courseId,
						progressPercentage: progress.progressPercentage || 0,
						completedLessons: progress.completedLessons?.length || 0,
						totalLessons,
						totalTimeSpent: (progress.totalTimeSpent || 0) * 60, // Convert to seconds
						lastActive: convertTimestamp(progress.lastAccessedAt),
						daysSinceLastActive,
						totalNotes: notesDocs.size,
						totalBookmarks: bookmarksDocs.size,
						averageScrollDepth: Math.round(averageScrollDepth * 10) / 10,
						activityLevel,
						atRisk
					}
				})
			)

			// Sort by progress percentage (descending)
			return summaries.sort((a, b) => b.progressPercentage - a.progressPercentage)
		} catch (error) {
			console.error('Error getting student engagement:', error)
			throw error
		}
	}

	/**
	 * Get at-risk students who might drop out
	 */
	static async getAtRiskStudents(courseId: string): Promise<StudentEngagementSummary[]> {
		const allStudents = await this.getStudentEngagement(courseId)
		return allStudents.filter((student) => student.atRisk)
	}

	/**
	 * Get active students in the last N days
	 */
	static async getActiveStudents(
		courseId: string,
		days: number = 7
	): Promise<StudentEngagementSummary[]> {
		const allStudents = await this.getStudentEngagement(courseId)
		return allStudents.filter((student) => student.daysSinceLastActive <= days)
	}
}

// Re-export for convenience
export const {
	getLessonAnalytics,
	getCourseAnalytics,
	getStudentEngagement,
	getAtRiskStudents,
	getActiveStudents
} = AnalyticsService
