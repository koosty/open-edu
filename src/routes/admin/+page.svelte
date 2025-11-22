<script lang="ts">
	import { CourseService } from '$lib/services/courses'
	import { navigate } from '$lib/utils/navigation'
	import { authState } from '$lib/auth.svelte'
	import { isAdmin, canManageCourses } from '$lib/utils/admin'
	import { Button } from '$lib/components/ui'
	import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '$lib/components/ui'
	import type { Course } from '$lib/types'
	import Loading from '$lib/components/Loading.svelte'
	import { Plus, BookOpen, Users, CheckCircle, Star, User } from 'lucide-svelte'

	// State management
	let loading = $state(true)
	let error = $state<string | null>(null)
	let courses = $state<Course[]>([])
	const analytics = $state({
		totalCourses: 0,
		totalStudents: 0,
		totalEnrollments: 0,
		publishedCourses: 0,
		draftCourses: 0,
		featuredCourses: 0
	})
	
	let popularCourses = $state<Course[]>([])

	// Access control
	const hasAccess = $derived(authState.user && canManageCourses(authState.user))
	const isFullAdmin = $derived(authState.user && isAdmin(authState.user))

	// Reactive effect for authentication and access control
	$effect(() => {
		// Wait for auth to finish loading before making navigation decisions
		if (authState.loading) {
			return
		}

		// If no user after loading is complete, redirect to login
		if (!authState.user) {
			navigate('/auth/login')
			return
		}

		// If user doesn't have admin/instructor access, redirect to dashboard
		if (!hasAccess) {
			navigate('/dashboard')
			return
		}

		// If we reach here, user has proper access - load the dashboard
		loadDashboardData()
	})

	async function loadDashboardData() {
		loading = true
		error = null

		try {
			// Load courses based on user role
			let coursesQuery = null
			
			if (isFullAdmin) {
				// Admins can see all courses
				coursesQuery = CourseService.getCourses({}, { field: 'createdAt', direction: 'desc' }, { page: 1, limit: 50 })
			} else {
				// Instructors can only see their own courses
				coursesQuery = CourseService.getCoursesByInstructor(authState.user!.id)
					.then(courses => ({
						courses,
						total: courses.length,
						hasMore: false,
						nextCursor: undefined
					}))
			}

			const coursesResult = await coursesQuery
			courses = coursesResult.courses || []

			// Calculate analytics
			calculateAnalytics()

			// Load popular courses (top 5 by enrollment)
			const popularCoursesResult = await CourseService.getCourses(
				{ isPublished: true },
				{ field: 'enrolled', direction: 'desc' },
				{ page: 1, limit: 5 }
			)
			popularCourses = popularCoursesResult.courses

			// Load recent enrollments for admin view
			if (isFullAdmin) {
				await loadRecentEnrollments()
			}

		} catch (err: any) {
			error = err.message || 'Failed to load dashboard data'
			console.error('Error loading dashboard:', err)
		} finally {
			loading = false
		}
	}

	async function loadRecentEnrollments() {
		try {
			// For demo purposes, we'll just show placeholder data
			// In a real app, you'd have a service to get recent enrollments across all courses
			// TODO: Implement enrollment tracking
		} catch (err) {
			console.error('Error loading recent enrollments:', err)
		}
	}

	function calculateAnalytics() {
		analytics.totalCourses = courses.length
		analytics.publishedCourses = courses.filter(c => c.isPublished).length
		analytics.draftCourses = courses.filter(c => !c.isPublished).length
		analytics.featuredCourses = courses.filter(c => c.isFeatured).length
		analytics.totalEnrollments = courses.reduce((sum, course) => sum + course.enrolled, 0)
		
		// Calculate unique students (approximation)
		analytics.totalStudents = Math.floor(analytics.totalEnrollments * 0.8) // Rough estimate
	}

	async function handleTogglePublish(course: Course) {
		try {
			await CourseService.togglePublishStatus(course.id, !course.isPublished)
			
			// Update local state
			const courseIndex = courses.findIndex(c => c.id === course.id)
			if (courseIndex >= 0) {
				courses[courseIndex] = { ...course, isPublished: !course.isPublished }
				calculateAnalytics()
			}
		} catch (err: any) {
			error = err.message || 'Failed to update course status'
		}
	}

	function formatDate(dateString: string): string {
		return new Date(dateString).toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric'
		})
	}

	function formatNumber(num: number): string {
		return num.toLocaleString()
	}

	function getDifficultyColor(difficulty: string): string {
		switch (difficulty.toLowerCase()) {
			case 'beginner': return 'bg-green-500/10 text-green-700 dark:text-green-400'
			case 'intermediate': return 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400' 
			case 'advanced': return 'bg-red-500/10 text-red-700 dark:text-red-400'
			default: return 'bg-muted text-muted-foreground'
		}
	}
</script>

<svelte:head>
	<title>Admin Dashboard - Open-EDU</title>
	<meta name="description" content="Course management dashboard for Open-EDU" />
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
				<p class="text-muted-foreground mb-6">You don't have permission to access the admin dashboard.</p>
				<Button onclick={() => navigate('/dashboard')}>
					Go to Dashboard
				</Button>
			</CardContent>
		</Card>
	</div>
{:else}
	<div class="min-h-screen bg-background">
		<!-- Header -->
		<div class="bg-card border-b">
			<div class="container mx-auto px-4 py-6">
				<div class="flex items-center justify-between">
					<div>
						<h1 class="text-3xl font-bold text-foreground">Admin Dashboard</h1>
						<p class="text-muted-foreground mt-1">
							{isFullAdmin ? 'Platform Administrator' : 'Course Instructor'}
						</p>
					</div>
					<Button onclick={() => navigate('/admin/courses/new')} class="flex items-center gap-2">
						<Plus class="w-5 h-5" />
						Create Course
					</Button>
				</div>
			</div>
		</div>

		<div class="container mx-auto px-4 py-8">
			<!-- Analytics Cards -->
			<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
				<Card>
					<CardContent class="p-6">
						<div class="flex items-center justify-between">
							<div>
								<p class="text-sm font-medium text-muted-foreground">Total Courses</p>
								<p class="text-3xl font-bold text-foreground">{formatNumber(analytics.totalCourses)}</p>
							</div>
							<div class="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
								<BookOpen class="w-6 h-6 text-primary" />
							</div>
						</div>
						<div class="mt-2">
							<span class="text-sm text-muted-foreground">
								{analytics.publishedCourses} published, {analytics.draftCourses} draft
							</span>
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardContent class="p-6">
						<div class="flex items-center justify-between">
							<div>
								<p class="text-sm font-medium text-muted-foreground">Total Enrollments</p>
								<p class="text-3xl font-bold text-foreground">{formatNumber(analytics.totalEnrollments)}</p>
							</div>
							<div class="w-12 h-12 bg-green-500/10 rounded-lg flex items-center justify-center">
								<Users class="w-6 h-6 text-green-600 dark:text-green-500" />
							</div>
						</div>
						<div class="mt-2">
							<span class="text-sm text-muted-foreground">
								~{formatNumber(analytics.totalStudents)} students
							</span>
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardContent class="p-6">
						<div class="flex items-center justify-between">
							<div>
								<p class="text-sm font-medium text-muted-foreground">Published Courses</p>
								<p class="text-3xl font-bold text-foreground">{formatNumber(analytics.publishedCourses)}</p>
							</div>
							<div class="w-12 h-12 bg-purple-500/10 rounded-lg flex items-center justify-center">
								<CheckCircle class="w-6 h-6 text-purple-600 dark:text-purple-500" />
							</div>
						</div>
						<div class="mt-2">
							<span class="text-sm text-muted-foreground">
								{analytics.featuredCourses} featured
							</span>
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardContent class="p-6">
						<div class="flex items-center justify-between">
							<div>
								<p class="text-sm font-medium text-muted-foreground">Average Rating</p>
								<p class="text-3xl font-bold text-foreground">
									{courses.length > 0 ? 
										(courses.reduce((sum, c) => sum + c.rating, 0) / courses.length).toFixed(1) : 
										'N/A'}
								</p>
							</div>
							<div class="w-12 h-12 bg-yellow-500/10 rounded-lg flex items-center justify-center">
								<Star class="w-6 h-6 text-yellow-600 dark:text-yellow-500" fill="currentColor" />
							</div>
						</div>
						<div class="mt-2">
							<span class="text-sm text-muted-foreground">
								Across {analytics.totalCourses} courses
							</span>
						</div>
					</CardContent>
				</Card>
			</div>

			<div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
				<!-- Course Management -->
				<div class="lg:col-span-2">
					<Card>
						<CardHeader>
							<div class="flex items-center justify-between">
								<CardTitle>Course Management</CardTitle>
								<Button variant="outline" onclick={() => navigate('/courses')}>
									View All Courses
								</Button>
							</div>
						</CardHeader>
						<CardContent>
							{#if courses.length === 0}
								<div class="text-center py-8">
									<BookOpen class="w-12 h-12 text-muted-foreground mx-auto mb-4" />
									<h3 class="text-lg font-medium text-foreground mb-2">No courses yet</h3>
									<p class="text-muted-foreground mb-4">Get started by creating your first course.</p>
									<Button onclick={() => navigate('/admin/courses/new')}>
										Create Course
									</Button>
								</div>
							{:else}
								<div class="space-y-4">
									{#each courses.slice(0, 6) as course (course.id)}
										<div class="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
											<div class="flex-1">
												<div class="flex items-center gap-3 mb-2">
													<h3 class="font-medium text-foreground">{course.title}</h3>
													<span class="px-2 py-1 text-xs rounded-full {getDifficultyColor(course.difficulty)}">
														{course.difficulty}
													</span>
													{#if course.isFeatured}
														<span class="px-2 py-1 bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 text-xs rounded-full">
															Featured
														</span>
													{/if}
												</div>
												<p class="text-sm text-muted-foreground mb-2">
													{course.description.length > 100 ? 
														course.description.substring(0, 100) + '...' : 
														course.description}
												</p>
												<div class="flex items-center gap-4 text-sm text-muted-foreground">
													<span>{course.enrolled} students</span>
													<span>{course.lessons?.length || 0} lessons</span>
													{#if course.rating > 0}
														<span>⭐ {course.rating.toFixed(1)}</span>
													{/if}
													<span>Updated {formatDate(course.updatedAt)}</span>
												</div>
											</div>
											<div class="flex items-center gap-2 ml-4">
												<div class="flex items-center">
													{#if course.isPublished}
														<span class="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
														<span class="text-sm text-green-600 dark:text-green-500 font-medium">Published</span>
													{:else}
														<span class="w-2 h-2 bg-muted-foreground rounded-full mr-2"></span>
														<span class="text-sm text-muted-foreground font-medium">Draft</span>
													{/if}
												</div>
												<Button 
													variant="outline" 
													size="sm"
													onclick={() => handleTogglePublish(course)}
												>
													{course.isPublished ? 'Unpublish' : 'Publish'}
												</Button>
												<Button 
													variant="ghost" 
													size="sm"
													onclick={() => navigate(`/courses/${course.id}`)}
												>
													View
												</Button>
											</div>
										</div>
									{/each}

									{#if courses.length > 6}
										<div class="text-center pt-4">
											<Button variant="outline" onclick={() => navigate('/courses')}>
												View All {courses.length} Courses
											</Button>
										</div>
									{/if}
								</div>
							{/if}
						</CardContent>
					</Card>
				</div>

				<!-- Sidebar -->
				<div class="space-y-6">
					<!-- Quick Actions -->
					<Card>
						<CardHeader>
							<CardTitle>Quick Actions</CardTitle>
						</CardHeader>
						<CardContent class="space-y-3">
							<Button onclick={() => navigate('/admin/courses/new')} class="w-full justify-start">
								<Plus class="w-4 h-4 mr-2" />
								Create New Course
							</Button>
							<Button variant="outline" onclick={() => navigate('/admin/analytics')} class="w-full justify-start">
								<svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
								</svg>
								Content Analytics
							</Button>
							<Button variant="outline" onclick={() => navigate('/courses')} class="w-full justify-start">
								<BookOpen class="w-4 h-4 mr-2" />
								Browse Courses
							</Button>
							<Button variant="outline" onclick={() => navigate('/dashboard')} class="w-full justify-start">
								<User class="w-4 h-4 mr-2" />
								Student View
							</Button>
						</CardContent>
					</Card>

					<!-- Popular Courses -->
					{#if popularCourses.length > 0}
						<Card>
							<CardHeader>
								<CardTitle>Popular Courses</CardTitle>
								<CardDescription>Most enrolled courses</CardDescription>
							</CardHeader>
							<CardContent>
								<div class="space-y-3">
									{#each popularCourses as course (course.id)}
										<div class="flex items-center justify-between">
											<div class="flex-1 min-w-0">
												<p class="font-medium text-sm text-foreground truncate">{course.title}</p>
												<p class="text-xs text-muted-foreground">{course.enrolled} students</p>
											</div>
											<Button 
												variant="ghost" 
												size="sm"
												onclick={() => navigate(`/courses/${course.id}`)}
											>
												View
											</Button>
										</div>
									{/each}
								</div>
							</CardContent>
						</Card>
					{/if}

					<!-- Account Info -->
					<Card>
						<CardHeader>
							<CardTitle>Account</CardTitle>
						</CardHeader>
						<CardContent>
							<div class="flex items-center gap-3 mb-4">
								{#if authState.user?.photoURL}
									<img 
										src={authState.user.photoURL} 
										alt={authState.user.displayName || 'User'}
										class="w-10 h-10 rounded-full"
									/>
								{:else}
									<div class="w-10 h-10 bg-muted rounded-full flex items-center justify-center">
										<User class="w-6 h-6 text-muted-foreground" />
									</div>
								{/if}
								<div>
									<p class="font-medium text-foreground">{authState.user?.displayName || 'User'}</p>
									<p class="text-sm text-muted-foreground capitalize">{authState.user?.role}</p>
								</div>
							</div>
							<Button 
								variant="outline" 
								onclick={() => navigate('/auth/profile')} 
								class="w-full"
							>
								Profile Settings
							</Button>
						</CardContent>
					</Card>
				</div>
			</div>

			<!-- Error Display -->
			{#if error}
				<div class="mt-6 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
					<div class="flex items-start gap-3">
						<svg class="w-5 h-5 text-destructive mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
						</svg>
						<div>
							<h3 class="text-sm font-medium text-destructive">Error</h3>
							<p class="text-sm text-destructive/90 mt-1">{error}</p>
						</div>
					</div>
				</div>
			{/if}
		</div>
	</div>
{/if}