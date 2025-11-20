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
					<Skeleton variant="button" width="40px" />
					<Skeleton variant="button" width="40px" />
				</div>
				<Skeleton variant="button" width="80px" />
			</div>
			
			<!-- Title and description -->
			<div class="space-y-2">
				<Skeleton variant="heading" width="60%" />
				<Skeleton variant="text" width="80%" />
			</div>
		</div>
		
		<CardContent>
			<!-- Content skeleton -->
			<div class="prose prose-slate max-w-none space-y-4">
				<!-- Paragraph lines -->
				<div class="space-y-2">
					<Skeleton variant="text" width="100%" />
					<Skeleton variant="text" width="95%" />
					<Skeleton variant="text" width="88%" />
					<Skeleton variant="text" width="92%" />
				</div>
				
				<!-- Heading -->
				<Skeleton variant="heading" width="50%" className="mt-6" />
				
				<!-- More paragraph lines -->
				<div class="space-y-2">
					<Skeleton variant="text" width="98%" />
					<Skeleton variant="text" width="94%" />
					<Skeleton variant="text" width="90%" />
				</div>
				
				<!-- Another heading -->
				<Skeleton variant="heading" width="45%" className="mt-6" />
				
				<!-- Code block placeholder -->
				<Skeleton variant="card" height="120px" />
				
				<!-- Final paragraph -->
				<div class="space-y-2">
					<Skeleton variant="text" width="96%" />
					<Skeleton variant="text" width="92%" />
					<Skeleton variant="text" width="70%" />
				</div>
			</div>
		</CardContent>
	</Card>
	
	<!-- Navigation skeleton -->
	<div class="flex items-center justify-between">
		<Skeleton variant="button" width="120px" />
		<Skeleton variant="button" width="140px" />
	</div>
</div>
