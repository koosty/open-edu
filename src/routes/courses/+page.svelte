<!-- Course catalog page for Open-EDU v1.1.0 -->
<!-- Based on CourseCatalog.tsx template with Svelte 5 implementation -->

<script lang="ts">
	import { onMount } from 'svelte'
	import { page } from '$app/stores'
	import { navigate } from '$lib/utils/navigation'
	import { browser } from '$app/environment'
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
	// State tracking
	let isInitialized = $state(false)
	
	// Search and filter state
	let searchInput = $state('') // For the input field
	let searchQuery = $state('') // For the actual search execution
	let selectedCategories = $state<string[]>([]) // Multiple category selection
	let selectedDifficulties = $state<('Beginner' | 'Intermediate' | 'Advanced')[]>([]) // Multiple difficulty selection  
	let selectedLevels = $state<('free' | 'premium')[]>([]) // Multiple level selection
	
	// Modal states
	let showCategoryModal = $state(false)
	let showDifficultyModal = $state(false)
	let showLevelModal = $state(false)
	
	// Pagination state
	let currentPage = $state(1)
	let totalCourses = $state(0)
	let hasMore = $state(false)
	
	// Debounce timers
	let searchDebounceTimer: NodeJS.Timeout
	let urlUpdateTimer: NodeJS.Timeout
	
	// Flag to prevent URL effect from running during manual filter changes
	let isManualFilterChange = false
	
	// Filter options (excluding 'all' since we'll use checkboxes)
	const categories = [
		'Programming', 'Web Development', 'Data Science', 
		'Design', 'Marketing', 'Business', 'Artificial Intelligence'
	]
	
	const difficulties = ['Beginner', 'Intermediate', 'Advanced'] as const
	const levels = ['free', 'premium'] as const
	
	// Derived filter counts and labels  
	const activeFilterCount = $derived(() => {
		return selectedCategories.length + selectedDifficulties.length + selectedLevels.length
	})
	
	// Enhanced courses with computed properties
	const enhancedCourses = $derived(() => {
		return courses.map(course => ({
			...course,
			difficultyColor: course.difficulty === 'Beginner' 
				? 'bg-green-100 text-green-800'
				: course.difficulty === 'Intermediate'
				? 'bg-yellow-100 text-yellow-800'
				: 'bg-red-100 text-red-800',
			formattedEnrollment: formatEnrollmentCount(course.enrolled || 0)
		}))
	})
	
	// Helper to get URL search params
	function urlParams() {
		return new URLSearchParams(browser ? window.location.search : '')
	}
	
	// Computed active filters state
	const hasActiveFilters = $derived(() => 
		searchQuery || selectedCategories.length > 0 || selectedDifficulties.length > 0 || selectedLevels.length > 0
	)
	
	// Initialize filters from URL parameters
	function initializeFiltersFromURL() {
		if (!browser) return
		
		const params = urlParams()
		searchInput = params.get('q') || ''
		searchQuery = params.get('q') || ''
		
		// Parse comma-separated filter values
		const categoryParam = params.get('categories')
		selectedCategories = categoryParam ? categoryParam.split(',') : []
		
		const difficultyParam = params.get('difficulties') 
		selectedDifficulties = difficultyParam ? difficultyParam.split(',') as ('Beginner' | 'Intermediate' | 'Advanced')[] : []
		
		const levelParam = params.get('levels')
		selectedLevels = levelParam ? levelParam.split(',') as ('free' | 'premium')[] : []
		
		currentPage = parseInt(params.get('page') || '1')
	}
	
	// Debounced URL update function
	function updateURL(immediate = false) {
		if (!browser) return
		
		if (immediate) {
			// Update URL immediately for filter changes
			performURLUpdate()
		} else {
			// Debounce for search input changes
			clearTimeout(urlUpdateTimer)
			urlUpdateTimer = setTimeout(performURLUpdate, 300)
		}
	}
	
	function performURLUpdate() {
		const url = new URL($page.url)
		const params = url.searchParams
		
		// Update search params
		if (searchQuery.trim()) {
			params.set('q', searchQuery.trim())
		} else {
			params.delete('q')
		}
		
		if (selectedCategories.length > 0) {
			params.set('categories', selectedCategories.join(','))
		} else {
			params.delete('categories')
		}
		
		if (selectedDifficulties.length > 0) {
			params.set('difficulties', selectedDifficulties.join(','))
		} else {
			params.delete('difficulties')
		}
		
		if (selectedLevels.length > 0) {
			params.set('levels', selectedLevels.join(','))
		} else {
			params.delete('levels')
		}
		
		if (currentPage > 1) {
			params.set('page', currentPage.toString())
		} else {
			params.delete('page')
		}
		
		// Update URL without triggering a page reload
		navigate(url.pathname + url.search, { 
			replaceState: true,
			noScroll: true,
			keepFocus: true
		})
	}
	
	// Load courses with current filters
	async function loadCourses() {
		loading = true
		error = null
		
		try {
			const filters: CourseFilter = {
				categories: selectedCategories.length > 0 ? selectedCategories : undefined,
				difficulties: selectedDifficulties.length > 0 ? selectedDifficulties : undefined,
				levels: selectedLevels.length > 0 ? selectedLevels : undefined,
				isPublished: true
			}
			
			const sort: CourseSort = { field: 'rating', direction: 'desc' }
			const pagination: Pagination = { page: currentPage, limit: 12 }
			
			const result = await CourseService.getCourses(filters, sort, pagination)
			
			courses = result.courses
			totalCourses = result.total
			hasMore = result.hasMore
		} catch (err) {
			const errorMessage = err instanceof Error ? err.message : 'Failed to load courses'
			// Enhanced error handling - check for specific error types
			if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
				error = 'Network connection error. Please check your internet connection and try again.'
			} else if (errorMessage.includes('timeout')) {
				error = 'Request timed out. Please try again.'
			} else {
				error = errorMessage
			}
			console.error('Error loading courses:', err)
		} finally {
			loading = false
		}
	}
	
	// Clear all filters
	function clearFilters() {
		searchInput = ''
		searchQuery = ''
		selectedCategories = []
		selectedDifficulties = []
		selectedLevels = []
		currentPage = 1
		updateURL(true) // Immediate URL update
		loadCourses()
	}
	
	// Handle search execution (button click or Enter key)
	function handleSearch() {
		searchQuery = searchInput.trim()
		currentPage = 1
		updateURL(true) // Immediate URL update
		loadCourses()
	}
	
	// Handle Enter key in search input
	function handleSearchKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter') {
			event.preventDefault()
			handleSearch()
		}
	}
	
	// Handle input changes with debounce
	function handleSearchInput(event: Event) {
		const target = event.target as HTMLInputElement
		searchInput = target.value
		
		// Debounced search - auto-search after user stops typing
		clearTimeout(searchDebounceTimer)
		searchDebounceTimer = setTimeout(() => {
			if (searchInput.trim() !== searchQuery) {
				handleSearch()
			}
		}, 500)
	}
	
	// Effect for URL changes (browser back/forward navigation)
	$effect(() => {
		if (!browser || !isInitialized || isManualFilterChange) return
		
		const params = urlParams()
		const urlSearch = params.get('q') || ''
		const urlCategories = params.get('categories')?.split(',') || []
		const urlDifficulties = params.get('difficulties')?.split(',') || []
		const urlLevels = params.get('levels')?.split(',') || []
		const urlPage = parseInt(params.get('page') || '1')
		
		// Check if URL parameters differ from current state (browser navigation)
		const arraysEqual = (a: string[], b: string[]) => a.length === b.length && a.every((val, i) => val === b[i])
		
		const needsUpdate = 
			searchQuery !== urlSearch ||
			!arraysEqual(selectedCategories, urlCategories) ||
			!arraysEqual(selectedDifficulties, urlDifficulties) ||
			!arraysEqual(selectedLevels, urlLevels) ||
			currentPage !== urlPage
		
		if (needsUpdate) {
			// Update state to match URL (browser navigation)
			searchInput = urlSearch
			searchQuery = urlSearch
			selectedCategories = urlCategories
			selectedDifficulties = urlDifficulties as ('Beginner' | 'Intermediate' | 'Advanced')[]
			selectedLevels = urlLevels as ('free' | 'premium')[]
			currentPage = urlPage
			loadCourses()
		}
	})

	// Initialize from URL and load courses on mount
	onMount(() => {
		initializeFiltersFromURL()
		loadCourses().then(() => {
			isInitialized = true
		})
		
		// Add global click listener to close dropdowns when clicking outside
		function handleGlobalClick(event: MouseEvent) {
			// Check if click is inside any dropdown button or panel
			const target = event.target as Element
			if (!target.closest('[data-dropdown]')) {
				closeAllModals()
			}
		}
		
		// Add global escape key listener for dropdowns
		function handleKeydown(event: KeyboardEvent) {
			if (event.key === 'Escape') {
				closeAllModals()
			}
		}
		
		document.addEventListener('click', handleGlobalClick)
		document.addEventListener('keydown', handleKeydown)
		
		return () => {
			document.removeEventListener('click', handleGlobalClick)
			document.removeEventListener('keydown', handleKeydown)
		}
	})

	// Functions for handling user interactions
	function handleCategoryChange() {
		isManualFilterChange = true
		currentPage = 1
		updateURL(true) // Immediate URL update
		loadCourses().then(() => {
			// Reset flag after a short delay to allow URL effect to resume
			setTimeout(() => { isManualFilterChange = false }, 100)
		})
	}

	function handleDifficultyChange() {
		isManualFilterChange = true
		currentPage = 1
		updateURL(true) // Immediate URL update
		loadCourses().then(() => {
			setTimeout(() => { isManualFilterChange = false }, 100)
		})
	}

	function handleLevelChange() {
		isManualFilterChange = true
		currentPage = 1
		updateURL(true) // Immediate URL update
		loadCourses().then(() => {
			setTimeout(() => { isManualFilterChange = false }, 100)
		})
	}

	// Modal control functions
	function toggleCategoryModal() {
		showCategoryModal = !showCategoryModal
		showDifficultyModal = false
		showLevelModal = false
	}

	function toggleDifficultyModal() {
		showDifficultyModal = !showDifficultyModal
		showCategoryModal = false
		showLevelModal = false
	}

	function toggleLevelModal() {
		showLevelModal = !showLevelModal
		showCategoryModal = false
		showDifficultyModal = false
	}

	function closeAllModals() {
		showCategoryModal = false
		showDifficultyModal = false
		showLevelModal = false
	}

	// Filter selection functions
	function toggleCategory(category: string) {
		const index = selectedCategories.indexOf(category)
		if (index > -1) {
			selectedCategories = selectedCategories.filter(c => c !== category)
		} else {
			selectedCategories = [...selectedCategories, category]
		}
		handleCategoryChange()
	}

	function toggleDifficulty(difficulty: 'Beginner' | 'Intermediate' | 'Advanced') {
		const index = selectedDifficulties.indexOf(difficulty)
		if (index > -1) {
			selectedDifficulties = selectedDifficulties.filter(d => d !== difficulty)
		} else {
			selectedDifficulties = [...selectedDifficulties, difficulty]
		}
		handleDifficultyChange()
	}

	function toggleLevel(level: 'free' | 'premium') {
		const index = selectedLevels.indexOf(level)
		if (index > -1) {
			selectedLevels = selectedLevels.filter(l => l !== level)
		} else {
			selectedLevels = [...selectedLevels, level]
		}
		handleLevelChange()
	}

	// Handle page change
	function handlePageChange(newPage: number) {
		currentPage = newPage
		updateURL()
		loadCourses()
	}
	
	// Format enrollment count
	function formatEnrollmentCount(count: number | undefined): string {
		if (!count || count === 0) {
			return '0'
		}
		if (count >= 1000000) {
			return `${(count / 1000000).toFixed(1)}M`
		} else if (count >= 1000) {
			return `${(count / 1000).toFixed(1)}K`
		}
		return count.toString()
	}
	
	// Navigate to course detail
	function viewCourse(courseId: string) {
		navigate(`/courses/${courseId}`)
	}
	
	// Handle image loading errors
	function handleImageError(event: Event) {
		const img = event.target as HTMLImageElement
		// Use a placeholder service or create a simple SVG data URL
		img.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjIyNSIgdmlld0JveD0iMCAwIDQwMCAyMjUiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSI0MDAiIGhlaWdodD0iMjI1IiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0xNzUgMTAwSDE4NVYxMTBIMTc1VjEwMFoiIGZpbGw9IiM5Q0EzQUYiLz4KPHA+PGVsbGlwc2UgY3g9IjIwMCIgY3k9IjExMiIgcng9IjUwIiByeT0iMjUiIGZpbGw9IiNEMUQ1REIiLz4KPHA+PHRleHQgeD0iMjAwIiB5PSIxNDAiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZvbnQtZmFtaWx5PSJzYW5zLXNlcmlmIiBmb250LXNpemU9IjE0cHgiIGZpbGw9IiM2QjcyODAiPkNvdXJzZSBJbWFnZTwvdGV4dD4KPC9zdmc+'
	}
</script>

<svelte:head>
	<title>Course Catalog - Open-EDU</title>
	<meta name="description" content="Explore thousands of courses taught by industry experts. Learn new skills and advance your career." />
</svelte:head>

<div class="container mx-auto px-4 py-8">
	<!-- Skip to main content link for accessibility -->
	<a href="#main-content" class="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-gradient-to-r from-primary-600 to-primary-700 text-white px-4 py-2 rounded-lg shadow-lg">
		Skip to main content
	</a>

	<!-- Hero Section -->
	<header class="mb-12 text-center">
		<h1 class="text-4xl font-bold bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent mb-4">
			Explore Our Course Catalog
		</h1>
		<p class="text-lg text-slate-600 max-w-2xl mx-auto">
			Discover thousands of courses taught by industry experts. Learn new skills and advance your career.
		</p>
	</header>

	<!-- Search and Filters Section -->
	<section aria-label="Course search and filters" class="mb-8 space-y-4">
		<!-- Search Bar -->
		<div class="relative flex gap-2">
			<div class="relative flex-1">
				<Search class="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" aria-hidden="true" />
				<Input
					type="text"
					placeholder="Search courses..."
					bind:value={searchInput}
					onkeydown={handleSearchKeydown}
					oninput={handleSearchInput}
					class="pl-10 input"
					aria-label="Search courses"
					role="searchbox"
				/>
			</div>
			<Button onclick={handleSearch} class="px-6 bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800" aria-label="Search courses">
				Search
			</Button>
		</div>

		<!-- Filter Controls -->
		<div class="flex flex-wrap items-center gap-4" role="group" aria-label="Course filters">
			<!-- Category Filter Dropdown -->
			<div class="relative" data-dropdown>
				<Button 
					variant="outline" 
					onclick={toggleCategoryModal}
					class="gap-2 interactive rounded-lg {selectedCategories.length > 0 ? 'bg-primary-50 border-primary-300 text-primary-700' : ''}"
					aria-label="Filter by category"
				>
					{#if selectedCategories.length === 0}
						Category
					{:else if selectedCategories.length === 1}
						{selectedCategories[0]}
					{:else}
						Categories ({selectedCategories.length})
					{/if}
					<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
						<path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd"></path>
					</svg>
				</Button>
				
				{#if showCategoryModal}
					<div class="absolute top-full left-0 mt-2 bg-white rounded-xl shadow-lg border border-slate-200 p-4 min-w-[240px] z-10">
						<div class="space-y-2" role="group" aria-label="Category filter options">
							{#each categories as category (category)}
								<label class="flex items-center space-x-2 cursor-pointer hover:bg-slate-50 p-2 rounded-lg interactive">
									<input 
										type="checkbox" 
										checked={selectedCategories.includes(category)}
										onchange={() => toggleCategory(category)}
										class="h-4 w-4 text-primary-600 focus:ring-primary-500 border-slate-300 rounded"
									/>
									<span class="text-slate-700 text-sm">{category}</span>
								</label>
							{/each}
						</div>
						{#if selectedCategories.length > 0}
							<div class="mt-3 pt-3 border-t border-slate-200">
								<button 
									onclick={() => { selectedCategories = []; handleCategoryChange(); }}
									class="text-sm text-primary-600 hover:text-primary-800 font-medium interactive"
								>
									Clear categories
								</button>
							</div>
						{/if}
					</div>
				{/if}
			</div>
			
			<!-- Difficulty Filter Dropdown -->
			<div class="relative" data-dropdown>
				<Button 
					variant="outline" 
					onclick={toggleDifficultyModal}
					class="gap-2 interactive rounded-lg {selectedDifficulties.length > 0 ? 'bg-primary-50 border-primary-300 text-primary-700' : ''}"
					aria-label="Filter by difficulty"
				>
					{#if selectedDifficulties.length === 0}
						Difficulty
					{:else if selectedDifficulties.length === 1}
						{selectedDifficulties[0]}
					{:else}
						Difficulties ({selectedDifficulties.length})
					{/if}
					<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
						<path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd"></path>
					</svg>
				</Button>
				
				{#if showDifficultyModal}
					<div class="absolute top-full left-0 mt-2 bg-white rounded-xl shadow-lg border border-slate-200 p-4 min-w-[180px] z-10">
						<div class="space-y-2" role="group" aria-label="Difficulty filter options">
							{#each difficulties as difficulty (difficulty)}
								<label class="flex items-center space-x-2 cursor-pointer hover:bg-slate-50 p-2 rounded-lg interactive">
									<input 
										type="checkbox" 
										checked={selectedDifficulties.includes(difficulty)}
										onchange={() => toggleDifficulty(difficulty)}
										class="h-4 w-4 text-primary-600 focus:ring-primary-500 border-slate-300 rounded"
									/>
									<span class="text-slate-700 text-sm">{difficulty}</span>
								</label>
							{/each}
						</div>
						{#if selectedDifficulties.length > 0}
							<div class="mt-3 pt-3 border-t border-slate-200">
								<button 
									onclick={() => { selectedDifficulties = []; handleDifficultyChange(); }}
									class="text-sm text-primary-600 hover:text-primary-800 font-medium interactive"
								>
									Clear difficulties
								</button>
							</div>
						{/if}
					</div>
				{/if}
			</div>
			
			<!-- Level Filter Dropdown -->
			<div class="relative" data-dropdown>
				<Button 
					variant="outline" 
					onclick={toggleLevelModal}
					class="gap-2 interactive rounded-lg {selectedLevels.length > 0 ? 'bg-primary-50 border-primary-300 text-primary-700' : ''}"
					aria-label="Filter by course type"
				>
					{#if selectedLevels.length === 0}
						Type
					{:else if selectedLevels.length === 1}
						{selectedLevels[0] === 'free' ? 'Free' : 'Premium'}
					{:else}
						Types ({selectedLevels.length})
					{/if}
					<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
						<path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd"></path>
					</svg>
				</Button>
				
				{#if showLevelModal}
					<div class="absolute top-full left-0 mt-2 bg-white rounded-xl shadow-lg border border-slate-200 p-4 min-w-[140px] z-10">
						<div class="space-y-2" role="group" aria-label="Type filter options">
							{#each levels as level (level)}
								<label class="flex items-center space-x-2 cursor-pointer hover:bg-slate-50 p-2 rounded-lg interactive">
									<input 
										type="checkbox" 
										checked={selectedLevels.includes(level)}
										onchange={() => toggleLevel(level)}
										class="h-4 w-4 text-primary-600 focus:ring-primary-500 border-slate-300 rounded"
									/>
									<span class="text-slate-700 text-sm">{level === 'free' ? 'Free' : 'Premium'}</span>
								</label>
							{/each}
						</div>
						{#if selectedLevels.length > 0}
							<div class="mt-3 pt-3 border-t border-slate-200">
								<button 
									onclick={() => { selectedLevels = []; handleLevelChange(); }}
									class="text-sm text-primary-600 hover:text-primary-800 font-medium interactive"
								>
									Clear types
								</button>
							</div>
						{/if}
					</div>
				{/if}
			</div>
			
			<!-- Clear All Button -->
			{#if hasActiveFilters()}
				<Button variant="outline" onclick={clearFilters} class="text-slate-600 hover:text-slate-800 interactive rounded-lg">
					Clear all
				</Button>
			{/if}
		</div>
	</section>

	<!-- Results Count -->
	<div class="mb-6" aria-live="polite">
		<p class="text-slate-600 font-medium">
			{#if loading}
				Loading courses...
			{:else}
				Showing {courses.length} {courses.length === 1 ? 'course' : 'courses'}
				{#if totalCourses > courses.length}
					of {totalCourses} total
				{/if}
			{/if}
		</p>
	</div>

	<!-- Error Message -->
	{#if error}
		<div class="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl shadow-sm" role="alert" aria-live="assertive">
			<h3 class="font-semibold text-red-800 mb-2">
				{error.includes('Network') ? 'Connection Error' : 'Loading Error'}
			</h3>
			<p class="text-red-700">{error}</p>
			<Button variant="outline" onclick={loadCourses} class="mt-2 interactive">
				Try Again
			</Button>
		</div>
	{/if}

	<!-- Main Content -->
	<main id="main-content">
		<!-- Course Grid -->
		{#if loading}
			<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" aria-label="Loading course cards">
				{#each Array(6) as _, index (index)}
					<div class="animate-pulse" aria-hidden="true">
						<Card class="h-full card rounded-xl">
							<CardHeader class="p-0">
								<div class="aspect-video bg-slate-200 rounded-t-xl"></div>
							</CardHeader>
							<CardContent class="pt-4">
								<div class="space-y-2">
									<div class="h-4 bg-slate-200 rounded w-3/4"></div>
									<div class="h-3 bg-slate-200 rounded w-1/2"></div>
									<div class="h-3 bg-slate-200 rounded w-2/3"></div>
								</div>
							</CardContent>
						</Card>
					</div>
				{/each}
			</div>
		{:else if enhancedCourses().length > 0}
			<section aria-label="Course results">
				<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
					{#each enhancedCourses() as course (course.id)}
						<article>
							<button
								onclick={() => viewCourse(course.id)}
								class="text-left focus:outline-none focus:ring-2 focus:ring-primary-500 rounded-xl w-full h-full interactive"
								aria-label="View details for {course.title}"
							>
								<Card class="h-full card-hover rounded-xl shadow-sm">
									<CardHeader class="p-0">
										<div class="aspect-video overflow-hidden rounded-t-xl">
											<img 
												src={course.thumbnail} 
												alt=""
												class="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
												loading="lazy"
												onerror={handleImageError}
											/>
										</div>
									</CardHeader>
									
									<CardContent class="pt-4">
										<!-- Category and Difficulty Badges -->
										<div class="flex items-center gap-2 mb-2 flex-wrap" role="group" aria-label="Course tags">
											<span class="px-2 py-1 bg-primary-100 text-primary-800 text-xs font-medium rounded-lg">
												{course.category}
											</span>
											<span class="px-2 py-1 text-xs font-medium rounded-lg {course.difficultyColor === 'bg-green-100 text-green-800' ? 'bg-secondary-100 text-secondary-800' : course.difficultyColor === 'bg-yellow-100 text-yellow-800' ? 'bg-accent-100 text-accent-800' : 'bg-red-100 text-red-800'}">
												{course.difficulty}
											</span>
											{#if course.level === 'premium'}
												<span class="px-2 py-1 bg-gradient-to-r from-purple-100 to-pink-100 text-purple-800 text-xs font-medium rounded-lg">
													Premium
												</span>
											{/if}
										</div>
										
										<!-- Course Title -->
										<h3 class="text-lg font-semibold text-slate-900 mb-2 line-clamp-2">
											{course.title}
										</h3>
										
										<!-- Course Description -->
										<p class="text-slate-600 text-sm line-clamp-2 mb-4">
											{course.description}
										</p>
										
										<!-- Instructor -->
										<p class="text-sm font-medium text-slate-700 mb-3">
											Instructor: {course.instructor}
										</p>
									</CardContent>
									
									<CardFooter class="flex items-center justify-between text-sm text-slate-600 pt-0">
										<!-- Rating -->
										<div class="flex items-center gap-1" aria-label="Rating: {course.rating} out of 5 stars">
											<Star class="h-4 w-4 fill-accent-400 text-accent-400" aria-hidden="true" />
											<span class="font-medium text-slate-900">{course.rating}</span>
											<span class="text-slate-500">({course.ratingCount})</span>
										</div>
										
										<!-- Enrollment Count -->
										<div class="flex items-center gap-1" aria-label="{course.formattedEnrollment} students enrolled">
											<Users class="h-4 w-4" aria-hidden="true" />
											<span>{course.formattedEnrollment}</span>
										</div>
										
										<!-- Duration -->
										<div class="flex items-center gap-1" aria-label="Duration: {course.duration}">
											<Clock class="h-4 w-4" aria-hidden="true" />
											<span>{course.duration}</span>
										</div>
									</CardFooter>
								</Card>
							</button>
						</article>
					{/each}
				</div>

				<!-- Load More Button -->
				{#if hasMore}
					<div class="text-center mt-8">
						<Button 
							onclick={() => handlePageChange(currentPage + 1)}
							disabled={loading}
							class="px-8 bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 interactive"
							aria-label="Load more courses"
						>
							{loading ? 'Loading...' : 'Load More Courses'}
						</Button>
					</div>
				{/if}
			</section>
		{:else}
			<!-- No Results -->
			<section class="text-center py-12" aria-label="No courses found">
				<div class="max-w-md mx-auto">
					<div class="mb-4">
						<Search class="h-16 w-16 text-slate-400 mx-auto" aria-hidden="true" />
					</div>
					<h2 class="text-lg font-semibold text-slate-900 mb-2">No courses found</h2>
					<p class="text-slate-600 mb-4">
						We couldn't find any courses matching your criteria. Try adjusting your filters or search terms.
					</p>
					<Button variant="outline" onclick={clearFilters} class="interactive rounded-lg">
						Clear all filters
					</Button>
				</div>
			</section>
		{/if}
	</main>
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