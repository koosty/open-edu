<!--
	LessonSkeleton Component
	Loading skeleton for lesson content page
-->
<script lang="ts">
	import { Card, CardContent, Skeleton } from '$lib/components/ui'
</script>

<div class="px-6 py-12 max-w-4xl mx-auto">
	<Card class="mb-6 shadow-lg">
		<!-- Lesson Header Skeleton -->
		<div class="px-6 pt-6 pb-4 border-b border-slate-200">
			<div class="flex items-center justify-between gap-4 mb-4">
				<div class="flex items-center gap-3">
					<Skeleton class="h-10 w-[40px]" />
					<Skeleton class="h-10 w-[40px]" />
				</div>
				<Skeleton class="h-10 w-[80px]" />
			</div>
			
			<!-- Title and description -->
			<div class="space-y-2">
				<Skeleton class="h-8 w-[60%]" />
				<Skeleton class="h-4 w-[80%]" />
			</div>
		</div>
		
		<CardContent>
			<!-- Content skeleton -->
			<div class="prose prose-slate max-w-none space-y-4">
				<!-- Paragraph lines -->
				<div class="space-y-2">
					<Skeleton class="h-4 w-full" />
					<Skeleton class="h-4 w-[95%]" />
					<Skeleton class="h-4 w-[88%]" />
					<Skeleton class="h-4 w-[92%]" />
				</div>
				
				<!-- Heading -->
				<Skeleton class="h-8 w-[50%] mt-6" />
				
				<!-- More paragraph lines -->
				<div class="space-y-2">
					<Skeleton class="h-4 w-[98%]" />
					<Skeleton class="h-4 w-[94%]" />
					<Skeleton class="h-4 w-[90%]" />
				</div>
				
				<!-- Another heading -->
				<Skeleton class="h-8 w-[45%] mt-6" />
				
				<!-- Code block placeholder -->
				<Skeleton class="h-[120px] w-full rounded-xl" />
				
				<!-- Final paragraph -->
				<div class="space-y-2">
					<Skeleton class="h-4 w-[96%]" />
					<Skeleton class="h-4 w-[92%]" />
					<Skeleton class="h-4 w-[70%]" />
				</div>
			</div>
		</CardContent>
	</Card>
	
	<!-- Navigation skeleton -->
	<div class="flex items-center justify-between">
		<Skeleton class="h-10 w-[120px]" />
		<Skeleton class="h-10 w-[140px]" />
	</div>
</div>
