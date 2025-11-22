<script lang="ts">
	import { toggleMode } from 'mode-watcher'
	import { Moon, Sun } from 'lucide-svelte'
	import { Button } from '$lib/components/ui'
</script>

<Button
	variant="ghost"
	size="icon"
	onclick={toggleMode}
	title="Toggle theme"
	class="relative"
>
	<Sun class="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
	<Moon
		class="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100"
	/>
	<span class="sr-only">Toggle theme</span>
</Button>
