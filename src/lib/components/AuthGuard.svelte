<script lang="ts">
	import { authState } from '$lib/auth.svelte'
	import { goto } from '$app/navigation'
	import { Shield, LoaderCircle } from 'lucide-svelte'
	
	type Props = {
		children: import('svelte').Snippet
		redirectTo?: string
		requireAuth?: boolean
		showLoading?: boolean
	}
	
	let { 
		children, 
		redirectTo = '/auth/login',
		requireAuth = true,
		showLoading = true
	}: Props = $props()

	// Redirect logic
	$effect(() => {
		// Wait for auth to be initialized before making navigation decisions
		if (!authState.initialized) {
			return
		}
		
		if (requireAuth && !authState.user) {
			goto(redirectTo)
		} else if (!requireAuth && authState.user) {
			// For login page when user is already logged in
			goto('/dashboard')
		}
	})

	// Determine what to show
	const shouldShow = $derived.by(() => {
		// Show loading until auth is initialized
		if (!authState.initialized) {
			return 'loading'
		}
		
		if (requireAuth) {
			return authState.user ? 'content' : 'unauthorized'
		} else {
			return authState.user ? 'redirect' : 'content'
		}
	})
</script>

{#if shouldShow === 'loading' && showLoading}
	<!-- Loading State -->
	<div class="min-h-screen flex items-center justify-center">
		<div class="text-center space-y-4">
			<LoaderCircle class="h-8 w-8 animate-spin text-primary mx-auto" />
			<p class="text-sm text-muted-foreground">Loading...</p>
		</div>
	</div>
{:else if shouldShow === 'content'}
	<!-- Show protected content -->
	{@render children()}
{:else if shouldShow === 'unauthorized'}
	<!-- Unauthorized access -->
	<div class="min-h-screen flex items-center justify-center">
		<div class="text-center space-y-4 max-w-md mx-auto px-4">
			<Shield class="h-12 w-12 text-muted-foreground mx-auto" />
			<h1 class="text-2xl font-bold text-foreground">Access Restricted</h1>
			<p class="text-muted-foreground">
				You need to be signed in to access this page.
			</p>
			<a 
				href={redirectTo} 
				class="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
			>
				Sign In
			</a>
		</div>
	</div>
{/if}