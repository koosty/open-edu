<script lang="ts">
	import { onMount } from 'svelte'
	import { CourseService } from '$lib/services/courses'
	import { navigate } from '$lib/utils/navigation'
	import { EnrollmentService } from '$lib/services/enrollment'
	import { authState } from '$lib/auth.svelte'
	import { isAdmin, canManageCourses } from '$lib/utils/admin'
	import { Button } from '$lib/components/ui'
	import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '$lib/components/ui'
	import type { Course, Enrollment } from '$lib/types'
	import Loading from '$lib/components/Loading.svelte'

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
	
	let recentEnrollments = $state<(Enrollment & { courseName?: string })[]>([])
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
			recentEnrollments = []
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
			case 'beginner': return 'bg-green-100 text-green-800'
			case 'intermediate': return 'bg-yellow-100 text-yellow-800' 
			case 'advanced': return 'bg-red-100 text-red-800'
			default: return 'bg-gray-100 text-gray-800'
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
				<h2 class="text-2xl font-bold text-red-600 mb-4">Access Denied</h2>
				<p class="text-gray-600 mb-6">You don't have permission to access the admin dashboard.</p>
				<Button onclick={() => navigate('/dashboard')}>
					Go to Dashboard
				</Button>
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
						<h1 class="text-3xl font-bold">Admin Dashboard</h1>
						<p class="text-gray-600 mt-1">
							{isFullAdmin ? 'Platform Administrator' : 'Course Instructor'}
						</p>
					</div>
					<Button onclick={() => navigate('/admin/courses/new')} class="flex items-center gap-2">
						<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
						</svg>
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
								<p class="text-sm font-medium text-gray-600">Total Courses</p>
								<p class="text-3xl font-bold">{formatNumber(analytics.totalCourses)}</p>
							</div>
							<div class="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
								<svg class="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
								</svg>
							</div>
						</div>
						<div class="mt-2">
							<span class="text-sm text-gray-500">
								{analytics.publishedCourses} published, {analytics.draftCourses} draft
							</span>
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardContent class="p-6">
						<div class="flex items-center justify-between">
							<div>
								<p class="text-sm font-medium text-gray-600">Total Enrollments</p>
								<p class="text-3xl font-bold">{formatNumber(analytics.totalEnrollments)}</p>
							</div>
							<div class="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
								<svg class="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
								</svg>
							</div>
						</div>
						<div class="mt-2">
							<span class="text-sm text-gray-500">
								~{formatNumber(analytics.totalStudents)} students
							</span>
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardContent class="p-6">
						<div class="flex items-center justify-between">
							<div>
								<p class="text-sm font-medium text-gray-600">Published Courses</p>
								<p class="text-3xl font-bold">{formatNumber(analytics.publishedCourses)}</p>
							</div>
							<div class="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
								<svg class="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
								</svg>
							</div>
						</div>
						<div class="mt-2">
							<span class="text-sm text-gray-500">
								{analytics.featuredCourses} featured
							</span>
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardContent class="p-6">
						<div class="flex items-center justify-between">
							<div>
								<p class="text-sm font-medium text-gray-600">Average Rating</p>
								<p class="text-3xl font-bold">
									{courses.length > 0 ? 
										(courses.reduce((sum, c) => sum + c.rating, 0) / courses.length).toFixed(1) : 
										'N/A'}
								</p>
							</div>
							<div class="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
								<svg class="w-6 h-6 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
									<path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
								</svg>
							</div>
						</div>
						<div class="mt-2">
							<span class="text-sm text-gray-500">
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
									<svg class="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
									</svg>
									<h3 class="text-lg font-medium text-gray-900 mb-2">No courses yet</h3>
									<p class="text-gray-600 mb-4">Get started by creating your first course.</p>
									<Button onclick={() => navigate('/admin/courses/new')}>
										Create Course
									</Button>
								</div>
							{:else}
								<div class="space-y-4">
									{#each courses.slice(0, 6) as course (course.id)}
										<div class="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
											<div class="flex-1">
												<div class="flex items-center gap-3 mb-2">
													<h3 class="font-medium">{course.title}</h3>
													<span class="px-2 py-1 text-xs rounded-full {getDifficultyColor(course.difficulty)}">
														{course.difficulty}
													</span>
													{#if course.isFeatured}
														<span class="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">
															Featured
														</span>
													{/if}
												</div>
												<p class="text-sm text-gray-600 mb-2">
													{course.description.length > 100 ? 
														course.description.substring(0, 100) + '...' : 
														course.description}
												</p>
												<div class="flex items-center gap-4 text-sm text-gray-500">
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
														<span class="text-sm text-green-600 font-medium">Published</span>
													{:else}
														<span class="w-2 h-2 bg-gray-400 rounded-full mr-2"></span>
														<span class="text-sm text-gray-500 font-medium">Draft</span>
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
								<svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
								</svg>
								Create New Course
							</Button>
							<Button variant="outline" onclick={() => navigate('/admin/analytics')} class="w-full justify-start">
								<svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
								</svg>
								Content Analytics
							</Button>
							<Button variant="outline" onclick={() => navigate('/courses')} class="w-full justify-start">
								<svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
								</svg>
								Browse Courses
							</Button>
							<Button variant="outline" onclick={() => navigate('/dashboard')} class="w-full justify-start">
								<svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
								</svg>
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
												<p class="font-medium text-sm truncate">{course.title}</p>
												<p class="text-xs text-gray-500">{course.enrolled} students</p>
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
									<div class="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
										<svg class="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
										</svg>
									</div>
								{/if}
								<div>
									<p class="font-medium">{authState.user?.displayName || 'User'}</p>
									<p class="text-sm text-gray-600 capitalize">{authState.user?.role}</p>
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
				<div class="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
					<div class="flex items-start gap-3">
						<svg class="w-5 h-5 text-red-500 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
						</svg>
						<div>
							<h3 class="text-sm font-medium text-red-800">Error</h3>
							<p class="text-sm text-red-700 mt-1">{error}</p>
						</div>
					</div>
				</div>
			{/if}
		</div>
	</div>
{/if}