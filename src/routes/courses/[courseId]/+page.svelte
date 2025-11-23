<script lang="ts">
	import { page } from '$app/stores'
	import { navigate } from '$lib/utils/navigation'
	import { CourseService } from '$lib/services/courses'
	import { EnrollmentService } from '$lib/services/enrollment'
	import { authState } from '$lib/auth.svelte'
	import { canManageCourses } from '$lib/utils/admin'
	import { Button } from '$lib/components/ui'
	import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '$lib/components/ui'
	import { User, Clock, Users, Star, Edit } from 'lucide-svelte'
	import type { Course, Enrollment } from '$lib/types'
	import Loading from '$lib/components/Loading.svelte'
	import DynamicBreadcrumb from '$lib/components/DynamicBreadcrumb.svelte'

	const courseId = $derived($page.params.courseId as string)
	let course = $state<Course | null>(null)
	let enrollment = $state<Enrollment | null>(null)
	let loading = $state(true)
	let enrolling = $state(false)
	let error = $state<string | null>(null)

	// Derived states
	const isEnrolled = $derived(enrollment !== null)
	const canEnroll = $derived(
		authState.user && 
		course && 
		course.isPublished && 
		!isEnrolled
	)
	const canStartLearning = $derived(
		authState.user && 
		isEnrolled && 
		course?.lessons && course.lessons.length > 0
	)
	const canEditCourse = $derived(
		authState.user && canManageCourses(authState.user)
	)
	// Sorted lessons to prevent mutation in template
	const sortedLessons = $derived(
		course?.lessons ? [...course.lessons].sort((a, b) => a.order - b.order) : []
	)

	// Load course data reactively when auth is initialized
	$effect(() => {
		if (!authState.initialized) {
			return // Wait for auth to initialize
		}
		
		loadCourseData()
	})

	// Separate effect for enrollment check - runs when auth state or course changes
	$effect(() => {
		if (!authState.initialized || !course) {
			return
		}
		
		if (authState.user) {
			loadEnrollmentStatus()
		} else {
			// User not logged in - clear enrollment
			enrollment = null
		}
	})

	async function loadCourseData() {
		loading = true
		error = null

		try {
			// Load course details (public data)
			const courseData = await CourseService.getCourse(courseId)
			if (!courseData) {
				error = 'Course not found'
				return
			}
			course = courseData
		} catch (err: any) {
			error = err.message || 'Failed to load course'
			console.error('Error loading course:', err)
		} finally {
			loading = false
		}
	}

	async function loadEnrollmentStatus() {
		if (!authState.user) return
		
		try {
			const enrollmentData = await EnrollmentService.getEnrollment(authState.user.id, courseId)
			enrollment = enrollmentData
		} catch (err: any) {
			console.error('Error loading enrollment:', err)
			// Don't set error - enrollment check failure shouldn't block viewing course
		}
	}

	async function handleEnroll() {
		if (!authState.user || !canEnroll) return

		enrolling = true
		error = null

		try {
			await EnrollmentService.enrollUser(authState.user.id, courseId)
			
			// Reload enrollment status
			const enrollmentData = await EnrollmentService.getEnrollment(authState.user.id, courseId)
			enrollment = enrollmentData
			
			// Reload course data to get updated enrolled count
			const courseData = await CourseService.getCourse(courseId)
			if (courseData) {
				course = courseData
			}
			
		} catch (err: any) {
			error = err.message || 'Failed to enroll in course'
			console.error('Error enrolling:', err)
		} finally {
			enrolling = false
		}
	}

	function handleStartLearning() {
		if (!course || !course.lessons?.length) return
		
		// Find the first lesson
		const firstLesson = course.lessons.find(lesson => lesson.order === 1) || course.lessons[0]
		if (firstLesson) {
			navigate(`/courses/${courseId}/learn/${firstLesson.id}`)
		}
	}

	function formatDuration(duration: string): string {
		return duration || 'Self-paced'
	}

	function formatPrice(course: Course): string {
		if (course.level === 'free') return 'Free'
		if (course.price && course.currency) {
			return `${course.currency.toUpperCase()} ${course.price}`
		}
		return 'Premium'
	}
</script>

<svelte:head>
	<title>{course?.title || 'Course'} - Open-EDU</title>
	<meta name="description" content={course?.description || 'Open-EDU Course'} />
</svelte:head>

{#if loading}
	<div class="flex justify-center items-center min-h-[50vh]">
		<Loading />
	</div>
{:else if error}
	<div class="container mx-auto px-4 py-8">
		<Card>
			<CardContent class="p-8 text-center">
				<h2 class="text-2xl font-bold text-destructive mb-4">Error</h2>
				<p class="text-muted-foreground mb-6">{error}</p>
				<Button onclick={() => navigate('/courses')}>
					Back to Courses
				</Button>
			</CardContent>
		</Card>
	</div>
{:else if !course}
	<div class="container mx-auto px-4 py-8">
		<Card>
			<CardContent class="p-8 text-center">
				<h2 class="text-2xl font-bold text-foreground mb-4">Course Not Found</h2>
				<p class="text-muted-foreground mb-6">The course you're looking for doesn't exist.</p>
				<Button onclick={() => navigate('/courses')}>
					Back to Courses
				</Button>
			</CardContent>
		</Card>
	</div>
{:else}
	<div class="container mx-auto px-4 py-8">
		<!-- Breadcrumb -->
		<DynamicBreadcrumb 
			items={[
				{ label: 'Courses', href: '/courses' },
				{ label: course.title, current: true }
			]} 
		/>
		
		<!-- Course Header -->
		<div class="mb-8">
			<div class="flex flex-col lg:flex-row gap-8">
				<!-- Course Image -->
				<div class="lg:w-1/3">
					<img 
						src={course.thumbnail} 
					alt={course.title}
					class="w-full aspect-video object-cover rounded-lg shadow-lg"
				onerror={(e) => {
					const target = e.currentTarget as HTMLImageElement
					// Prevent infinite loop by checking if already replaced
					if (target.src !== target.dataset.fallback) {
						// Use a simple SVG data URI as fallback
						target.dataset.fallback = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="225" viewBox="0 0 400 225"%3E%3Crect width="400" height="225" fill="%236366f1"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="18" fill="white"%3ECourse Image%3C/text%3E%3C/svg%3E'
						target.src = target.dataset.fallback
					}
				}}
					/>
				</div>

				<!-- Course Info -->
				<div class="lg:w-2/3">
					<div class="flex items-center gap-2 mb-3">
						<span class="px-3 py-1 bg-primary/10 text-primary text-sm font-medium rounded-full">
							{course.category}
						</span>
						<span class="px-3 py-1 bg-secondary/10 text-secondary-foreground text-sm font-medium rounded-full">
							{course.difficulty}
						</span>
						{#if course.isFeatured}
							<span class="px-3 py-1 bg-accent/10 text-accent-foreground text-sm font-medium rounded-full">
								Featured
							</span>
						{/if}
					</div>

					<h1 class="text-3xl lg:text-4xl font-bold text-foreground mb-4">{course.title}</h1>
					<p class="text-muted-foreground text-lg mb-6">{course.description}</p>

					<!-- Course Meta -->
					<div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
						<div class="flex items-center gap-2">
							<User class="w-5 h-5 text-muted-foreground" />
							<span class="text-sm text-muted-foreground">By {course.instructor}</span>
						</div>
						<div class="flex items-center gap-2">
							<Clock class="w-5 h-5 text-muted-foreground" />
							<span class="text-sm text-muted-foreground">{formatDuration(course.duration)}</span>
						</div>
						<div class="flex items-center gap-2">
							<Users class="w-5 h-5 text-muted-foreground" />
							<span class="text-sm text-muted-foreground">{course.enrolled} enrolled</span>
						</div>
					</div>

					<!-- Rating -->
					{#if course.rating > 0}
						<div class="flex items-center gap-2 mb-6">
							<div class="flex items-center">
							{#each Array(5) as _, i (i)}
								<Star 
									class="w-5 h-5 {i < Math.floor(course.rating) ? 'text-accent-foreground fill-accent-foreground' : 'text-muted fill-muted'}"
								/>
							{/each}
							</div>
							<span class="text-sm text-muted-foreground">
								{course.rating.toFixed(1)} ({course.ratingCount} reviews)
							</span>
						</div>
					{/if}

					<!-- Price and Enrollment -->
					<div class="flex items-center justify-between">
						<div class="text-2xl font-bold text-green-600 dark:text-green-400">
							{formatPrice(course)}
						</div>
						
						<div class="flex gap-3">
							{#if canEditCourse}
								<Button 
									variant="outline"
									onclick={() => navigate(`/admin/courses/${courseId}`)}
								>
									<Edit class="w-4 h-4 mr-2" />
									Edit Course
								</Button>
							{/if}
							{#if !authState.user}
								<Button onclick={() => navigate('/auth/login')}>
									Sign In to Enroll
								</Button>
							{:else if canEnroll}
								<Button 
									onclick={handleEnroll}
									disabled={enrolling}
									class="px-8"
								>
									{enrolling ? 'Enrolling...' : 'Enroll Now'}
								</Button>
							{:else if canStartLearning}
								<Button onclick={handleStartLearning} class="px-8">
									Continue Learning
								</Button>
							{:else if isEnrolled}
								<Button variant="outline" disabled>
									Already Enrolled
								</Button>
							{/if}
						</div>
					</div>
				</div>
			</div>
		</div>

		<div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
			<!-- Main Content -->
			<div class="lg:col-span-2">
				<!-- Learning Outcomes -->
				{#if course.learningOutcomes?.length}
					<Card class="mb-8">
						<CardHeader>
							<CardTitle>What You'll Learn</CardTitle>
						</CardHeader>
						<CardContent>
							<ul class="space-y-3">
							{#each course.learningOutcomes as outcome (outcome)}
								<li class="flex items-start gap-3">
									<svg class="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
									</svg>
									<span class="text-foreground">{outcome}</span>
								</li>
							{/each}
							</ul>
						</CardContent>
					</Card>
				{/if}

				<!-- Course Curriculum -->
				{#if course.lessons?.length}
					<Card class="mb-8">
						<CardHeader>
							<CardTitle>Course Curriculum</CardTitle>
							<CardDescription>
								{course.lessons.length} lesson{course.lessons.length !== 1 ? 's' : ''}
							</CardDescription>
						</CardHeader>
						<CardContent>
							<div class="space-y-2">
							{#each sortedLessons as lesson (lesson.id)}
								<Card class="overflow-hidden hover:shadow-md transition-shadow">
									<CardContent class="p-4">
										<div class="flex items-center gap-3">
											<!-- Lesson Number Badge -->
											<div class="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center text-sm font-semibold text-primary shrink-0">
												{lesson.order || sortedLessons.indexOf(lesson) + 1}
											</div>
											
											<!-- Lesson Info -->
											<div class="flex-1 min-w-0">
												<h4 class="font-semibold text-foreground mb-1">{lesson.title}</h4>
												{#if lesson.description}
													<p class="text-sm text-muted-foreground line-clamp-2">{lesson.description}</p>
												{/if}
											</div>
											
											<!-- Lesson Meta -->
											<div class="flex flex-col sm:flex-row items-end sm:items-center gap-2 text-xs shrink-0">
												{#if lesson.duration}
													<div class="flex items-center gap-1 px-2 py-1 bg-muted rounded-md">
														<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
															<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
														</svg>
														<span class="text-muted-foreground font-medium">{lesson.duration} min</span>
													</div>
												{/if}
												<div class="px-2 py-1 bg-secondary/10 text-secondary-foreground rounded-md capitalize font-medium">
													{lesson.quiz ? 'Quiz' : 'Lesson'}
												</div>
												{#if lesson.isRequired}
													<div class="px-2 py-1 bg-destructive/10 text-destructive rounded-md font-semibold">
														Required
													</div>
												{/if}
											</div>
										</div>
									</CardContent>
								</Card>
							{/each}
							</div>
						</CardContent>
					</Card>
				{/if}
			</div>

			<!-- Sidebar -->
			<div class="lg:col-span-1">
				<!-- Course Information -->
				<Card class="mb-6">
					<CardHeader>
						<CardTitle>Course Details</CardTitle>
					</CardHeader>
					<CardContent class="space-y-4">
						<div class="flex justify-between items-center">
							<span class="text-muted-foreground">Level:</span>
							<span class="font-medium text-foreground capitalize">{course.level}</span>
						</div>
						<div class="flex justify-between items-center">
							<span class="text-muted-foreground">Duration:</span>
							<span class="font-medium text-foreground">{formatDuration(course.duration)}</span>
						</div>
						<div class="flex justify-between items-center">
							<span class="text-muted-foreground">Lessons:</span>
							<span class="font-medium text-foreground">{course.lessons?.length || 0}</span>
						</div>
						<div class="flex justify-between items-center">
							<span class="text-muted-foreground">Enrolled:</span>
							<span class="font-medium text-foreground">{course.enrolled}</span>
						</div>
						{#if course.prerequisites?.length}
							<div>
								<span class="text-muted-foreground block mb-2">Prerequisites:</span>
								<ul class="text-sm space-y-1">
								{#each course.prerequisites as prereq (prereq)}
									<li class="flex items-start gap-2">
										<span class="w-1.5 h-1.5 bg-muted-foreground rounded-full mt-2 shrink-0"></span>
										<span class="text-foreground">{prereq}</span>
									</li>
								{/each}
								</ul>
							</div>
						{/if}
					</CardContent>
				</Card>

				<!-- Tags -->
				{#if course.tags?.length}
					<Card>
						<CardHeader>
							<CardTitle>Tags</CardTitle>
						</CardHeader>
						<CardContent>
							<div class="flex flex-wrap gap-2">
							{#each course.tags as tag (tag)}
								<span class="px-3 py-1 bg-muted text-foreground text-sm rounded-full">
									{tag}
								</span>
							{/each}
							</div>
						</CardContent>
					</Card>
				{/if}
			</div>
		</div>

		<!-- Enrollment Error -->
		{#if error}
			<div class="mt-6 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
				<div class="flex items-start gap-3">
					<svg class="w-5 h-5 text-destructive mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
					</svg>
					<div>
						<h3 class="text-sm font-medium text-destructive">Error</h3>
						<p class="text-sm text-destructive mt-1">{error}</p>
					</div>
				</div>
			</div>
		{/if}
	</div>
{/if}

<style>
	.line-clamp-2 {
		display: -webkit-box;
		-webkit-line-clamp: 2;
		line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}
</style>