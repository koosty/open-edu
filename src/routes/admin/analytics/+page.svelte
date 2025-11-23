<script lang="ts">
	import { navigate } from '$lib/utils/navigation'
	import { CourseService } from '$lib/services/courses'
	import { AnalyticsService } from '$lib/services/analytics'
	import { authState } from '$lib/auth.svelte'
	import { isAdmin, canManageCourses } from '$lib/utils/admin'
	import { Button, Label } from '$lib/components/ui'
	import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '$lib/components/ui'
	import * as Select from '$lib/components/ui/select'
	import type { Course } from '$lib/types'
	import type { CourseAnalytics } from '$lib/types/analytics'
	import Loading from '$lib/components/Loading.svelte'
	import DynamicBreadcrumb from '$lib/components/DynamicBreadcrumb.svelte'
	import { ArrowLeft, Users, CheckCircle, Clock, Zap } from 'lucide-svelte'

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
	} catch (err: unknown) {
		error = err instanceof Error ? err.message : 'Failed to load courses'
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
	} catch (err: unknown) {
		error = err instanceof Error ? err.message : 'Failed to load analytics'
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

	function _getActivityColor(level: string): string {
		switch (level) {
			case 'high':
				return 'bg-green-500/10 text-green-700 dark:text-green-400'
			case 'medium':
				return 'bg-primary/10 text-primary'
			case 'low':
				return 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400'
			case 'inactive':
				return 'bg-muted text-muted-foreground'
			default:
				return 'bg-muted text-muted-foreground'
		}
	}

	function getEngagementColor(score: number): string {
		if (score >= 70) return 'text-green-600 dark:text-green-500'
		if (score >= 40) return 'text-yellow-600 dark:text-yellow-500'
		return 'text-red-600 dark:text-red-500'
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
				<h2 class="text-2xl font-bold text-destructive mb-4">Access Denied</h2>
				<p class="text-muted-foreground mb-6">You don't have permission to access analytics.</p>
				<Button onclick={() => navigate('/dashboard')}>Go to Dashboard</Button>
			</CardContent>
		</Card>
	</div>
{:else}
	<div class="min-h-screen bg-background">
		<!-- Header -->
		<div class="bg-card border-b">
			<div class="container mx-auto px-4 py-6">
				<!-- Breadcrumb -->
				<DynamicBreadcrumb 
					items={[
						{ label: 'Admin', href: '/admin' },
						{ label: 'Analytics', current: true }
					]} 
					class="mb-4"
				/>
				
				<div class="flex items-center justify-between">
					<div>
						<h1 class="text-3xl font-bold text-foreground">Content Analytics</h1>
						<p class="text-muted-foreground mt-1">Student engagement and performance insights</p>
					</div>
					<Button variant="outline" onclick={() => navigate('/admin')}>
						<ArrowLeft class="w-4 h-4 mr-2" />
						Back to Admin
					</Button>
				</div>
			</div>
		</div>

		<div class="container mx-auto px-4 py-8">
	<!-- Course Selector -->
	<div class="mb-6">
		<Label for="course-select" class="mb-2">Select Course</Label>
	<Select.Root
			type="single" 
			value={selectedCourseId ?? undefined}
			onValueChange={(v) => v && handleCourseChange(v)}
		>
			<Select.Trigger class="w-full max-w-md">
				{courses.find(c => c.id === selectedCourseId)?.title || 'Select a course'}
			</Select.Trigger>
			<Select.Content>
				{#each courses as course (course.id)}
					<Select.Item value={course.id} label="{course.title} ({course.enrolled} students)">
						{course.title} ({course.enrolled} students)
					</Select.Item>
				{/each}
			</Select.Content>
		</Select.Root>
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
									<p class="text-sm font-medium text-muted-foreground">Total Enrolled</p>
									<p class="text-3xl font-bold text-foreground">{formatNumber(courseAnalytics.totalEnrolled)}</p>
								</div>
								<div class="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
									<Users class="w-6 h-6 text-primary" />
								</div>
							</div>
							<div class="mt-2">
								<span class="text-sm text-muted-foreground">
									{formatNumber(courseAnalytics.activeStudents)} active (last 7 days)
								</span>
							</div>
						</CardContent>
					</Card>

					<Card>
						<CardContent class="p-6">
							<div class="flex items-center justify-between">
								<div>
									<p class="text-sm font-medium text-muted-foreground">Completion Rate</p>
									<p class="text-3xl font-bold text-foreground">{courseAnalytics.completionRate.toFixed(1)}%</p>
								</div>
								<div class="w-12 h-12 bg-green-500/10 rounded-lg flex items-center justify-center">
									<CheckCircle class="w-6 h-6 text-green-600 dark:text-green-500" />
								</div>
							</div>
							<div class="mt-2">
								<span class="text-sm text-muted-foreground">
									Avg progress: {courseAnalytics.averageCourseProgress.toFixed(1)}%
								</span>
							</div>
						</CardContent>
					</Card>

					<Card>
						<CardContent class="p-6">
							<div class="flex items-center justify-between">
								<div>
									<p class="text-sm font-medium text-muted-foreground">Avg Time to Complete</p>
									<p class="text-3xl font-bold text-foreground">{formatTime(courseAnalytics.averageCourseTime)}</p>
								</div>
								<div class="w-12 h-12 bg-purple-500/10 rounded-lg flex items-center justify-center">
									<Clock class="w-6 h-6 text-purple-600 dark:text-purple-500" />
								</div>
							</div>
							<div class="mt-2">
								<span class="text-sm text-muted-foreground">
									Median: {formatTime(courseAnalytics.medianCourseTime)}
								</span>
							</div>
						</CardContent>
					</Card>

					<Card>
						<CardContent class="p-6">
							<div class="flex items-center justify-between">
								<div>
									<p class="text-sm font-medium text-muted-foreground">Avg Session</p>
									<p class="text-3xl font-bold text-foreground">
										{formatTime(courseAnalytics.averageSessionDuration)}
									</p>
								</div>
								<div class="w-12 h-12 bg-yellow-500/10 rounded-lg flex items-center justify-center">
									<Zap class="w-6 h-6 text-yellow-600 dark:text-yellow-500" />
								</div>
							</div>
							<div class="mt-2">
								<span class="text-sm text-muted-foreground">Per student session</span>
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
													<span class="text-xs font-medium text-muted-foreground"
														>#{lesson.order}</span
													>
													<h4 class="font-medium text-sm text-foreground">{lesson.lessonTitle}</h4>
												</div>
												<div class="flex items-center gap-4 text-xs text-muted-foreground">
													<span>{lesson.views} students</span>
													<span>{lesson.completionRate.toFixed(1)}% completed</span>
												</div>
											</div>
											<div class="text-right">
												<p class="text-lg font-bold {getEngagementColor(lesson.engagementScore)}">
													{lesson.engagementScore}
												</p>
												<p class="text-xs text-muted-foreground">score</p>
											</div>
										</div>
									{/each}
								</div>
							{:else}
								<p class="text-muted-foreground text-center py-4">No data available</p>
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
													<span class="text-xs font-medium text-muted-foreground"
														>#{lesson.order}</span
													>
													<h4 class="font-medium text-sm text-foreground">{lesson.lessonTitle}</h4>
												</div>
												<div class="flex items-center gap-4 text-xs text-muted-foreground">
													<span>{lesson.views} students</span>
													<span>{lesson.completionRate.toFixed(1)}% completed</span>
												</div>
											</div>
											<div class="text-right">
												<p class="text-lg font-bold {getEngagementColor(lesson.engagementScore)}">
													{lesson.engagementScore}
												</p>
												<p class="text-xs text-muted-foreground">score</p>
											</div>
										</div>
									{/each}
								</div>
							{:else}
								<p class="text-muted-foreground text-center py-4">No data available</p>
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
								<thead class="bg-muted border-b">
									<tr>
										<th class="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase"
											>#</th
										>
										<th class="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase"
											>Lesson</th
										>
										<th class="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase"
											>Students</th
										>
										<th class="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase"
											>Completion</th
										>
										<th class="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase"
											>Avg Time</th
										>
										<th class="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase"
											>Engagement</th
										>
									</tr>
								</thead>
								<tbody class="divide-y">
									{#each courseAnalytics.lessonsAnalytics as lesson (lesson.lessonId)}
										<tr class="hover:bg-muted/50">
											<td class="px-4 py-3 text-sm text-muted-foreground">{lesson.order}</td>
											<td class="px-4 py-3 text-sm font-medium text-foreground">{lesson.lessonTitle}</td>
											<td class="px-4 py-3 text-sm text-muted-foreground text-right">
												{formatNumber(lesson.uniqueStudents)}
											</td>
											<td class="px-4 py-3 text-sm text-muted-foreground text-right">
												{lesson.completionRate.toFixed(1)}%
											</td>
											<td class="px-4 py-3 text-sm text-muted-foreground text-right">
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
				<p class="text-sm text-muted-foreground text-center mt-4">
					Last updated: {new Date(courseAnalytics.lastUpdated).toLocaleString()}
				</p>
			{:else if error}
				<Card>
					<CardContent class="p-8 text-center">
						<div class="text-destructive mb-4">
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
						<h3 class="text-lg font-medium text-foreground mb-2">Error Loading Analytics</h3>
						<p class="text-muted-foreground mb-4">{error}</p>
						<Button onclick={() => loadAnalytics(selectedCourseId!)}>Try Again</Button>
					</CardContent>
				</Card>
			{:else}
				<Card>
					<CardContent class="p-8 text-center">
						<p class="text-muted-foreground">Select a course to view analytics</p>
					</CardContent>
				</Card>
			{/if}
		</div>
	</div>
{/if}
