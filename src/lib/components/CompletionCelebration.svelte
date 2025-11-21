<!--
	CompletionCelebration Component
	Confetti animation and motivational message when completing a lesson
-->
<script lang="ts">
	import { Button } from '$lib/components/ui'
	import { Trophy, ArrowRight, X } from 'lucide-svelte'
	import { onMount } from 'svelte'
	
	let {
		show = $bindable(false),
		lessonTitle,
		isLastLesson = false,
		nextLessonTitle = '',
		courseProgress = 0,
		onContinue,
		onClose
	}: {
		show?: boolean
		lessonTitle: string
		isLastLesson?: boolean
		nextLessonTitle?: string
		courseProgress?: number
		onContinue?: () => void
		onClose?: () => void
	} = $props()
	
	let canvas = $state<HTMLCanvasElement | null>(null)
	let animationId = $state<number | null>(null)
	let mounted = $state(false)
	
	interface Confetti {
		x: number
		y: number
		vx: number
		vy: number
		rotation: number
		rotationSpeed: number
		color: string
		size: number
		opacity: number
	}
	
	let confetti: Confetti[] = []
	
	/**
	 * Generate random confetti particles
	 */
	function generateConfetti(count: number): Confetti[] {
		const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']
		const particles: Confetti[] = []
		
		for (let i = 0; i < count; i++) {
			particles.push({
				x: Math.random() * (canvas?.width || window.innerWidth),
				y: -20,
				vx: (Math.random() - 0.5) * 4,
				vy: Math.random() * 3 + 2,
				rotation: Math.random() * 360,
				rotationSpeed: (Math.random() - 0.5) * 10,
				color: colors[Math.floor(Math.random() * colors.length)],
				size: Math.random() * 8 + 4,
				opacity: 1
			})
		}
		
		return particles
	}
	
	/**
	 * Animate confetti particles
	 */
	function animateConfetti() {
		const canvasEl = canvas
		if (!canvasEl) return
		
		const ctx = canvasEl.getContext('2d')
		if (!ctx) return
		
		ctx.clearRect(0, 0, canvasEl.width, canvasEl.height)
		
		// Update and draw each particle
		confetti = confetti.filter(p => {
			// Update position
			p.x += p.vx
			p.y += p.vy
			p.rotation += p.rotationSpeed
			p.vy += 0.1 // Gravity
			p.opacity -= 0.005
			
			// Draw particle
			ctx.save()
			ctx.translate(p.x, p.y)
			ctx.rotate((p.rotation * Math.PI) / 180)
			ctx.globalAlpha = p.opacity
			ctx.fillStyle = p.color
			ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size / 2)
			ctx.restore()
			
			// Keep particle if still visible and on screen
			return p.opacity > 0 && p.y < canvasEl.height
		})
		
		// Continue animation if particles remain
		if (confetti.length > 0) {
			animationId = requestAnimationFrame(animateConfetti)
		}
	}
	
	/**
	 * Start confetti animation
	 */
	function startConfetti() {
		if (!canvas || !mounted) return
		
		// Set canvas size
		canvas.width = window.innerWidth
		canvas.height = window.innerHeight
		
		// Generate confetti particles
		confetti = generateConfetti(80)
		
		// Start animation
		animateConfetti()
	}
	
	/**
	 * Stop confetti animation
	 */
	function stopConfetti() {
		if (animationId) {
			cancelAnimationFrame(animationId)
			animationId = null
		}
		confetti = []
	}
	
	/**
	 * Handle window resize
	 */
	function handleResize() {
		if (canvas) {
			canvas.width = window.innerWidth
			canvas.height = window.innerHeight
		}
	}
	
	onMount(() => {
		mounted = true
		return () => {
			stopConfetti()
		}
	})
	
	/**
	 * Watch for show prop changes
	 */
	$effect(() => {
		if (show && mounted) {
			startConfetti()
		} else {
			stopConfetti()
		}
	})
</script>

<svelte:window on:resize={handleResize} />

{#if show}
	<!-- Overlay -->
	<div 
		class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
		onclick={onClose}
		onkeydown={(e) => e.key === 'Enter' && onClose?.()}
		role="button"
		tabindex="0"
		aria-label="Close celebration"
	>
		<!-- Confetti Canvas -->
		<canvas
			bind:this={canvas}
			class="absolute inset-0 pointer-events-none"
			aria-hidden="true"
		></canvas>
		
		<!-- Celebration Modal -->
		<div 
			class="relative bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 text-center animate-[scale-in_0.3s_ease-out] z-10"
			onclick={(e) => e.stopPropagation()}
			onkeydown={(e) => e.key === 'Enter' && e.stopPropagation()}
			role="dialog"
			tabindex="-1"
		>
			<!-- Close button -->
			<button
				onclick={onClose}
				class="absolute top-4 right-4 p-2 rounded-lg hover:bg-slate-100 transition-colors"
				aria-label="Close"
			>
				<X class="w-5 h-5 text-slate-600" />
			</button>
			
			<!-- Trophy icon -->
			<div class="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center animate-[bounce_1s_ease-in-out_2]">
				<Trophy class="w-10 h-10 text-white" />
			</div>
			
			<!-- Title -->
			<h2 class="text-3xl font-bold text-slate-900 mb-3">
				Lesson Complete!
			</h2>
			
			<!-- Lesson title -->
			<p class="text-lg text-slate-600 mb-6">
				You've completed <span class="font-semibold text-slate-900">{lessonTitle}</span>
			</p>
			
			<!-- Progress indicator -->
			{#if courseProgress > 0}
				<div class="mb-6">
					<div class="flex justify-between items-center mb-2 text-sm">
						<span class="text-slate-600">Course Progress</span>
						<span class="font-semibold text-primary-600">{Math.round(courseProgress)}%</span>
					</div>
					<div class="h-3 bg-slate-200 rounded-full overflow-hidden">
						<div 
							class="h-full bg-gradient-to-r from-primary-500 to-secondary-500 rounded-full transition-all duration-1000"
							style="width: {courseProgress}%"
						></div>
					</div>
				</div>
			{/if}
			
			<!-- Motivational message -->
			<p class="text-slate-600 mb-6">
				{#if isLastLesson}
					🎉 Congratulations! You've completed all lessons in this course!
				{:else}
					Great job! Keep up the momentum!
				{/if}
			</p>
			
			<!-- Action buttons -->
			<div class="flex flex-col gap-3">
				{#if !isLastLesson && nextLessonTitle}
					<Button 
						onclick={onContinue}
						class="w-full"
						size="lg"
					>
						Continue to Next Lesson
						<ArrowRight class="w-5 h-5 ml-2" />
					</Button>
				{/if}
				
				<Button 
					variant="outline"
					onclick={onClose}
					class="w-full"
					size="lg"
				>
					{isLastLesson ? 'Back to Course' : 'Stay Here'}
				</Button>
			</div>
		</div>
	</div>
{/if}

<style>
	@keyframes scale-in {
		from {
			transform: scale(0.8);
			opacity: 0;
		}
		to {
			transform: scale(1);
			opacity: 1;
		}
	}
</style>
