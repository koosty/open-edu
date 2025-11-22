<script lang="ts">
	import { navigate } from '$lib/utils/navigation'
	import { CourseService } from '$lib/services/courses'
	import { authState } from '$lib/auth.svelte'
	import { canManageCourses } from '$lib/utils/admin'
	import { Button, Input, Textarea, Checkbox, Label } from '$lib/components/ui'
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui'
	import * as Select from '$lib/components/ui/select'
	import * as RadioGroup from '$lib/components/ui/radio-group'
	import AuthGuard from '$lib/components/AuthGuard.svelte'


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
	<div class="min-h-screen bg-muted/30">
		<!-- Header -->
		<div class="bg-card border-b border-border">
			<div class="container mx-auto px-4 py-6">
				<div class="flex items-center justify-between">
					<div>
						<h1 class="text-3xl font-bold">Create New Course</h1>
						<p class="text-muted-foreground mt-1">Build an engaging learning experience for your students</p>
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
							<Label for="title" class="mb-2">Course Title *</Label>
							<Input
									id="title"
									bind:value={form.title}
									placeholder="Enter a compelling course title"
									class="w-full"
									required
								/>
								<p class="text-xs text-muted-foreground mt-1">Make it clear and descriptive</p>
							</div>

						<div>
							<Label for="description" class="mb-2">Course Description *</Label>
							<Textarea
									id="description"
									bind:value={form.description}
									placeholder="Describe what students will learn and achieve..."
									rows={4}
									required
								/>
								<p class="text-xs text-muted-foreground mt-1">Explain the value and outcomes</p>
							</div>

						<div class="grid grid-cols-1 md:grid-cols-3 gap-6">
						<div>
							<Label for="category" class="mb-2">Category *</Label>
							<Select.Root type="single" bind:value={form.category} required>
									<Select.Trigger class="w-full">
										{form.category || 'Select a category'}
									</Select.Trigger>
									<Select.Content>
										{#each categories as category (category)}
											<Select.Item value={category} label={category}>{category}</Select.Item>
										{/each}
									</Select.Content>
								</Select.Root>
							</div>

						<div>
							<Label for="difficulty" class="mb-2">Difficulty Level *</Label>
							<Select.Root type="single" bind:value={form.difficulty}>
									<Select.Trigger class="w-full">
										{form.difficulty}
									</Select.Trigger>
									<Select.Content>
										<Select.Item value="Beginner" label="Beginner">Beginner</Select.Item>
										<Select.Item value="Intermediate" label="Intermediate">Intermediate</Select.Item>
										<Select.Item value="Advanced" label="Advanced">Advanced</Select.Item>
									</Select.Content>
								</Select.Root>
							</div>

							<div>
								<Label for="duration" class="mb-2">Duration *</Label>
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
							<Label for="thumbnail" class="mb-2">Thumbnail URL</Label>
							<Input
									id="thumbnail"
									bind:value={form.thumbnail}
									placeholder="https://example.com/course-thumbnail.jpg"
									class="w-full"
								/>
								<p class="text-xs text-muted-foreground mt-1">Recommended size: 400x225 pixels</p>
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
							<Label for="learning-outcomes" class="mb-2">Learning Outcomes</Label>
							<Textarea
									id="learning-outcomes"
									bind:value={form.learningOutcomes}
									placeholder="What will students learn? (One outcome per line)
Example:
Build responsive web applications
Master React fundamentals
Deploy to production"
									rows={6}
									class="font-mono text-sm"
								/>
								<p class="text-xs text-muted-foreground mt-1">Enter one learning outcome per line</p>
							</div>

						<div>
							<Label for="prerequisites" class="mb-2">Prerequisites</Label>
							<Textarea
									id="prerequisites"
									bind:value={form.prerequisites}
									placeholder="What should students know before taking this course? (One prerequisite per line)
Example:
Basic HTML/CSS knowledge
JavaScript fundamentals
Familiarity with command line"
									rows={4}
									class="font-mono text-sm"
								/>
								<p class="text-xs text-muted-foreground mt-1">Enter one prerequisite per line</p>
							</div>

						<div>
							<Label for="tags" class="mb-2">Tags</Label>
							<Input
									id="tags"
									bind:value={form.tags}
									placeholder="react, javascript, frontend, web development"
									class="w-full"
								/>
								<p class="text-xs text-muted-foreground mt-1">Separate tags with commas</p>
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
							<legend class="block text-sm font-medium text-foreground mb-3">Course Type</legend>
							<RadioGroup.Root bind:value={form.level} class="flex gap-4">
								<div class="flex items-center gap-2">
									<RadioGroup.Item value="free" id="free" />
									<Label for="free" class="font-normal cursor-pointer">Free Course</Label>
								</div>
								<div class="flex items-center gap-2">
									<RadioGroup.Item value="premium" id="premium" />
									<Label for="premium" class="font-normal cursor-pointer">Premium Course</Label>
								</div>
							</RadioGroup.Root>
						</fieldset>

							{#if form.level === 'premium'}
								<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
								<div>
									<Label for="price" class="mb-2">Price</Label>
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
								<Label for="currency" class="mb-2">Currency</Label>
								<Select.Root type="single" bind:value={form.currency}>
										<Select.Trigger class="w-full">
											{form.currency === 'USD' ? 'USD ($)' : form.currency === 'EUR' ? 'EUR (€)' : 'GBP (£)'}
										</Select.Trigger>
										<Select.Content>
											<Select.Item value="USD" label="USD ($)">USD ($)</Select.Item>
											<Select.Item value="EUR" label="EUR (€)">EUR (€)</Select.Item>
											<Select.Item value="GBP" label="GBP (£)">GBP (£)</Select.Item>
										</Select.Content>
									</Select.Root>
								</div>
								</div>
							{/if}

							<div class="space-y-4">
								<div class="flex items-start gap-3">
									<Checkbox
										id="is-published"
										bind:checked={form.isPublished}
										class="mt-1"
									/>
									<Label for="is-published" class="cursor-pointer">
										<span class="font-medium">Publish immediately</span>
										<p class="text-sm text-muted-foreground font-normal">Make this course visible to students</p>
									</Label>
								</div>

								<div class="flex items-start gap-3">
									<Checkbox
										id="is-featured"
										bind:checked={form.isFeatured}
										class="mt-1"
									/>
									<Label for="is-featured" class="cursor-pointer">
										<span class="font-medium">Feature this course</span>
										<p class="text-sm text-muted-foreground font-normal">Highlight in featured courses section</p>
									</Label>
								</div>
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
								<div class="w-16 h-16 bg-secondary/10 rounded-full flex items-center justify-center mx-auto mb-4">
									<svg class="w-8 h-8 text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
									</svg>
								</div>
								<h3 class="text-lg font-semibold mb-2">Course Created Successfully!</h3>
								<p class="text-muted-foreground">Redirecting to course page...</p>
							</CardContent>
						</Card>
					</div>
				{/if}

				<!-- Error Display -->
				{#if error}
					<div class="mt-6 p-4 bg-destructive/10 border border-destructive/30 rounded-lg">
						<div class="flex items-start gap-3">
							<svg class="w-5 h-5 text-destructive mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
							</svg>
							<div>
								<h3 class="text-sm font-medium text-destructive">Error Creating Course</h3>
								<p class="text-sm text-destructive/90 mt-1">{error}</p>
							</div>
						</div>
					</div>
				{/if}
			</div>
		</div>
	</div>
</AuthGuard>