<script lang="ts">
	import { getLocale, locales, localizeUrl } from '$lib/paraglide/runtime'
	import { page } from '$app/stores'

	const languages = {
		en: { name: 'English', flag: '🇬🇧' },
		id: { name: 'Bahasa Indonesia', flag: '🇮🇩' }
	}

	// Make currentLocale reactive to URL changes
	$: currentLocale = getLocale()

	function switchLanguage(newLang: string) {
		const currentUrl = $page.url.pathname + $page.url.search
		const newUrl = localizeUrl(currentUrl, { locale: newLang })
		window.location.href = newUrl.toString()
	}
</script>

<div class="relative inline-block">
	<select
		value={currentLocale}
		onchange={(e) => switchLanguage(e.currentTarget.value)}
		class="appearance-none bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 pr-10 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer transition-colors"
		aria-label="Select language"
	>
		{#each locales as lang}
			<option value={lang}>
				{languages[lang as keyof typeof languages].flag}
				{languages[lang as keyof typeof languages].name}
			</option>
		{/each}
	</select>
</div>

<style>
	select {
		background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e");
		background-position: right 0.5rem center;
		background-repeat: no-repeat;
		background-size: 1.5em 1.5em;
	}
</style>
