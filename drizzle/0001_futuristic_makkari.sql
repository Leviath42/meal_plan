CREATE TABLE `access_tokens` (
	`id` text PRIMARY KEY NOT NULL,
	`token` text NOT NULL,
	`created_by_user_id` text,
	`type` text DEFAULT 'calendar_read' NOT NULL,
	`expires_at` text NOT NULL,
	`revoked_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`created_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `access_tokens_token_unique` ON `access_tokens` (`token`);--> statement-breakpoint
CREATE TABLE `app_settings` (
	`id` integer PRIMARY KEY DEFAULT 1 NOT NULL,
	`default_servings` integer DEFAULT 4 NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
