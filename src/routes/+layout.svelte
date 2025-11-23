<script lang="ts">
	import '../app.css'
	import favicon from '$lib/assets/favicon.svg'
	import { onMount } from 'svelte'
	import { page } from '$app/state'
	import { initializeAuth, authState, logout } from '$lib/auth.svelte'
	import { Button } from '$lib/components/ui'
	import { LogOut, BookOpen, Menu, Settings } from 'lucide-svelte'
	import { isAdmin } from '$lib/utils/admin'
	import { initTheme } from '$lib/config/theme'
	import { getPath } from '$lib/utils/navigation'
	import { ModeWatcher } from 'mode-watcher'
	import ThemeToggle from '$lib/components/ThemeToggle.svelte'
	import { VERSION, formatBuildId, ENVIRONMENT } from '$lib/version'
	
	const { children } = $props()
	let mobileMenuOpen = $state(false)

	// Detect if we're on a lesson viewer or quiz page (hide footer)
	const isLessonPage = $derived(
		(page.url.pathname.includes('/courses/') && page.url.pathname.includes('/learn/')) ||
		(page.url.pathname.includes('/quizzes/') && page.url.pathname.includes('/preview'))
	)

	// Initialize auth immediately when script runs
	initializeAuth()

	// Initialize theme on mount
	onMount(() => {
		initTheme()
	})

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

<ModeWatcher />

<div class="min-h-screen bg-background">
	<!-- Navigation Header -->
	<header class="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
		<div class="container mx-auto px-4 flex h-16 items-center justify-between max-w-7xl">
			<!-- Logo -->
			<div class="flex items-center">
				<a href={getPath('/')} class="flex items-center space-x-2">
					<BookOpen class="h-6 w-6" />
					<span class="font-bold text-xl">Open-EDU</span>
				</a>
			</div>

			<!-- Desktop Navigation -->
			<nav class="hidden md:flex items-center space-x-6 text-sm font-medium">
				<a 
					href={getPath('/')} 
					class="transition-colors hover:text-foreground/80 {page.url.pathname === '/' ? 'text-foreground' : 'text-foreground/60'}"
				>
					Home
				</a>
				<a 
					href={getPath('/courses')} 
					class="transition-colors hover:text-foreground/80 {page.url.pathname.startsWith('/courses') ? 'text-foreground' : 'text-foreground/60'}"
				>
					Courses
				</a>
				{#if authState.user}
					<a 
						href={getPath('/dashboard')} 
						class="transition-colors hover:text-foreground/80 {page.url.pathname === '/dashboard' ? 'text-foreground' : 'text-foreground/60'}"
					>
						Dashboard
					</a>
					{#if isAdmin(authState.user)}
						<a 
							href={getPath('/admin')} 
							class="transition-colors hover:text-foreground/80 {page.url.pathname.startsWith('/admin') ? 'text-foreground' : 'text-foreground/60'} flex items-center space-x-1"
						>
							<Settings class="h-3 w-3" />
							<span>Admin</span>
						</a>
					{/if}
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
						<ThemeToggle />
						<Button variant="ghost" size="icon" onclick={handleLogout} title="Logout">
							<LogOut class="h-4 w-4" />
						</Button>
					</div>
				{:else}
					<!-- Guest User Menu -->
					<ThemeToggle />
					<Button size="sm">
						<a href={getPath('/auth/login')}>Sign In with Google</a>
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
					<a 
						href={getPath('/')} 
						class="block py-2 text-sm font-medium {page.url.pathname === '/' ? 'text-foreground' : 'text-muted-foreground'}"
					>
						Home
					</a>
					<a 
						href={getPath('/courses')} 
						class="block py-2 text-sm font-medium {page.url.pathname.startsWith('/courses') ? 'text-foreground' : 'text-muted-foreground'}"
					>
						Courses
					</a>
					{#if authState.user}
						<a 
							href={getPath('/dashboard')} 
							class="block py-2 text-sm font-medium {page.url.pathname === '/dashboard' ? 'text-foreground' : 'text-muted-foreground'}"
						>
							Dashboard
						</a>
						{#if isAdmin(authState.user)}
							<a 
								href={getPath('/admin')} 
								class="block py-2 text-sm font-medium flex items-center space-x-1 {page.url.pathname.startsWith('/admin') ? 'text-foreground' : 'text-muted-foreground'}"
							>
								<Settings class="h-3 w-3" />
								<span>Admin</span>
							</a>
						{/if}
					{/if}
				</nav>
			</div>
		{/if}
	</header>

	<!-- Main Content -->
	<main class="flex-1">
		{@render children()}
	</main>

	<!-- Footer (hidden on lesson pages) -->
	{#if !isLessonPage}
	<footer class="border-t bg-muted">
		<div class="container mx-auto px-4 py-8 max-w-7xl">
			<div class="grid grid-cols-1 md:grid-cols-4 gap-8">
				<div class="space-y-3">
					<div class="flex items-center space-x-2 text-foreground">
						<BookOpen class="h-5 w-5" />
						<span class="font-bold">Open-EDU</span>
					</div>
					<p class="text-sm text-muted-foreground">
						Empowering learners worldwide with accessible, high-quality online education.
					</p>
				</div>
				<div class="space-y-3">
					<h3 class="text-sm font-semibold text-foreground">Platform</h3>
					<ul class="space-y-1 text-sm">
						<li><a href={getPath('/courses')} class="text-muted-foreground hover:text-primary hover:underline">Browse Courses</a></li>
						<li><a href="https://github.com/koostyy/open-edu#readme" target="_blank" rel="noopener noreferrer" class="text-muted-foreground hover:text-primary hover:underline">About Us</a></li>
						<li><a href="https://github.com/koostyy/open-edu#pricing" target="_blank" rel="noopener noreferrer" class="text-muted-foreground hover:text-primary hover:underline">Pricing</a></li>
					</ul>
				</div>
				<div class="space-y-3">
					<h3 class="text-sm font-semibold text-foreground">Support</h3>
					<ul class="space-y-1 text-sm">
						<li><a href="https://github.com/koostyy/open-edu/wiki" target="_blank" rel="noopener noreferrer" class="text-muted-foreground hover:text-primary hover:underline">Help Center</a></li>
						<li><a href="https://github.com/koostyy/open-edu/issues/new" target="_blank" rel="noopener noreferrer" class="text-muted-foreground hover:text-primary hover:underline">Contact</a></li>
						<li><a href="https://github.com/koostyy/open-edu/discussions" target="_blank" rel="noopener noreferrer" class="text-muted-foreground hover:text-primary hover:underline">Community</a></li>
					</ul>
				</div>
				<div class="space-y-3">
					<h3 class="text-sm font-semibold text-foreground">Legal</h3>
					<ul class="space-y-1 text-sm">
						<li><a href="https://github.com/koostyy/open-edu/blob/main/PRIVACY.md" target="_blank" rel="noopener noreferrer" class="text-muted-foreground hover:text-primary hover:underline">Privacy Policy</a></li>
						<li><a href="https://github.com/koostyy/open-edu/blob/main/LICENSE" target="_blank" rel="noopener noreferrer" class="text-muted-foreground hover:text-primary hover:underline">Terms of Service</a></li>
					</ul>
				</div>
			</div>
		</div>
		<div class="border-t bg-background">
			<div class="container mx-auto px-4 py-4 max-w-7xl">
				<div class="flex flex-col md:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
					<div class="text-center md:text-left">
						© {new Date().getFullYear()} Open-EDU. All rights reserved.
					</div>
					<div class="flex items-center gap-3 text-center md:text-right">
						<span class="font-mono">v{VERSION}</span>
						<span class="hidden sm:inline">•</span>
						<span class="hidden sm:inline font-mono">Build {formatBuildId()}</span>
						<span class="hidden md:inline">•</span>
						<span class="hidden md:inline capitalize">{ENVIRONMENT}</span>
					</div>
				</div>
			</div>
		</div>
	</footer>
	{/if}
</div>
