<!-- Course catalog page for Open-EDU v1.1.0 -->
<!-- Based on CourseCatalog.tsx template with Svelte 5 implementation -->

<script lang="ts">
	import { onMount } from 'svelte'
	import { page } from '$app/stores'
	import { goto } from '$app/navigation'
	import { Search, Users, Clock, Star } from 'lucide-svelte'
	
	import Button from '$lib/components/ui/Button.svelte'
	import Input from '$lib/components/ui/Input.svelte'
	import Card from '$lib/components/ui/Card.svelte'
	import CardContent from '$lib/components/ui/CardContent.svelte'
	import CardFooter from '$lib/components/ui/CardFooter.svelte'
	import CardHeader from '$lib/components/ui/CardHeader.svelte'
	
	import { CourseService } from '$lib/services/courses'
	import type { Course } from '$lib/types'
	import type { CourseFilter, CourseSort, Pagination } from '$lib/validation/course'

	// Reactive state
	let courses: Course[] = $state([])
	let loading = $state(false)
	let error = $state<string | null>(null)
	
	// Search and filter state
	let searchQuery = $state('')
	let selectedCategory = $state('all')
	let selectedDifficulty = $state('all')
	let selectedLevel = $state('all')
	
	// Pagination state
	let currentPage = $state(1)
	let totalCourses = $state(0)
	let hasMore = $state(false)
	
	// Filter options
	const categories = [
		'all', 'Programming', 'Web Development', 'Data Science', 
		'Design', 'Marketing', 'Business', 'Artificial Intelligence'
	]
	
	const difficulties = ['all', 'Beginner', 'Intermediate', 'Advanced']
	const levels = ['all', 'free', 'premium']
	
	// Load courses with current filters
	async function loadCourses() {
		loading = true
		error = null
		
		try {
			const filters: CourseFilter = {
				search: searchQuery || undefined,
				category: selectedCategory !== 'all' ? selectedCategory : undefined,
				difficulty: selectedDifficulty !== 'all' ? selectedDifficulty as any : undefined,
				level: selectedLevel !== 'all' ? selectedLevel as any : undefined,
				isPublished: true
			}
			
			const sort: CourseSort = { field: 'rating', direction: 'desc' }
			const pagination: Pagination = { page: currentPage, limit: 12 }
			
			const result = await CourseService.getCourses(filters, sort, pagination)
			
			courses = result.courses
			totalCourses = result.total
			hasMore = result.hasMore
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to load courses'
			console.error('Error loading courses:', err)
		} finally {
			loading = false
		}
	}
	
	// Clear all filters
	function clearFilters() {
		searchQuery = ''
		selectedCategory = 'all'
		selectedDifficulty = 'all'
		selectedLevel = 'all'
		currentPage = 1
	}
	
	// Handle search input with debounce
	let searchTimeout: NodeJS.Timeout
	function handleSearchInput() {
		clearTimeout(searchTimeout)
		searchTimeout = setTimeout(() => {
			currentPage = 1
			loadCourses()
		}, 300)
	}
	
	// Handle filter changes
	function handleFilterChange() {
		currentPage = 1
		loadCourses()
	}
	
	// Get difficulty badge color
	function getDifficultyColor(difficulty: string): string {
		switch (difficulty) {
			case 'Beginner': return 'bg-green-100 text-green-800'
			case 'Intermediate': return 'bg-yellow-100 text-yellow-800'
			case 'Advanced': return 'bg-red-100 text-red-800'
			default: return 'bg-gray-100 text-gray-800'
		}
	}
	
	// Format enrollment count
	function formatEnrollmentCount(count: number): string {
		if (count >= 1000000) {
			return `${(count / 1000000).toFixed(1)}M`
		} else if (count >= 1000) {
			return `${(count / 1000).toFixed(1)}K`
		}
		return count.toString()
	}
	
	// Navigate to course detail
	function viewCourse(courseId: string) {
		goto(`/courses/${courseId}`)
	}
	
	// Load courses on mount and when filters change
	onMount(() => {
		loadCourses()
	})
</script>

<svelte:head>
	<title>Course Catalog - Open-EDU</title>
	<meta name="description" content="Explore thousands of courses taught by industry experts. Learn new skills and advance your career." />
</svelte:head>

<div class="container mx-auto px-4 py-8">
	<!-- Hero Section -->
	<div class="mb-12 text-center">
		<h1 class="text-4xl font-bold text-gray-900 mb-4">Explore Our Course Catalog</h1>
		<p class="text-lg text-gray-600 max-w-2xl mx-auto">
			Discover thousands of courses taught by industry experts. Learn new skills and advance your career.
		</p>
	</div>

	<!-- Search and Filters -->
	<div class="mb-8 space-y-4">
		<!-- Search Bar -->
		<div class="relative">
			<Search class="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
			<Input
				type="text"
				placeholder="Search courses..."
				bind:value={searchQuery}
				oninput={handleSearchInput}
				class="pl-10"
			/>
		</div>

		<!-- Filter Controls -->
		<div class="flex flex-wrap gap-4">
			<!-- Category Filter -->
			<select 
				bind:value={selectedCategory} 
				onchange={handleFilterChange}
				class="px-3 py-2 border border-gray-300 rounded-md bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
			>
				{#each categories as category (category)}
					<option value={category}>
						{category === 'all' ? 'All Categories' : category}
					</option>
				{/each}
			</select>

			<!-- Difficulty Filter -->
			<select 
				bind:value={selectedDifficulty} 
				onchange={handleFilterChange}
				class="px-3 py-2 border border-gray-300 rounded-md bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
			>
				{#each difficulties as difficulty (difficulty)}
					<option value={difficulty}>
						{difficulty === 'all' ? 'All Levels' : difficulty}
					</option>
				{/each}
			</select>

			<!-- Level Filter -->
			<select 
				bind:value={selectedLevel} 
				onchange={handleFilterChange}
				class="px-3 py-2 border border-gray-300 rounded-md bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
			>
				{#each levels as level (level)}
					<option value={level}>
						{level === 'all' ? 'All Types' : level === 'free' ? 'Free' : 'Premium'}
					</option>
				{/each}
			</select>

			<!-- Clear Filters Button -->
			{#if searchQuery || selectedCategory !== 'all' || selectedDifficulty !== 'all' || selectedLevel !== 'all'}
				<Button variant="outline" onclick={clearFilters}>
					Clear Filters
				</Button>
			{/if}
		</div>
	</div>

	<!-- Results Count -->
	<div class="mb-6">
		<p class="text-gray-600">
			{#if loading}
				Loading courses...
			{:else}
				Showing {courses.length} {courses.length === 1 ? 'course' : 'courses'}
			{/if}
		</p>
	</div>

	<!-- Error Message -->
	{#if error}
		<div class="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
			<p class="text-red-800">{error}</p>
			<Button variant="outline" onclick={loadCourses} class="mt-2">
				Try Again
			</Button>
		</div>
	{/if}

	<!-- Course Grid -->
	{#if loading}
		<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
			{#each Array(6) as _, index (index)}
				<div class="animate-pulse">
					<Card class="h-full">
						<CardHeader class="p-0">
							<div class="aspect-video bg-gray-200 rounded-t-lg"></div>
						</CardHeader>
						<CardContent class="pt-4">
							<div class="space-y-2">
								<div class="h-4 bg-gray-200 rounded w-3/4"></div>
								<div class="h-3 bg-gray-200 rounded w-1/2"></div>
								<div class="h-3 bg-gray-200 rounded w-2/3"></div>
							</div>
						</CardContent>
					</Card>
				</div>
			{/each}
		</div>
	{:else if courses.length > 0}
		<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
			{#each courses as course (course.id)}
				<button
					onclick={() => viewCourse(course.id)}
					class="text-left focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-lg"
				>
					<Card class="h-full hover:shadow-lg transition-shadow duration-200">
						<CardHeader class="p-0">
							<div class="aspect-video overflow-hidden rounded-t-lg">
								<img 
									src={course.thumbnail} 
									alt={course.title}
									class="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
									loading="lazy"
								/>
							</div>
						</CardHeader>
						
						<CardContent class="pt-4">
							<!-- Category and Difficulty Badges -->
							<div class="flex items-center gap-2 mb-2">
								<span class="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded">
									{course.category}
								</span>
								<span class="px-2 py-1 text-xs font-medium rounded {getDifficultyColor(course.difficulty)}">
									{course.difficulty}
								</span>
								{#if course.level === 'premium'}
									<span class="px-2 py-1 bg-purple-100 text-purple-800 text-xs font-medium rounded">
										Premium
									</span>
								{/if}
							</div>
							
							<!-- Course Title -->
							<h3 class="text-lg font-semibold text-gray-900 mb-2 line-clamp-2">
								{course.title}
							</h3>
							
							<!-- Course Description -->
							<p class="text-gray-600 text-sm line-clamp-2 mb-4">
								{course.description}
							</p>
							
							<!-- Instructor -->
							<p class="text-sm font-medium text-gray-700 mb-3">
								{course.instructor}
							</p>
						</CardContent>
						
						<CardFooter class="flex items-center justify-between text-sm text-gray-600 pt-0">
							<!-- Rating -->
							<div class="flex items-center gap-1">
								<Star class="h-4 w-4 fill-yellow-400 text-yellow-400" />
								<span class="font-medium">{course.rating}</span>
								<span class="text-gray-500">({course.ratingCount})</span>
							</div>
							
							<!-- Enrollment Count -->
							<div class="flex items-center gap-1">
								<Users class="h-4 w-4" />
								<span>{formatEnrollmentCount(course.enrolled)}</span>
							</div>
							
							<!-- Duration -->
							<div class="flex items-center gap-1">
								<Clock class="h-4 w-4" />
								<span>{course.duration}</span>
							</div>
						</CardFooter>
					</Card>
				</button>
			{/each}
		</div>

		<!-- Load More Button -->
		{#if hasMore}
			<div class="text-center mt-8">
				<Button 
					onclick={() => { currentPage++; loadCourses(); }}
					disabled={loading}
					class="px-8"
				>
					{loading ? 'Loading...' : 'Load More Courses'}
				</Button>
			</div>
		{/if}
	{:else}
		<!-- No Results -->
		<div class="text-center py-12">
			<div class="max-w-md mx-auto">
				<div class="mb-4">
					<Search class="h-16 w-16 text-gray-400 mx-auto" />
				</div>
				<h3 class="text-lg font-semibold text-gray-900 mb-2">No courses found</h3>
				<p class="text-gray-600 mb-4">
					We couldn't find any courses matching your criteria. Try adjusting your filters or search terms.
				</p>
				<Button variant="outline" onclick={clearFilters}>
					Clear all filters
				</Button>
			</div>
		</div>
	{/if}
</div>

<style>
	.line-clamp-2 {
		display: -webkit-box;
		line-clamp: 2;
		-webkit-line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}
	
	.animate-pulse {
		animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
	}
	
	@keyframes pulse {
		0%, 100% {
			opacity: 1;
		}
		50% {
			opacity: .5;
		}
	}
</style>