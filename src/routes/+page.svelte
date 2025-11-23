<script lang="ts">
	import { Button, Card, CardDescription, CardHeader, CardTitle } from '$lib/components/ui'
	import { authState } from '$lib/auth.svelte'
	import { BookOpen, Users, Star, Github, Flame, Rocket } from 'lucide-svelte'
	import { getPath } from '$lib/utils/navigation'
</script>

<svelte:head>
	<title>Welcome to Open-EDU</title>
	<meta name="description" content="Transform your learning journey with Open-EDU - quality courses for everyone" />
</svelte:head>

<!-- Hero Section -->
<section class="py-20 px-4 text-center bg-background">
	<div class="container mx-auto max-w-4xl">
		<h1 class="text-4xl md:text-6xl font-bold tracking-tight mb-6 text-foreground">
			Transform Your Learning 
			<span class="text-primary">Journey</span>
		</h1>
		<p class="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
			Discover world-class courses taught by industry experts. Learn at your own pace with interactive lessons, quizzes, and real-world projects.
		</p>
		<div class="flex flex-col sm:flex-row gap-4 justify-center items-center">
		{#if authState.user}
			<div class="flex flex-col sm:flex-row gap-4">
				<Button size="lg" class="text-lg px-8">
					<a href={getPath('/dashboard')}>Go to Dashboard</a>
				</Button>
				<Button variant="outline" size="lg" class="text-lg px-8">
					<a href={getPath('/courses')}>Browse Courses</a>
				</Button>
			</div>
		{:else}
			<div class="flex flex-col sm:flex-row gap-4">
				<Button size="lg" class="text-lg px-8">
					<a href={getPath('/auth/login')}>Start Learning Today</a>
				</Button>
				<Button variant="outline" size="lg" class="text-lg px-8">
					<a href={getPath('/courses')}>Explore Courses</a>
				</Button>
			</div>
		{/if}
		</div>
	</div>
</section>

<!-- Features Section -->
<section class="py-20 px-4 bg-muted">
	<div class="container mx-auto max-w-7xl">
		<div class="text-center mb-16">
			<h2 class="text-3xl font-bold text-foreground mb-4">Why Choose Open-EDU?</h2>
			<p class="text-xl text-muted-foreground max-w-2xl mx-auto">
				Experience learning like never before with our innovative platform designed for success
			</p>
		</div>
		
		<div class="grid grid-cols-1 md:grid-cols-3 gap-8">
			<Card class="card-hover">
				<CardHeader class="text-center">
					<div class="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
						<BookOpen class="h-6 w-6 text-primary" />
					</div>
					<CardTitle>Expert-Led Courses</CardTitle>
					<CardDescription>
						Learn from industry professionals with years of real-world experience
					</CardDescription>
				</CardHeader>
			</Card>
			
			<Card class="card-hover">
				<CardHeader class="text-center">
					<div class="w-12 h-12 bg-secondary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
						<Users class="h-6 w-6 text-secondary-foreground" />
					</div>
					<CardTitle>Interactive Learning</CardTitle>
					<CardDescription>
						Engage with quizzes, projects, and peer discussions for deeper understanding
					</CardDescription>
				</CardHeader>
			</Card>
			
			<Card class="card-hover">
				<CardHeader class="text-center">
					<div class="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center mx-auto mb-4">
						<Star class="h-6 w-6 text-accent-foreground" />
					</div>
					<CardTitle>Learn at Your Pace</CardTitle>
					<CardDescription>
						Flexible scheduling that fits your lifestyle and learning preferences
					</CardDescription>
				</CardHeader>
			</Card>
		</div>
	</div>
</section>

<!-- Platform Features Section -->
<section class="py-20 px-4 bg-primary">
	<div class="container mx-auto max-w-7xl">
		<div class="text-center mb-12">
			<h2 class="text-3xl md:text-4xl font-bold text-primary-foreground mb-3">
				Built Different
			</h2>
			<p class="text-lg text-primary-foreground/80 max-w-2xl mx-auto">
				Modern, open-source architecture designed for developers and educators
			</p>
		</div>
		
		<div class="grid grid-cols-1 md:grid-cols-3 gap-8">
			<!-- Feature 1: Open Source -->
			<div class="p-8 rounded-xl bg-primary-foreground/10 backdrop-blur-sm hover:bg-primary-foreground/20 transition-all duration-300 cursor-pointer group">
				<div class="flex justify-center mb-6">
					<div class="w-16 h-16 rounded-full bg-primary-foreground/20 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
						<Github class="w-8 h-8 text-primary-foreground" />
					</div>
				</div>
				<h3 class="text-xl font-bold text-primary-foreground mb-3 text-center">
					100% Open Source
				</h3>
				<p class="text-primary-foreground/90 text-center mb-4 leading-relaxed">
					MIT licensed, community-driven development. Fork, customize, and deploy your own instance.
				</p>
				<div class="text-center">
					<a href="https://github.com/koosty/open-edu" 
					   target="_blank"
					   rel="noopener noreferrer"
					   class="inline-flex items-center text-primary-foreground/80 hover:text-primary-foreground text-sm font-medium transition-colors">
						View on GitHub →
					</a>
				</div>
			</div>
			
			<!-- Feature 2: Firebase-Powered -->
			<div class="p-8 rounded-xl bg-primary-foreground/10 backdrop-blur-sm hover:bg-primary-foreground/20 transition-all duration-300 cursor-pointer group">
				<div class="flex justify-center mb-6">
					<div class="w-16 h-16 rounded-full bg-primary-foreground/20 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
						<Flame class="w-8 h-8 text-primary-foreground" />
					</div>
				</div>
				<h3 class="text-xl font-bold text-primary-foreground mb-3 text-center">
					Firebase-Powered
				</h3>
				<p class="text-primary-foreground/90 text-center mb-4 leading-relaxed">
					No backend needed. Real-time database, authentication, and hosting with serverless architecture.
				</p>
				<div class="text-center">
					<span class="inline-flex items-center text-primary-foreground/80 text-sm font-medium">
						Serverless & Scalable
					</span>
				</div>
			</div>
			
			<!-- Feature 3: Deploy Anywhere -->
			<div class="p-8 rounded-xl bg-primary-foreground/10 backdrop-blur-sm hover:bg-primary-foreground/20 transition-all duration-300 cursor-pointer group">
				<div class="flex justify-center mb-6">
					<div class="w-16 h-16 rounded-full bg-primary-foreground/20 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
						<Rocket class="w-8 h-8 text-primary-foreground" />
					</div>
				</div>
				<h3 class="text-xl font-bold text-primary-foreground mb-3 text-center">
					Deploy Anywhere
				</h3>
				<p class="text-primary-foreground/90 text-center mb-4 leading-relaxed">
					GitHub Pages, Vercel, Netlify, Cloudflare Pages. Global CDN-powered performance in minutes.
				</p>
				<div class="text-center">
					<span class="inline-flex items-center text-primary-foreground/80 text-sm font-medium">
						Deploy in &lt; 5 min
					</span>
				</div>
			</div>
		</div>
	</div>
</section>

<!-- CTA Section -->
<section class="py-20 px-4 bg-background">
	<div class="container mx-auto max-w-4xl text-center">
		<h2 class="text-3xl font-bold text-foreground mb-4">Ready to Start Your Learning Journey?</h2>
		<p class="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
			Join thousands of learners who are already advancing their careers with Open-EDU
		</p>
		{#if !authState.user}
			<Button size="lg" class="text-lg px-8">
				<a href={getPath('/auth/login')}>Sign Up Free Today</a>
			</Button>
		{/if}
	</div>
</section>
