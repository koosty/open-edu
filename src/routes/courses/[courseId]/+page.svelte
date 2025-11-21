<script lang="ts">
	import { page } from '$app/stores'
	import { onMount } from 'svelte'
	import { navigate } from '$lib/utils/navigation'
	import { CourseService } from '$lib/services/courses'
	import { EnrollmentService } from '$lib/services/enrollment'
	import { authState } from '$lib/auth.svelte'
	import { canManageCourses } from '$lib/utils/admin'
	import { Button } from '$lib/components/ui'
	import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '$lib/components/ui'
	import type { Course, Enrollment } from '$lib/types'
	import Loading from '$lib/components/Loading.svelte'

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
				<h2 class="text-2xl font-bold text-red-600 mb-4">Error</h2>
				<p class="text-gray-600 mb-6">{error}</p>
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
				<h2 class="text-2xl font-bold mb-4">Course Not Found</h2>
				<p class="text-gray-600 mb-6">The course you're looking for doesn't exist.</p>
				<Button onclick={() => navigate('/courses')}>
					Back to Courses
				</Button>
			</CardContent>
		</Card>
	</div>
{:else}
	<div class="container mx-auto px-4 py-8">
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
						target.src = 'https://via.placeholder.com/400x225/6366f1/white?text=Course'
					}}
					/>
				</div>

				<!-- Course Info -->
				<div class="lg:w-2/3">
					<div class="flex items-center gap-2 mb-3">
						<span class="px-3 py-1 bg-blue-100 text-blue-800 text-sm font-medium rounded-full">
							{course.category}
						</span>
						<span class="px-3 py-1 bg-gray-100 text-gray-800 text-sm font-medium rounded-full">
							{course.difficulty}
						</span>
						{#if course.isFeatured}
							<span class="px-3 py-1 bg-yellow-100 text-yellow-800 text-sm font-medium rounded-full">
								Featured
							</span>
						{/if}
					</div>

					<h1 class="text-3xl lg:text-4xl font-bold mb-4">{course.title}</h1>
					<p class="text-gray-600 text-lg mb-6">{course.description}</p>

					<!-- Course Meta -->
					<div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
						<div class="flex items-center gap-2">
							<svg class="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
							</svg>
							<span class="text-sm text-gray-600">By {course.instructor}</span>
						</div>
						<div class="flex items-center gap-2">
							<svg class="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
							</svg>
							<span class="text-sm text-gray-600">{formatDuration(course.duration)}</span>
						</div>
						<div class="flex items-center gap-2">
							<svg class="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
							</svg>
							<span class="text-sm text-gray-600">{course.enrolled} enrolled</span>
						</div>
					</div>

					<!-- Rating -->
					{#if course.rating > 0}
						<div class="flex items-center gap-2 mb-6">
							<div class="flex items-center">
							{#each Array(5) as _, i (i)}
								<svg 
									class="w-5 h-5 {i < Math.floor(course.rating) ? 'text-yellow-400' : 'text-gray-300'}" 
									fill="currentColor" 
									viewBox="0 0 20 20"
								>
									<path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
								</svg>
							{/each}
							</div>
							<span class="text-sm text-gray-600">
								{course.rating.toFixed(1)} ({course.ratingCount} reviews)
							</span>
						</div>
					{/if}

					<!-- Price and Enrollment -->
					<div class="flex items-center justify-between">
						<div class="text-2xl font-bold text-green-600">
							{formatPrice(course)}
						</div>
						
						<div class="flex gap-3">
							{#if canEditCourse}
								<Button 
									variant="outline"
									onclick={() => navigate(`/admin/courses/${courseId}`)}
								>
									<svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
									</svg>
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
									<svg class="w-5 h-5 text-green-500 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
									</svg>
									<span class="text-gray-700">{outcome}</span>
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
							<div class="space-y-3">
							{#each sortedLessons as lesson (lesson.id)}
								<div class="flex items-center gap-3 p-3 border rounded-lg">
									<div class="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-sm font-medium">
										{lesson.order || sortedLessons.indexOf(lesson) + 1}
									</div>
									<div class="flex-1">
										<h4 class="font-medium">{lesson.title}</h4>
										{#if lesson.description}
											<p class="text-sm text-gray-600">{lesson.description}</p>
										{/if}
									</div>
									<div class="flex items-center gap-2 text-sm text-gray-500">
										{#if lesson.duration}
											<span>{lesson.duration} min</span>
										{/if}
										<span class="capitalize">{lesson.type}</span>
										{#if lesson.isRequired}
											<span class="px-2 py-1 bg-red-100 text-red-600 text-xs rounded">Required</span>
										{/if}
									</div>
								</div>
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
							<span class="text-gray-600">Level:</span>
							<span class="font-medium capitalize">{course.level}</span>
						</div>
						<div class="flex justify-between items-center">
							<span class="text-gray-600">Duration:</span>
							<span class="font-medium">{formatDuration(course.duration)}</span>
						</div>
						<div class="flex justify-between items-center">
							<span class="text-gray-600">Lessons:</span>
							<span class="font-medium">{course.lessons?.length || 0}</span>
						</div>
						<div class="flex justify-between items-center">
							<span class="text-gray-600">Enrolled:</span>
							<span class="font-medium">{course.enrolled}</span>
						</div>
						{#if course.prerequisites?.length}
							<div>
								<span class="text-gray-600 block mb-2">Prerequisites:</span>
								<ul class="text-sm space-y-1">
								{#each course.prerequisites as prereq (prereq)}
									<li class="flex items-start gap-2">
										<span class="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 shrink-0"></span>
										<span>{prereq}</span>
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
								<span class="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-full">
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
{/if}