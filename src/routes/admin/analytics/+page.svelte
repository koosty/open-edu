<script lang="ts">
	import { onMount } from 'svelte'
	import { navigate } from '$lib/utils/navigation'
	import { CourseService } from '$lib/services/courses'
	import { AnalyticsService } from '$lib/services/analytics'
	import { authState } from '$lib/auth.svelte'
	import { isAdmin, canManageCourses } from '$lib/utils/admin'
	import { Button } from '$lib/components/ui'
	import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '$lib/components/ui'
	import type { Course } from '$lib/types'
	import type { CourseAnalytics } from '$lib/types/analytics'
	import Loading from '$lib/components/Loading.svelte'

	// State management
	let loading = $state(true)
	let error = $state<string | null>(null)
	let courses = $state<Course[]>([])
	let selectedCourseId = $state<string | null>(null)
	let courseAnalytics = $state<CourseAnalytics | null>(null)
	let loadingAnalytics = $state(false)

	// Access control
	const hasAccess = $derived(authState.user && canManageCourses(authState.user))
	const isFullAdmin = $derived(authState.user && isAdmin(authState.user))

	// Reactive effect for authentication and access control
	$effect(() => {
		if (authState.loading) {
			return
		}

		if (!authState.user) {
			navigate('/auth/login')
			return
		}

		if (!hasAccess) {
			navigate('/dashboard')
			return
		}

		loadCourses()
	})

	async function loadCourses() {
		loading = true
		error = null

		try {
			let coursesQuery

			if (isFullAdmin) {
				coursesQuery = CourseService.getCourses(
					{ isPublished: true },
					{ field: 'createdAt', direction: 'desc' },
					{ page: 1, limit: 50 }
				)
			} else {
				coursesQuery = CourseService.getCoursesByInstructor(authState.user!.id).then(
					(courses) => ({
						courses,
						total: courses.length,
						hasMore: false,
						nextCursor: undefined
					})
				)
			}

			const coursesResult = await coursesQuery
			courses = coursesResult.courses || []

			// Auto-select first course if available
			if (courses.length > 0 && !selectedCourseId) {
				selectedCourseId = courses[0].id
				await loadAnalytics(selectedCourseId)
			}
		} catch (err: any) {
			error = err.message || 'Failed to load courses'
			console.error('Error loading courses:', err)
		} finally {
			loading = false
		}
	}

	async function loadAnalytics(courseId: string) {
		if (!courseId) return

		loadingAnalytics = true
		error = null

		try {
			const analytics = await AnalyticsService.getCourseAnalytics(courseId)
			courseAnalytics = analytics
		} catch (err: any) {
			error = err.message || 'Failed to load analytics'
			console.error('Error loading analytics:', err)
		} finally {
			loadingAnalytics = false
		}
	}

	async function handleCourseChange(courseId: string) {
		selectedCourseId = courseId
		await loadAnalytics(courseId)
	}

	function formatTime(seconds: number): string {
		if (seconds < 60) return `${Math.round(seconds)}s`
		if (seconds < 3600) return `${Math.round(seconds / 60)}m`
		return `${Math.round(seconds / 3600)}h`
	}

	function formatNumber(num: number): string {
		return num.toLocaleString()
	}

	function getActivityColor(level: string): string {
		switch (level) {
			case 'high':
				return 'bg-green-100 text-green-800'
			case 'medium':
				return 'bg-blue-100 text-blue-800'
			case 'low':
				return 'bg-yellow-100 text-yellow-800'
			case 'inactive':
				return 'bg-gray-100 text-gray-800'
			default:
				return 'bg-gray-100 text-gray-800'
		}
	}

	function getEngagementColor(score: number): string {
		if (score >= 70) return 'text-green-600'
		if (score >= 40) return 'text-yellow-600'
		return 'text-red-600'
	}
</script>

<svelte:head>
	<title>Content Analytics - Open-EDU</title>
	<meta name="description" content="Course engagement and analytics dashboard" />
</svelte:head>

{#if authState.loading || loading}
	<div class="flex justify-center items-center min-h-[50vh]">
		<Loading />
	</div>
{:else if !hasAccess}
	<div class="container mx-auto px-4 py-8">
		<Card>
			<CardContent class="p-8 text-center">
				<h2 class="text-2xl font-bold text-red-600 mb-4">Access Denied</h2>
				<p class="text-gray-600 mb-6">You don't have permission to access analytics.</p>
				<Button onclick={() => navigate('/dashboard')}>Go to Dashboard</Button>
			</CardContent>
		</Card>
	</div>
{:else}
	<div class="min-h-screen bg-gray-50">
		<!-- Header -->
		<div class="bg-white border-b">
			<div class="container mx-auto px-4 py-6">
				<div class="flex items-center justify-between">
					<div>
						<h1 class="text-3xl font-bold">Content Analytics</h1>
						<p class="text-gray-600 mt-1">Student engagement and performance insights</p>
					</div>
					<Button variant="outline" onclick={() => navigate('/admin')}>
						<svg
							class="w-4 h-4 mr-2"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M10 19l-7-7m0 0l7-7m-7 7h18"
							/>
						</svg>
						Back to Admin
					</Button>
				</div>
			</div>
		</div>

		<div class="container mx-auto px-4 py-8">
			<!-- Course Selector -->
			<div class="mb-6">
				<label for="course-select" class="block text-sm font-medium text-gray-700 mb-2">
					Select Course
				</label>
				<select
					id="course-select"
					bind:value={selectedCourseId}
					onchange={(e) => handleCourseChange((e.target as HTMLSelectElement).value)}
					class="w-full max-w-md px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
				>
					{#each courses as course (course.id)}
						<option value={course.id}>
							{course.title} ({course.enrolled} students)
						</option>
					{/each}
				</select>
			</div>

			{#if loadingAnalytics}
				<div class="flex justify-center items-center py-12">
					<Loading />
				</div>
			{:else if courseAnalytics}
				<!-- Overview Cards -->
				<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
					<Card>
						<CardContent class="p-6">
							<div class="flex items-center justify-between">
								<div>
									<p class="text-sm font-medium text-gray-600">Total Enrolled</p>
									<p class="text-3xl font-bold">{formatNumber(courseAnalytics.totalEnrolled)}</p>
								</div>
								<div class="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
									<svg
										class="w-6 h-6 text-blue-600"
										fill="none"
										stroke="currentColor"
										viewBox="0 0 24 24"
									>
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2"
											d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
										/>
									</svg>
								</div>
							</div>
							<div class="mt-2">
								<span class="text-sm text-gray-500">
									{formatNumber(courseAnalytics.activeStudents)} active (last 7 days)
								</span>
							</div>
						</CardContent>
					</Card>

					<Card>
						<CardContent class="p-6">
							<div class="flex items-center justify-between">
								<div>
									<p class="text-sm font-medium text-gray-600">Completion Rate</p>
									<p class="text-3xl font-bold">{courseAnalytics.completionRate.toFixed(1)}%</p>
								</div>
								<div class="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
									<svg
										class="w-6 h-6 text-green-600"
										fill="none"
										stroke="currentColor"
										viewBox="0 0 24 24"
									>
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2"
											d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
										/>
									</svg>
								</div>
							</div>
							<div class="mt-2">
								<span class="text-sm text-gray-500">
									Avg progress: {courseAnalytics.averageCourseProgress.toFixed(1)}%
								</span>
							</div>
						</CardContent>
					</Card>

					<Card>
						<CardContent class="p-6">
							<div class="flex items-center justify-between">
								<div>
									<p class="text-sm font-medium text-gray-600">Avg Time to Complete</p>
									<p class="text-3xl font-bold">{formatTime(courseAnalytics.averageCourseTime)}</p>
								</div>
								<div class="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
									<svg
										class="w-6 h-6 text-purple-600"
										fill="none"
										stroke="currentColor"
										viewBox="0 0 24 24"
									>
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2"
											d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
										/>
									</svg>
								</div>
							</div>
							<div class="mt-2">
								<span class="text-sm text-gray-500">
									Median: {formatTime(courseAnalytics.medianCourseTime)}
								</span>
							</div>
						</CardContent>
					</Card>

					<Card>
						<CardContent class="p-6">
							<div class="flex items-center justify-between">
								<div>
									<p class="text-sm font-medium text-gray-600">Avg Session</p>
									<p class="text-3xl font-bold">
										{formatTime(courseAnalytics.averageSessionDuration)}
									</p>
								</div>
								<div class="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
									<svg
										class="w-6 h-6 text-yellow-600"
										fill="none"
										stroke="currentColor"
										viewBox="0 0 24 24"
									>
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2"
											d="M13 10V3L4 14h7v7l9-11h-7z"
										/>
									</svg>
								</div>
							</div>
							<div class="mt-2">
								<span class="text-sm text-gray-500">Per student session</span>
							</div>
						</CardContent>
					</Card>
				</div>

				<div class="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
					<!-- Most Popular Lessons -->
					<Card>
						<CardHeader>
							<CardTitle>Most Engaging Lessons</CardTitle>
							<CardDescription>Top performing content by engagement score</CardDescription>
						</CardHeader>
						<CardContent>
							{#if courseAnalytics.mostPopularLessons.length > 0}
								<div class="space-y-4">
									{#each courseAnalytics.mostPopularLessons as lesson (lesson.lessonId)}
										<div class="flex items-center justify-between p-3 border rounded-lg">
											<div class="flex-1">
												<div class="flex items-center gap-2 mb-1">
													<span class="text-xs font-medium text-gray-500"
														>#{lesson.order}</span
													>
													<h4 class="font-medium text-sm">{lesson.lessonTitle}</h4>
												</div>
												<div class="flex items-center gap-4 text-xs text-gray-600">
													<span>{lesson.views} students</span>
													<span>{lesson.completionRate.toFixed(1)}% completed</span>
												</div>
											</div>
											<div class="text-right">
												<p class="text-lg font-bold {getEngagementColor(lesson.engagementScore)}">
													{lesson.engagementScore}
												</p>
												<p class="text-xs text-gray-500">score</p>
											</div>
										</div>
									{/each}
								</div>
							{:else}
								<p class="text-gray-500 text-center py-4">No data available</p>
							{/if}
						</CardContent>
					</Card>

					<!-- Least Engaging Lessons -->
					<Card>
						<CardHeader>
							<CardTitle>Needs Improvement</CardTitle>
							<CardDescription>Lessons with lower engagement scores</CardDescription>
						</CardHeader>
						<CardContent>
							{#if courseAnalytics.leastEngagingLessons.length > 0}
								<div class="space-y-4">
									{#each courseAnalytics.leastEngagingLessons as lesson (lesson.lessonId)}
										<div class="flex items-center justify-between p-3 border rounded-lg">
											<div class="flex-1">
												<div class="flex items-center gap-2 mb-1">
													<span class="text-xs font-medium text-gray-500"
														>#{lesson.order}</span
													>
													<h4 class="font-medium text-sm">{lesson.lessonTitle}</h4>
												</div>
												<div class="flex items-center gap-4 text-xs text-gray-600">
													<span>{lesson.views} students</span>
													<span>{lesson.completionRate.toFixed(1)}% completed</span>
												</div>
											</div>
											<div class="text-right">
												<p class="text-lg font-bold {getEngagementColor(lesson.engagementScore)}">
													{lesson.engagementScore}
												</p>
												<p class="text-xs text-gray-500">score</p>
											</div>
										</div>
									{/each}
								</div>
							{:else}
								<p class="text-gray-500 text-center py-4">No data available</p>
							{/if}
						</CardContent>
					</Card>
				</div>

				<!-- All Lessons Table -->
				<Card>
					<CardHeader>
						<CardTitle>Lesson Performance Overview</CardTitle>
						<CardDescription>Detailed metrics for all lessons in this course</CardDescription>
					</CardHeader>
					<CardContent>
						<div class="overflow-x-auto">
							<table class="w-full">
								<thead class="bg-gray-50 border-b">
									<tr>
										<th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase"
											>#</th
										>
										<th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase"
											>Lesson</th
										>
										<th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase"
											>Students</th
										>
										<th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase"
											>Completion</th
										>
										<th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase"
											>Avg Time</th
										>
										<th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase"
											>Engagement</th
										>
									</tr>
								</thead>
								<tbody class="divide-y">
									{#each courseAnalytics.lessonsAnalytics as lesson (lesson.lessonId)}
										<tr class="hover:bg-gray-50">
											<td class="px-4 py-3 text-sm text-gray-500">{lesson.order}</td>
											<td class="px-4 py-3 text-sm font-medium">{lesson.lessonTitle}</td>
											<td class="px-4 py-3 text-sm text-gray-600 text-right">
												{formatNumber(lesson.uniqueStudents)}
											</td>
											<td class="px-4 py-3 text-sm text-gray-600 text-right">
												{lesson.completionRate.toFixed(1)}%
											</td>
											<td class="px-4 py-3 text-sm text-gray-600 text-right">
												{formatTime(lesson.averageTimeSpent)}
											</td>
											<td class="px-4 py-3 text-sm text-right">
												<span
													class="inline-block px-2 py-1 rounded text-xs font-medium {getEngagementColor(
														lesson.engagementScore
													)}"
												>
													{lesson.engagementScore}
												</span>
											</td>
										</tr>
									{/each}
								</tbody>
							</table>
						</div>
					</CardContent>
				</Card>

				<!-- Last Updated -->
				<p class="text-sm text-gray-500 text-center mt-4">
					Last updated: {new Date(courseAnalytics.lastUpdated).toLocaleString()}
				</p>
			{:else if error}
				<Card>
					<CardContent class="p-8 text-center">
						<div class="text-red-600 mb-4">
							<svg
								class="w-12 h-12 mx-auto"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
								/>
							</svg>
						</div>
						<h3 class="text-lg font-medium text-gray-900 mb-2">Error Loading Analytics</h3>
						<p class="text-gray-600 mb-4">{error}</p>
						<Button onclick={() => loadAnalytics(selectedCourseId!)}>Try Again</Button>
					</CardContent>
				</Card>
			{:else}
				<Card>
					<CardContent class="p-8 text-center">
						<p class="text-gray-600">Select a course to view analytics</p>
					</CardContent>
				</Card>
			{/if}
		</div>
	</div>
{/if}
