<script lang="ts">
	import { onMount } from 'svelte'
	import { AuthGuard, Loading } from '$lib/components'
	import { Card, CardHeader, CardTitle, CardDescription, CardContent, Button } from '$lib/components/ui'
	import { authState } from '$lib/auth.svelte'
	import { EnrollmentService } from '$lib/services/enrollment'
	import { ProgressService } from '$lib/services/progress'
	import { CourseService } from '$lib/services/courses'
	import { BookOpen, User, Clock, Award, Play, CheckCircle } from 'lucide-svelte'
	import { base } from '$app/paths'
	import { goto } from '$app/navigation'
	
	// State management
	let loading = $state(true)
	let error = $state<string | null>(null)
	let enrollments = $state<any[]>([])
	let progressData = $state<any[]>([])
	let userStats = $state({
		totalCourses: 0,
		completedCourses: 0,
		totalStudyTime: 0,
		currentStreak: 0
	})

	// Computed values
	let recentCourses = $derived(
		enrollments
			.slice(0, 5)
			.map(enrollment => {
				const progress = progressData.find(p => p.courseId === enrollment.courseId)
				return {
					...enrollment,
					progress: progress ? Math.round(progress.overallProgress * 100) : 0,
					lastAccessed: progress?.lastAccessed || enrollment.enrolledAt
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
			enrollments = userEnrollments

			// Load progress data for enrolled courses
			const progressPromises = userEnrollments.map(enrollment => 
				ProgressService.getCourseProgress(authState.user!.id, enrollment.courseId)
			)
			const progressResults = await Promise.allSettled(progressPromises)
			progressData = progressResults
				.filter(result => result.status === 'fulfilled')
				.map(result => (result as PromiseFulfilledResult<any>).value)
				.filter(progress => progress !== null)

			// Calculate user stats
			const completedCourses = progressData.filter(p => p.overallProgress >= 1).length
			const totalStudyTime = progressData.reduce((total, p) => total + (p.totalTimeSpent || 0), 0)
			
			userStats = {
				totalCourses: userEnrollments.length,
				completedCourses,
				totalStudyTime: Math.round(totalStudyTime / 3600), // Convert to hours
				currentStreak: authState.user.streakDays || 0
			}

		} catch (err) {
			console.error('Failed to load dashboard data:', err)
			error = 'Failed to load dashboard data'
		} finally {
			loading = false
		}
	}

	async function continueCourse(courseId: string) {
		const progress = progressData.find(p => p.courseId === courseId)
		const lastLessonId = progress?.lastLessonId
		
		if (lastLessonId) {
			goto(`${base}/courses/${courseId}/learn/${lastLessonId}`)
		} else {
			goto(`${base}/courses/${courseId}`)
		}
	}

	onMount(loadDashboardData)
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
				<h1 class="text-3xl font-bold text-foreground mb-2">
					Welcome back{#if authState.user?.displayName}, {authState.user.displayName}{/if}!
				</h1>
				<p class="text-muted-foreground">
					Here's your learning progress and recent activity.
				</p>
			</div>

			{#if error}
				<Card class="mb-8 border-destructive">
					<CardContent class="pt-6">
						<p class="text-destructive">{error}</p>
						<Button onclick={loadDashboardData} class="mt-4">Retry</Button>
					</CardContent>
				</Card>
			{/if}

			<!-- Stats Cards -->
			<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
				<Card>
					<CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle class="text-sm font-medium">Enrolled Courses</CardTitle>
						<BookOpen class="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div class="text-2xl font-bold">{userStats.totalCourses}</div>
						<p class="text-xs text-muted-foreground">
							Total enrollments
						</p>
					</CardContent>
				</Card>

				<Card>
					<CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle class="text-sm font-medium">Completed</CardTitle>
						<Award class="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div class="text-2xl font-bold">{userStats.completedCourses}</div>
						<p class="text-xs text-muted-foreground">
							{userStats.totalCourses > 0 ? Math.round((userStats.completedCourses / userStats.totalCourses) * 100) : 0}% completion rate
						</p>
					</CardContent>
				</Card>

				<Card>
					<CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle class="text-sm font-medium">Study Hours</CardTitle>
						<Clock class="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div class="text-2xl font-bold">{userStats.totalStudyTime}</div>
						<p class="text-xs text-muted-foreground">
							Total time invested
						</p>
					</CardContent>
				</Card>

				<Card>
					<CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle class="text-sm font-medium">Current Streak</CardTitle>
						<User class="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div class="text-2xl font-bold">{userStats.currentStreak}</div>
						<p class="text-xs text-muted-foreground">
							{userStats.currentStreak === 1 ? 'day' : 'days'} in a row
						</p>
					</CardContent>
				</Card>
			</div>

			<!-- Course Overview -->
			<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
				<Card>
					<CardHeader>
						<CardTitle>Recent Courses</CardTitle>
						<CardDescription>
							Your enrolled courses and progress
						</CardDescription>
					</CardHeader>
					<CardContent>
						{#if recentCourses.length > 0}
							<div class="space-y-4">
								{#each recentCourses as course}
									<div class="flex items-center justify-between space-x-4 p-3 rounded-lg border border-border hover:bg-muted transition-colors">
										<div class="flex items-center space-x-4 flex-1">
											<div class="w-10 h-10 bg-primary/20 rounded-lg flex items-center justify-center">
												{#if course.progress >= 100}
													<CheckCircle class="h-5 w-5 text-green-600" />
												{:else}
													<BookOpen class="h-5 w-5 text-primary" />
												{/if}
											</div>
											<div class="flex-1">
												<p class="text-sm font-medium">{course.title}</p>
												<div class="flex items-center space-x-2 mt-1">
													<p class="text-xs text-muted-foreground">{course.progress}% complete</p>
													<div class="w-16 h-1 bg-muted rounded-full">
														<div 
															class="h-1 bg-primary rounded-full transition-all"
															style="width: {course.progress}%"
														></div>
													</div>
												</div>
											</div>
										</div>
										<Button 
											size="sm" 
											variant="outline"
											onclick={() => continueCourse(course.courseId)}
										>
											{course.progress > 0 ? 'Continue' : 'Start'}
										</Button>
									</div>
								{/each}
							</div>
						{:else}
							<div class="text-center py-8">
								<BookOpen class="h-12 w-12 text-muted-foreground mx-auto mb-4" />
								<p class="text-sm font-medium mb-2">No enrolled courses yet</p>
								<p class="text-xs text-muted-foreground mb-4">Start your learning journey by browsing our course catalog</p>
								<Button onclick={() => goto(`${base}/courses`)}>Browse Courses</Button>
							</div>
						{/if}
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>Quick Actions</CardTitle>
						<CardDescription>
							Common tasks and shortcuts
						</CardDescription>
					</CardHeader>
					<CardContent>
						<div class="space-y-3">
							<a 
								href="{base}/courses" 
								class="block p-3 rounded-lg border border-border hover:bg-muted transition-colors"
							>
								<div class="flex items-center space-x-3">
									<BookOpen class="h-5 w-5 text-primary" />
									<div>
										<p class="text-sm font-medium">Browse Courses</p>
										<p class="text-xs text-muted-foreground">Discover new learning materials</p>
									</div>
								</div>
							</a>

							<a 
								href="{base}/auth/profile" 
								class="block p-3 rounded-lg border border-border hover:bg-muted transition-colors"
							>
								<div class="flex items-center space-x-3">
									<User class="h-5 w-5 text-primary" />
									<div>
										<p class="text-sm font-medium">Edit Profile</p>
										<p class="text-xs text-muted-foreground">Update your account information</p>
									</div>
								</div>
							</a>

							<div class="p-3 rounded-lg border border-border">
								<div class="flex items-center space-x-3">
									<Award class="h-5 w-5 text-primary" />
									<div>
										<p class="text-sm font-medium">Learning Goal</p>
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