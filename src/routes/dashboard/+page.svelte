<script lang="ts">
	import { AuthGuard, Loading } from '$lib/components'
	import { Card, CardHeader, CardTitle, CardDescription, CardContent, Button } from '$lib/components/ui'
	import { authState } from '$lib/auth.svelte'
	import { EnrollmentService } from '$lib/services/enrollment'
	import { ProgressService } from '$lib/services/progress'
	import { CourseService } from '$lib/services/courses'
	import { BookOpen, User, Clock, Award, CheckCircle } from 'lucide-svelte'
	import { getPath, navigate } from '$lib/utils/navigation'
	
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
	const recentCourses = $derived(
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
				<h1 class="text-3xl font-bold bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent mb-2">
					Welcome back{#if authState.user?.displayName}, {authState.user.displayName}{/if}!
				</h1>
				<p class="text-slate-600">
					Here's your learning progress and recent activity.
				</p>
			</div>

			{#if error}
				<Card class="mb-8 border-red-200 bg-red-50 rounded-xl shadow-sm">
					<CardContent class="pt-6">
						<p class="text-red-800 font-medium">{error}</p>
						<Button onclick={loadDashboardData} class="mt-4 bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 interactive">Retry</Button>
					</CardContent>
				</Card>
			{/if}

			<!-- Stats Cards -->
			<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
				<Card class="card-hover rounded-xl shadow-sm border-slate-200">
					<CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle class="text-sm font-medium text-slate-700">Enrolled Courses</CardTitle>
						<div class="w-8 h-8 rounded-lg bg-primary-100 flex items-center justify-center">
							<BookOpen class="h-4 w-4 text-primary-600" />
						</div>
					</CardHeader>
					<CardContent>
						<div class="text-2xl font-bold text-slate-900">{userStats.totalCourses}</div>
						<p class="text-xs text-slate-600">
							Total enrollments
						</p>
					</CardContent>
				</Card>

				<Card class="card-hover rounded-xl shadow-sm border-slate-200">
					<CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle class="text-sm font-medium text-slate-700">Completed</CardTitle>
						<div class="w-8 h-8 rounded-lg bg-secondary-100 flex items-center justify-center">
							<Award class="h-4 w-4 text-secondary-600" />
						</div>
					</CardHeader>
					<CardContent>
						<div class="text-2xl font-bold text-slate-900">{userStats.completedCourses}</div>
						<p class="text-xs text-slate-600">
							{userStats.totalCourses > 0 ? Math.round((userStats.completedCourses / userStats.totalCourses) * 100) : 0}% completion rate
						</p>
					</CardContent>
				</Card>

				<Card class="card-hover rounded-xl shadow-sm border-slate-200">
					<CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle class="text-sm font-medium text-slate-700">Study Hours</CardTitle>
						<div class="w-8 h-8 rounded-lg bg-accent-100 flex items-center justify-center">
							<Clock class="h-4 w-4 text-accent-600" />
						</div>
					</CardHeader>
					<CardContent>
						<div class="text-2xl font-bold text-slate-900">{userStats.totalStudyTime}</div>
						<p class="text-xs text-slate-600">
							Total time invested
						</p>
					</CardContent>
				</Card>

				<Card class="card-hover rounded-xl shadow-sm border-slate-200">
					<CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle class="text-sm font-medium text-slate-700">Current Streak</CardTitle>
						<div class="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-100 to-secondary-100 flex items-center justify-center">
							<User class="h-4 w-4 text-primary-600" />
						</div>
					</CardHeader>
					<CardContent>
						<div class="text-2xl font-bold text-slate-900">{userStats.currentStreak}</div>
						<p class="text-xs text-slate-600">
							{userStats.currentStreak === 1 ? 'day' : 'days'} in a row
						</p>
					</CardContent>
				</Card>
			</div>

			<!-- Course Overview -->
			<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
				<Card class="card rounded-xl shadow-sm border-slate-200">
					<CardHeader>
						<CardTitle class="text-slate-900">Recent Courses</CardTitle>
						<CardDescription class="text-slate-600">
							Your enrolled courses and progress
						</CardDescription>
					</CardHeader>
					<CardContent>
						{#if recentCourses.length > 0}
							<div class="space-y-4">
								{#each recentCourses as course (course.id)}
									<div class="flex items-center justify-between space-x-4 p-3 rounded-lg border border-slate-200 hover:bg-slate-50 interactive hover:shadow-sm">
										<div class="flex items-center space-x-4 flex-1">
											<div class="w-10 h-10 rounded-lg flex items-center justify-center {course.progress >= 100 ? 'bg-gradient-to-br from-secondary-500 to-secondary-600 shadow-md' : 'bg-primary-100'}">
												{#if course.progress >= 100}
													<CheckCircle class="h-5 w-5 text-white" />
												{:else}
													<BookOpen class="h-5 w-5 text-primary-600" />
												{/if}
											</div>
											<div class="flex-1">
												<p class="text-sm font-medium text-slate-900">{course.title}</p>
												<div class="flex items-center space-x-2 mt-1">
													<p class="text-xs text-slate-600 font-medium">{course.progress}% complete</p>
													{#if course.category}
														<span class="text-xs text-slate-400">•</span>
														<span class="text-xs text-slate-600 capitalize">{course.category}</span>
													{/if}
												</div>
												<div class="w-full h-1.5 bg-slate-200 rounded-full mt-2">
													<div 
														class="h-1.5 bg-gradient-to-r from-primary-500 to-secondary-500 rounded-full transition-all"
														style="width: {course.progress}%"
													></div>
												</div>
											</div>
										</div>
										<Button 
											size="sm" 
											variant="outline"
											onclick={() => continueCourse(course.courseId)}
											class="interactive rounded-lg border-primary-300 text-primary-700 hover:bg-primary-50"
										>
											{course.progress > 0 ? 'Continue' : 'Start'}
										</Button>
									</div>
								{/each}
							</div>
						{:else}
							<div class="text-center py-8">
								<BookOpen class="h-12 w-12 text-slate-400 mx-auto mb-4" />
								<p class="text-sm font-medium text-slate-900 mb-2">No enrolled courses yet</p>
								<p class="text-xs text-slate-600 mb-4">Start your learning journey by browsing our course catalog</p>
								<Button onclick={() => navigate('/courses')} class="bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 interactive">Browse Courses</Button>
							</div>
						{/if}
					</CardContent>
				</Card>

				<Card class="card rounded-xl shadow-sm border-slate-200">
					<CardHeader>
						<CardTitle class="text-slate-900">Quick Actions</CardTitle>
						<CardDescription class="text-slate-600">
							Common tasks and shortcuts
						</CardDescription>
					</CardHeader>
					<CardContent>
						<div class="space-y-3">
							<a 
								href={getPath('/courses')} 
								class="block p-3 rounded-lg border border-slate-200 hover:bg-slate-50 interactive hover:shadow-sm"
							>
								<div class="flex items-center space-x-3">
									<div class="w-10 h-10 rounded-lg bg-primary-100 flex items-center justify-center">
										<BookOpen class="h-5 w-5 text-primary-600" />
									</div>
									<div>
										<p class="text-sm font-medium text-slate-900">Browse Courses</p>
										<p class="text-xs text-slate-600">Discover new learning materials</p>
									</div>
								</div>
							</a>

							<a 
								href={getPath('/auth/profile')} 
								class="block p-3 rounded-lg border border-slate-200 hover:bg-slate-50 interactive hover:shadow-sm"
							>
								<div class="flex items-center space-x-3">
									<div class="w-10 h-10 rounded-lg bg-secondary-100 flex items-center justify-center">
										<User class="h-5 w-5 text-secondary-600" />
									</div>
									<div>
										<p class="text-sm font-medium text-slate-900">Edit Profile</p>
										<p class="text-xs text-slate-600">Update your account information</p>
									</div>
								</div>
							</a>

							<div class="p-3 rounded-lg border border-slate-200 bg-gradient-to-br from-accent-50 to-white">
								<div class="flex items-center space-x-3">
									<div class="w-10 h-10 rounded-lg bg-accent-100 flex items-center justify-center">
										<Award class="h-5 w-5 text-accent-600" />
									</div>
									<div>
										<p class="text-sm font-medium text-slate-900">Learning Goal</p>
										<p class="text-xs text-slate-600">
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