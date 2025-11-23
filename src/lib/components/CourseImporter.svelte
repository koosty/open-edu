<script lang="ts">
	import { Button, Input, Label } from '$lib/components/ui'
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui'
	import { parseCourseFile, downloadTemplate, type ImportFormat } from '$lib/utils/course-import'
	import type { CourseImportData } from '$lib/validation/course-import'
	import { CourseService } from '$lib/services/courses'
	import { authState } from '$lib/auth.svelte'
	import { navigate } from '$lib/utils/navigation'

	let fileInput = $state<HTMLInputElement | null>(null)
	let uploading = $state(false)
	let error = $state<string | null>(null)
	let preview = $state<CourseImportData | null>(null)
	let format = $state<ImportFormat | null>(null)

	async function handleFileSelect(e: Event) {
		const input = e.target as HTMLInputElement
		const file = input.files?.[0]
		if (!file) return

		error = null
		preview = null
		format = null

		try {
			const result = await parseCourseFile(file)
			preview = result.data
			format = result.format
		} catch (err: any) {
			error = err.message || 'Failed to parse file'
			console.error('File parsing error:', err)
		}
	}

	async function importCourse() {
		if (!preview || !authState.user) return

		uploading = true
		error = null

		try {
			const courseId = await CourseService.importCourse(
				preview,
				authState.user.id,
				authState.user.displayName || authState.user.email
			)

			// Success! Navigate to course
			navigate(`/courses/${courseId}`)
		} catch (err: any) {
			error = err.message || 'Failed to import course'
			console.error('Import error:', err)
		} finally {
			uploading = false
		}
	}

	function handleDownloadTemplate(templateFormat: ImportFormat) {
		downloadTemplate(templateFormat)
	}

	function clearFile() {
		if (fileInput) {
			fileInput.value = ''
		}
		preview = null
		format = null
		error = null
	}
</script>

<Card>
	<CardHeader>
		<CardTitle>Import Course from File</CardTitle>
	</CardHeader>
	<CardContent class="space-y-4">
		<!-- File Upload -->
		<div>
			<Label for="course-file">Upload JSON or YAML File</Label>
			<div class="flex gap-2 mt-2">
				<Input
					id="course-file"
					type="file"
					accept=".json,.yaml,.yml"
					ref={fileInput}
					onchange={handleFileSelect}
					class="flex-1"
				/>
				{#if preview}
					<Button variant="outline" onclick={clearFile} size="sm">
						Clear
					</Button>
				{/if}
			</div>
			<p class="text-xs text-muted-foreground mt-1">
				Supported formats: .json, .yaml, .yml
			</p>
		</div>

		<!-- Preview -->
		{#if preview}
			<div class="border rounded-lg p-4 bg-muted/30 space-y-3">
				<div class="flex items-center justify-between">
					<h3 class="font-semibold">Preview</h3>
					{#if format}
						<span class="text-xs bg-primary/10 text-primary px-2 py-1 rounded font-medium uppercase">
							{format}
						</span>
					{/if}
				</div>
				
				<div class="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
					<div>
						<p class="text-muted-foreground">Title</p>
						<p class="font-medium">{preview.title}</p>
					</div>
					<div>
						<p class="text-muted-foreground">Category</p>
						<p class="font-medium">{preview.category}</p>
					</div>
					<div>
						<p class="text-muted-foreground">Difficulty</p>
						<p class="font-medium">{preview.difficulty}</p>
					</div>
					<div>
						<p class="text-muted-foreground">Duration</p>
						<p class="font-medium">{preview.duration}</p>
					</div>
				</div>

				<div class="pt-3 border-t space-y-2">
					<div class="flex items-center justify-between text-sm">
						<span class="text-muted-foreground">Total Lessons</span>
						<span class="font-semibold">{preview.lessons.length}</span>
					</div>
				
				{#if preview.lessons.some(l => l.quiz)}
					<div class="flex items-center justify-between text-sm">
						<span class="text-muted-foreground">Quizzes</span>
						<span class="font-semibold text-blue-600">
							{preview.lessons.filter(l => l.quiz).length}
						</span>
					</div>
				{/if}

					{#if preview.level === 'premium' && preview.price}
						<div class="flex items-center justify-between text-sm">
							<span class="text-muted-foreground">Price</span>
							<span class="font-semibold text-green-600">
								{preview.currency} {preview.price}
							</span>
						</div>
					{/if}
				</div>

				<!-- Learning Outcomes Preview -->
				{#if preview.learningOutcomes && preview.learningOutcomes.length > 0}
					<div class="pt-3 border-t">
						<p class="text-sm font-medium mb-2">Learning Outcomes ({preview.learningOutcomes.length})</p>
						<ul class="text-xs text-muted-foreground space-y-1 list-disc list-inside">
							{#each preview.learningOutcomes.slice(0, 3) as outcome}
								<li>{outcome}</li>
							{/each}
							{#if preview.learningOutcomes.length > 3}
								<li class="italic">... and {preview.learningOutcomes.length - 3} more</li>
							{/if}
						</ul>
					</div>
				{/if}
			</div>

			<!-- Import Button -->
			<Button 
				onclick={importCourse} 
				disabled={uploading} 
				class="w-full"
				size="lg"
			>
				{#if uploading}
					<svg class="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
						<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
						<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
					</svg>
					Importing Course...
				{:else}
					Import Course ({format?.toUpperCase()})
				{/if}
			</Button>
		{/if}

		<!-- Error Display -->
		{#if error}
			<div class="p-4 bg-destructive/10 border border-destructive/30 rounded-lg">
				<div class="flex items-start gap-3">
					<svg class="w-5 h-5 text-destructive mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
					</svg>
					<div class="flex-1">
						<h4 class="text-sm font-medium text-destructive mb-1">Import Error</h4>
						<p class="text-sm text-destructive/90">{error}</p>
					</div>
				</div>
			</div>
		{/if}

		<!-- Templates Section -->
		<div class="mt-6 pt-6 border-t">
			<div class="flex items-center justify-between mb-3">
				<div>
					<p class="text-sm font-medium">Need a template?</p>
					<p class="text-xs text-muted-foreground">Download a pre-filled example to get started</p>
				</div>
			</div>
			<div class="flex gap-2">
				<Button 
					variant="outline" 
					size="sm" 
					onclick={() => handleDownloadTemplate('json')}
					class="flex-1"
				>
					<svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
					</svg>
					JSON Template
				</Button>
				<Button 
					variant="outline" 
					size="sm" 
					onclick={() => handleDownloadTemplate('yaml')}
					class="flex-1"
				>
					<svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
					</svg>
					YAML Template
				</Button>
			</div>
		</div>

		<!-- Help Text -->
		<div class="text-xs text-muted-foreground space-y-1 pt-2">
			<p><strong>Tip:</strong> YAML format is more human-friendly for long content and markdown.</p>
			<p><strong>Note:</strong> All lessons and quizzes will be imported with the course.</p>
		</div>
	</CardContent>
</Card>
