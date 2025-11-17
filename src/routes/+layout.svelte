<script lang="ts">
	import '../app.css'
	import favicon from '$lib/assets/favicon.svg'
	import { onMount } from 'svelte'
	import { initializeAuth, authState, logout } from '$lib/auth.svelte'
	import { Button } from '$lib/components/ui'
	import { LogOut, BookOpen, Menu } from 'lucide-svelte'
	import { base } from '$app/paths'
	
	let { children } = $props()
	let mobileMenuOpen = $state(false)

	// Initialize auth immediately when script runs
	initializeAuth()

	async function handleLogout() {
		try {
			await logout()
		} catch (error) {
			console.error('Logout failed:', error)
		}
	}
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>Open-EDU - Online Learning Platform</title>
	<meta name="description" content="Learn with Open-EDU - A modern online course platform" />
</svelte:head>

<div class="min-h-screen bg-background">
	<!-- Navigation Header -->
	<header class="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
		<div class="container mx-auto px-4 flex h-16 items-center justify-between max-w-7xl">
			<!-- Logo -->
			<div class="flex items-center">
				<a href="{base}/" class="flex items-center space-x-2">
					<BookOpen class="h-6 w-6" />
					<span class="font-bold text-xl">Open-EDU</span>
				</a>
			</div>

			<!-- Desktop Navigation -->
			<nav class="hidden md:flex items-center space-x-6 text-sm font-medium">
				<a href="{base}/" class="transition-colors hover:text-foreground/80 text-foreground">
					Home
				</a>
				<a href="{base}/courses" class="transition-colors hover:text-foreground/80 text-foreground/60">
					Courses
				</a>
				{#if authState.user}
					<a href="{base}/dashboard" class="transition-colors hover:text-foreground/80 text-foreground/60">
						Dashboard
					</a>
				{/if}
			</nav>

			<!-- User Menu -->
			<div class="flex items-center space-x-3">
				{#if authState.loading}
					<div class="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
				{:else if authState.user}
					<!-- Authenticated User Menu -->
					<div class="flex items-center space-x-3">
						<span class="hidden sm:inline-block text-sm text-muted-foreground">
							Welcome, {authState.user.displayName || authState.user.email}
						</span>
						<Button variant="ghost" size="icon" onclick={handleLogout} title="Logout">
							<LogOut class="h-4 w-4" />
						</Button>
					</div>
				{:else}
					<!-- Guest User Menu -->
					<Button size="sm">
						<a href="{base}/auth/login">Sign In with Google</a>
					</Button>
				{/if}

				<!-- Mobile Menu Button -->
				<Button variant="ghost" size="icon" class="md:hidden" onclick={() => mobileMenuOpen = !mobileMenuOpen}>
					<Menu class="h-4 w-4" />
				</Button>
			</div>
		</div>

		<!-- Mobile Navigation Menu -->
		{#if mobileMenuOpen}
			<div class="border-t bg-background md:hidden">
				<nav class="container mx-auto px-4 py-4 space-y-3 max-w-7xl">
					<a href="{base}/" class="block py-2 text-sm font-medium">
						Home
					</a>
					<a href="{base}/courses" class="block py-2 text-sm font-medium text-muted-foreground">
						Courses
					</a>
					{#if authState.user}
						<a href="{base}/dashboard" class="block py-2 text-sm font-medium text-muted-foreground">
							Dashboard
						</a>
					{/if}
				</nav>
			</div>
		{/if}
	</header>

	<!-- Main Content -->
	<main class="flex-1">
		{@render children()}
	</main>

	<!-- Footer -->
	<footer class="border-t bg-muted/50">
		<div class="container mx-auto px-4 py-8 max-w-7xl">
			<div class="grid grid-cols-1 md:grid-cols-4 gap-8">
				<div class="space-y-3">
					<div class="flex items-center space-x-2">
						<BookOpen class="h-5 w-5" />
						<span class="font-bold">Open-EDU</span>
					</div>
					<p class="text-sm text-muted-foreground">
						Empowering learners worldwide with accessible, high-quality online education.
					</p>
				</div>
				<div class="space-y-3">
					<h3 class="text-sm font-semibold">Platform</h3>
					<ul class="space-y-1 text-sm text-muted-foreground">
						<li><a href="{base}/courses" class="hover:text-foreground">Browse Courses</a></li>
						<li><a href="{base}/about" class="hover:text-foreground">About Us</a></li>
						<li><a href="{base}/pricing" class="hover:text-foreground">Pricing</a></li>
					</ul>
				</div>
				<div class="space-y-3">
					<h3 class="text-sm font-semibold">Support</h3>
					<ul class="space-y-1 text-sm text-muted-foreground">
						<li><a href="{base}/help" class="hover:text-foreground">Help Center</a></li>
						<li><a href="{base}/contact" class="hover:text-foreground">Contact</a></li>
						<li><a href="{base}/community" class="hover:text-foreground">Community</a></li>
					</ul>
				</div>
				<div class="space-y-3">
					<h3 class="text-sm font-semibold">Legal</h3>
					<ul class="space-y-1 text-sm text-muted-foreground">
						<li><a href="{base}/privacy" class="hover:text-foreground">Privacy Policy</a></li>
						<li><a href="{base}/terms" class="hover:text-foreground">Terms of Service</a></li>
						<li><a href="{base}/cookies" class="hover:text-foreground">Cookie Policy</a></li>
					</ul>
				</div>
			</div>
		</div>
		<div class="border-t bg-muted/30">
			<div class="container mx-auto px-4 py-4 max-w-7xl">
				<div class="text-center text-sm text-muted-foreground">
					© {new Date().getFullYear()} Open-EDU. All rights reserved.
				</div>
			</div>
		</div>
	</footer>
</div>
