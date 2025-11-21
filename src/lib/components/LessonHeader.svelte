<script lang="ts">
	import type { Lesson } from '$lib/types'
	import { estimateReadingTime } from '$lib/services/markdown'
	import { Clock, BookOpen, CircleCheck, Calendar } from 'lucide-svelte'
	
	interface Props {
		lesson: Lesson
		isCompleted?: boolean
		lastAccessedAt?: Date | null
		timeSpent?: number // in seconds
		estimatedReadingMinutes?: number // calculated from content
	}
	
	const { 
		lesson, 
		isCompleted = false, 
		lastAccessedAt = null,
		timeSpent = 0,
		estimatedReadingMinutes = 0
	}: Props = $props()
	
	// Calculate reading time from content if not provided
	const readingTime = $derived(() => {
		if (estimatedReadingMinutes > 0) {
			return estimatedReadingMinutes
		}
		if (lesson.duration) {
			return lesson.duration
		}
		if (lesson.content) {
			return estimateReadingTime(lesson.content)
		}
		return 5 // default fallback
	})
	
	// Format last accessed date
	function formatLastAccessed(date: Date | null): string {
		if (!date) return 'Not started'
		
		const now = new Date()
		const diffMs = now.getTime() - date.getTime()
		const diffMins = Math.floor(diffMs / 60000)
		const diffHours = Math.floor(diffMs / 3600000)
		const diffDays = Math.floor(diffMs / 86400000)
		
		if (diffMins < 1) return 'Just now'
		if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`
		if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
		if (diffDays === 1) return 'Yesterday'
		if (diffDays < 7) return `${diffDays} days ago`
		
		// Format as date for older entries
		return date.toLocaleDateString('en-US', { 
			month: 'short', 
			day: 'numeric',
			year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
		})
	}
	
	// Format time spent
	function formatTimeSpent(seconds: number): string {
		if (seconds < 60) return `${seconds}s`
		const mins = Math.floor(seconds / 60)
		if (mins < 60) return `${mins}m`
		const hours = Math.floor(mins / 60)
		const remainingMins = mins % 60
		return remainingMins > 0 ? `${hours}h ${remainingMins}m` : `${hours}h`
	}
	
	// Lesson type badge
	const lessonTypeBadge = $derived(
		lesson.type === 'quiz' 
			? { text: 'Quiz', class: 'bg-purple-100 text-purple-700 border-purple-200' }
			: { text: 'Lesson', class: 'bg-blue-100 text-blue-700 border-blue-200' }
	)
</script>

<header class="bg-white border-b border-gray-200 sticky top-20 z-20 shadow-sm">
	<div class="max-w-5xl mx-auto px-6 py-6">
		<!-- Title and Type Badge -->
		<div class="flex items-start justify-between gap-4 mb-4">
			<div class="flex-1 min-w-0">
				<div class="flex items-center gap-3 mb-2">
					<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border {lessonTypeBadge.class}">
						{lessonTypeBadge.text}
					</span>
					{#if isCompleted}
						<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 border border-green-200">
							<CircleCheck class="w-3 h-3" />
							Completed
						</span>
					{/if}
				</div>
				<h1 class="text-2xl md:text-3xl font-bold text-gray-900 leading-tight">
					{lesson.title}
				</h1>
				{#if lesson.description}
					<p class="mt-2 text-sm md:text-base text-gray-600 line-clamp-2">
						{lesson.description}
					</p>
				{/if}
			</div>
		</div>
		
		<!-- Metadata Grid -->
		<div class="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 pt-4 border-t border-gray-100">
			<!-- Reading Time -->
			<div class="flex items-center gap-2 text-sm">
				<div class="flex-shrink-0 w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
					<Clock class="w-4 h-4 text-blue-600" />
				</div>
				<div class="min-w-0">
					<div class="text-xs text-gray-500 font-medium">
						{lesson.type === 'quiz' ? 'Est. Time' : 'Reading Time'}
					</div>
					<div class="text-sm font-semibold text-gray-900 truncate">
						{readingTime()} min
					</div>
				</div>
			</div>
			
			<!-- Progress / Time Spent -->
			{#if timeSpent > 0}
				<div class="flex items-center gap-2 text-sm">
					<div class="flex-shrink-0 w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center">
						<BookOpen class="w-4 h-4 text-green-600" />
					</div>
					<div class="min-w-0">
						<div class="text-xs text-gray-500 font-medium">Time Spent</div>
						<div class="text-sm font-semibold text-gray-900 truncate">
							{formatTimeSpent(timeSpent)}
						</div>
					</div>
				</div>
			{/if}
			
			<!-- Last Accessed -->
			{#if lastAccessedAt || timeSpent > 0}
				<div class="flex items-center gap-2 text-sm">
					<div class="flex-shrink-0 w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center">
						<Calendar class="w-4 h-4 text-purple-600" />
					</div>
					<div class="min-w-0">
						<div class="text-xs text-gray-500 font-medium">Last Read</div>
						<div class="text-sm font-semibold text-gray-900 truncate">
							{formatLastAccessed(lastAccessedAt)}
						</div>
					</div>
				</div>
			{/if}
			
			<!-- Lesson Order/Number -->
			<div class="flex items-center gap-2 text-sm">
				<div class="flex-shrink-0 w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
					<span class="text-xs font-bold text-gray-700">#{lesson.order}</span>
				</div>
				<div class="min-w-0">
					<div class="text-xs text-gray-500 font-medium">Lesson</div>
					<div class="text-sm font-semibold text-gray-900 truncate">
						Lesson {lesson.order}
					</div>
				</div>
			</div>
		</div>
	</div>
</header>

<style>
	.line-clamp-2 {
		display: -webkit-box;
		-webkit-line-clamp: 2;
		line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}
</style>
