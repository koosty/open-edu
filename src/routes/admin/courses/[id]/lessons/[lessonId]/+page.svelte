<script lang="ts">
	import { page } from '$app/stores'
	import { goto } from '$app/navigation'
	import { CourseService } from '$lib/services/courses'
	import { authState } from '$lib/auth.svelte'
	import { canManageCourses } from '$lib/utils/admin'
	import { Button } from '$lib/components/ui'
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui'
	import { Input } from '$lib/components/ui'
	import AuthGuard from '$lib/components/AuthGuard.svelte'
	import Loading from '$lib/components/Loading.svelte'
	import MarkdownRenderer from '$lib/components/MarkdownRenderer.svelte'
	import type { Course, Lesson } from '$lib/types'
	
	let courseId = $derived($page.params.id as string)
	let lessonId = $derived($page.params.lessonId as string)
	let isNewLesson = $derived(lessonId === 'new')
	
	// Data
	let course = $state<Course | null>(null)
	let lesson = $state<Lesson | null>(null)
	let loading = $state(true)
	let error = $state<string | null>(null)
	
	// Form state
	let form = $state({
		title: '',
		description: '',
		type: 'lesson' as 'lesson' | 'quiz',
		content: '# Welcome\n\nStart writing your lesson content here using **Markdown**.\n\n## Code Example\n\n```javascript\nconst hello = "world";\nconsole.log(hello);\n```\n\n## Math Formula\n\nThe quadratic formula: $x = \\frac{-b \\pm \\sqrt{b^2-4ac}}{2a}$',
		duration: 30,
		order: 1,
		isRequired: true,
		videoUrl: ''
	})
	
	// UI state
	let submitting = $state(false)
	let success = $state(false)
	let showPreview = $state(true)
	let previewMode = $state<'split' | 'preview' | 'edit'>('split')
	
	// Validation
	let isValid = $derived(
		form.title.trim().length > 0 &&
		form.duration > 0 &&
		(form.type === 'quiz' || form.content.trim().length > 0)
	)
	
	// Load data
	$effect(() => {
		if (!authState.initialized) return
		
		if (!authState.user || !canManageCourses(authState.user)) {
			goto('/dashboard')
			return
		}
		
		loadData()
	})
	
	async function loadData() {
		loading = true
		error = null
		
		try {
			const courseData = await CourseService.getCourse(courseId)
			
			if (!courseData) {
				error = 'Course not found'
				return
			}
			
			course = courseData
			
			if (!isNewLesson) {
				// Find existing lesson
				const existingLesson = courseData.lessons?.find(l => l.id === lessonId)
				
				if (!existingLesson) {
					error = 'Lesson not found'
					return
				}
				
				lesson = existingLesson
				
				// Populate form
				form.title = existingLesson.title
				form.description = existingLesson.description || ''
				form.type = existingLesson.type
				form.content = existingLesson.content || ''
				form.duration = existingLesson.duration || 30
				form.order = existingLesson.order
				form.isRequired = existingLesson.isRequired
				form.videoUrl = existingLesson.videoUrl || ''
			} else {
				// Set default order for new lesson
				form.order = (courseData.lessons?.length || 0) + 1
			}
			
		} catch (err: any) {
			error = err.message || 'Failed to load data'
			console.error('Error loading data:', err)
		} finally {
			loading = false
		}
	}
	
	async function handleSubmit(event: SubmitEvent) {
		event.preventDefault()
		await submitForm()
	}
	
	async function submitForm() {
		if (!authState.user || !isValid || submitting || !course) return
		
		submitting = true
		error = null
		success = false
		
		try {
			const lessonData: Lesson = {
				id: isNewLesson ? `lesson-${Date.now()}` : lessonId,
				courseId: courseId,
				title: form.title.trim(),
				description: form.description.trim(),
				type: form.type,
				content: form.content.trim(),
				duration: form.duration,
				order: form.order,
				isRequired: form.isRequired,
				videoUrl: form.videoUrl.trim() || undefined,
				createdAt: isNewLesson ? new Date().toISOString() : (lesson?.createdAt || new Date().toISOString()),
				updatedAt: new Date().toISOString()
		}
		
		let updatedLessons: Lesson[]
		
		if (isNewLesson) {
			// Add new lesson
			updatedLessons = [...(course.lessons || []), lessonData]
		} else {
			// Update existing lesson
			updatedLessons = (course.lessons || []).map(l => 
				l.id === lessonId ? lessonData : l
			)
		}
		
		// Sort by order
		updatedLessons = updatedLessons.sort((a, b) => a.order - b.order)
		
		// Update course with new lessons
		await CourseService.updateCourse(courseId, { lessons: updatedLessons })
			
			success = true
			
			// Redirect to course edit page
			setTimeout(() => {
				goto(`/admin/courses/${courseId}`)
			}, 1500)
			
		} catch (err: any) {
			error = err.message || `Failed to ${isNewLesson ? 'create' : 'update'} lesson`
			console.error('❌ Error saving lesson:', err)
			console.error('Full error:', err)
		} finally {
			submitting = false
		}
	}
	
	function handleCancel() {
		goto(`/admin/courses/${courseId}`)
	}
	
	function insertMarkdown(syntax: string) {
		const textarea = document.querySelector('textarea[name="content"]') as HTMLTextAreaElement
		if (!textarea) return
		
		const start = textarea.selectionStart
		const end = textarea.selectionEnd
		const selectedText = form.content.substring(start, end)
		
		let insertion = ''
		let cursorOffset = 0
		
		switch (syntax) {
			case 'bold':
				insertion = `**${selectedText || 'bold text'}**`
				cursorOffset = selectedText ? insertion.length : 2
				break
			case 'italic':
				insertion = `*${selectedText || 'italic text'}*`
				cursorOffset = selectedText ? insertion.length : 1
				break
			case 'code':
				insertion = `\`${selectedText || 'code'}\``
				cursorOffset = selectedText ? insertion.length : 1
				break
			case 'codeblock':
				insertion = `\n\`\`\`javascript\n${selectedText || '// Your code here'}\n\`\`\`\n`
				cursorOffset = selectedText ? insertion.length : 15
				break
			case 'heading':
				insertion = `\n## ${selectedText || 'Heading'}\n`
				cursorOffset = selectedText ? insertion.length : 3
				break
			case 'link':
				insertion = `[${selectedText || 'link text'}](url)`
				cursorOffset = selectedText ? insertion.length - 4 : 1
				break
			case 'list':
				insertion = `\n- ${selectedText || 'List item'}\n`
				cursorOffset = selectedText ? insertion.length : 2
				break
		}
		
		form.content = form.content.substring(0, start) + insertion + form.content.substring(end)
		
		// Set cursor position
		setTimeout(() => {
			textarea.focus()
			const newPosition = start + cursorOffset
			textarea.setSelectionRange(newPosition, newPosition)
		}, 0)
	}
</script>

<svelte:head>
	<title>{isNewLesson ? 'Create' : 'Edit'} Lesson - {course?.title || 'Loading...'}</title>
	<meta name="description" content="Edit lesson content" />
</svelte:head>

<AuthGuard>
	{#if loading}
		<div class="flex justify-center items-center min-h-screen">
			<Loading />
		</div>
	{:else if error && !course}
		<div class="min-h-screen bg-slate-50 flex items-center justify-center">
			<Card class="max-w-md shadow-lg">
				<CardContent class="p-8 text-center">
					<h2 class="text-2xl font-bold text-red-600 mb-4">Error</h2>
					<p class="text-slate-600 mb-6">{error}</p>
					<Button onclick={() => goto('/admin')} class="shadow-sm">
						← Back to Admin
					</Button>
				</CardContent>
			</Card>
		</div>
	{:else}
		<div class="min-h-screen bg-slate-50">
			<!-- Header -->
			<div class="bg-white border-b border-slate-200 sticky top-0 z-10 shadow-sm">
				<div class="container mx-auto px-4 py-4">
					<div class="flex items-center justify-between">
						<div>
							<h1 class="text-2xl font-bold text-slate-900">{isNewLesson ? 'Create' : 'Edit'} Lesson</h1>
							<p class="text-sm text-slate-600 mt-1">{course?.title}</p>
						</div>
						<div class="flex gap-3">
							<Button variant="outline" onclick={handleCancel} class="shadow-sm">
								Cancel
							</Button>
							<Button 
								onclick={submitForm} 
								disabled={!isValid || submitting}
								class="px-6 shadow-sm"
							>
								{submitting ? 'Saving...' : isNewLesson ? 'Create Lesson' : 'Save Changes'}
							</Button>
						</div>
					</div>
				</div>
			</div>

			<div class="container mx-auto px-4 py-6">
				<!-- Success Message -->
				{#if success}
					<div class="mb-6 p-5 bg-secondary-50 border border-secondary-200 rounded-xl shadow-sm">
						<div class="flex items-center gap-3">
							<svg class="w-5 h-5 text-secondary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
							</svg>
							<p class="text-secondary-900 font-semibold">Lesson {isNewLesson ? 'created' : 'updated'} successfully! Redirecting...</p>
						</div>
					</div>
				{/if}

				<!-- Error Message -->
				{#if error}
					<div class="mb-6 p-5 bg-red-50 border border-red-200 rounded-xl shadow-sm">
						<div class="flex items-center gap-3">
							<svg class="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
							</svg>
							<p class="text-red-900 font-medium">{error}</p>
						</div>
					</div>
				{/if}

				<form onsubmit={handleSubmit} class="space-y-6">
					<!-- Basic Info -->
					<Card class="shadow-sm">
						<CardHeader>
							<CardTitle>Lesson Information</CardTitle>
						</CardHeader>
						<CardContent class="space-y-6">
							<div>
								<label for="title" class="block text-sm font-semibold text-slate-900 mb-2">
									Lesson Title *
								</label>
								<Input
									id="title"
									bind:value={form.title}
									placeholder="Enter lesson title"
									class="w-full"
									required
								/>
							</div>

							<div>
								<label for="description" class="block text-sm font-semibold text-slate-900 mb-2">
									Description
								</label>
								<textarea
									id="description"
									bind:value={form.description}
									placeholder="Brief description of what students will learn"
									rows="2"
									class="input w-full"
								></textarea>
							</div>

							<div class="grid grid-cols-1 md:grid-cols-3 gap-6">
								<div>
									<label for="type" class="block text-sm font-semibold text-slate-900 mb-2">
										Type *
									</label>
									<select
										id="type"
										bind:value={form.type}
										class="input w-full h-10"
									>
										<option value="lesson">Lesson</option>
										<option value="quiz">Quiz</option>
									</select>
								</div>

								<div>
									<label for="duration" class="block text-sm font-semibold text-slate-900 mb-2">
										Duration (minutes) *
									</label>
									<Input
										id="duration"
										type="number"
										value={form.duration.toString()}
										oninput={(e) => form.duration = parseInt((e.target as HTMLInputElement).value) || 0}
										placeholder="30"
										class="w-full"
										min="1"
										required
									/>
								</div>

								<div>
									<label for="order" class="block text-sm font-semibold text-slate-900 mb-2">
										Order *
									</label>
									<Input
										id="order"
										type="number"
										value={form.order.toString()}
										oninput={(e) => form.order = parseInt((e.target as HTMLInputElement).value) || 0}
										placeholder="1"
										class="w-full"
										min="1"
										required
									/>
								</div>
							</div>

							<div>
								<label for="videoUrl" class="block text-sm font-semibold text-slate-900 mb-2">
									Video URL (optional)
								</label>
								<Input
									id="videoUrl"
									bind:value={form.videoUrl}
									placeholder="https://youtube.com/watch?v=..."
									class="w-full"
								/>
							</div>

							<div>
								<label class="flex items-center gap-2 cursor-pointer">
									<input
										type="checkbox"
										bind:checked={form.isRequired}
										class="w-4 h-4 text-primary-600 rounded focus:ring-primary-500 focus:ring-2"
									/>
									<span class="text-sm font-medium text-slate-900">Required Lesson</span>
								</label>
								<p class="text-xs text-slate-500 mt-1">Students must complete this to progress</p>
							</div>
						</CardContent>
					</Card>

					<!-- Markdown Editor -->
					{#if form.type === 'lesson'}
						<Card class="shadow-sm">
							<CardHeader>
								<div class="flex items-center justify-between">
									<CardTitle>Lesson Content</CardTitle>
									<div class="flex gap-2">
										<Button
											type="button"
											variant={previewMode === 'edit' ? 'default' : 'outline'}
											onclick={() => previewMode = 'edit'}
											class="text-sm shadow-sm"
										>
											Edit
										</Button>
										<Button
											type="button"
											variant={previewMode === 'split' ? 'default' : 'outline'}
											onclick={() => previewMode = 'split'}
											class="text-sm shadow-sm"
										>
											Split
										</Button>
										<Button
											type="button"
											variant={previewMode === 'preview' ? 'default' : 'outline'}
											onclick={() => previewMode = 'preview'}
											class="text-sm shadow-sm"
										>
											Preview
										</Button>
									</div>
								</div>
							</CardHeader>
							<CardContent>
								<!-- Toolbar -->
								<div class="flex flex-wrap gap-2 mb-4 p-3 bg-slate-50 rounded-xl border border-slate-200">
									<button
										type="button"
										onclick={() => insertMarkdown('heading')}
										class="interactive px-3 py-1.5 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 hover:border-primary-300 active:scale-95 text-sm font-medium shadow-sm transition-all"
										title="Heading"
									>
										H2
									</button>
									<button
										type="button"
										onclick={() => insertMarkdown('bold')}
										class="interactive px-3 py-1.5 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 hover:border-primary-300 active:scale-95 text-sm font-bold shadow-sm transition-all"
										title="Bold"
									>
										B
									</button>
									<button
										type="button"
										onclick={() => insertMarkdown('italic')}
										class="interactive px-3 py-1.5 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 hover:border-primary-300 active:scale-95 text-sm italic shadow-sm transition-all"
										title="Italic"
									>
										I
									</button>
									<button
										type="button"
										onclick={() => insertMarkdown('code')}
										class="interactive px-3 py-1.5 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 hover:border-primary-300 active:scale-95 text-sm font-mono shadow-sm transition-all"
										title="Inline Code"
									>
										&lt;/&gt;
									</button>
									<button
										type="button"
										onclick={() => insertMarkdown('codeblock')}
										class="interactive px-3 py-1.5 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 hover:border-primary-300 active:scale-95 text-sm shadow-sm transition-all"
										title="Code Block"
									>
										```
									</button>
									<button
										type="button"
										onclick={() => insertMarkdown('link')}
										class="interactive px-3 py-1.5 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 hover:border-primary-300 active:scale-95 text-sm shadow-sm transition-all"
										title="Link"
									>
										🔗
									</button>
									<button
										type="button"
										onclick={() => insertMarkdown('list')}
										class="interactive px-3 py-1.5 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 hover:border-primary-300 active:scale-95 text-sm shadow-sm transition-all"
										title="List"
									>
										• List
									</button>
								</div>

								<!-- Editor Area -->
								<div class="grid {previewMode === 'split' ? 'grid-cols-2' : 'grid-cols-1'} gap-4">
									<!-- Editor -->
									{#if previewMode !== 'preview'}
										<div>
											<textarea
												name="content"
												bind:value={form.content}
												placeholder="Write your lesson content in Markdown..."
												rows="25"
												class="input w-full font-mono text-sm"
											></textarea>
										</div>
									{/if}

									<!-- Preview -->
									{#if previewMode !== 'edit'}
										<div class="border border-slate-300 rounded-xl p-6 bg-white overflow-auto max-h-[600px] shadow-sm">
											<div class="prose prose-slate max-w-none">
												<MarkdownRenderer content={form.content} />
											</div>
										</div>
									{/if}
								</div>

								<p class="text-xs text-slate-600 mt-3 bg-primary-50/50 p-3 rounded-lg border border-primary-100">
									💡 <span class="font-medium">Tip:</span> Use Markdown syntax for formatting. Supports code highlighting, math formulas, and more!
								</p>
							</CardContent>
						</Card>
					{:else}
						<Card class="shadow-sm">
							<CardContent class="p-8">
								<div class="text-center mb-6">
									<svg class="w-16 h-16 mx-auto text-primary-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
									</svg>
									<h3 class="text-lg font-semibold text-slate-900 mb-2">📋 Create Quiz Content</h3>
									<p class="text-slate-600">This lesson is marked as a Quiz. To add quiz questions:</p>
								</div>

								<div class="bg-primary-50 border border-primary-200 rounded-xl p-6 text-left space-y-4">
									<div class="flex items-start gap-3">
										<span class="flex-shrink-0 w-6 h-6 bg-primary-600 text-white rounded-full flex items-center justify-center text-sm font-bold">1</span>
										<div>
											<p class="font-medium text-slate-900">Save this lesson first</p>
											<p class="text-sm text-slate-600 mt-1">Click "Create Lesson" or "Save Changes" above to create the lesson placeholder</p>
										</div>
									</div>
									
									<div class="flex items-start gap-3">
										<span class="flex-shrink-0 w-6 h-6 bg-primary-600 text-white rounded-full flex items-center justify-center text-sm font-bold">2</span>
										<div>
											<p class="font-medium text-slate-900">Navigate to Quiz Management</p>
											<p class="text-sm text-slate-600 mt-1">After saving, go to <span class="font-mono bg-white px-2 py-0.5 rounded border border-slate-300">Admin → Courses → {course?.title} → Manage Quizzes</span></p>
										</div>
									</div>
									
									<div class="flex items-start gap-3">
										<span class="flex-shrink-0 w-6 h-6 bg-primary-600 text-white rounded-full flex items-center justify-center text-sm font-bold">3</span>
										<div>
											<p class="font-medium text-slate-900">Create quiz and link to this lesson</p>
											<p class="text-sm text-slate-600 mt-1">Use "Create Quiz" button and link it to the lesson you just created</p>
										</div>
									</div>
								</div>

								<div class="mt-6 flex items-center justify-center gap-3">
									<a 
										href="/docs/quiz-creation-guide.md" 
										target="_blank"
										class="text-sm text-primary-600 hover:text-primary-700 font-medium hover:underline"
									>
										📚 View Complete Quiz Creation Guide →
									</a>
								</div>

								<div class="mt-6 p-4 bg-slate-100 border border-slate-200 rounded-lg">
									<p class="text-xs text-slate-600 leading-relaxed">
										<strong>Note:</strong> Quiz lessons serve as navigation placeholders in the course structure. 
										The actual quiz questions are managed separately through the Quiz Management interface, 
										which provides detailed statistics and publishing controls.
									</p>
								</div>
							</CardContent>
						</Card>
					{/if}
				</form>
			</div>
		</div>
	{/if}
</AuthGuard>
