<script lang="ts">
	import { page } from '$app/stores'
	import { navigate } from '$lib/utils/navigation'
	import { authState } from '$lib/auth.svelte'
	import { canManageCourses } from '$lib/utils/admin'
	import { Button, Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui'
	import AuthGuard from '$lib/components/AuthGuard.svelte'
	import Loading from '$lib/components/Loading.svelte'
	import { CourseService } from '$lib/services/courses'
	import { AnalyticsService } from '$lib/services/analytics'
	import * as QuizService from '$lib/services/quiz'
	import type { Course } from '$lib/types'
	import type { CourseAnalytics, StudentEngagementSummary } from '$lib/types/analytics'
	import type { Quiz, QuizStatistics } from '$lib/types/quiz'
	
	const courseId = $derived($page.params.id as string)
	
	// State
	let course = $state<Course | null>(null)
	let analytics = $state<CourseAnalytics | null>(null)
	let students = $state<StudentEngagementSummary[]>([])
	let quizzes = $state<Quiz[]>([])
	const quizStats = $state<Map<string, QuizStatistics>>(new Map())
	let loading = $state(true)
	let error = $state<string | null>(null)
	
	// Filters
	let showAtRiskOnly = $state(false)
	let selectedTab = $state<'overview' | 'students' | 'lessons' | 'quizzes'>('overview')
	
	// Load data
	$effect(() => {
		const _currentCourseId = courseId
		
		if (!authState.initialized) return
		
		if (!authState.user || !canManageCourses(authState.user)) {
			navigate('/dashboard')
			return
		}
		
		loadData()
	})
	
	async function loadData() {
		loading = true
		error = null
		
		try {
			// Load course and analytics in parallel
			const [courseData, analyticsData, studentsData, quizzesData] = await Promise.all([
				CourseService.getCourse(courseId),
				AnalyticsService.getCourseAnalytics(courseId),
				AnalyticsService.getStudentEngagement(courseId),
				QuizService.getQuizzesByCourse(courseId)
			])
			
			if (!courseData) {
				error = 'Course not found'
				return
			}
			
			course = courseData
			analytics = analyticsData
			students = studentsData
			quizzes = quizzesData
			
			// Load quiz statistics
			const statsPromises = quizzesData.map(async quiz => {
				try {
					const stats = await QuizService.getQuizStatistics(quiz.id)
					quizStats.set(quiz.id, stats)
				} catch (err) {
					console.error(`Failed to load stats for quiz ${quiz.id}:`, err)
				}
			})
			await Promise.all(statsPromises)
			
		} catch (err: any) {
			error = err.message || 'Failed to load analytics'
			console.error('Error loading analytics:', err)
		} finally {
			loading = false
		}
	}
	
	// Computed values
	const filteredStudents = $derived(
		showAtRiskOnly ? students.filter(s => s.atRisk) : students
	)
	
	const atRiskCount = $derived(students.filter(s => s.atRisk).length)
	
	const averageQuizScore = $derived(() => {
		const scores = Array.from(quizStats.values()).map(s => s.averageScore)
		return scores.length > 0 
			? Math.round(scores.reduce((sum, s) => sum + s, 0) / scores.length)
			: 0
	})
	
	// Helper functions
	function formatTime(seconds: number): string {
		const hours = Math.floor(seconds / 3600)
		const mins = Math.floor((seconds % 3600) / 60)
		if (hours > 0) return `${hours}h ${mins}m`
		return `${mins}m`
	}
	
	function formatDate(dateString: string): string {
		try {
			const date = new Date(dateString)
			return date.toLocaleDateString('en-US', {
				month: 'short',
				day: 'numeric',
				year: 'numeric'
			})
		} catch {
			return 'N/A'
		}
	}
	
	function getActivityColor(level: string): string {
		switch (level) {
			case 'high': return 'bg-green-100 text-green-800'
			case 'medium': return 'bg-yellow-100 text-yellow-800'
			case 'low': return 'bg-orange-100 text-orange-800'
			case 'inactive': return 'bg-red-100 text-red-800'
			default: return 'bg-gray-100 text-gray-800'
		}
	}
	
	function getProgressColor(percentage: number): string {
		if (percentage >= 75) return 'bg-green-500'
		if (percentage >= 50) return 'bg-blue-500'
		if (percentage >= 25) return 'bg-yellow-500'
		return 'bg-red-500'
	}
</script>

<svelte:head>
	<title>Analytics - {course?.title || 'Loading...'}</title>
	<meta name="description" content="Course analytics dashboard" />
</svelte:head>

<AuthGuard>
	{#if loading}
		<div class="flex justify-center items-center min-h-screen">
			<Loading />
		</div>
	{:else if error && !course}
		<div class="min-h-screen bg-gray-50 flex items-center justify-center">
			<Card class="max-w-md">
				<CardContent class="p-8 text-center">
					<h2 class="text-2xl font-bold text-red-600 mb-4">Error</h2>
					<p class="text-gray-600 mb-6">{error}</p>
					<Button onclick={() => navigate('/admin')}>
						Back to Admin
					</Button>
				</CardContent>
			</Card>
		</div>
	{:else if course && analytics}
		<div class="min-h-screen bg-gray-50">
			<!-- Header -->
			<div class="bg-white border-b">
				<div class="container mx-auto px-4 py-6">
					<div class="flex items-center justify-between">
						<div>
							<div class="flex items-center gap-3 text-sm text-gray-600 mb-2">
								<button
									onclick={() => navigate('/admin')}
									class="hover:text-blue-600"
								>
									Admin
								</button>
								<span>/</span>
								<button
									onclick={() => navigate(`/admin/courses/${courseId}`)}
									class="hover:text-blue-600"
								>
									{course.title}
								</button>
								<span>/</span>
								<span class="text-gray-900">Analytics</span>
							</div>
							<h1 class="text-3xl font-bold">Course Analytics</h1>
							<p class="text-gray-600 mt-1">
								Insights and performance metrics for {course.title}
							</p>
						</div>
						<div class="flex gap-3">
							<Button 
								variant="outline" 
								onclick={() => navigate(`/admin/courses/${courseId}`)}
							>
								Back to Course
							</Button>
							<Button onclick={loadData} disabled={loading}>
								<svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
								</svg>
								Refresh
							</Button>
						</div>
					</div>
				</div>
			</div>

			<div class="container mx-auto px-4 py-8">
				<!-- Tabs -->
				<div class="flex gap-2 mb-6 border-b">
					<button
						class="px-4 py-2 font-medium {selectedTab === 'overview' 
							? 'border-b-2 border-primary-600 text-primary-600' 
							: 'text-gray-600 hover:text-gray-900'}"
						onclick={() => selectedTab = 'overview'}
					>
						Overview
					</button>
					<button
						class="px-4 py-2 font-medium {selectedTab === 'students' 
							? 'border-b-2 border-primary-600 text-primary-600' 
							: 'text-gray-600 hover:text-gray-900'}"
						onclick={() => selectedTab = 'students'}
					>
						Students ({students.length})
					</button>
					<button
						class="px-4 py-2 font-medium {selectedTab === 'lessons' 
							? 'border-b-2 border-primary-600 text-primary-600' 
							: 'text-gray-600 hover:text-gray-900'}"
						onclick={() => selectedTab = 'lessons'}
					>
						Lessons ({analytics.lessonsAnalytics.length})
					</button>
					<button
						class="px-4 py-2 font-medium {selectedTab === 'quizzes' 
							? 'border-b-2 border-primary-600 text-primary-600' 
							: 'text-gray-600 hover:text-gray-900'}"
						onclick={() => selectedTab = 'quizzes'}
					>
						Quizzes ({quizzes.length})
					</button>
				</div>

				<!-- Overview Tab -->
				{#if selectedTab === 'overview'}
					<!-- Summary Cards -->
					<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
						<Card>
							<CardContent class="p-6">
								<div class="flex items-center justify-between mb-2">
									<span class="text-sm font-medium text-gray-600">Total Enrolled</span>
									<svg class="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
									</svg>
								</div>
								<div class="text-3xl font-bold text-gray-900">{analytics.totalEnrolled}</div>
								<div class="text-sm text-gray-600 mt-1">
									{analytics.activeStudents} active
								</div>
							</CardContent>
						</Card>

						<Card>
							<CardContent class="p-6">
								<div class="flex items-center justify-between mb-2">
									<span class="text-sm font-medium text-gray-600">Completion Rate</span>
									<svg class="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
									</svg>
								</div>
								<div class="text-3xl font-bold text-gray-900">{analytics.completionRate}%</div>
								<div class="text-sm text-gray-600 mt-1">
									{Math.round(analytics.totalEnrolled * analytics.completionRate / 100)} completed
								</div>
							</CardContent>
						</Card>

						<Card>
							<CardContent class="p-6">
								<div class="flex items-center justify-between mb-2">
									<span class="text-sm font-medium text-gray-600">Avg. Progress</span>
									<svg class="w-8 h-8 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
									</svg>
								</div>
								<div class="text-3xl font-bold text-gray-900">{analytics.averageCourseProgress}%</div>
								<div class="text-sm text-gray-600 mt-1">
									Across all students
								</div>
							</CardContent>
						</Card>

						<Card>
							<CardContent class="p-6">
								<div class="flex items-center justify-between mb-2">
									<span class="text-sm font-medium text-gray-600">Avg. Time Spent</span>
									<svg class="w-8 h-8 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
									</svg>
								</div>
								<div class="text-3xl font-bold text-gray-900">{formatTime(analytics.averageCourseTime)}</div>
								<div class="text-sm text-gray-600 mt-1">
									Per student
								</div>
							</CardContent>
						</Card>
					</div>

					<!-- At-Risk Students Alert -->
					{#if atRiskCount > 0}
						<Card class="mb-8 bg-red-50 border-red-200">
							<CardContent class="p-6">
								<div class="flex items-start gap-4">
									<div class="w-12 h-12 bg-red-500 rounded-full flex items-center justify-center flex-shrink-0">
										<svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
										</svg>
									</div>
									<div class="flex-1">
										<h3 class="text-lg font-semibold text-red-900 mb-1">
											⚠️ {atRiskCount} Student{atRiskCount > 1 ? 's' : ''} at Risk
										</h3>
										<p class="text-red-800 mb-4">
											These students haven't accessed the course in over 2 weeks and have low progress. Consider reaching out.
										</p>
										<Button
											size="sm"
											variant="outline"
											class="border-red-300 text-red-700 hover:bg-red-100"
											onclick={() => {
												selectedTab = 'students'
												showAtRiskOnly = true
											}}
										>
											View At-Risk Students
										</Button>
									</div>
								</div>
							</CardContent>
						</Card>
					{/if}

					<!-- Popular & Least Engaging Lessons -->
					<div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
						<!-- Most Popular Lessons -->
						<Card>
							<CardHeader class="border-b">
								<CardTitle>Most Popular Lessons</CardTitle>
							</CardHeader>
							<CardContent class="p-6">
								{#if analytics.mostPopularLessons.length > 0}
									<div class="space-y-4">
										{#each analytics.mostPopularLessons as lesson, i (lesson.lessonId)}
											<div class="flex items-center gap-3">
												<div class="w-8 h-8 rounded-full bg-green-100 text-green-700 flex items-center justify-center font-semibold text-sm">
													{i + 1}
												</div>
												<div class="flex-1">
													<div class="font-medium text-gray-900">{lesson.lessonTitle}</div>
													<div class="text-sm text-gray-600">
														{lesson.views} views • {lesson.completionRate}% completion
													</div>
												</div>
												<div class="text-right">
													<div class="text-sm font-semibold text-green-600">
														Score: {lesson.engagementScore}
													</div>
												</div>
											</div>
										{/each}
									</div>
								{:else}
									<p class="text-gray-500 text-center py-8">No lesson data yet</p>
								{/if}
							</CardContent>
						</Card>

						<!-- Least Engaging Lessons -->
						<Card>
							<CardHeader class="border-b">
								<CardTitle>Needs Improvement</CardTitle>
							</CardHeader>
							<CardContent class="p-6">
								{#if analytics.leastEngagingLessons.length > 0}
									<div class="space-y-4">
										{#each analytics.leastEngagingLessons as lesson, i (lesson.lessonId)}
											<div class="flex items-center gap-3">
												<div class="w-8 h-8 rounded-full bg-red-100 text-red-700 flex items-center justify-center font-semibold text-sm">
													{i + 1}
												</div>
												<div class="flex-1">
													<div class="font-medium text-gray-900">{lesson.lessonTitle}</div>
													<div class="text-sm text-gray-600">
														{lesson.views} views • {lesson.completionRate}% completion
													</div>
												</div>
												<div class="text-right">
													<div class="text-sm font-semibold text-red-600">
														Score: {lesson.engagementScore}
													</div>
												</div>
											</div>
										{/each}
									</div>
								{:else}
									<p class="text-gray-500 text-center py-8">No lesson data yet</p>
								{/if}
							</CardContent>
						</Card>
					</div>

					<!-- Quiz Performance Summary -->
					{#if quizzes.length > 0}
						<Card class="mb-8">
							<CardHeader class="border-b">
								<CardTitle>Quiz Performance Overview</CardTitle>
							</CardHeader>
							<CardContent class="p-6">
								<div class="grid grid-cols-1 md:grid-cols-3 gap-6">
									<div class="text-center">
										<div class="text-3xl font-bold text-gray-900">{quizzes.length}</div>
										<div class="text-sm text-gray-600 mt-1">Total Quizzes</div>
									</div>
									<div class="text-center">
										<div class="text-3xl font-bold text-gray-900">{averageQuizScore()}%</div>
										<div class="text-sm text-gray-600 mt-1">Average Score</div>
									</div>
									<div class="text-center">
										<div class="text-3xl font-bold text-gray-900">
											{Array.from(quizStats.values()).reduce((sum, s) => sum + s.totalAttempts, 0)}
										</div>
										<div class="text-sm text-gray-600 mt-1">Total Attempts</div>
									</div>
								</div>
							</CardContent>
						</Card>
					{/if}
				{/if}

				<!-- Students Tab -->
				{#if selectedTab === 'students'}
					<Card>
						<CardHeader class="border-b">
							<div class="flex items-center justify-between">
								<CardTitle>Student Engagement</CardTitle>
								<label class="flex items-center gap-2 text-sm">
									<input
										type="checkbox"
										bind:checked={showAtRiskOnly}
										class="rounded border-gray-300"
									/>
									<span>Show at-risk only ({atRiskCount})</span>
								</label>
							</div>
						</CardHeader>
						<CardContent class="p-0">
							{#if filteredStudents.length > 0}
								<div class="overflow-x-auto">
									<table class="w-full">
										<thead class="bg-gray-50 border-b">
											<tr>
												<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Student</th>
												<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Progress</th>
												<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Lessons</th>
												<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Time Spent</th>
												<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Last Active</th>
												<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Activity</th>
											</tr>
										</thead>
										<tbody class="divide-y divide-gray-200">
											{#each filteredStudents as student (student.userId)}
												<tr class="hover:bg-gray-50">
													<td class="px-6 py-4">
														<div class="flex items-center gap-3">
															<div class="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center">
																<span class="text-primary-700 font-semibold">
																	{student.userName.charAt(0).toUpperCase()}
																</span>
															</div>
															<div>
																<div class="font-medium text-gray-900">{student.userName}</div>
																{#if student.atRisk}
																	<span class="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700">
																		⚠️ At Risk
																	</span>
																{/if}
															</div>
														</div>
													</td>
													<td class="px-6 py-4">
														<div class="flex items-center gap-2">
															<div class="flex-1 bg-gray-200 rounded-full h-2 max-w-[100px]">
																<div
																	class="{getProgressColor(student.progressPercentage)} h-2 rounded-full transition-all"
																	style="width: {student.progressPercentage}%"
																></div>
															</div>
															<span class="text-sm font-medium text-gray-900">
																{Math.round(student.progressPercentage)}%
															</span>
														</div>
													</td>
													<td class="px-6 py-4">
														<span class="text-sm text-gray-900">
															{student.completedLessons}/{student.totalLessons}
														</span>
													</td>
													<td class="px-6 py-4">
														<span class="text-sm text-gray-900">
															{formatTime(student.totalTimeSpent)}
														</span>
													</td>
													<td class="px-6 py-4">
														<div class="text-sm text-gray-900">
															{formatDate(student.lastActive)}
														</div>
														<div class="text-xs text-gray-500">
															{student.daysSinceLastActive}d ago
														</div>
													</td>
													<td class="px-6 py-4">
														<span class="text-xs px-2 py-1 rounded-full {getActivityColor(student.activityLevel)}">
															{student.activityLevel}
														</span>
													</td>
												</tr>
											{/each}
										</tbody>
									</table>
								</div>
							{:else}
								<div class="p-8 text-center text-gray-500">
									{showAtRiskOnly ? 'No at-risk students found' : 'No student data yet'}
								</div>
							{/if}
						</CardContent>
					</Card>
				{/if}

				<!-- Lessons Tab -->
				{#if selectedTab === 'lessons'}
					<Card>
						<CardHeader class="border-b">
							<CardTitle>Lesson Analytics</CardTitle>
						</CardHeader>
						<CardContent class="p-0">
							{#if analytics.lessonsAnalytics.length > 0}
								<div class="overflow-x-auto">
									<table class="w-full">
										<thead class="bg-gray-50 border-b">
											<tr>
												<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">#</th>
												<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Lesson</th>
												<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Students</th>
												<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Completion</th>
												<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Avg. Time</th>
												<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Engagement</th>
											</tr>
										</thead>
										<tbody class="divide-y divide-gray-200">
											{#each analytics.lessonsAnalytics as lesson (lesson.lessonId)}
												<tr class="hover:bg-gray-50">
													<td class="px-6 py-4 text-sm text-gray-500">{lesson.order}</td>
													<td class="px-6 py-4">
														<div class="font-medium text-gray-900">{lesson.lessonTitle}</div>
													</td>
													<td class="px-6 py-4 text-sm text-gray-900">{lesson.uniqueStudents}</td>
													<td class="px-6 py-4">
														<div class="flex items-center gap-2">
															<div class="flex-1 bg-gray-200 rounded-full h-2 max-w-[80px]">
																<div
																	class="{getProgressColor(lesson.completionRate)} h-2 rounded-full"
																	style="width: {lesson.completionRate}%"
																></div>
															</div>
															<span class="text-sm font-medium text-gray-900">
																{Math.round(lesson.completionRate)}%
															</span>
														</div>
													</td>
													<td class="px-6 py-4 text-sm text-gray-900">
														{formatTime(lesson.averageTimeSpent)}
													</td>
													<td class="px-6 py-4">
														<div class="flex items-center gap-2">
															<div class="flex-1 bg-gray-200 rounded-full h-2 max-w-[60px]">
																<div
																	class="bg-purple-500 h-2 rounded-full"
																	style="width: {lesson.engagementScore}%"
																></div>
															</div>
															<span class="text-sm font-medium text-gray-900">
																{lesson.engagementScore}
															</span>
														</div>
													</td>
												</tr>
											{/each}
										</tbody>
									</table>
								</div>
							{:else}
								<div class="p-8 text-center text-gray-500">
									No lesson data yet
								</div>
							{/if}
						</CardContent>
					</Card>
				{/if}

				<!-- Quizzes Tab -->
				{#if selectedTab === 'quizzes'}
					<Card>
						<CardHeader class="border-b">
							<CardTitle>Quiz Performance</CardTitle>
						</CardHeader>
						<CardContent class="p-0">
							{#if quizzes.length > 0}
								<div class="overflow-x-auto">
									<table class="w-full">
										<thead class="bg-gray-50 border-b">
											<tr>
												<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Quiz</th>
												<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Attempts</th>
												<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Students</th>
												<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Avg. Score</th>
												<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pass Rate</th>
												<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
											</tr>
										</thead>
										<tbody class="divide-y divide-gray-200">
											{#each quizzes as quiz (quiz.id)}
												{@const stats = quizStats.get(quiz.id)}
												<tr class="hover:bg-gray-50">
													<td class="px-6 py-4">
														<div class="font-medium text-gray-900">{quiz.title}</div>
														<div class="text-sm text-gray-500">
															{quiz.questions.length} questions • {quiz.passingScore}% to pass
														</div>
													</td>
													<td class="px-6 py-4 text-sm text-gray-900">
														{stats?.totalAttempts || 0}
													</td>
													<td class="px-6 py-4 text-sm text-gray-900">
														{stats?.uniqueUsers || 0}
													</td>
													<td class="px-6 py-4">
														<span class="text-sm font-medium {
															(stats?.averageScore || 0) >= quiz.passingScore 
																? 'text-green-600' 
																: 'text-red-600'
														}">
															{stats?.averageScore.toFixed(1) || 0}%
														</span>
													</td>
													<td class="px-6 py-4">
														<div class="flex items-center gap-2">
															<div class="flex-1 bg-gray-200 rounded-full h-2 max-w-[80px]">
																<div
																	class="bg-green-500 h-2 rounded-full"
																	style="width: {stats?.passRate || 0}%"
																></div>
															</div>
															<span class="text-sm font-medium text-gray-900">
																{stats?.passRate.toFixed(0) || 0}%
															</span>
														</div>
													</td>
													<td class="px-6 py-4">
														{#if quiz.isPublished}
															<span class="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700">
																Published
															</span>
														{:else}
															<span class="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-700">
																Draft
															</span>
														{/if}
													</td>
												</tr>
											{/each}
										</tbody>
									</table>
								</div>
							{:else}
								<div class="p-8 text-center text-gray-500">
									No quizzes in this course yet
								</div>
							{/if}
						</CardContent>
					</Card>
				{/if}
			</div>
		</div>
	{/if}
</AuthGuard>
