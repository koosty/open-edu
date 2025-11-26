<script lang="ts">
	import { AuthGuard, Loading } from '$lib/components'
	import { Card, CardHeader, CardTitle, CardDescription, CardContent, Button } from '$lib/components/ui'
	import { authState } from '$lib/auth.svelte'
	import { EnrollmentService } from '$lib/services/enrollment'
	import { ProgressService } from '$lib/services/progress'
	import { CourseService } from '$lib/services/courses'
	import { BookOpen, User, Clock, Award, CheckCircle } from 'lucide-svelte'
	import { getPath, navigate } from '$lib/utils/navigation'
	import { getErrorMessage } from '$lib/utils/errors'
	import * as m from '$lib/paraglide/messages'
	import type { Enrollment, UserProgress } from '$lib/types'
	
	// Extended enrollment type that includes course details
	interface EnrollmentWithCourse extends Enrollment {
		title: string
		description: string
		level: string
		duration: string | number
		thumbnail: string | null
		category: string
	}
	
	// State management
	let loading = $state(true)
	let error = $state<string | null>(null)
	let enrollments = $state<EnrollmentWithCourse[]>([])
	let progressData = $state<UserProgress[]>([])
	let userStats = $state({
		totalCourses: 0,
		completedCourses: 0,
		totalStudyTime: 0,
		currentStreak: 0
	})

	// Computed values
	const recentCourses = $derived(
		enrollments
			.slice(0, 5)
			.map(enrollment => {
				const progress = progressData.find(p => p.courseId === enrollment.courseId)
				return {
					...enrollment,
					progress: progress?.progressPercentage ?? 0,
					lastAccessed: progress?.lastAccessedAt || enrollment.enrolledAt
				}
			})
			.sort((a, b) => new Date(b.lastAccessed).getTime() - new Date(a.lastAccessed).getTime())
	)

	async function loadDashboardData() {
		if (!authState.user) return

		try {
			loading = true
			error = null

			// Load user enrollments
			const userEnrollments = await EnrollmentService.getUserEnrollments(authState.user.id)
			
			// Load course details for each enrollment
			const coursePromises = userEnrollments.map(enrollment => 
				CourseService.getCourse(enrollment.courseId)
			)
			const courseResults = await Promise.allSettled(coursePromises)
			
			// Combine enrollment data with course details
			const enrollmentsWithCourses = userEnrollments.map((enrollment, index) => {
				const courseResult = courseResults[index]
				const courseData = courseResult.status === 'fulfilled' ? courseResult.value : null
				
				return {
					...enrollment,
					title: courseData?.title || 'Unknown Course',
					description: courseData?.description || '',
					level: courseData?.level || 'beginner',
					duration: courseData?.duration || 0,
					thumbnail: courseData?.thumbnail || null,
					category: courseData?.category || 'General'
				}
			})
			
			enrollments = enrollmentsWithCourses

			// Load progress data for enrolled courses
			const progressPromises = userEnrollments.map(enrollment => 
				ProgressService.getCourseProgress(authState.user!.id, enrollment.courseId)
			)
			const progressResults = await Promise.allSettled(progressPromises)
			progressData = progressResults
				.filter((result): result is PromiseFulfilledResult<UserProgress | null> => result.status === 'fulfilled')
				.map(result => result.value)
				.filter((progress): progress is UserProgress => progress !== null)

			// Calculate user stats
			const completedCourses = progressData.filter(p => p.progressPercentage >= 100).length
			const totalStudyTime = progressData.reduce((total, p) => total + (p.totalTimeSpent || 0), 0)
			
			userStats = {
				totalCourses: userEnrollments.length,
				completedCourses,
				totalStudyTime: Math.round(totalStudyTime / 3600), // Convert to hours
				currentStreak: authState.user.streakDays || 0
			}

		} catch (err) {
			console.error('Failed to load dashboard data:', err)
			error = getErrorMessage(err)
		} finally {
			loading = false
		}
	}

	async function continueCourse(courseId: string) {
		const progress = progressData.find(p => p.courseId === courseId)
		const lastLessonId = progress?.currentLesson
		
		if (lastLessonId) {
			navigate(`/courses/${courseId}/learn/${lastLessonId}`)
		} else {
			navigate(`/courses/${courseId}`)
		}
	}

	// React to auth state changes instead of just onMount
	$effect(() => {
		// Only load data when auth is resolved and user exists
		if (!authState.loading && authState.user) {
			loadDashboardData()
		}
	})
</script>

<svelte:head>
	<title>Dashboard - Open-EDU</title>
	<meta name="description" content="Your Open-EDU dashboard" />
</svelte:head>

<AuthGuard>
	{#if loading}
		<Loading />
	{:else}
		<div class="container mx-auto py-8 px-4">
			<!-- Welcome Section -->
			<div class="mb-8">
				<h1 class="text-3xl font-bold text-primary mb-2">
					{#if authState.user?.displayName}
						{m.dashboard_titleWithName({ name: authState.user.displayName })}
					{:else}
						{m.dashboard_title()}
					{/if}
				</h1>
				<p class="text-muted-foreground">
					{m.dashboard_subtitle()}
				</p>
			</div>

			{#if error}
				<Card class="mb-8 border-destructive/20 bg-destructive/10">
					<CardContent class="pt-6">
						<p class="text-destructive font-medium">{error}</p>
						<Button onclick={loadDashboardData} class="mt-4">Retry</Button>
					</CardContent>
				</Card>
			{/if}

			<!-- Stats Cards -->
			<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
				<Card class="card-hover">
					<CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle class="text-sm font-medium text-muted-foreground">{m.dashboard_stats_enrolled()}</CardTitle>
						<div class="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
							<BookOpen class="h-4 w-4 text-primary" />
						</div>
					</CardHeader>
					<CardContent>
						<div class="text-2xl font-bold text-foreground">{userStats.totalCourses}</div>
						<p class="text-xs text-muted-foreground">
							{m.dashboard_stats_totalEnrollments()}
						</p>
					</CardContent>
				</Card>

				<Card class="card-hover">
					<CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle class="text-sm font-medium text-muted-foreground">{m.dashboard_stats_completed()}</CardTitle>
						<div class="w-8 h-8 rounded-lg bg-secondary/10 flex items-center justify-center">
							<Award class="h-4 w-4 text-secondary-foreground" />
						</div>
					</CardHeader>
					<CardContent>
						<div class="text-2xl font-bold text-foreground">{userStats.completedCourses}</div>
						<p class="text-xs text-muted-foreground">
							{m.dashboard_stats_completionRate({ rate: userStats.totalCourses > 0 ? Math.round((userStats.completedCourses / userStats.totalCourses) * 100) : 0 })}
						</p>
					</CardContent>
				</Card>

				<Card class="card-hover">
					<CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle class="text-sm font-medium text-muted-foreground">{m.dashboard_stats_studyHours()}</CardTitle>
						<div class="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center">
							<Clock class="h-4 w-4 text-accent-foreground" />
						</div>
					</CardHeader>
					<CardContent>
						<div class="text-2xl font-bold text-foreground">{userStats.totalStudyTime}</div>
						<p class="text-xs text-muted-foreground">
							{m.dashboard_stats_totalTime()}
						</p>
					</CardContent>
				</Card>

				<Card class="card-hover">
					<CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle class="text-sm font-medium text-muted-foreground">{m.dashboard_stats_streak()}</CardTitle>
						<div class="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
							<User class="h-4 w-4 text-primary" />
						</div>
					</CardHeader>
					<CardContent>
						<div class="text-2xl font-bold text-foreground">{userStats.currentStreak}</div>
						<p class="text-xs text-muted-foreground">
							{userStats.currentStreak === 1 ? m.dashboard_stats_day() : m.dashboard_stats_days({ count: userStats.currentStreak })}
						</p>
					</CardContent>
				</Card>
			</div>

			<!-- Course Overview -->
			<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
				<Card class="card">
					<CardHeader>
						<CardTitle>{m.dashboard_recentCourses()}</CardTitle>
						<CardDescription>
							{m.dashboard_recentCoursesDesc()}
						</CardDescription>
					</CardHeader>
					<CardContent>
						{#if recentCourses.length > 0}
							<div class="space-y-4">
								{#each recentCourses as course (course.id)}
									<div class="flex items-center justify-between space-x-4 p-3 rounded-lg border hover:bg-muted interactive hover:shadow-sm">
										<div class="flex items-center space-x-4 flex-1">
											<div class="w-10 h-10 rounded-lg flex items-center justify-center {course.progress >= 100 ? 'bg-primary text-primary-foreground shadow-md' : 'bg-primary/10'}">
												{#if course.progress >= 100}
													<CheckCircle class="h-5 w-5" />
												{:else}
													<BookOpen class="h-5 w-5 text-primary" />
												{/if}
											</div>
											<div class="flex-1">
												<p class="text-sm font-medium text-foreground">{course.title}</p>
												<div class="flex items-center space-x-2 mt-1">
													<p class="text-xs text-muted-foreground font-medium">{m.dashboard_percentComplete({ percent: course.progress })}</p>
													{#if course.category}
														<span class="text-xs text-muted-foreground">•</span>
														<span class="text-xs text-muted-foreground capitalize">{course.category}</span>
													{/if}
												</div>
												<div class="w-full h-1.5 bg-muted rounded-full mt-2">
													<div 
														class="h-1.5 bg-primary rounded-full transition-all"
														style="width: {course.progress}%"
													></div>
												</div>
											</div>
										</div>
										<Button 
											size="sm" 
											variant="outline"
											onclick={() => continueCourse(course.courseId)}
										>
											{course.progress > 0 ? m.dashboard_continue() : m.dashboard_start()}
										</Button>
									</div>
								{/each}
							</div>
						{:else}
							<div class="text-center py-8">
								<BookOpen class="h-12 w-12 text-muted-foreground mx-auto mb-4" />
								<p class="text-sm font-medium text-foreground mb-2">{m.dashboard_noCourses()}</p>
								<p class="text-xs text-muted-foreground mb-4">{m.dashboard_noCoursesDesc()}</p>
								<Button onclick={() => navigate('/courses')}>{m.dashboard_browseCourses()}</Button>
							</div>
						{/if}
					</CardContent>
				</Card>

				<Card class="card">
					<CardHeader>
						<CardTitle>{m.dashboard_quickActions()}</CardTitle>
						<CardDescription>
							{m.dashboard_quickActionsDesc()}
						</CardDescription>
					</CardHeader>
					<CardContent>
						<div class="space-y-3">
							<a 
								href={getPath('/courses')} 
								class="block p-3 rounded-lg border hover:bg-muted interactive hover:shadow-sm"
							>
								<div class="flex items-center space-x-3">
									<div class="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
										<BookOpen class="h-5 w-5 text-primary" />
									</div>
									<div>
										<p class="text-sm font-medium text-foreground">Browse Courses</p>
										<p class="text-xs text-muted-foreground">Discover new learning materials</p>
									</div>
								</div>
							</a>

							<a 
								href={getPath('/auth/profile')} 
								class="block p-3 rounded-lg border hover:bg-muted interactive hover:shadow-sm"
							>
								<div class="flex items-center space-x-3">
									<div class="w-10 h-10 rounded-lg bg-secondary/10 flex items-center justify-center">
										<User class="h-5 w-5 text-secondary-foreground" />
									</div>
									<div>
										<p class="text-sm font-medium text-foreground">Edit Profile</p>
										<p class="text-xs text-muted-foreground">Update your account information</p>
									</div>
								</div>
							</a>

							<div class="p-3 rounded-lg border bg-accent/5">
								<div class="flex items-center space-x-3">
									<div class="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
										<Award class="h-5 w-5 text-accent-foreground" />
									</div>
									<div>
										<p class="text-sm font-medium text-foreground">Learning Goal</p>
										<p class="text-xs text-muted-foreground">
											{#if userStats.totalCourses === 0}
												Enroll in your first course
											{:else if userStats.completedCourses < userStats.totalCourses}
												Complete {userStats.totalCourses - userStats.completedCourses} more course{userStats.totalCourses - userStats.completedCourses !== 1 ? 's' : ''}
											{:else}
												All courses completed! 🎉
											{/if}
										</p>
									</div>
								</div>
							</div>
						</div>
					</CardContent>
				</Card>
			</div>
		</div>
	{/if}
</AuthGuard>