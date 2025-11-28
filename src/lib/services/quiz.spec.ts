/**
 * Quiz Service Tests
 * Comprehensive test coverage for quiz CRUD, attempts, and grading
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import type { Quiz, QuizAnswer } from '$lib/types/quiz'

// Mock Firestore functions
const mockGetDoc = vi.fn()
const mockGetDocs = vi.fn()
const mockAddDoc = vi.fn()
const mockUpdateDoc = vi.fn()
const mockDeleteDoc = vi.fn()
const mockCollection = vi.fn()
const mockDoc = vi.fn()
const mockQuery = vi.fn()
const mockWhere = vi.fn()
const mockOrderBy = vi.fn()
const mockServerTimestamp = vi.fn(() => new Date().toISOString())
const mockArrayUnion = vi.fn((item) => [item])
const mockIncrement = vi.fn((n) => n)

// Mock batch operations
const mockBatchSet = vi.fn()
const mockBatchUpdate = vi.fn()
const mockBatchDelete = vi.fn()
const mockBatchCommit = vi.fn().mockResolvedValue(undefined)
const mockWriteBatch = vi.fn(() => ({
	set: mockBatchSet,
	update: mockBatchUpdate,
	delete: mockBatchDelete,
	commit: mockBatchCommit
}))

// Mock Firebase before imports
vi.mock('firebase/firestore', () => ({
	collection: (...args: any[]) => mockCollection(...args),
	doc: (...args: any[]) => mockDoc(...args),
	getDoc: (...args: any[]) => mockGetDoc(...args),
	getDocs: (...args: any[]) => mockGetDocs(...args),
	addDoc: (...args: any[]) => mockAddDoc(...args),
	updateDoc: (...args: any[]) => mockUpdateDoc(...args),
	deleteDoc: (...args: any[]) => mockDeleteDoc(...args),
	query: (...args: any[]) => mockQuery(...args),
	where: (...args: any[]) => mockWhere(...args),
	orderBy: (...args: any[]) => mockOrderBy(...args),
	limit: vi.fn(),
	serverTimestamp: () => mockServerTimestamp(),
	arrayUnion: (args: any) => mockArrayUnion(args),
	increment: (n: number) => mockIncrement(n),
	writeBatch: () => mockWriteBatch(),
	Timestamp: { now: () => ({ toDate: () => new Date() }) }
}))

vi.mock('$lib/firebase', () => ({
	db: 'mock-db'
}))

// Import service after mocks
const {
	createQuiz,
	getQuiz,
	updateQuiz,
	deleteQuiz,
	publishQuiz,
	startQuizAttempt,
	saveQuizAnswer,
	submitQuizAttempt,
	getUserQuizAttempts,
	getUserBestAttempt,
	getQuizStatistics
} = await import('./quiz')

// Helper to create mock quiz
function createMockQuiz(overrides: Partial<Quiz> = {}): Quiz {
	return {
		id: 'quiz-1',
		courseId: 'course-1',
		lessonId: 'lesson-1',
		title: 'JavaScript Basics Quiz',
		description: 'Test your knowledge',
		instructions: 'Answer all questions',
		questions: [
			{
				id: 'q1',
				type: 'multiple_choice',
				question: 'What is 2 + 2?',
				options: [
					{ id: 'opt1', text: '3', isCorrect: false },
					{ id: 'opt2', text: '4', isCorrect: true },
					{ id: 'opt3', text: '5', isCorrect: false },
					{ id: 'opt4', text: '6', isCorrect: false }
				],
				correctAnswer: '4',
				points: 10,
				order: 1
			},
			{
				id: 'q2',
				type: 'true_false',
				question: 'JavaScript is a compiled language',
				options: [
					{ id: 'opt1', text: 'True', isCorrect: false },
					{ id: 'opt2', text: 'False', isCorrect: true }
				],
				correctAnswer: 'False',
				points: 10,
				order: 2
			}
		],
		timeLimit: 30,
		passingScore: 70,
		maxAttempts: 3,
		allowMultipleAttempts: true,
		isPublished: true,
		randomizeQuestions: false,
		randomizeOptions: false,
		showCorrectAnswers: true,
		showExplanations: false,
		allowReview: true,
		createdAt: '2024-01-01T00:00:00.000Z',
		updatedAt: '2024-01-01T00:00:00.000Z',
		...overrides
	}
}

// Helper to create mock document snapshot
function createMockDocSnap(data: any, exists = true) {
	return {
		exists: () => exists,
		id: data?.id || 'mock-id',
		data: () => {
			const { id: _id, ...rest } = data || {}
			return rest
		}
	}
}

// Helper to create mock query snapshot
function createMockQuerySnap(docs: any[]) {
	return {
		docs: docs.map(doc => createMockDocSnap(doc))
	}
}

describe('Quiz Service', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		mockQuery.mockImplementation((...args) => args)
		mockWhere.mockImplementation((...args) => ({ _where: args }))
		mockOrderBy.mockImplementation((...args) => ({ _orderBy: args }))
		mockDoc.mockReturnValue({ id: 'mock-doc-ref' })
	})

	afterEach(() => {
		vi.clearAllMocks()
	})

	describe('Quiz CRUD Operations', () => {
		it('should create a quiz', async () => {
			const quizData = createMockQuiz()
			
			// Mock getDoc for course lookup
			mockGetDoc.mockResolvedValue(createMockDocSnap({ totalQuizzes: 0 }))
			// Mock doc to return ref with id
			mockDoc.mockReturnValue({ id: 'new-quiz-id' })
			
			const result = await createQuiz(quizData)
			
			expect(mockBatchSet).toHaveBeenCalled()
			expect(mockBatchCommit).toHaveBeenCalled()
			expect(result.id).toBe('new-quiz-id')
			expect(result.title).toBe(quizData.title)
		})

		it('should get quiz by id', async () => {
			const mockQuiz = createMockQuiz()
			mockGetDoc.mockResolvedValue(createMockDocSnap(mockQuiz))
			
			const result = await getQuiz('quiz-1')
			
			expect(mockGetDoc).toHaveBeenCalled()
			expect(result).toEqual(mockQuiz)
		})

		it('should return null for non-existent quiz', async () => {
			mockGetDoc.mockResolvedValue(createMockDocSnap(null, false))
			
			const result = await getQuiz('non-existent')
			
			expect(result).toBeNull()
		})

		it('should update quiz', async () => {
			const mockQuiz = createMockQuiz()
			const updates = { title: 'Updated Quiz Title' }
			
			// Mock getDoc to return existing quiz for the update check
			mockGetDoc.mockResolvedValue(createMockDocSnap(mockQuiz))
			
			await updateQuiz('quiz-1', updates)
			
			// With metadata fields, it uses batch; otherwise updateDoc
			expect(mockBatchCommit).toHaveBeenCalled()
		})

		it('should delete quiz', async () => {
			const mockQuiz = createMockQuiz()
			
			// Mock getDoc to return existing quiz and course
			mockGetDoc.mockResolvedValue(createMockDocSnap(mockQuiz))
			
			await deleteQuiz('quiz-1')
			
			// Delete uses batch when quiz has courseId
			expect(mockBatchDelete).toHaveBeenCalled()
			expect(mockBatchCommit).toHaveBeenCalled()
		})

		it('should publish quiz', async () => {
			await publishQuiz('quiz-1', true)
			
			expect(mockUpdateDoc).toHaveBeenCalled()
			const callArgs = mockUpdateDoc.mock.calls[0]
			expect(callArgs[1]).toHaveProperty('isPublished', true)
			expect(callArgs[1]).toHaveProperty('updatedAt')
		})

		it('should unpublish quiz', async () => {
			await publishQuiz('quiz-1', false)
			
			expect(mockUpdateDoc).toHaveBeenCalled()
			const callArgs = mockUpdateDoc.mock.calls[0]
			expect(callArgs[1]).toHaveProperty('isPublished', false)
			expect(callArgs[1]).toHaveProperty('publishedAt', null)
		})
	})

	describe('Quiz Attempts', () => {
		it('should start a quiz attempt', async () => {
			const mockQuiz = createMockQuiz()
			mockGetDoc.mockResolvedValue(createMockDocSnap(mockQuiz))
			mockGetDocs.mockResolvedValue(createMockQuerySnap([]))
			mockAddDoc.mockResolvedValue({ id: 'attempt-1' })
			
			const result = await startQuizAttempt('user-1', 'quiz-1', 'course-1', 'lesson-1')
			
			expect(result.id).toBe('attempt-1')
			expect(result.status).toBe('in_progress')
			expect(result.attemptNumber).toBe(1)
			expect(result.totalPoints).toBe(20) // 10 + 10
		})

		it('should throw error if quiz not published', async () => {
			const mockQuiz = createMockQuiz({ isPublished: false })
			mockGetDoc.mockResolvedValue(createMockDocSnap(mockQuiz))
			
			await expect(
				startQuizAttempt('user-1', 'quiz-1', 'course-1', 'lesson-1')
			).rejects.toThrow('Quiz is not published')
		})

		it('should throw error if max attempts reached', async () => {
			const mockQuiz = createMockQuiz({ maxAttempts: 2 })
			mockGetDoc.mockResolvedValue(createMockDocSnap(mockQuiz))
			
			// Mock 2 previous attempts
			mockGetDocs.mockResolvedValue(createMockQuerySnap([
				{ id: 'attempt-1', attemptNumber: 1 },
				{ id: 'attempt-2', attemptNumber: 2 }
			]))
			
			await expect(
				startQuizAttempt('user-1', 'quiz-1', 'course-1', 'lesson-1')
			).rejects.toThrow('Maximum attempts reached')
		})

		it('should save answer during attempt', async () => {
			const mockAttempt = {
				id: 'attempt-1',
				status: 'in_progress',
				answers: []
			}
			mockGetDoc.mockResolvedValue(createMockDocSnap(mockAttempt))
			
			const answer: QuizAnswer = {
				questionId: 'q1',
				questionType: 'multiple_choice',
				answer: '4',
				isCorrect: false,
				pointsEarned: 0,
				pointsPossible: 0,
				answeredAt: new Date().toISOString()
			}
			
			await saveQuizAnswer('attempt-1', answer)
			
			expect(mockUpdateDoc).toHaveBeenCalled()
		})

		it('should throw error when modifying submitted attempt', async () => {
			const mockAttempt = {
				id: 'attempt-1',
				status: 'submitted',
				answers: []
			}
			mockGetDoc.mockResolvedValue(createMockDocSnap(mockAttempt))
			
			const answer: QuizAnswer = {
				questionId: 'q1',
				questionType: 'multiple_choice',
				answer: '4',
				isCorrect: false,
				pointsEarned: 0,
				pointsPossible: 0,
				answeredAt: new Date().toISOString()
			}
			
			await expect(
				saveQuizAnswer('attempt-1', answer)
			).rejects.toThrow('Cannot modify submitted attempt')
		})

		it('should update existing answer when answering same question', async () => {
			const existingAnswer: QuizAnswer = {
				questionId: 'q1',
				questionType: 'multiple_choice',
				answer: '3',
				isCorrect: false,
				pointsEarned: 0,
				pointsPossible: 10,
				answeredAt: new Date().toISOString()
			}
			
			const mockAttempt = {
				id: 'attempt-1',
				status: 'in_progress',
				answers: [existingAnswer]
			}
			mockGetDoc.mockResolvedValue(createMockDocSnap(mockAttempt))
			
			const newAnswer: QuizAnswer = {
				questionId: 'q1',
				questionType: 'multiple_choice',
				answer: '4',
				isCorrect: false,
				pointsEarned: 0,
				pointsPossible: 10,
				answeredAt: new Date().toISOString()
			}
			
			await saveQuizAnswer('attempt-1', newAnswer)
			
			expect(mockUpdateDoc).toHaveBeenCalled()
			const callArgs = mockUpdateDoc.mock.calls[0]
			expect(callArgs[1].answers).toBeDefined()
			expect(callArgs[1].answers[0]).toHaveProperty('questionId', 'q1')
			expect(callArgs[1].answers[0]).toHaveProperty('answer', '4')
		})
	})

	describe('Quiz Grading - Multiple Choice', () => {
		it('should grade correct multiple choice answer', async () => {
			const mockQuiz = createMockQuiz()
			const mockAttempt = {
				id: 'attempt-1',
				quizId: 'quiz-1',
				status: 'in_progress',
				answers: [
					{ questionId: 'q1', questionType: 'multiple_choice', answer: '4', isCorrect: false, pointsEarned: 0, pointsPossible: 0, answeredAt: new Date().toISOString() }
				]
			}
			
			mockGetDoc
				.mockResolvedValueOnce(createMockDocSnap(mockAttempt))
				.mockResolvedValueOnce(createMockDocSnap(mockQuiz))
			
			const result = await submitQuizAttempt('attempt-1', 120)
			
			expect(result.answers[0].isCorrect).toBe(true)
			expect(result.answers[0].pointsEarned).toBe(10)
			expect(result.score).toBe(50) // 1/2 questions correct
		})

		it('should grade incorrect multiple choice answer', async () => {
			const mockQuiz = createMockQuiz()
			const mockAttempt = {
				id: 'attempt-1',
				quizId: 'quiz-1',
				status: 'in_progress',
				answers: [
					{ questionId: 'q1', questionType: 'multiple_choice', answer: '3', isCorrect: false, pointsEarned: 0, pointsPossible: 0, answeredAt: new Date().toISOString() }
				]
			}
			
			mockGetDoc
				.mockResolvedValueOnce(createMockDocSnap(mockAttempt))
				.mockResolvedValueOnce(createMockDocSnap(mockQuiz))
			
			const result = await submitQuizAttempt('attempt-1', 120)
			
			expect(result.answers[0].isCorrect).toBe(false)
			expect(result.answers[0].pointsEarned).toBe(0)
		})
	})

	describe('Quiz Grading - True/False', () => {
		it('should grade correct true/false answer', async () => {
			const mockQuiz = createMockQuiz()
			const mockAttempt = {
				id: 'attempt-1',
				quizId: 'quiz-1',
				status: 'in_progress',
				answers: [
					{ questionId: 'q2', questionType: 'true_false', answer: 'False', isCorrect: false, pointsEarned: 0, pointsPossible: 0, answeredAt: new Date().toISOString() }
				]
			}
			
			mockGetDoc
				.mockResolvedValueOnce(createMockDocSnap(mockAttempt))
				.mockResolvedValueOnce(createMockDocSnap(mockQuiz))
			
			const result = await submitQuizAttempt('attempt-1', 120)
			
			expect(result.answers[0].isCorrect).toBe(true)
			expect(result.answers[0].pointsEarned).toBe(10)
		})
	})

	describe('Quiz Grading - Multiple Select', () => {
		it('should grade correct multiple select answer', async () => {
			const mockQuiz = createMockQuiz({
				questions: [
					{
						id: 'q1',
						type: 'multiple_select',
						question: 'Select all prime numbers',
						options: [
							{ id: 'opt1', text: '2', isCorrect: true },
							{ id: 'opt2', text: '3', isCorrect: true },
							{ id: 'opt3', text: '4', isCorrect: false },
							{ id: 'opt4', text: '5', isCorrect: true }
						],
						correctAnswer: ['opt1', 'opt2', 'opt4'],
						points: 10,
						order: 1
					}
				]
			})
			
			const mockAttempt = {
				id: 'attempt-1',
				quizId: 'quiz-1',
				status: 'in_progress',
				answers: [
					{ questionId: 'q1', questionType: 'multiple_select', answer: ['opt1', 'opt2', 'opt4'], isCorrect: false, pointsEarned: 0, pointsPossible: 0, answeredAt: new Date().toISOString() }
				]
			}
			
			mockGetDoc
				.mockResolvedValueOnce(createMockDocSnap(mockAttempt))
				.mockResolvedValueOnce(createMockDocSnap(mockQuiz))
			
			const result = await submitQuizAttempt('attempt-1', 120)
			
			expect(result.answers[0].isCorrect).toBe(true)
			expect(result.answers[0].pointsEarned).toBe(10)
		})

		it('should grade incorrect multiple select answer (wrong order)', async () => {
			const mockQuiz = createMockQuiz({
				questions: [
					{
						id: 'q1',
						type: 'multiple_select',
						question: 'Select all prime numbers',
						options: [
							{ id: 'opt1', text: '2', isCorrect: true },
							{ id: 'opt2', text: '3', isCorrect: true },
							{ id: 'opt3', text: '4', isCorrect: false },
							{ id: 'opt4', text: '5', isCorrect: true }
						],
						correctAnswer: ['opt1', 'opt2', 'opt4'],
						points: 10,
						order: 1
					}
				]
			})
			
			// Answer in different order but same values - should still be correct
			const mockAttempt = {
				id: 'attempt-1',
				quizId: 'quiz-1',
				status: 'in_progress',
				answers: [
					{ questionId: 'q1', questionType: 'multiple_select', answer: ['opt4', 'opt1', 'opt2'], isCorrect: false, pointsEarned: 0, pointsPossible: 0, answeredAt: new Date().toISOString() }
				]
			}
			
			mockGetDoc
				.mockResolvedValueOnce(createMockDocSnap(mockAttempt))
				.mockResolvedValueOnce(createMockDocSnap(mockQuiz))
			
			const result = await submitQuizAttempt('attempt-1', 120)
			
			// Should still be correct because arrays are sorted before comparison
			expect(result.answers[0].isCorrect).toBe(true)
		})

		it('should grade incorrect multiple select answer (missing option)', async () => {
			const mockQuiz = createMockQuiz({
				questions: [
					{
						id: 'q1',
						type: 'multiple_select',
						question: 'Select all prime numbers',
						options: [
							{ id: 'opt1', text: '2', isCorrect: true },
							{ id: 'opt2', text: '3', isCorrect: true },
							{ id: 'opt3', text: '4', isCorrect: false },
							{ id: 'opt4', text: '5', isCorrect: true }
						],
						correctAnswer: ['opt1', 'opt2', 'opt4'],
						points: 10,
						order: 1
					}
				]
			})
			
			const mockAttempt = {
				id: 'attempt-1',
				quizId: 'quiz-1',
				status: 'in_progress',
				answers: [
					{ questionId: 'q1', questionType: 'multiple_select', answer: ['opt1', 'opt2'], isCorrect: false, pointsEarned: 0, pointsPossible: 0, answeredAt: new Date().toISOString() }
				]
			}
			
			mockGetDoc
				.mockResolvedValueOnce(createMockDocSnap(mockAttempt))
				.mockResolvedValueOnce(createMockDocSnap(mockQuiz))
			
			const result = await submitQuizAttempt('attempt-1', 120)
			
			expect(result.answers[0].isCorrect).toBe(false)
			expect(result.answers[0].pointsEarned).toBe(0)
		})
	})

	describe('Quiz Grading - Short Answer', () => {
		it('should grade correct short answer (case insensitive)', async () => {
			const mockQuiz = createMockQuiz({
				questions: [
					{
						id: 'q1',
						type: 'short_answer',
						question: 'What is the capital of France?',
						correctAnswer: 'Paris',
						caseSensitive: false,
						points: 10,
						order: 1
					}
				]
			})
			
			const mockAttempt = {
				id: 'attempt-1',
				quizId: 'quiz-1',
				status: 'in_progress',
				answers: [
					{ questionId: 'q1', questionType: 'short_answer', answer: 'paris', isCorrect: false, pointsEarned: 0, pointsPossible: 0, answeredAt: new Date().toISOString() }
				]
			}
			
			mockGetDoc
				.mockResolvedValueOnce(createMockDocSnap(mockAttempt))
				.mockResolvedValueOnce(createMockDocSnap(mockQuiz))
			
			const result = await submitQuizAttempt('attempt-1', 120)
			
			expect(result.answers[0].isCorrect).toBe(true)
		})

		it('should grade incorrect short answer (case sensitive)', async () => {
			const mockQuiz = createMockQuiz({
				questions: [
					{
						id: 'q1',
						type: 'short_answer',
						question: 'What is the capital of France?',
						correctAnswer: 'Paris',
						caseSensitive: true,
						points: 10,
						order: 1
					}
				]
			})
			
			const mockAttempt = {
				id: 'attempt-1',
				quizId: 'quiz-1',
				status: 'in_progress',
				answers: [
					{ questionId: 'q1', questionType: 'short_answer', answer: 'paris', isCorrect: false, pointsEarned: 0, pointsPossible: 0, answeredAt: new Date().toISOString() }
				]
			}
			
			mockGetDoc
				.mockResolvedValueOnce(createMockDocSnap(mockAttempt))
				.mockResolvedValueOnce(createMockDocSnap(mockQuiz))
			
			const result = await submitQuizAttempt('attempt-1', 120)
			
			expect(result.answers[0].isCorrect).toBe(false)
		})

		it('should accept alternative correct answers', async () => {
			const mockQuiz = createMockQuiz({
				questions: [
					{
						id: 'q1',
						type: 'short_answer',
						question: 'What is 2 + 2?',
						correctAnswer: '4',
						acceptableAnswers: ['four', 'Four'],
						caseSensitive: false,
						points: 10,
						order: 1
					}
				]
			})
			
			const mockAttempt = {
				id: 'attempt-1',
				quizId: 'quiz-1',
				status: 'in_progress',
				answers: [
					{ questionId: 'q1', questionType: 'short_answer', answer: 'four', isCorrect: false, pointsEarned: 0, pointsPossible: 0, answeredAt: new Date().toISOString() }
				]
			}
			
			mockGetDoc
				.mockResolvedValueOnce(createMockDocSnap(mockAttempt))
				.mockResolvedValueOnce(createMockDocSnap(mockQuiz))
			
			const result = await submitQuizAttempt('attempt-1', 120)
			
			expect(result.answers[0].isCorrect).toBe(true)
		})
	})

	describe('Quiz Grading - Fill in the Blank', () => {
		it('should grade correct fill blank answer', async () => {
			const mockQuiz = createMockQuiz({
				questions: [
					{
						id: 'q1',
						type: 'fill_blank',
						question: 'JavaScript is a _____ language',
						correctAnswer: 'programming',
						caseSensitive: false,
						points: 10,
						order: 1
					}
				]
			})
			
			const mockAttempt = {
				id: 'attempt-1',
				quizId: 'quiz-1',
				status: 'in_progress',
				answers: [
					{ questionId: 'q1', questionType: 'fill_blank', answer: 'Programming', isCorrect: false, pointsEarned: 0, pointsPossible: 0, answeredAt: new Date().toISOString() }
				]
			}
			
			mockGetDoc
				.mockResolvedValueOnce(createMockDocSnap(mockAttempt))
				.mockResolvedValueOnce(createMockDocSnap(mockQuiz))
			
			const result = await submitQuizAttempt('attempt-1', 120)
			
			expect(result.answers[0].isCorrect).toBe(true)
		})
	})

	describe('Quiz Grading - Null/Empty Answers', () => {
		it('should handle null answers', async () => {
			const mockQuiz = createMockQuiz()
			const mockAttempt = {
				id: 'attempt-1',
				quizId: 'quiz-1',
				status: 'in_progress',
				answers: [
					{ questionId: 'q1', questionType: 'multiple_choice', answer: null, isCorrect: false, pointsEarned: 0, pointsPossible: 0, answeredAt: new Date().toISOString() }
				]
			}
			
			mockGetDoc
				.mockResolvedValueOnce(createMockDocSnap(mockAttempt))
				.mockResolvedValueOnce(createMockDocSnap(mockQuiz))
			
			const result = await submitQuizAttempt('attempt-1', 120)
			
			expect(result.answers[0].isCorrect).toBe(false)
			expect(result.answers[0].pointsEarned).toBe(0)
			expect(result.answers[0].pointsPossible).toBe(10)
		})
	})

	describe('Quiz Scoring', () => {
		it('should calculate score and determine pass/fail', async () => {
			const mockQuiz = createMockQuiz({ passingScore: 70 })
			const mockAttempt = {
				id: 'attempt-1',
				quizId: 'quiz-1',
				status: 'in_progress',
				answers: [
					{ questionId: 'q1', questionType: 'multiple_choice', answer: '4', isCorrect: false, pointsEarned: 0, pointsPossible: 0, answeredAt: new Date().toISOString() },
					{ questionId: 'q2', questionType: 'true_false', answer: 'False', isCorrect: false, pointsEarned: 0, pointsPossible: 0, answeredAt: new Date().toISOString() }
				]
			}
			
			mockGetDoc
				.mockResolvedValueOnce(createMockDocSnap(mockAttempt))
				.mockResolvedValueOnce(createMockDocSnap(mockQuiz))
			
			const result = await submitQuizAttempt('attempt-1', 120)
			
			expect(result.score).toBe(100) // 2/2 correct
			expect(result.pointsEarned).toBe(20) // 10 + 10
			expect(result.isPassed).toBe(true) // 100 >= 70
			expect(result.status).toBe('submitted')
		})

		it('should mark as failed if score below passing', async () => {
			const mockQuiz = createMockQuiz({ passingScore: 70 })
			const mockAttempt = {
				id: 'attempt-1',
				quizId: 'quiz-1',
				status: 'in_progress',
				answers: [
					{ questionId: 'q1', questionType: 'multiple_choice', answer: '3', isCorrect: false, pointsEarned: 0, pointsPossible: 0, answeredAt: new Date().toISOString() }
				]
			}
			
			mockGetDoc
				.mockResolvedValueOnce(createMockDocSnap(mockAttempt))
				.mockResolvedValueOnce(createMockDocSnap(mockQuiz))
			
			const result = await submitQuizAttempt('attempt-1', 120)
			
			expect(result.score).toBe(0) // 0/2 correct (only 1 answer provided)
			expect(result.isPassed).toBe(false) // 0 < 70
		})
	})

	describe('Quiz Statistics', () => {
		it('should calculate statistics for quiz with attempts', async () => {
			const attempts = [
				{
					id: 'attempt-1',
					userId: 'user-1',
					quizId: 'quiz-1',
					score: 85,
					isPassed: true,
					timeSpent: 600
				},
				{
					id: 'attempt-2',
					userId: 'user-2',
					quizId: 'quiz-1',
					score: 95,
					isPassed: true,
					timeSpent: 480
				},
				{
					id: 'attempt-3',
					userId: 'user-1',
					quizId: 'quiz-1',
					score: 65,
					isPassed: false,
					timeSpent: 720
				}
			]
			
			mockGetDocs.mockResolvedValue(createMockQuerySnap(attempts))
			
			const stats = await getQuizStatistics('quiz-1')
			
			expect(stats.totalAttempts).toBe(3)
			expect(stats.uniqueUsers).toBe(2)
			expect(stats.averageScore).toBeCloseTo(81.67, 1) // (85 + 95 + 65) / 3
			expect(stats.highestScore).toBe(95)
			expect(stats.lowestScore).toBe(65)
			expect(stats.passRate).toBeCloseTo(66.67, 1) // 2/3 passed
			expect(stats.estimatedDifficulty).toBe('easy') // avg > 80
		})

		it('should handle quiz with no attempts', async () => {
			mockGetDocs.mockResolvedValue(createMockQuerySnap([]))
			
			const stats = await getQuizStatistics('quiz-1')
			
			expect(stats.totalAttempts).toBe(0)
			expect(stats.uniqueUsers).toBe(0)
			expect(stats.averageScore).toBe(0)
			expect(stats.passRate).toBe(0)
		})

		it('should estimate difficulty correctly', async () => {
			// Test "hard" difficulty (avg < 60)
			mockGetDocs.mockResolvedValue(createMockQuerySnap([
				{ id: 'a1', userId: 'u1', score: 50, isPassed: false, timeSpent: 600 }
			]))
			
			let stats = await getQuizStatistics('quiz-1')
			expect(stats.estimatedDifficulty).toBe('hard')
			
			// Test "medium" difficulty (60 <= avg < 80)
			mockGetDocs.mockResolvedValue(createMockQuerySnap([
				{ id: 'a1', userId: 'u1', score: 70, isPassed: true, timeSpent: 600 }
			]))
			
			stats = await getQuizStatistics('quiz-1')
			expect(stats.estimatedDifficulty).toBe('medium')
			
			// Test "easy" difficulty (avg >= 80)
			mockGetDocs.mockResolvedValue(createMockQuerySnap([
				{ id: 'a1', userId: 'u1', score: 90, isPassed: true, timeSpent: 600 }
			]))
			
			stats = await getQuizStatistics('quiz-1')
			expect(stats.estimatedDifficulty).toBe('easy')
		})
	})

	describe('User Quiz Attempts', () => {
		it('should get user attempts for a quiz', async () => {
			const attempts = [
				{ id: 'attempt-2', attemptNumber: 2, score: 85 },
				{ id: 'attempt-1', attemptNumber: 1, score: 75 }
			]
			
			mockGetDocs.mockResolvedValue(createMockQuerySnap(attempts))
			
			const result = await getUserQuizAttempts('user-1', 'quiz-1')
			
			expect(result).toHaveLength(2)
			expect(result[0].id).toBe('attempt-2')
			expect(result[1].id).toBe('attempt-1')
		})

		it('should get user best attempt', async () => {
			const attempts = [
				{ id: 'attempt-1', score: 75, attemptNumber: 1 },
				{ id: 'attempt-2', score: 95, attemptNumber: 2 },
				{ id: 'attempt-3', score: 85, attemptNumber: 3 }
			]
			
			mockGetDocs.mockResolvedValue(createMockQuerySnap(attempts))
			
			const result = await getUserBestAttempt('user-1', 'quiz-1')
			
			expect(result?.id).toBe('attempt-2')
			expect(result?.score).toBe(95)
		})

		it('should return null if no attempts', async () => {
			mockGetDocs.mockResolvedValue(createMockQuerySnap([]))
			
			const result = await getUserBestAttempt('user-1', 'quiz-1')
			
			expect(result).toBeNull()
		})
	})
})
