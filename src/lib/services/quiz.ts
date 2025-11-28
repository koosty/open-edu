/**
 * Quiz Service
 * Handles all quiz-related operations including CRUD, attempts, and scoring
 * v1.6.0: Added quiz metadata sync to course document
 */

import {
	collection,
	doc,
	getDoc,
	getDocs,
	addDoc,
	updateDoc,
	deleteDoc,
	query,
	where,
	orderBy,
	serverTimestamp,
	arrayUnion,
	increment,
	writeBatch
} from 'firebase/firestore'
import { db } from '$lib/firebase'
import { COLLECTIONS } from '$lib/firebase/collections'
import type {
	Quiz,
	QuizAttempt,
	QuizAnswer,
	QuizStatistics
} from '$lib/types/quiz'
import type { Lesson } from '$lib/types'
import type { QuizMetadata } from '$lib/types/lesson'
import { buildQuizMetadata } from '$lib/types/lesson'

// ============================================
// Quiz CRUD Operations
// ============================================

/**
 * Create a new quiz
 * v1.6.0: Uses batch write to atomically create quiz and update course metadata
 */
export async function createQuiz(quizData: Omit<Quiz, 'id' | 'createdAt' | 'updatedAt'>): Promise<Quiz> {
	const batch = writeBatch(db)
	
	// Create the quiz document
	const quizRef = doc(collection(db, COLLECTIONS.QUIZZES))
	const now = new Date().toISOString()
	
	const newQuiz = {
		...quizData,
		createdAt: serverTimestamp(),
		updatedAt: serverTimestamp()
	}
	
	batch.set(quizRef, newQuiz)
	
	// Update course with quiz metadata if courseId is provided
	if (quizData.courseId) {
		const courseRef = doc(db, COLLECTIONS.COURSES, quizData.courseId)
		
		// Get current quiz count to determine order
		const courseSnap = await getDoc(courseRef)
		const courseData = courseSnap.data()
		const currentQuizCount = courseData?.totalQuizzes || 0
		
		// Build quiz metadata
		const quizMetadata = buildQuizMetadata(
			{
				id: quizRef.id,
				lessonId: quizData.lessonId,
				title: quizData.title,
				questions: quizData.questions,
				passingScore: quizData.passingScore,
				timeLimit: quizData.timeLimit
			},
			currentQuizCount + 1
		)
		
		batch.update(courseRef, {
			quizzesMetadata: arrayUnion(quizMetadata),
			totalQuizzes: increment(1),
			updatedAt: serverTimestamp()
		})
	}
	
	await batch.commit()
	
	return {
		...quizData,
		id: quizRef.id,
		createdAt: now,
		updatedAt: now
	} as Quiz
}

/**
 * Create a new quiz with an associated lesson
 * This is the preferred method for creating quizzes as it ensures 
 * the lesson and quiz are properly linked and the lesson type is set correctly
 * v1.6.0: Uses batch write to atomically create quiz, lesson, and update course metadata
 */
export async function createQuizWithLesson(
	courseId: string,
	lessonData: {
		title: string
		description?: string
		duration?: number
		order?: number
		isRequired?: boolean
	},
	quizData: Omit<Quiz, 'id' | 'createdAt' | 'updatedAt' | 'lessonId' | 'courseId'>
): Promise<{ quiz: Quiz; lesson: Lesson }> {
	const batch = writeBatch(db)
	
	// Get the course to determine the next lesson order
	const courseRef = doc(db, COLLECTIONS.COURSES, courseId)
	const courseSnap = await getDoc(courseRef)
	
	if (!courseSnap.exists()) {
		throw new Error('Course not found')
	}
	
	const courseData = courseSnap.data()
	const existingLessons = courseData.lessons || []
	const currentQuizCount = courseData.totalQuizzes || 0
	
	// Generate lesson ID
	const lessonId = `lesson-${Date.now()}`
	const now = new Date().toISOString()
	
	// Create lesson object
	// Note: Only include duration if it's actually provided (Firestore doesn't support undefined)
	const newLesson: Lesson = {
		id: lessonId,
		courseId,
		title: lessonData.title,
		description: lessonData.description || '',
		order: lessonData.order ?? existingLessons.length + 1,
		...(lessonData.duration !== undefined && { duration: lessonData.duration }),
		isRequired: lessonData.isRequired ?? true,
		createdAt: now,
		updatedAt: now
	}
	
	// Create quiz document reference
	const quizRef = doc(collection(db, COLLECTIONS.QUIZZES))
	const newQuiz = {
		...quizData,
		courseId,
		lessonId,
		createdAt: serverTimestamp(),
		updatedAt: serverTimestamp()
	}
	
	batch.set(quizRef, newQuiz)
	
	// Build the created quiz object for return
	const createdQuiz: Quiz = {
		id: quizRef.id,
		...quizData,
		courseId,
		lessonId,
		createdAt: now,
		updatedAt: now
	}
	
	// Update the lesson to include the quiz data
	// This is required by the validation schema
	const lessonWithQuiz: Lesson = {
		...newLesson,
		quiz: createdQuiz
	}
	
	// Build quiz metadata for course document
	const quizMetadata = buildQuizMetadata(
		{
			id: quizRef.id,
			lessonId,
			title: quizData.title,
			questions: quizData.questions,
			passingScore: quizData.passingScore,
			timeLimit: quizData.timeLimit
		},
		currentQuizCount + 1
	)
	
	// Update course with lesson and quiz metadata
	batch.update(courseRef, {
		lessons: arrayUnion(lessonWithQuiz),
		quizzesMetadata: arrayUnion(quizMetadata),
		totalQuizzes: increment(1),
		updatedAt: serverTimestamp()
	})
	
	await batch.commit()
	
	return {
		quiz: createdQuiz,
		lesson: lessonWithQuiz
	}
}

/**
 * Get quiz by ID
 */
export async function getQuiz(quizId: string): Promise<Quiz | null> {
	const quizRef = doc(db, COLLECTIONS.QUIZZES, quizId)
	const quizSnap = await getDoc(quizRef)
	
	if (!quizSnap.exists()) {
		return null
	}
	
	return {
		id: quizSnap.id,
		...quizSnap.data() as Omit<Quiz, 'id'>
	}
}

/**
 * Get all quizzes for a lesson
 */
export async function getQuizzesByLesson(lessonId: string): Promise<Quiz[]> {
	const quizzesRef = collection(db, COLLECTIONS.QUIZZES)
	const q = query(
		quizzesRef,
		where('lessonId', '==', lessonId),
		orderBy('createdAt', 'desc')
	)
	
	const querySnap = await getDocs(q)
	return querySnap.docs.map(doc => ({
		id: doc.id,
		...doc.data() as Omit<Quiz, 'id'>
	}))
}

/**
 * Get all quizzes for a course
 */
export async function getQuizzesByCourse(courseId: string): Promise<Quiz[]> {
	const quizzesRef = collection(db, COLLECTIONS.QUIZZES)
	const q = query(
		quizzesRef,
		where('courseId', '==', courseId),
		orderBy('createdAt', 'desc')
	)
	
	const querySnap = await getDocs(q)
	return querySnap.docs.map(doc => ({
		id: doc.id,
		...doc.data() as Omit<Quiz, 'id'>
	}))
}

/**
 * Update quiz
 * v1.6.0: Syncs metadata changes to course document if relevant fields changed
 */
export async function updateQuiz(quizId: string, updates: Partial<Quiz>): Promise<void> {
	const quizRef = doc(db, COLLECTIONS.QUIZZES, quizId)
	
	// Check if we need to update course metadata
	const metadataFields = ['title', 'questions', 'passingScore', 'timeLimit']
	const needsMetadataSync = metadataFields.some(field => field in updates)
	
	if (needsMetadataSync) {
		// Get the current quiz to find courseId and build updated metadata
		const quizSnap = await getDoc(quizRef)
		if (!quizSnap.exists()) {
			throw new Error('Quiz not found')
		}
		
		const currentQuiz = { id: quizSnap.id, ...quizSnap.data() } as Quiz
		
		if (currentQuiz.courseId) {
			const batch = writeBatch(db)
			
			// Update the quiz document
			batch.update(quizRef, {
				...updates,
				updatedAt: serverTimestamp()
			})
			
			// Get course to find and update existing metadata
			const courseRef = doc(db, COLLECTIONS.COURSES, currentQuiz.courseId)
			const courseSnap = await getDoc(courseRef)
			
			if (courseSnap.exists()) {
				const courseData = courseSnap.data()
				const quizzesMetadata = (courseData.quizzesMetadata || []) as QuizMetadata[]
				
				// Find existing metadata entry
				const existingIndex = quizzesMetadata.findIndex(q => q.id === quizId)
				
				if (existingIndex >= 0) {
					// Build updated metadata
					const mergedQuiz = { ...currentQuiz, ...updates }
					const updatedMetadata = buildQuizMetadata(
						{
							id: quizId,
							lessonId: mergedQuiz.lessonId,
							title: mergedQuiz.title,
							questions: mergedQuiz.questions,
							passingScore: mergedQuiz.passingScore,
							timeLimit: mergedQuiz.timeLimit
						},
						quizzesMetadata[existingIndex].order
					)
					
					// Replace the metadata entry
					const newQuizzesMetadata = [...quizzesMetadata]
					newQuizzesMetadata[existingIndex] = updatedMetadata
					
					batch.update(courseRef, {
						quizzesMetadata: newQuizzesMetadata,
						updatedAt: serverTimestamp()
					})
				}
			}
			
			await batch.commit()
			return
		}
	}
	
	// Simple update without metadata sync
	await updateDoc(quizRef, {
		...updates,
		updatedAt: serverTimestamp()
	})
}

/**
 * Delete quiz
 * v1.6.0: Also removes quiz metadata from course document and decrements count
 */
export async function deleteQuiz(quizId: string): Promise<void> {
	const quizRef = doc(db, COLLECTIONS.QUIZZES, quizId)
	
	// Get the quiz to find courseId
	const quizSnap = await getDoc(quizRef)
	
	if (!quizSnap.exists()) {
		throw new Error('Quiz not found')
	}
	
	const quizData = quizSnap.data() as Quiz
	
	if (quizData.courseId) {
		const batch = writeBatch(db)
		
		// Delete the quiz document
		batch.delete(quizRef)
		
		// Update course: remove metadata and decrement count
		const courseRef = doc(db, COLLECTIONS.COURSES, quizData.courseId)
		const courseSnap = await getDoc(courseRef)
		
		if (courseSnap.exists()) {
			const courseData = courseSnap.data()
			const quizzesMetadata = (courseData.quizzesMetadata || []) as QuizMetadata[]
			
			// Filter out the deleted quiz metadata
			const updatedMetadata = quizzesMetadata.filter(q => q.id !== quizId)
			
			// Reorder remaining quizzes
			const reorderedMetadata = updatedMetadata.map((q, index) => ({
				...q,
				order: index + 1
			}))
			
			batch.update(courseRef, {
				quizzesMetadata: reorderedMetadata,
				totalQuizzes: increment(-1),
				updatedAt: serverTimestamp()
			})
		}
		
		await batch.commit()
	} else {
		// Simple delete without metadata sync
		await deleteDoc(quizRef)
	}
}

/**
 * Publish/unpublish quiz
 */
export async function publishQuiz(quizId: string, isPublished: boolean): Promise<void> {
	const quizRef = doc(db, COLLECTIONS.QUIZZES, quizId)
	
	await updateDoc(quizRef, {
		isPublished,
		publishedAt: isPublished ? serverTimestamp() : null,
		updatedAt: serverTimestamp()
	})
}

// ============================================
// Quiz Attempt Operations
// ============================================

/**
 * Start a new quiz attempt
 */
export async function startQuizAttempt(
	userId: string,
	quizId: string,
	courseId: string,
	lessonId: string
): Promise<QuizAttempt> {
	// Get quiz details
	const quiz = await getQuiz(quizId)
	if (!quiz) {
		throw new Error('Quiz not found')
	}
	
	// Check if quiz is published
	if (!quiz.isPublished) {
		throw new Error('Quiz is not published')
	}
	
	// Get previous attempts count
	const previousAttempts = await getUserQuizAttempts(userId, quizId)
	const attemptNumber = previousAttempts.length + 1
	
	// Check if max attempts reached
	if (quiz.maxAttempts && attemptNumber > quiz.maxAttempts) {
		throw new Error('Maximum attempts reached')
	}
	
	// Calculate total points
	const totalPoints = quiz.questions.reduce((sum, q) => sum + q.points, 0)
	
	const attemptData: Omit<QuizAttempt, 'id'> = {
		userId,
		quizId,
		courseId,
		lessonId,
		attemptNumber,
		status: 'in_progress',
		answers: [],
		score: 0,
		pointsEarned: 0,
		totalPoints,
		isPassed: false,
		startedAt: new Date().toISOString(),
		timeSpent: 0
	}
	
	const attemptsRef = collection(db, COLLECTIONS.QUIZ_ATTEMPTS)
	const docRef = await addDoc(attemptsRef, attemptData)
	
	return {
		id: docRef.id,
		...attemptData
	}
}

/**
 * Save answer to in-progress attempt
 */
export async function saveQuizAnswer(
	attemptId: string,
	answer: QuizAnswer
): Promise<void> {
	const attemptRef = doc(db, COLLECTIONS.QUIZ_ATTEMPTS, attemptId)
	const attemptSnap = await getDoc(attemptRef)
	
	if (!attemptSnap.exists()) {
		throw new Error('Attempt not found')
	}
	
	const attempt = attemptSnap.data() as Omit<QuizAttempt, 'id'>
	
	if (attempt.status !== 'in_progress') {
		throw new Error('Cannot modify submitted attempt')
	}
	
	// Update or add answer
	const existingAnswerIndex = attempt.answers.findIndex(
		a => a.questionId === answer.questionId
	)
	
	let updatedAnswers: QuizAnswer[]
	if (existingAnswerIndex >= 0) {
		updatedAnswers = [...attempt.answers]
		updatedAnswers[existingAnswerIndex] = answer
	} else {
		updatedAnswers = [...attempt.answers, answer]
	}
	
	await updateDoc(attemptRef, {
		answers: updatedAnswers,
		updatedAt: serverTimestamp()
	})
}

/**
 * Submit quiz attempt and calculate score
 */
export async function submitQuizAttempt(
	attemptId: string,
	timeSpent: number
): Promise<QuizAttempt> {
	const attemptRef = doc(db, COLLECTIONS.QUIZ_ATTEMPTS, attemptId)
	const attemptSnap = await getDoc(attemptRef)
	
	if (!attemptSnap.exists()) {
		throw new Error('Attempt not found')
	}
	
	const attempt = {
		id: attemptSnap.id,
		...attemptSnap.data() as Omit<QuizAttempt, 'id'>
	}
	
	if (attempt.status !== 'in_progress') {
		throw new Error('Attempt already submitted')
	}
	
	// Get quiz to check answers
	const quiz = await getQuiz(attempt.quizId)
	if (!quiz) {
		throw new Error('Quiz not found')
	}
	
	// Grade all answers
	const gradedAnswers = gradeQuizAnswers(quiz, attempt.answers)
	
	// Calculate scores
	const { score, pointsEarned, isPassed } = calculateScore(
		quiz,
		gradedAnswers
	)
	
	// Update attempt with results
	await updateDoc(attemptRef, {
		answers: gradedAnswers,
		score,
		pointsEarned,
		isPassed,
		status: 'submitted',
		submittedAt: serverTimestamp(),
		timeSpent,
	})
	
	return {
		...attempt,
		answers: gradedAnswers,
		score,
		pointsEarned,
		isPassed,
		status: 'submitted',
		submittedAt: new Date().toISOString(),
		timeSpent
	}
}

/**
 * Grade quiz answers
 */
function gradeQuizAnswers(quiz: Quiz, answers: QuizAnswer[]): QuizAnswer[] {
	return answers.map(answer => {
		const question = quiz.questions.find(q => q.id === answer.questionId)
		if (!question) {
			return {
				...answer,
				isCorrect: false,
				pointsEarned: 0,
				pointsPossible: 0
			}
		}
		
		// Handle null answers
		if (answer.answer === null) {
			return {
				...answer,
				isCorrect: false,
				pointsEarned: 0,
				pointsPossible: question.points
			}
		}
		
		const isCorrect = checkAnswer(question, answer.answer)
		const pointsEarned = isCorrect ? question.points : 0
		
		return {
			...answer,
			isCorrect,
			pointsEarned,
			pointsPossible: question.points
		}
	})
}

/**
 * Calculate score from graded answers
 */
function calculateScore(
	quiz: Quiz,
	gradedAnswers: QuizAnswer[]
): { score: number; pointsEarned: number; isPassed: boolean } {
	const totalQuestions = quiz.questions.length
	const correctCount = gradedAnswers.filter(a => a.isCorrect).length
	const pointsEarned = gradedAnswers.reduce((sum, a) => sum + a.pointsEarned, 0)
	
	// Calculate score percentage
	const score = totalQuestions > 0 ? (correctCount / totalQuestions) * 100 : 0
	const isPassed = score >= quiz.passingScore
	
	return {
		score,
		pointsEarned,
		isPassed
	}
}

/**
 * Check if answer is correct
 */
function checkAnswer(
	question: Quiz['questions'][0],
	answer: string | number | string[] | boolean
): boolean {
	const correctAnswer = question.correctAnswer
	
	// Handle different question types
	switch (question.type) {
		case 'multiple_choice':
		case 'true_false':
			return answer === correctAnswer
			
	case 'multiple_select': {
		if (!Array.isArray(answer) || !Array.isArray(correctAnswer)) {
			return false
		}
		// Sort and compare arrays
		const sortedAnswer = [...answer].sort()
		const sortedCorrect = [...correctAnswer].sort()
		return JSON.stringify(sortedAnswer) === JSON.stringify(sortedCorrect)
	}

	case 'short_answer': {
		if (typeof answer !== 'string' || typeof correctAnswer !== 'string') {
			return false
		}
		
		// Check acceptable answers if provided
		if (question.acceptableAnswers) {
			const allAcceptable = [correctAnswer, ...question.acceptableAnswers]
			return allAcceptable.some(acceptable => 
				question.caseSensitive 
					? answer === acceptable
					: answer.toLowerCase() === acceptable.toLowerCase()
			)
		}
		
		return question.caseSensitive
			? answer === correctAnswer
			: answer.toLowerCase() === correctAnswer.toLowerCase()
	}
		
	case 'fill_blank': {
		// Similar to short answer
		return question.caseSensitive
			? answer === correctAnswer
			: String(answer).toLowerCase() === String(correctAnswer).toLowerCase()
	}
	
	case 'essay':
		// Essays require manual grading
		return false
		
	default:
		return false
	}
}

/**
 * Get user's attempts for a quiz
 */
export async function getUserQuizAttempts(
	userId: string,
	quizId: string
): Promise<QuizAttempt[]> {
	const attemptsRef = collection(db, COLLECTIONS.QUIZ_ATTEMPTS)
	const q = query(
		attemptsRef,
		where('userId', '==', userId),
		where('quizId', '==', quizId),
		orderBy('attemptNumber', 'desc')
	)
	
	const querySnap = await getDocs(q)
	return querySnap.docs.map(doc => ({
		id: doc.id,
		...doc.data() as Omit<QuizAttempt, 'id'>
	}))
}

/**
 * Get user's best attempt for a quiz
 */
export async function getUserBestAttempt(
	userId: string,
	quizId: string
): Promise<QuizAttempt | null> {
	const attempts = await getUserQuizAttempts(userId, quizId)
	
	if (attempts.length === 0) {
		return null
	}
	
	// Find highest score
	return attempts.reduce((best, current) => 
		current.score > best.score ? current : best
	)
}

/**
 * Get attempt by ID
 */
export async function getQuizAttempt(attemptId: string): Promise<QuizAttempt | null> {
	const attemptRef = doc(db, COLLECTIONS.QUIZ_ATTEMPTS, attemptId)
	const attemptSnap = await getDoc(attemptRef)
	
	if (!attemptSnap.exists()) {
		return null
	}
	
	return {
		id: attemptSnap.id,
		...attemptSnap.data() as Omit<QuizAttempt, 'id'>
	}
}

// ============================================
// Quiz Statistics (for instructors)
// ============================================

/**
 * Get statistics for a quiz
 */
export async function getQuizStatistics(quizId: string): Promise<QuizStatistics> {
	const attemptsRef = collection(db, COLLECTIONS.QUIZ_ATTEMPTS)
	const q = query(
		attemptsRef,
		where('quizId', '==', quizId),
		where('status', '==', 'submitted')
	)
	
	const querySnap = await getDocs(q)
	const attempts = querySnap.docs.map(doc => ({
		id: doc.id,
		...doc.data() as Omit<QuizAttempt, 'id'>
	}))
	
	if (attempts.length === 0) {
		return {
			quizId,
			totalAttempts: 0,
			uniqueUsers: 0,
			averageScore: 0,
			highestScore: 0,
			lowestScore: 0,
			passRate: 0,
			averageTimeSpent: 0,
			questionStats: [],
			estimatedDifficulty: 'medium',
			lastUpdated: new Date().toISOString()
		}
	}
	
	// Calculate statistics
	const scores = attempts.map(a => a.score)
	const uniqueUsers = new Set(attempts.map(a => a.userId)).size
	const passedCount = attempts.filter(a => a.isPassed).length
	const avgScore = scores.reduce((sum, s) => sum + s, 0) / scores.length
	
	// Estimate difficulty based on average score
	let estimatedDifficulty: 'easy' | 'medium' | 'hard'
	if (avgScore >= 80) {
		estimatedDifficulty = 'easy'
	} else if (avgScore >= 60) {
		estimatedDifficulty = 'medium'
	} else {
		estimatedDifficulty = 'hard'
	}
	
	const statistics: QuizStatistics = {
		quizId,
		totalAttempts: attempts.length,
		uniqueUsers,
		averageScore: avgScore,
		highestScore: Math.max(...scores),
		lowestScore: Math.min(...scores),
		passRate: (passedCount / attempts.length) * 100,
		averageTimeSpent: attempts.reduce((sum, a) => sum + a.timeSpent, 0) / attempts.length / 60,
		questionStats: [], // TODO: Calculate per-question statistics
		estimatedDifficulty,
		lastUpdated: new Date().toISOString()
	}
	
	return statistics
}

/**
 * Get all attempts for a course (for instructor analytics)
 */
export async function getCourseQuizAttempts(courseId: string): Promise<QuizAttempt[]> {
	const attemptsRef = collection(db, COLLECTIONS.QUIZ_ATTEMPTS)
	const q = query(
		attemptsRef,
		where('courseId', '==', courseId),
		orderBy('submittedAt', 'desc')
	)
	
	const querySnap = await getDocs(q)
	return querySnap.docs.map(doc => ({
		id: doc.id,
		...doc.data() as Omit<QuizAttempt, 'id'>
	}))
}

/**
 * Batch update quizzes - used for reordering
 * Updates quiz order fields and syncs course quizzesMetadata
 * v1.6.0: Added for quiz reordering feature
 * 
 * @param courseId - The course ID
 * @param quizzes - Array of quizzes with updated order fields
 */
export async function batchUpdateQuizzes(
	courseId: string,
	quizzes: Array<{ id: string; order: number; lessonId: string; title: string; questions: Quiz['questions']; passingScore: number; timeLimit?: number }>
): Promise<void> {
	const batch = writeBatch(db)
	
	// Update each quiz document's order
	quizzes.forEach((quiz) => {
		const quizRef = doc(db, COLLECTIONS.QUIZZES, quiz.id)
		batch.update(quizRef, {
			order: quiz.order,
			updatedAt: serverTimestamp()
		})
	})
	
	// Rebuild full quizzesMetadata array for course
	const quizzesMetadata: QuizMetadata[] = quizzes.map((quiz) => 
		buildQuizMetadata(
			{
				id: quiz.id,
				lessonId: quiz.lessonId,
				title: quiz.title,
				questions: quiz.questions,
				passingScore: quiz.passingScore,
				timeLimit: quiz.timeLimit
			},
			quiz.order
		)
	)
	
	// Update course with new metadata array
	const courseRef = doc(db, COLLECTIONS.COURSES, courseId)
	batch.update(courseRef, {
		quizzesMetadata,
		totalQuizzes: quizzes.length,
		updatedAt: serverTimestamp()
	})
	
	await batch.commit()
}
