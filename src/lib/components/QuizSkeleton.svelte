<!--
	QuizSkeleton Component
	Loading skeleton for quiz viewer
-->
<script lang="ts">
	import { Card, CardContent, Skeleton } from '$lib/components/ui'
</script>

<div class="quiz-skeleton">
	<!-- Header Skeleton -->
	<div class="bg-white border-b border-slate-200 p-4 md:p-6 sticky top-0 shadow-sm">
		<div class="max-w-4xl mx-auto">
			<div class="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
				<div class="flex-1 min-w-0 space-y-2">
					<Skeleton variant="heading" width="40%" />
					<Skeleton variant="text" width="60%" />
				</div>
				
				<div class="flex items-center gap-2 md:gap-4">
					<Skeleton variant="button" width="120px" height="42px" />
					<Skeleton variant="text" width="80px" />
				</div>
			</div>
			
			<!-- Progress bar -->
			<Skeleton variant="text" height="8px" />
		</div>
	</div>
	
	<!-- Instructions Skeleton -->
	<div class="max-w-4xl mx-auto px-4 md:px-6 pt-4 md:pt-6">
		<Card class="border-slate-200 bg-slate-50">
			<CardContent class="p-4 md:p-5">
				<div class="flex items-start gap-2 md:gap-3">
					<Skeleton circle width="20px" height="20px" />
					<div class="flex-1 space-y-2">
						<Skeleton variant="text" width="30%" />
						<Skeleton variant="text" width="90%" />
						<Skeleton variant="text" width="80%" />
					</div>
				</div>
			</CardContent>
		</Card>
	</div>
	
	<!-- Question Card Skeleton -->
	<div class="max-w-4xl mx-auto px-4 md:px-6 py-6 md:py-8">
		<Card class="shadow-lg border-slate-200">
			<CardContent class="p-4 md:p-8">
				<!-- Question header -->
				<div class="flex items-start gap-3 md:gap-4 mb-4 md:mb-6">
					<Skeleton circle width="40px" height="40px" />
					<div class="flex-1 space-y-2">
						<Skeleton variant="text" width="30%" />
						<Skeleton variant="heading" width="80%" />
					</div>
				</div>
				
				<!-- Answer options -->
				<div class="space-y-3">
					<Skeleton variant="button" height="44px" />
					<Skeleton variant="button" height="44px" />
					<Skeleton variant="button" height="44px" />
					<Skeleton variant="button" height="44px" />
				</div>
			</CardContent>
		</Card>
	</div>
	
	<!-- Navigation Footer Skeleton -->
	<div class="border-t border-slate-200 bg-white p-3 md:p-6 sticky bottom-0 shadow-lg">
		<div class="max-w-4xl mx-auto">
			<!-- Question navigator -->
			<div class="flex gap-2 mb-3 md:mb-4 overflow-x-auto pb-2">
				{#each Array(5) as __, index (index)}
					<Skeleton width="44px" height="44px" className="shrink-0" />
				{/each}
			</div>
			
			<!-- Navigation buttons -->
			<div class="flex items-center justify-between gap-2">
				<Skeleton variant="button" width="100px" height="44px" />
				<Skeleton variant="button" width="120px" height="44px" />
			</div>
		</div>
	</div>
</div>

<style>
	.quiz-skeleton {
		min-height: 100vh;
		background-color: #f8fafc;
	}
</style>
