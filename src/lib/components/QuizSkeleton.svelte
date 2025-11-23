<!--
	QuizSkeleton Component
	Loading skeleton for quiz viewer
-->
<script lang="ts">
	import { Card, CardContent, Skeleton } from '$lib/components/ui'
</script>

<div class="quiz-skeleton">
	<!-- Header Skeleton -->
	<div class="bg-background border-b border-slate-200 p-4 md:p-6 sticky top-0 shadow-sm">
		<div class="max-w-4xl mx-auto">
			<div class="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
				<div class="flex-1 min-w-0 space-y-2">
					<Skeleton class="h-8 w-[40%]" />
					<Skeleton class="h-4 w-[60%]" />
				</div>
				
				<div class="flex items-center gap-2 md:gap-4">
					<Skeleton class="h-[42px] w-[120px]" />
					<Skeleton class="h-4 w-[80px]" />
				</div>
			</div>
			
			<!-- Progress bar -->
			<Skeleton class="h-2 w-full" />
		</div>
	</div>
	
	<!-- Instructions Skeleton -->
	<div class="max-w-4xl mx-auto px-4 md:px-6 pt-4 md:pt-6">
		<Card class="border-slate-200 bg-slate-50">
			<CardContent class="p-4 md:p-5">
				<div class="flex items-start gap-2 md:gap-3">
					<Skeleton class="h-5 w-5 rounded-full" />
					<div class="flex-1 space-y-2">
						<Skeleton class="h-4 w-[30%]" />
						<Skeleton class="h-4 w-[90%]" />
						<Skeleton class="h-4 w-[80%]" />
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
					<Skeleton class="h-10 w-10 rounded-full" />
					<div class="flex-1 space-y-2">
						<Skeleton class="h-4 w-[30%]" />
						<Skeleton class="h-8 w-[80%]" />
					</div>
				</div>
				
				<!-- Answer options -->
				<div class="space-y-3">
					<Skeleton class="h-11 w-full" />
					<Skeleton class="h-11 w-full" />
					<Skeleton class="h-11 w-full" />
					<Skeleton class="h-11 w-full" />
				</div>
			</CardContent>
		</Card>
	</div>
	
	<!-- Navigation Footer Skeleton -->
	<div class="border-t border-slate-200 bg-background p-3 md:p-6 sticky bottom-0 shadow-lg">
		<div class="max-w-4xl mx-auto">
			<!-- Question navigator -->
			<div class="flex gap-2 mb-3 md:mb-4 overflow-x-auto pb-2">
				{#each Array(5) as __, index (index)}
					<Skeleton class="h-11 w-11 shrink-0" />
				{/each}
			</div>
			
			<!-- Navigation buttons -->
			<div class="flex items-center justify-between gap-2">
				<Skeleton class="h-11 w-[100px]" />
				<Skeleton class="h-11 w-[120px]" />
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
