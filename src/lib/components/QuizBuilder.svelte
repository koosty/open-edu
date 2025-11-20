<!--
	QuizBuilder Component
	Visual quiz creation interface for instructors
	Supports all 6 question types with validation and preview
-->
<script lang="ts">
	import { Button, Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui'
	import { Input } from '$lib/components/ui'
	import type { Quiz, QuizQuestion, QuestionOption, QuizSettings, QuestionType } from '$lib/types/quiz'
	import { Plus, Trash2, MoveUp, MoveDown, Eye, Save, AlertCircle, CheckCircle2, GripVertical } from 'lucide-svelte'
	
	// Props
	let {
		courseId,
		lessonId,
		initialQuiz,
		onSave,
		onCancel,
		isSaving = false
	}: {
		courseId?: string
		lessonId?: string
		initialQuiz?: Quiz
		onSave: (quiz: Partial<Quiz>) => Promise<void>
		onCancel: () => void
		isSaving?: boolean
	} = $props()
	
	// State
	let title = $state(initialQuiz?.title || '')
	let description = $state(initialQuiz?.description || '')
	let instructions = $state(initialQuiz?.instructions || 'Answer all questions to the best of your ability.')
	let questions = $state<QuizQuestion[]>(initialQuiz?.questions || [])
	let settings = $state<QuizSettings>({
		passingScore: initialQuiz?.passingScore || 70,
		timeLimit: initialQuiz?.timeLimit,
		allowMultipleAttempts: initialQuiz?.allowMultipleAttempts ?? true,
		maxAttempts: initialQuiz?.maxAttempts,
		showCorrectAnswers: initialQuiz?.showCorrectAnswers ?? true,
		showExplanations: initialQuiz?.showExplanations ?? true,
		randomizeQuestions: initialQuiz?.randomizeQuestions ?? false,
		randomizeOptions: initialQuiz?.randomizeOptions ?? false,
		allowReview: initialQuiz?.allowReview ?? true
	})
	
	let activeTab = $state<'questions' | 'settings' | 'preview'>('questions')
	let editingQuestionIndex = $state<number | null>(null)
	let validationErrors = $state<string[]>([])
	
	// Question templates
	const questionTemplates: Record<QuestionType, Partial<QuizQuestion>> = {
		multiple_choice: {
			type: 'multiple_choice',
			question: '',
			options: [
				{ id: crypto.randomUUID(), text: '', isCorrect: false },
				{ id: crypto.randomUUID(), text: '', isCorrect: false },
				{ id: crypto.randomUUID(), text: '', isCorrect: false },
				{ id: crypto.randomUUID(), text: '', isCorrect: false }
			],
			correctAnswer: '',
			points: 1,
			difficulty: 'medium'
		},
		multiple_select: {
			type: 'multiple_select',
			question: '',
			options: [
				{ id: crypto.randomUUID(), text: '', isCorrect: false },
				{ id: crypto.randomUUID(), text: '', isCorrect: false },
				{ id: crypto.randomUUID(), text: '', isCorrect: false },
				{ id: crypto.randomUUID(), text: '', isCorrect: false }
			],
			correctAnswer: [],
			points: 1,
			difficulty: 'medium'
		},
		true_false: {
			type: 'true_false',
			question: '',
			options: [
				{ id: 'true', text: 'True', isCorrect: false },
				{ id: 'false', text: 'False', isCorrect: false }
			],
			correctAnswer: false,
			points: 1,
			difficulty: 'easy'
		},
		short_answer: {
			type: 'short_answer',
			question: '',
			correctAnswer: '',
			caseSensitive: false,
			acceptableAnswers: [],
			points: 1,
			difficulty: 'medium'
		},
		essay: {
			type: 'essay',
			question: '',
			correctAnswer: '',
			minLength: 50,
			maxLength: 1000,
			points: 5,
			difficulty: 'hard'
		},
		fill_blank: {
			type: 'fill_blank',
			question: '',
			correctAnswer: [],
			caseSensitive: false,
			points: 1,
			difficulty: 'medium'
		}
	}
	
	// Add new question
	function addQuestion(type: QuestionType) {
		const template = questionTemplates[type]
		const newQuestion: QuizQuestion = {
			...template,
			id: crypto.randomUUID(),
			order: questions.length,
			question: template.question || '',
			correctAnswer: template.correctAnswer!,
			points: template.points || 1
		} as QuizQuestion
		
		questions = [...questions, newQuestion]
		editingQuestionIndex = questions.length - 1
	}
	
	// Delete question
	function deleteQuestion(index: number) {
		if (confirm('Are you sure you want to delete this question?')) {
			questions = questions.filter((_, i) => i !== index)
			// Reorder remaining questions
			questions = questions.map((q, i) => ({ ...q, order: i }))
			if (editingQuestionIndex === index) {
				editingQuestionIndex = null
			}
		}
	}
	
	// Move question
	function moveQuestion(index: number, direction: 'up' | 'down') {
		const newIndex = direction === 'up' ? index - 1 : index + 1
		if (newIndex < 0 || newIndex >= questions.length) return
		
		const newQuestions = [...questions]
		const temp = newQuestions[index]
		newQuestions[index] = newQuestions[newIndex]
		newQuestions[newIndex] = temp
		
		// Update order
		questions = newQuestions.map((q, i) => ({ ...q, order: i }))
		editingQuestionIndex = newIndex
	}
	
	// Update question
	function updateQuestion(index: number, updates: Partial<QuizQuestion>) {
		questions = questions.map((q, i) => 
			i === index ? { ...q, ...updates } : q
		)
	}
	
	// Add option to multiple choice/select
	function addOption(questionIndex: number) {
		const question = questions[questionIndex]
		if (!question.options) return
		
		const newOption: QuestionOption = {
			id: crypto.randomUUID(),
			text: '',
			isCorrect: false
		}
		
		updateQuestion(questionIndex, {
			options: [...question.options, newOption]
		})
	}
	
	// Remove option
	function removeOption(questionIndex: number, optionId: string) {
		const question = questions[questionIndex]
		if (!question.options || question.options.length <= 2) {
			alert('Questions must have at least 2 options')
			return
		}
		
		updateQuestion(questionIndex, {
			options: question.options.filter(opt => opt.id !== optionId)
		})
	}
	
	// Update option
	function updateOption(questionIndex: number, optionId: string, updates: Partial<QuestionOption>) {
		const question = questions[questionIndex]
		if (!question.options) return
		
		updateQuestion(questionIndex, {
			options: question.options.map(opt =>
				opt.id === optionId ? { ...opt, ...updates } : opt
			)
		})
	}
	
	// Toggle correct answer for multiple choice
	function toggleCorrectAnswer(questionIndex: number, optionId: string) {
		const question = questions[questionIndex]
		
		if (question.type === 'multiple_choice') {
			// Only one correct answer
			updateQuestion(questionIndex, {
				options: question.options?.map(opt => ({
					...opt,
					isCorrect: opt.id === optionId
				})),
				correctAnswer: optionId
			})
		} else if (question.type === 'multiple_select') {
			// Multiple correct answers
			const updatedOptions = question.options?.map(opt =>
				opt.id === optionId ? { ...opt, isCorrect: !opt.isCorrect } : opt
			)
			
			updateQuestion(questionIndex, {
				options: updatedOptions,
				correctAnswer: updatedOptions?.filter(opt => opt.isCorrect).map(opt => opt.id) || []
			})
		}
	}
	
	// Validate quiz
	function validateQuiz(): string[] {
		const errors: string[] = []
		
		if (!title.trim()) {
			errors.push('Quiz title is required')
		}
		
		if (questions.length === 0) {
			errors.push('Quiz must have at least one question')
		}
		
		questions.forEach((q, index) => {
			if (!q.question.trim()) {
				errors.push(`Question ${index + 1}: Question text is required`)
			}
			
			if (q.points <= 0) {
				errors.push(`Question ${index + 1}: Points must be greater than 0`)
			}
			
			// Type-specific validation
			if (q.type === 'multiple_choice' || q.type === 'multiple_select') {
				if (!q.options || q.options.length < 2) {
					errors.push(`Question ${index + 1}: Must have at least 2 options`)
				}
				
				const hasCorrect = q.options?.some(opt => opt.isCorrect)
				if (!hasCorrect) {
					errors.push(`Question ${index + 1}: Must mark at least one correct answer`)
				}
				
				const emptyOptions = q.options?.filter(opt => !opt.text.trim())
				if (emptyOptions && emptyOptions.length > 0) {
					errors.push(`Question ${index + 1}: All options must have text`)
				}
			}
			
			if (q.type === 'short_answer' || q.type === 'essay') {
				if (!q.correctAnswer || (typeof q.correctAnswer === 'string' && !q.correctAnswer.trim())) {
					errors.push(`Question ${index + 1}: Sample answer is required`)
				}
			}
			
			if (q.type === 'fill_blank') {
				if (!Array.isArray(q.correctAnswer) || q.correctAnswer.length === 0) {
					errors.push(`Question ${index + 1}: Fill in the blank answers are required`)
				}
			}
		})
		
		if (settings.passingScore < 0 || settings.passingScore > 100) {
			errors.push('Passing score must be between 0 and 100')
		}
		
		if (settings.maxAttempts && settings.maxAttempts < 1) {
			errors.push('Max attempts must be at least 1')
		}
		
		return errors
	}
	
	// Handle save
	async function handleSave() {
		validationErrors = validateQuiz()
		
		if (validationErrors.length > 0) {
			activeTab = 'questions'
			return
		}
		
		// Build quiz data, filtering out undefined values
		const quizData: Partial<Quiz> = {
			courseId,
			lessonId,
			title,
			description,
			instructions,
			questions,
			passingScore: settings.passingScore,
			allowMultipleAttempts: settings.allowMultipleAttempts,
			showCorrectAnswers: settings.showCorrectAnswers,
			showExplanations: settings.showExplanations,
			randomizeQuestions: settings.randomizeQuestions,
			randomizeOptions: settings.randomizeOptions,
			allowReview: settings.allowReview,
			isPublished: false // Save as draft by default
		}
		
		// Add optional fields only if they have values
		if (settings.timeLimit !== undefined && settings.timeLimit !== null) {
			quizData.timeLimit = settings.timeLimit
		}
		if (settings.maxAttempts !== undefined && settings.maxAttempts !== null) {
			quizData.maxAttempts = settings.maxAttempts
		}
		
		await onSave(quizData)
	}
	
	// Get question type label
	function getQuestionTypeLabel(type: QuestionType): string {
		const labels: Record<QuestionType, string> = {
			multiple_choice: 'Multiple Choice',
			multiple_select: 'Multiple Select',
			true_false: 'True/False',
			short_answer: 'Short Answer',
			essay: 'Essay',
			fill_blank: 'Fill in the Blank'
		}
		return labels[type]
	}
</script>

<div class="quiz-builder max-w-6xl mx-auto p-6">
	<!-- Header -->
	<div class="mb-6">
		<h1 class="text-3xl font-bold mb-2">
			{initialQuiz ? 'Edit Quiz' : 'Create New Quiz'}
		</h1>
		<p class="text-gray-600">
			Build an interactive quiz for your students with automatic grading
		</p>
	</div>
	
	<!-- Validation errors -->
	{#if validationErrors.length > 0}
		<Card class="mb-6 border-red-300 bg-red-50">
			<CardContent class="pt-4">
				<div class="flex gap-2 items-start">
					<AlertCircle class="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
					<div>
						<h3 class="font-semibold text-red-900 mb-2">Please fix the following errors:</h3>
						<ul class="list-disc list-inside space-y-1 text-red-800">
							{#each validationErrors as error}
								<li>{error}</li>
							{/each}
						</ul>
					</div>
				</div>
			</CardContent>
		</Card>
	{/if}
	
	<!-- Tabs -->
	<div class="flex gap-2 mb-6 border-b">
		<button
			class="px-4 py-2 font-medium transition-colors {activeTab === 'questions' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-600 hover:text-gray-900'}"
			onclick={() => activeTab = 'questions'}
		>
			Questions ({questions.length})
		</button>
		<button
			class="px-4 py-2 font-medium transition-colors {activeTab === 'settings' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-600 hover:text-gray-900'}"
			onclick={() => activeTab = 'settings'}
		>
			Settings
		</button>
		<button
			class="px-4 py-2 font-medium transition-colors {activeTab === 'preview' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-600 hover:text-gray-900'}"
			onclick={() => activeTab = 'preview'}
		>
			<Eye class="w-4 h-4 inline mr-1" />
			Preview
		</button>
	</div>
	
	<!-- Questions Tab -->
	{#if activeTab === 'questions'}
		<div class="space-y-6">
			<!-- Basic info -->
			<Card>
				<CardHeader>
					<CardTitle>Quiz Information</CardTitle>
				</CardHeader>
				<CardContent class="space-y-4">
					<div>
						<label for="quiz-title" class="block text-sm font-medium mb-1">Quiz Title *</label>
						<Input
							type="text"
							bind:value={title}
							placeholder="e.g., Introduction to Variables Quiz"
							class="w-full"
						/>
					</div>
					
					<div>
						<label for="quiz-description" class="block text-sm font-medium mb-1">Description</label>
						<textarea
							id="quiz-description"
							bind:value={description}
							placeholder="Brief description of what this quiz covers"
							class="w-full px-3 py-2 border rounded-md resize-none"
							rows="2"
						></textarea>
					</div>
					
					<div>
						<label for="quiz-instructions" class="block text-sm font-medium mb-1">Instructions</label>
						<textarea
							id="quiz-instructions"
							bind:value={instructions}
							placeholder="Instructions for students taking the quiz"
							class="w-full px-3 py-2 border rounded-md resize-none"
							rows="2"
						></textarea>
					</div>
				</CardContent>
			</Card>
			
			<!-- Questions list -->
			<Card>
				<CardHeader>
					<div class="flex justify-between items-center">
						<CardTitle>Questions</CardTitle>
						<div class="flex gap-2">
							<button
								class="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
								onclick={() => addQuestion('multiple_choice')}
							>
								<Plus class="w-4 h-4" />
								Multiple Choice
							</button>
							<button
								class="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
								onclick={() => addQuestion('true_false')}
							>
								<Plus class="w-4 h-4" />
								True/False
							</button>
							<button
								class="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
								onclick={() => addQuestion('short_answer')}
							>
								<Plus class="w-4 h-4" />
								Short Answer
							</button>
						</div>
					</div>
				</CardHeader>
				<CardContent>
					{#if questions.length === 0}
						<div class="text-center py-12 text-gray-500">
							<p class="mb-4">No questions yet. Click a button above to add your first question.</p>
						</div>
					{:else}
						<div class="space-y-4">
							{#each questions as question, index (question.id)}
								<div class="border rounded-lg p-4 {editingQuestionIndex === index ? 'ring-2 ring-blue-500' : ''}">
									<!-- Question header -->
									<div class="flex items-start gap-3 mb-3">
										<GripVertical class="w-5 h-5 text-gray-400 flex-shrink-0 mt-1" />
										<div class="flex-1">
											<div class="flex items-center gap-2 mb-1">
												<span class="font-semibold">Question {index + 1}</span>
												<span class="text-xs px-2 py-0.5 bg-gray-100 rounded">
													{getQuestionTypeLabel(question.type)}
												</span>
												{#if question.difficulty}
													<span class="text-xs px-2 py-0.5 bg-blue-100 text-blue-800 rounded">
														{question.difficulty}
													</span>
												{/if}
												<span class="text-sm text-gray-600">{question.points} pts</span>
											</div>
											
											{#if editingQuestionIndex === index}
												<!-- Editing mode -->
												<div class="space-y-3">
														<div>
															<label for="question-{index}" class="block text-sm font-medium mb-1">Question Text *</label>
															<textarea
																id="question-{index}"
																value={question.question}
																oninput={(e) => updateQuestion(index, { question: e.currentTarget.value })}
																placeholder="Enter your question here"
																class="w-full px-3 py-2 border rounded-md resize-none"
																rows="3"
															></textarea>
														</div>
													
													<!-- Multiple choice/select options -->
													{#if question.type === 'multiple_choice' || question.type === 'multiple_select'}
														<fieldset>
															<legend class="block text-sm font-medium mb-2">
																Options *
																<span class="text-gray-500 text-xs ml-2">
																	({question.type === 'multiple_choice' ? 'Select one correct answer' : 'Select all correct answers'})
																</span>
															</legend>
															<div class="space-y-2">
																{#each question.options || [] as option (option.id)}
																	<div class="flex items-center gap-2">
																		<input
																			type={question.type === 'multiple_choice' ? 'radio' : 'checkbox'}
																			checked={option.isCorrect}
																			onchange={() => toggleCorrectAnswer(index, option.id)}
																			class="flex-shrink-0"
																		/>
																		<Input
																			type="text"
																			value={option.text}
																			oninput={(e) => updateOption(index, option.id, { text: e.currentTarget.value })}
																			placeholder="Option text"
																			class="flex-1"
																		/>
																		{#if (question.options?.length || 0) > 2}
																			<button
																				onclick={() => removeOption(index, option.id)}
																				class="text-red-600 hover:text-red-700 p-1"
																			>
																				<Trash2 class="w-4 h-4" />
																			</button>
																		{/if}
																	</div>
																{/each}
															</div>
															<button
																onclick={() => addOption(index)}
																class="mt-2 text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
															>
																<Plus class="w-3 h-3" />
																Add option
															</button>
														</fieldset>
													{/if}
													
													<!-- True/False (no options to edit) -->
													{#if question.type === 'true_false'}
														<fieldset>
															<legend class="block text-sm font-medium mb-2">Correct Answer *</legend>
															<div class="flex gap-4">
																<label class="flex items-center gap-2">
																	<input
																		type="radio"
																		checked={question.correctAnswer === true}
																		onchange={() => updateQuestion(index, { 
																			correctAnswer: true,
																			options: question.options?.map(opt => ({
																				...opt,
																				isCorrect: opt.id === 'true'
																			}))
																		})}
																	/>
																	<span>True</span>
																</label>
																<label class="flex items-center gap-2">
																	<input
																		type="radio"
																		checked={question.correctAnswer === false}
																		onchange={() => updateQuestion(index, { 
																			correctAnswer: false,
																			options: question.options?.map(opt => ({
																				...opt,
																				isCorrect: opt.id === 'false'
																			}))
																		})}
																	/>
																	<span>False</span>
																</label>
															</div>
														</fieldset>
													{/if}
													
													<!-- Short answer -->
													{#if question.type === 'short_answer'}
														<div>
															<label for="correct-answer-{index}" class="block text-sm font-medium mb-1">Correct Answer *</label>
															<Input
																type="text"
																value={question.correctAnswer as string}
																oninput={(e) => updateQuestion(index, { correctAnswer: e.currentTarget.value })}
																placeholder="Sample correct answer"
																class="w-full"
															/>
															<label class="flex items-center gap-2 mt-2">
																<input
																	type="checkbox"
																	checked={question.caseSensitive}
																	onchange={(e) => updateQuestion(index, { caseSensitive: e.currentTarget.checked })}
																/>
																<span class="text-sm">Case sensitive</span>
															</label>
														</div>
													{/if}
													
													<!-- Essay -->
													{#if question.type === 'essay'}
														<div class="space-y-3">
															<div>
																<label for="essay-answer-{index}" class="block text-sm font-medium mb-1">Sample Answer *</label>
																<textarea
																	id="essay-answer-{index}"
																	value={question.correctAnswer as string}
																	oninput={(e) => updateQuestion(index, { correctAnswer: e.currentTarget.value })}
																	placeholder="Provide a sample answer or rubric"
																	class="w-full px-3 py-2 border rounded-md resize-none"
																	rows="3"
																></textarea>
															</div>
															<div class="flex gap-4">
																<div class="flex-1">
																	<label for="min-length-{index}" class="block text-sm font-medium mb-1">Min Length</label>
																	<input
																		id="min-length-{index}"
																		type="number"
																		value={question.minLength || 0}
																		oninput={(e) => updateQuestion(index, { minLength: parseInt(e.currentTarget.value) || 0 })}
																		placeholder="50"
																		class="w-full px-3 py-2 border rounded-md"
																	/>
																</div>
																<div class="flex-1">
																	<label for="max-length-{index}" class="block text-sm font-medium mb-1">Max Length</label>
																	<input
																		id="max-length-{index}"
																		type="number"
																		value={question.maxLength || 1000}
																		oninput={(e) => updateQuestion(index, { maxLength: parseInt(e.currentTarget.value) || 1000 })}
																		placeholder="1000"
																		class="w-full px-3 py-2 border rounded-md"
																	/>
																</div>
															</div>
														</div>
													{/if}
													
													<!-- Common fields -->
													<div class="grid grid-cols-2 gap-4">
														<div>
															<label for="points-{index}" class="block text-sm font-medium mb-1">Points</label>
															<input
																id="points-{index}"
																type="number"
																value={question.points}
																oninput={(e) => updateQuestion(index, { points: parseInt(e.currentTarget.value) || 1 })}
																min="1"
																class="w-full px-3 py-2 border rounded-md"
															/>
														</div>
														<div>
															<label for="difficulty-{index}" class="block text-sm font-medium mb-1">Difficulty</label>
															<select
																id="difficulty-{index}"
																value={question.difficulty}
																onchange={(e) => updateQuestion(index, { difficulty: e.currentTarget.value as any })}
																class="w-full px-3 py-2 border rounded-md"
															>
																<option value="easy">Easy</option>
																<option value="medium">Medium</option>
																<option value="hard">Hard</option>
															</select>
														</div>
													</div>
													
													<div>
														<label for="explanation-{index}" class="block text-sm font-medium mb-1">Explanation (optional)</label>
														<textarea
															id="explanation-{index}"
															value={question.explanation || ''}
															oninput={(e) => updateQuestion(index, { explanation: e.currentTarget.value })}
															placeholder="Explain why this is the correct answer"
															class="w-full px-3 py-2 border rounded-md resize-none"
															rows="2"
														></textarea>
													</div>
													
													<div>
														<label for="hint-{index}" class="block text-sm font-medium mb-1">Hint (optional)</label>
														<Input
															type="text"
															value={question.hint || ''}
															oninput={(e) => updateQuestion(index, { hint: e.currentTarget.value })}
															placeholder="A hint to help students"
															class="w-full"
														/>
													</div>
												</div>
											{:else}
												<!-- Preview mode -->
												<p class="text-gray-700 line-clamp-2">
													{question.question || '(No question text)'}
												</p>
											{/if}
										</div>
										
										<!-- Actions -->
										<div class="flex items-center gap-1">
											<button
												onclick={() => moveQuestion(index, 'up')}
												disabled={index === 0}
												class="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
											>
												<MoveUp class="w-4 h-4" />
											</button>
											<button
												onclick={() => moveQuestion(index, 'down')}
												disabled={index === questions.length - 1}
												class="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
											>
												<MoveDown class="w-4 h-4" />
											</button>
											<button
												onclick={() => editingQuestionIndex = editingQuestionIndex === index ? null : index}
												class="p-1 text-blue-600 hover:text-blue-700"
											>
												{editingQuestionIndex === index ? 'Done' : 'Edit'}
											</button>
											<button
												onclick={() => deleteQuestion(index)}
												class="p-1 text-red-600 hover:text-red-700"
											>
												<Trash2 class="w-4 h-4" />
											</button>
										</div>
									</div>
								</div>
							{/each}
						</div>
					{/if}
				</CardContent>
			</Card>
		</div>
	{/if}
	
	<!-- Settings Tab -->
	{#if activeTab === 'settings'}
		<Card>
			<CardHeader>
				<CardTitle>Quiz Settings</CardTitle>
			</CardHeader>
			<CardContent class="space-y-6">
				<!-- Scoring -->
				<div>
					<h3 class="font-semibold mb-3">Scoring</h3>
					<div class="space-y-3">
						<div>
							<label for="passing-score" class="block text-sm font-medium mb-1">Passing Score (%)</label>
							<input
								id="passing-score"
								type="number"
								bind:value={settings.passingScore}
								min="0"
								max="100"
								class="w-32 px-3 py-2 border rounded-md"
							/>
							<p class="text-sm text-gray-600 mt-1">Minimum score required to pass</p>
						</div>
					</div>
				</div>
				
				<!-- Time limit -->
				<div>
					<h3 class="font-semibold mb-3">Time Limit</h3>
					<div class="space-y-3">
						<div>
							<label for="time-limit" class="block text-sm font-medium mb-1">Time Limit (minutes)</label>
							<input
								id="time-limit"
								type="number"
								bind:value={settings.timeLimit}
								min="0"
								placeholder="No limit"
								class="w-32 px-3 py-2 border rounded-md"
							/>
							<p class="text-sm text-gray-600 mt-1">Leave empty for no time limit</p>
						</div>
					</div>
				</div>
				
				<!-- Attempts -->
				<div>
					<h3 class="font-semibold mb-3">Attempts</h3>
					<div class="space-y-3">
						<label class="flex items-center gap-2">
							<input
								type="checkbox"
								bind:checked={settings.allowMultipleAttempts}
							/>
							<span>Allow multiple attempts</span>
						</label>
						
						{#if settings.allowMultipleAttempts}
							<div>
								<label for="max-attempts" class="block text-sm font-medium mb-1">Maximum Attempts</label>
								<input
									id="max-attempts"
									type="number"
									bind:value={settings.maxAttempts}
									min="1"
									placeholder="Unlimited"
									class="w-32 px-3 py-2 border rounded-md"
								/>
								<p class="text-sm text-gray-600 mt-1">Leave empty for unlimited attempts</p>
							</div>
						{/if}
					</div>
				</div>
				
				<!-- Feedback -->
				<div>
					<h3 class="font-semibold mb-3">Feedback</h3>
					<div class="space-y-3">
						<label class="flex items-center gap-2">
							<input
								type="checkbox"
								bind:checked={settings.showCorrectAnswers}
							/>
							<span>Show correct answers after submission</span>
						</label>
						
						<label class="flex items-center gap-2">
							<input
								type="checkbox"
								bind:checked={settings.showExplanations}
							/>
							<span>Show explanations after submission</span>
						</label>
						
						<label class="flex items-center gap-2">
							<input
								type="checkbox"
								bind:checked={settings.allowReview}
							/>
							<span>Allow reviewing quiz after completion</span>
						</label>
					</div>
				</div>
				
				<!-- Randomization -->
				<div>
					<h3 class="font-semibold mb-3">Randomization</h3>
					<div class="space-y-3">
						<label class="flex items-center gap-2">
							<input
								type="checkbox"
								bind:checked={settings.randomizeQuestions}
							/>
							<span>Randomize question order</span>
						</label>
						
						<label class="flex items-center gap-2">
							<input
								type="checkbox"
								bind:checked={settings.randomizeOptions}
							/>
							<span>Randomize option order</span>
						</label>
					</div>
				</div>
			</CardContent>
		</Card>
	{/if}
	
	<!-- Preview Tab -->
	{#if activeTab === 'preview'}
		<Card>
			<CardHeader>
				<CardTitle>Quiz Preview</CardTitle>
			</CardHeader>
			<CardContent>
				<div class="space-y-6">
					<div>
						<h2 class="text-2xl font-bold">{title || '(No title)'}</h2>
						{#if description}
							<p class="text-gray-600 mt-2">{description}</p>
						{/if}
					</div>
					
					<div class="border-t pt-4">
						<h3 class="font-semibold mb-2">Instructions</h3>
						<p class="text-gray-700">{instructions}</p>
					</div>
					
					<div class="grid grid-cols-2 gap-4 text-sm">
						<div>
							<span class="font-medium">Questions:</span> {questions.length}
						</div>
						<div>
							<span class="font-medium">Total Points:</span> {questions.reduce((sum, q) => sum + q.points, 0)}
						</div>
						<div>
							<span class="font-medium">Passing Score:</span> {settings.passingScore}%
						</div>
						<div>
							<span class="font-medium">Time Limit:</span> {settings.timeLimit ? `${settings.timeLimit} minutes` : 'No limit'}
						</div>
					</div>
					
					<div class="border-t pt-4">
						<h3 class="font-semibold mb-4">Questions Preview</h3>
						<div class="space-y-6">
							{#each questions as question, index}
								<div class="border-l-4 border-blue-500 pl-4">
									<div class="flex items-start justify-between mb-2">
										<span class="font-medium">Question {index + 1}</span>
										<span class="text-sm text-gray-600">{question.points} pts</span>
									</div>
									<p class="text-gray-700 mb-3">{question.question}</p>
									
									{#if question.type === 'multiple_choice' || question.type === 'multiple_select'}
										<div class="space-y-2 ml-4">
											{#each question.options || [] as option}
												<div class="flex items-center gap-2">
													<div class="w-4 h-4 border rounded {option.isCorrect ? 'bg-green-100 border-green-500' : 'border-gray-300'}"></div>
													<span class={option.isCorrect ? 'text-green-700 font-medium' : ''}>
														{option.text}
													</span>
													{#if option.isCorrect}
														<CheckCircle2 class="w-4 h-4 text-green-600" />
													{/if}
												</div>
											{/each}
										</div>
									{:else if question.type === 'true_false'}
										<div class="text-sm text-gray-600 ml-4">
											Correct answer: {question.correctAnswer ? 'True' : 'False'}
										</div>
									{:else if question.type === 'short_answer'}
										<div class="text-sm text-gray-600 ml-4">
											Sample answer: {question.correctAnswer}
										</div>
									{:else if question.type === 'essay'}
										<div class="text-sm text-gray-600 ml-4">
											Essay question ({question.minLength}-{question.maxLength} characters)
										</div>
									{/if}
									
									{#if question.explanation}
										<p class="text-sm text-gray-600 mt-2 ml-4">
											<span class="font-medium">Explanation:</span> {question.explanation}
										</p>
									{/if}
								</div>
							{/each}
						</div>
					</div>
				</div>
			</CardContent>
		</Card>
	{/if}
	
	<!-- Action buttons -->
	<div class="flex justify-between items-center mt-6 pt-6 border-t">
		<Button variant="outline" onclick={onCancel} disabled={isSaving}>
			Cancel
		</Button>
		
		<div class="flex gap-3">
			<Button
				variant="outline"
				onclick={handleSave}
				disabled={isSaving}
			>
				<Save class="w-4 h-4 mr-2" />
				{isSaving ? 'Saving...' : 'Save as Draft'}
			</Button>
			<Button
				onclick={handleSave}
				disabled={isSaving}
			>
				{isSaving ? 'Saving...' : 'Save Quiz'}
			</Button>
		</div>
	</div>
</div>

<style>
	.quiz-builder {
		min-height: 100vh;
	}
	
	.line-clamp-2 {
		display: -webkit-box;
		line-clamp: 2;
		-webkit-line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}
</style>
