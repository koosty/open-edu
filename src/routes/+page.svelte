<script lang="ts">
	import { Button, Card, CardDescription, CardHeader, CardTitle } from '$lib/components/ui'
	import { authState } from '$lib/auth.svelte'
	import { BookOpen, Users, Star } from 'lucide-svelte'
	import { base } from '$app/paths'
</script>

<svelte:head>
	<title>Welcome to Open-EDU</title>
	<meta name="description" content="Transform your learning journey with Open-EDU - quality courses for everyone" />
</svelte:head>

<!-- Hero Section -->
<section class="py-20 px-4 text-center bg-gradient-to-b from-white via-primary-50/30 to-secondary-50/30">
	<div class="container mx-auto max-w-4xl">
		<h1 class="text-4xl md:text-6xl font-bold tracking-tight mb-6">
			Transform Your Learning 
			<span class="bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">Journey</span>
		</h1>
		<p class="text-xl text-slate-600 mb-8 max-w-2xl mx-auto">
			Discover world-class courses taught by industry experts. Learn at your own pace with interactive lessons, quizzes, and real-world projects.
		</p>
		<div class="flex flex-col sm:flex-row gap-4 justify-center items-center">
		{#if authState.user}
			<div class="flex flex-col sm:flex-row gap-4">
				<Button size="lg" class="text-lg px-8 bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 interactive rounded-lg shadow-lg">
					<a href="{base}/dashboard">Go to Dashboard</a>
				</Button>
				<Button variant="outline" size="lg" class="text-lg px-8 interactive rounded-lg border-primary-300 text-primary-700 hover:bg-primary-50">
					<a href="{base}/courses">Browse Courses</a>
				</Button>
			</div>
		{:else}
			<div class="flex flex-col sm:flex-row gap-4">
				<Button size="lg" class="text-lg px-8 bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 interactive rounded-lg shadow-lg">
					<a href="{base}/auth/login">Start Learning Today</a>
				</Button>
				<Button variant="outline" size="lg" class="text-lg px-8 interactive rounded-lg border-primary-300 text-primary-700 hover:bg-primary-50">
					<a href="{base}/courses">Explore Courses</a>
				</Button>
			</div>
		{/if}
		</div>
	</div>
</section>

<!-- Features Section -->
<section class="py-20 px-4 bg-slate-50">
	<div class="container mx-auto max-w-7xl">
		<div class="text-center mb-16">
			<h2 class="text-3xl font-bold text-slate-900 mb-4">Why Choose Open-EDU?</h2>
			<p class="text-xl text-slate-600 max-w-2xl mx-auto">
				Experience learning like never before with our innovative platform designed for success
			</p>
		</div>
		
		<div class="grid grid-cols-1 md:grid-cols-3 gap-8">
			<Card class="card-hover rounded-xl shadow-sm border-slate-200">
				<CardHeader class="text-center">
					<div class="w-12 h-12 bg-gradient-to-br from-primary-100 to-primary-200 rounded-lg flex items-center justify-center mx-auto mb-4">
						<BookOpen class="h-6 w-6 text-primary-600" />
					</div>
					<CardTitle class="text-slate-900">Expert-Led Courses</CardTitle>
					<CardDescription class="text-slate-600">
						Learn from industry professionals with years of real-world experience
					</CardDescription>
				</CardHeader>
			</Card>
			
			<Card class="card-hover rounded-xl shadow-sm border-slate-200">
				<CardHeader class="text-center">
					<div class="w-12 h-12 bg-gradient-to-br from-secondary-100 to-secondary-200 rounded-lg flex items-center justify-center mx-auto mb-4">
						<Users class="h-6 w-6 text-secondary-600" />
					</div>
					<CardTitle class="text-slate-900">Interactive Learning</CardTitle>
					<CardDescription class="text-slate-600">
						Engage with quizzes, projects, and peer discussions for deeper understanding
					</CardDescription>
				</CardHeader>
			</Card>
			
			<Card class="card-hover rounded-xl shadow-sm border-slate-200">
				<CardHeader class="text-center">
					<div class="w-12 h-12 bg-gradient-to-br from-accent-100 to-accent-200 rounded-lg flex items-center justify-center mx-auto mb-4">
						<Star class="h-6 w-6 text-accent-600" />
					</div>
					<CardTitle class="text-slate-900">Learn at Your Pace</CardTitle>
					<CardDescription class="text-slate-600">
						Flexible scheduling that fits your lifestyle and learning preferences
					</CardDescription>
				</CardHeader>
			</Card>
		</div>
	</div>
</section>

<!-- Stats Section -->
<section class="py-20 px-4 bg-gradient-to-r from-primary-600 to-secondary-600">
	<div class="container mx-auto max-w-7xl">
		<div class="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
			<div class="p-6 rounded-xl bg-white/10 backdrop-blur-sm interactive hover:bg-white/20">
				<div class="text-4xl font-bold text-white mb-2">50+</div>
				<div class="text-lg font-semibold text-white mb-1">Expert Instructors</div>
				<div class="text-white/90">Industry professionals</div>
			</div>
			<div class="p-6 rounded-xl bg-white/10 backdrop-blur-sm interactive hover:bg-white/20">
				<div class="text-4xl font-bold text-white mb-2">10,000+</div>
				<div class="text-lg font-semibold text-white mb-1">Active Students</div>
				<div class="text-white/90">Learning worldwide</div>
			</div>
			<div class="p-6 rounded-xl bg-white/10 backdrop-blur-sm interactive hover:bg-white/20">
				<div class="text-4xl font-bold text-white mb-2">200+</div>
				<div class="text-lg font-semibold text-white mb-1">Courses Available</div>
				<div class="text-white/90">Across multiple domains</div>
			</div>
		</div>
	</div>
</section>

<!-- CTA Section -->
<section class="py-20 px-4 bg-white">
	<div class="container mx-auto max-w-4xl text-center">
		<h2 class="text-3xl font-bold text-slate-900 mb-4">Ready to Start Your Learning Journey?</h2>
		<p class="text-xl text-slate-700 mb-8 max-w-2xl mx-auto">
			Join thousands of learners who are already advancing their careers with Open-EDU
		</p>
		{#if !authState.user}
			<Button size="lg" class="text-lg px-8 bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 interactive rounded-lg shadow-lg">
				<a href="{base}/auth/login">Sign Up Free Today</a>
			</Button>
		{/if}
	</div>
</section>
