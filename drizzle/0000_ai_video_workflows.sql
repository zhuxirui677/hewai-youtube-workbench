CREATE TABLE `ai_video_workflows` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`state` text NOT NULL,
	`payload` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `ai_video_workflows_updated_at_idx` ON `ai_video_workflows` (`updated_at`);
