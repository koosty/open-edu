<script lang="ts">
	import { Button, Input, Card, CardHeader, CardTitle, CardDescription, CardContent } from '$lib/components/ui'
	import { authState, updateUserProfile, logout } from '$lib/auth.svelte'
	import { navigate } from '$lib/utils/navigation'
	import { getErrorMessage } from '$lib/utils/errors'
	import { User, Mail, Calendar, Save, LogOut, Pencil } from 'lucide-svelte'
	
	let displayName = $state('')
	let email = $state('')
	let isEditing = $state(false)
	let loading = $state(false)
	let error = $state<string | null>(null)
	let success = $state<string | null>(null)

	// Initialize form data when user is loaded
	$effect(() => {
		if (authState.user) {
			displayName = authState.user.displayName || ''
			email = authState.user.email
		}
	})

	// Redirect if not logged in
	$effect(() => {
		if (!authState.loading && !authState.user) {
			navigate('/auth/login')
		}
	})

	async function handleSave(event: Event) {
		event.preventDefault()
		
		if (!displayName.trim()) {
			error = 'Display name is required'
			return
		}

		loading = true
		error = null
		success = null

		try {
			await updateUserProfile({ displayName: displayName.trim() })
			success = 'Profile updated successfully!'
			isEditing = false
		} catch (err) {
			error = getErrorMessage(err)
		} finally {
			loading = false
		}
	}

	async function handleLogout() {
		try {
			await logout()
			navigate('/')
		} catch (err) {
			error = getErrorMessage(err)
		}
	}

	function startEditing() {
		isEditing = true
		error = null
		success = null
	}

	function cancelEditing() {
		isEditing = false
		error = null
		success = null
		// Reset form to current user data
		if (authState.user) {
			displayName = authState.user.displayName || ''
		}
	}
</script>

<svelte:head>
	<title>Profile - Open-EDU</title>
	<meta name="description" content="Manage your Open-EDU profile" />
</svelte:head>

<div class="min-h-screen py-12 px-4 sm:px-6 lg:px-8">
	<div class="max-w-2xl mx-auto">
		<!-- Header -->
		<div class="text-center mb-8">
			<User class="mx-auto h-12 w-12 text-primary" />
			<h1 class="mt-6 text-3xl font-bold text-foreground">Your Profile</h1>
			<p class="mt-2 text-sm text-muted-foreground">
				Manage your account information and settings
			</p>
		</div>

		<div class="space-y-6">
			<!-- Profile Information -->
			<Card>
				<CardHeader>
					<div class="flex items-center justify-between">
						<div>
							<CardTitle>Profile Information</CardTitle>
							<CardDescription>
								Your personal details and account information
							</CardDescription>
						</div>
						{#if !isEditing}
							<Button variant="outline" size="sm" onclick={startEditing}>
								<Pencil class="h-4 w-4 mr-2" />
								Edit
							</Button>
						{/if}
					</div>
				</CardHeader>
				<CardContent>
					{#if isEditing}
						<!-- Edit Form -->
						<form onsubmit={handleSave} class="space-y-4">
							<div>
								<label for="displayName" class="block text-sm font-medium text-foreground mb-2">
									Display Name
								</label>
								<Input
									id="displayName"
									type="text"
									required
									placeholder="Enter your display name"
									bind:value={displayName}
									disabled={loading}
								/>
							</div>

							<div>
								<label for="email" class="block text-sm font-medium text-foreground mb-2">
									Email Address
								</label>
								<Input
									id="email"
									type="email"
									value={email}
									disabled
									class="bg-muted"
								/>
								<p class="mt-1 text-xs text-muted-foreground">
									Email cannot be changed from here
								</p>
							</div>

							{#if error}
								<div class="bg-destructive/10 border border-destructive/20 rounded-md p-3">
									<p class="text-sm text-destructive">{error}</p>
								</div>
							{/if}

							{#if success}
								<div class="bg-green-500/10 border border-green-500/20 rounded-md p-3">
									<p class="text-sm text-green-700 dark:text-green-400">{success}</p>
								</div>
							{/if}

							<div class="flex space-x-3">
								<Button type="submit" disabled={loading}>
									{#if loading}
										<div class="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2"></div>
										Saving...
									{:else}
										<Save class="h-4 w-4 mr-2" />
										Save Changes
									{/if}
								</Button>
								<Button type="button" variant="outline" onclick={cancelEditing} disabled={loading}>
									Cancel
								</Button>
							</div>
						</form>
					{:else}
						<!-- Display Mode -->
						<div class="space-y-4">
							<div class="flex items-center space-x-3">
								<User class="h-5 w-5 text-muted-foreground" />
								<div>
									<p class="text-sm font-medium text-foreground">Display Name</p>
									<p class="text-sm text-muted-foreground">
										{authState.user?.displayName || 'Not set'}
									</p>
								</div>
							</div>

							<div class="flex items-center space-x-3">
								<Mail class="h-5 w-5 text-muted-foreground" />
								<div>
									<p class="text-sm font-medium text-foreground">Email Address</p>
									<p class="text-sm text-muted-foreground">
										{authState.user?.email}
									</p>
									{#if authState.user && !authState.user.emailVerified}
										<span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 mt-1">
											Unverified
										</span>
									{/if}
								</div>
							</div>

							<div class="flex items-center space-x-3">
								<Calendar class="h-5 w-5 text-muted-foreground" />
								<div>
									<p class="text-sm font-medium text-foreground">Member Since</p>
									<p class="text-sm text-muted-foreground">
										{#if authState.user?.createdAt}
											{new Date(authState.user.createdAt).toLocaleDateString()}
										{:else}
											Unknown
										{/if}
									</p>
								</div>
							</div>

							{#if success}
								<div class="bg-green-500/10 border border-green-500/20 rounded-md p-3">
									<p class="text-sm text-green-700 dark:text-green-400">{success}</p>
								</div>
							{/if}
						</div>
					{/if}
				</CardContent>
			</Card>

			<!-- Account Actions -->
			<Card>
				<CardHeader>
					<CardTitle>Account Actions</CardTitle>
					<CardDescription>
						Manage your account settings and preferences
					</CardDescription>
				</CardHeader>
				<CardContent>
					<div class="space-y-4">
						<div class="border-t border-border pt-4">
							<div class="flex items-center justify-between">
								<div>
									<h3 class="text-sm font-medium text-foreground">Sign Out</h3>
									<p class="text-sm text-muted-foreground">
										Sign out of your account on this device
									</p>
								</div>
								<Button variant="destructive" size="sm" onclick={handleLogout}>
									<LogOut class="h-4 w-4 mr-2" />
									Sign Out
								</Button>
							</div>
						</div>
					</div>
				</CardContent>
			</Card>
		</div>
	</div>
</div>