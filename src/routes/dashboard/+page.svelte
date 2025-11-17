<script lang="ts">
	import { AuthGuard } from '$lib/components'
	import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '$lib/components/ui'
	import { authState } from '$lib/auth.svelte'
	import { BookOpen, User, Clock, Award } from 'lucide-svelte'
	import { base } from '$app/paths'
</script>

<svelte:head>
	<title>Dashboard - Open-EDU</title>
	<meta name="description" content="Your Open-EDU dashboard" />
</svelte:head>

<AuthGuard>
	<div class="container mx-auto py-8 px-4">
		<!-- Welcome Section -->
		<div class="mb-8">
			<h1 class="text-3xl font-bold text-foreground mb-2">
				Welcome back{#if authState.user?.displayName}, {authState.user.displayName}{/if}!
			</h1>
			<p class="text-muted-foreground">
				Here's your learning progress and recent activity.
			</p>
		</div>

		<!-- Stats Cards -->
		<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
			<Card>
				<CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
					<CardTitle class="text-sm font-medium">Total Courses</CardTitle>
					<BookOpen class="h-4 w-4 text-muted-foreground" />
				</CardHeader>
				<CardContent>
					<div class="text-2xl font-bold">12</div>
					<p class="text-xs text-muted-foreground">
						+2 from last month
					</p>
				</CardContent>
			</Card>

			<Card>
				<CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
					<CardTitle class="text-sm font-medium">Completed</CardTitle>
					<Award class="h-4 w-4 text-muted-foreground" />
				</CardHeader>
				<CardContent>
					<div class="text-2xl font-bold">8</div>
					<p class="text-xs text-muted-foreground">
						+3 from last month
					</p>
				</CardContent>
			</Card>

			<Card>
				<CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
					<CardTitle class="text-sm font-medium">Study Hours</CardTitle>
					<Clock class="h-4 w-4 text-muted-foreground" />
				</CardHeader>
				<CardContent>
					<div class="text-2xl font-bold">142</div>
					<p class="text-xs text-muted-foreground">
						+12 from last week
					</p>
				</CardContent>
			</Card>

			<Card>
				<CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
					<CardTitle class="text-sm font-medium">Current Streak</CardTitle>
					<User class="h-4 w-4 text-muted-foreground" />
				</CardHeader>
				<CardContent>
					<div class="text-2xl font-bold">7</div>
					<p class="text-xs text-muted-foreground">
						days in a row
					</p>
				</CardContent>
			</Card>
		</div>

		<!-- Recent Activity -->
		<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
			<Card>
				<CardHeader>
					<CardTitle>Recent Courses</CardTitle>
					<CardDescription>
						Your most recently accessed courses
					</CardDescription>
				</CardHeader>
				<CardContent>
					<div class="space-y-4">
						<div class="flex items-center space-x-4">
							<div class="w-10 h-10 bg-primary/20 rounded-lg flex items-center justify-center">
								<BookOpen class="h-5 w-5 text-primary" />
							</div>
							<div class="flex-1">
								<p class="text-sm font-medium">Advanced React Patterns</p>
								<p class="text-xs text-muted-foreground">75% complete</p>
							</div>
						</div>

						<div class="flex items-center space-x-4">
							<div class="w-10 h-10 bg-primary/20 rounded-lg flex items-center justify-center">
								<BookOpen class="h-5 w-5 text-primary" />
							</div>
							<div class="flex-1">
								<p class="text-sm font-medium">TypeScript Fundamentals</p>
								<p class="text-xs text-muted-foreground">90% complete</p>
							</div>
						</div>

						<div class="flex items-center space-x-4">
							<div class="w-10 h-10 bg-primary/20 rounded-lg flex items-center justify-center">
								<BookOpen class="h-5 w-5 text-primary" />
							</div>
							<div class="flex-1">
								<p class="text-sm font-medium">Web Design Basics</p>
								<p class="text-xs text-muted-foreground">45% complete</p>
							</div>
						</div>
					</div>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>Quick Actions</CardTitle>
					<CardDescription>
						Common tasks and shortcuts
					</CardDescription>
				</CardHeader>
				<CardContent>
					<div class="space-y-3">
						<a 
							href="{base}/courses" 
							class="block p-3 rounded-lg border border-border hover:bg-muted transition-colors"
						>
							<div class="flex items-center space-x-3">
								<BookOpen class="h-5 w-5 text-primary" />
								<div>
									<p class="text-sm font-medium">Browse Courses</p>
									<p class="text-xs text-muted-foreground">Discover new learning materials</p>
								</div>
							</div>
						</a>

						<a 
							href="{base}/auth/profile" 
							class="block p-3 rounded-lg border border-border hover:bg-muted transition-colors"
						>
							<div class="flex items-center space-x-3">
								<User class="h-5 w-5 text-primary" />
								<div>
									<p class="text-sm font-medium">Edit Profile</p>
									<p class="text-xs text-muted-foreground">Update your account information</p>
								</div>
							</div>
						</a>

						<div class="p-3 rounded-lg border border-border">
							<div class="flex items-center space-x-3">
								<Award class="h-5 w-5 text-primary" />
								<div>
									<p class="text-sm font-medium">Next Goal</p>
									<p class="text-xs text-muted-foreground">Complete 2 more courses this month</p>
								</div>
							</div>
						</div>
					</div>
				</CardContent>
			</Card>
		</div>

		<!-- User Info Debug (for testing) -->
		{#if authState.user}
			<Card class="mt-8">
				<CardHeader>
					<CardTitle>User Information (Debug)</CardTitle>
					<CardDescription>
						Current user data for testing purposes
					</CardDescription>
				</CardHeader>
				<CardContent>
					<pre class="text-xs bg-muted p-3 rounded overflow-auto">
{JSON.stringify(authState.user, null, 2)}
					</pre>
				</CardContent>
			</Card>
		{/if}
	</div>
</AuthGuard>