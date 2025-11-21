<script lang="ts">
	import { navigate } from '$lib/utils/navigation'
	import { CourseService } from '$lib/services/courses'
	import { authState } from '$lib/auth.svelte'
	import { canManageCourses } from '$lib/utils/admin'
	import { Button } from '$lib/components/ui'
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui'
	import { Input } from '$lib/components/ui'
	import AuthGuard from '$lib/components/AuthGuard.svelte'
	import type { Course } from '$lib/types'

	// Form state
	const form = $state({
		title: '',
		description: '',
		category: '',
		difficulty: 'Beginner' as 'Beginner' | 'Intermediate' | 'Advanced',
		duration: '',
		level: 'free' as 'free' | 'premium',
		price: '0',
		currency: 'USD',
		prerequisites: '',
		learningOutcomes: '',
		tags: '',
		thumbnail: 'https://via.placeholder.com/400x225/6366f1/white?text=Course+Thumbnail',
		isPublished: false,
		isFeatured: false
	})

	// State management
	let submitting = $state(false)
	let error = $state<string | null>(null)
	let success = $state(false)

	// Validation
	const isValid = $derived(
		form.title.trim().length > 0 &&
		form.description.trim().length > 0 &&
		form.category.trim().length > 0 &&
		form.duration.trim().length > 0 &&
		(form.level === 'free' || (form.level === 'premium' && parseFloat(form.price) > 0))
	)

	// Categories for selection
	const categories = [
		'Programming',
		'Web Development',
		'Data Science',
		'Machine Learning',
		'Design',
		'Business',
		'Marketing',
		'Photography',
		'Music',
		'Language',
		'Other'
	]

	// Access control check
	$effect(() => {
		if (!authState.initialized) return
		
		if (!authState.user || !canManageCourses(authState.user)) {
			navigate('/dashboard')
		}
	})

	async function handleSubmit(event: SubmitEvent) {
		event.preventDefault()
		await submitForm()
	}

	async function handleButtonClick() {
		await submitForm()
	}

	async function submitForm() {
		if (!authState.user || !isValid || submitting) return

		submitting = true
		error = null
		success = false

		try {
			// Process form data
			const courseData: any = {
				title: form.title.trim(),
				description: form.description.trim(),
				instructor: authState.user.displayName || authState.user.email,
				category: form.category.trim(),
				difficulty: form.difficulty,
				duration: form.duration.trim(),
				thumbnail: form.thumbnail,
				level: form.level,
				tags: form.tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0),
				prerequisites: form.prerequisites.split('\n').map(prereq => prereq.trim()).filter(prereq => prereq.length > 0),
				learningOutcomes: form.learningOutcomes.split('\n').map(outcome => outcome.trim()).filter(outcome => outcome.length > 0),
				isPublished: form.isPublished,
				isFeatured: form.isFeatured,
				lessons: []
			}

			// Add price info for premium courses
			if (form.level === 'premium') {
				courseData.price = parseFloat(form.price) || 0
				courseData.currency = form.currency
			}

			const courseId = await CourseService.createCourse(courseData, authState.user.id)
			
			success = true

			// Redirect to course detail page after a short delay
			setTimeout(() => {
				navigate(`/courses/${courseId}`)
			}, 2000)

		} catch (err: any) {
			error = err.message || 'Failed to create course'
			console.error('Error creating course:', err)
		} finally {
			submitting = false
		}
	}

	function handleCancel() {
		navigate('/admin')
	}

	function handleReset() {
		form.title = ''
		form.description = ''
		form.category = ''
		form.difficulty = 'Beginner'
		form.duration = ''
		form.level = 'free'
		form.price = '0'
		form.prerequisites = ''
		form.learningOutcomes = ''
		form.tags = ''
		form.isPublished = false
		form.isFeatured = false
		error = null
		success = false
	}
</script>

<svelte:head>
	<title>Create Course - Open-EDU Admin</title>
	<meta name="description" content="Create a new course on Open-EDU" />
</svelte:head>

<AuthGuard>
	<div class="min-h-screen bg-gray-50">
		<!-- Header -->
		<div class="bg-white border-b">
			<div class="container mx-auto px-4 py-6">
				<div class="flex items-center justify-between">
					<div>
						<h1 class="text-3xl font-bold">Create New Course</h1>
						<p class="text-gray-600 mt-1">Build an engaging learning experience for your students</p>
					</div>
					<div class="flex gap-3">
						<Button variant="outline" onclick={handleCancel}>
							Cancel
						</Button>
						<Button 
							onclick={handleButtonClick} 
							disabled={!isValid || submitting}
							class="px-6"
						>
							{submitting ? 'Creating...' : 'Create Course'}
						</Button>
								</div>
								</div>
							</div>
		</div>

		<div class="container mx-auto px-4 py-8">
			<div class="max-w-4xl mx-auto">
				<form onsubmit={handleSubmit} class="space-y-8">
					
					<!-- Basic Information -->
					<Card>
						<CardHeader>
							<CardTitle>Basic Information</CardTitle>
						</CardHeader>
						<CardContent class="space-y-6">
							<div>
								<label for="title" class="block text-sm font-medium text-gray-700 mb-2">
									Course Title *
								</label>
								<Input
									id="title"
									bind:value={form.title}
									placeholder="Enter a compelling course title"
									class="w-full"
									required
								/>
								<p class="text-xs text-gray-500 mt-1">Make it clear and descriptive</p>
							</div>

							<div>
								<label for="description" class="block text-sm font-medium text-gray-700 mb-2">
									Course Description *
								</label>
								<textarea
									id="description"
									bind:value={form.description}
									placeholder="Describe what students will learn and achieve..."
									rows="4"
									class="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
									required
								></textarea>
								<p class="text-xs text-gray-500 mt-1">Explain the value and outcomes</p>
							</div>

							<div class="grid grid-cols-1 md:grid-cols-3 gap-6">
								<div>
									<label for="category" class="block text-sm font-medium text-gray-700 mb-2">
										Category *
									</label>
									<select
										id="category"
										bind:value={form.category}
										class="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
										required
									>
										<option value="">Select a category</option>
										{#each categories as category (category)}
											<option value={category}>{category}</option>
										{/each}
									</select>
								</div>

								<div>
									<label for="difficulty" class="block text-sm font-medium text-gray-700 mb-2">
										Difficulty Level *
									</label>
									<select
										id="difficulty"
										bind:value={form.difficulty}
										class="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
									>
										<option value="Beginner">Beginner</option>
										<option value="Intermediate">Intermediate</option>
										<option value="Advanced">Advanced</option>
									</select>
								</div>

								<div>
									<label for="duration" class="block text-sm font-medium text-gray-700 mb-2">
										Duration *
									</label>
									<Input
										id="duration"
										bind:value={form.duration}
										placeholder="e.g., 8 weeks, 20 hours"
										class="w-full"
										required
									/>
								</div>
							</div>

							<div>
								<label for="thumbnail" class="block text-sm font-medium text-gray-700 mb-2">
									Thumbnail URL
								</label>
								<Input
									id="thumbnail"
									bind:value={form.thumbnail}
									placeholder="https://example.com/course-thumbnail.jpg"
									class="w-full"
								/>
								<p class="text-xs text-gray-500 mt-1">Recommended size: 400x225 pixels</p>
								{#if form.thumbnail}
									<img 
										src={form.thumbnail} 
										alt="Course thumbnail preview"
										class="mt-3 w-48 h-27 object-cover rounded-lg border"
										onerror={(e) => {
											const target = e.currentTarget as HTMLImageElement
											target.src = 'https://via.placeholder.com/400x225/6366f1/white?text=Invalid+Image'
										}}
									/>
								{/if}
							</div>
						</CardContent>
					</Card>

					<!-- Course Content -->
					<Card>
						<CardHeader>
							<CardTitle>Course Content</CardTitle>
						</CardHeader>
						<CardContent class="space-y-6">
							<div>
								<label for="learning-outcomes" class="block text-sm font-medium text-gray-700 mb-2">
									Learning Outcomes
								</label>
								<textarea
									id="learning-outcomes"
									bind:value={form.learningOutcomes}
									placeholder="What will students learn? (One outcome per line)
Example:
Build responsive web applications
Master React fundamentals
Deploy to production"
									rows="6"
									class="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
								></textarea>
								<p class="text-xs text-gray-500 mt-1">Enter one learning outcome per line</p>
							</div>

							<div>
								<label for="prerequisites" class="block text-sm font-medium text-gray-700 mb-2">
									Prerequisites
								</label>
								<textarea
									id="prerequisites"
									bind:value={form.prerequisites}
									placeholder="What should students know before taking this course? (One prerequisite per line)
Example:
Basic HTML/CSS knowledge
JavaScript fundamentals
Familiarity with command line"
									rows="4"
									class="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
								></textarea>
								<p class="text-xs text-gray-500 mt-1">Enter one prerequisite per line</p>
							</div>

							<div>
								<label for="tags" class="block text-sm font-medium text-gray-700 mb-2">
									Tags
								</label>
								<Input
									id="tags"
									bind:value={form.tags}
									placeholder="react, javascript, frontend, web development"
									class="w-full"
								/>
								<p class="text-xs text-gray-500 mt-1">Separate tags with commas</p>
							</div>
						</CardContent>
					</Card>

					<!-- Pricing & Settings -->
					<Card>
						<CardHeader>
							<CardTitle>Pricing & Settings</CardTitle>
						</CardHeader>
						<CardContent class="space-y-6">
							<fieldset>
								<legend class="block text-sm font-medium text-gray-700 mb-3">Course Type</legend>
								<div class="flex gap-4">
									<label class="flex items-center gap-2">
										<input
											type="radio"
											bind:group={form.level}
											value="free"
											class="text-blue-600 focus:ring-blue-500"
										/>
										<span>Free Course</span>
									</label>
									<label class="flex items-center gap-2">
										<input
											type="radio"
											bind:group={form.level}
											value="premium"
											class="text-blue-600 focus:ring-blue-500"
										/>
										<span>Premium Course</span>
									</label>
								</div>
							</fieldset>

							{#if form.level === 'premium'}
								<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
									<div>
										<label for="price" class="block text-sm font-medium text-gray-700 mb-2">
											Price
										</label>
										<Input
											id="price"
											type="number"
											bind:value={form.price}
											min="0"
											step="0.01"
											placeholder="0.00"
											class="w-full"
										/>
									</div>
									<div>
										<label for="currency" class="block text-sm font-medium text-gray-700 mb-2">
											Currency
										</label>
										<select
											id="currency"
											bind:value={form.currency}
											class="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
										>
											<option value="USD">USD ($)</option>
											<option value="EUR">EUR (€)</option>
											<option value="GBP">GBP (£)</option>
										</select>
									</div>
								</div>
							{/if}

							<div class="space-y-4">
								<label class="flex items-center gap-3">
									<input
										type="checkbox"
										bind:checked={form.isPublished}
										class="text-blue-600 focus:ring-blue-500"
									/>
									<div>
										<span class="font-medium">Publish immediately</span>
										<p class="text-sm text-gray-600">Make this course visible to students</p>
									</div>
								</label>

								<label class="flex items-center gap-3">
									<input
										type="checkbox"
										bind:checked={form.isFeatured}
										class="text-blue-600 focus:ring-blue-500"
									/>
									<div>
										<span class="font-medium">Feature this course</span>
										<p class="text-sm text-gray-600">Highlight in featured courses section</p>
									</div>
								</label>
							</div>
						</CardContent>
					</Card>

					<!-- Action Buttons -->
					<Card>
						<CardContent class="p-6">
							<div class="flex items-center justify-between">
								<div class="flex gap-3">
									<Button variant="outline" onclick={handleCancel}>
										Cancel
									</Button>
									<Button variant="outline" onclick={handleReset}>
										Reset Form
									</Button>
								</div>
								<Button 
									type="submit" 
									disabled={!isValid || submitting}
									class="px-8"
								>
									{submitting ? 'Creating Course...' : 'Create Course'}
								</Button>
							</div>
						</CardContent>
					</Card>
				</form>

				<!-- Success Message -->
				{#if success}
					<div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
						<Card class="max-w-md w-full mx-4">
							<CardContent class="p-8 text-center">
								<div class="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
									<svg class="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
									</svg>
								</div>
								<h3 class="text-lg font-semibold mb-2">Course Created Successfully!</h3>
								<p class="text-gray-600">Redirecting to course page...</p>
							</CardContent>
						</Card>
					</div>
				{/if}

				<!-- Error Display -->
				{#if error}
					<div class="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
						<div class="flex items-start gap-3">
							<svg class="w-5 h-5 text-red-500 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
							</svg>
							<div>
								<h3 class="text-sm font-medium text-red-800">Error Creating Course</h3>
								<p class="text-sm text-red-700 mt-1">{error}</p>
							</div>
						</div>
					</div>
				{/if}
			</div>
		</div>
	</div>
</AuthGuard>