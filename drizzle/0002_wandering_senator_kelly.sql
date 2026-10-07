ALTER TABLE `recipes` ADD `last_served_at` text;--> statement-breakpoint
ALTER TABLE `users` ADD `min_days_between` integer DEFAULT 7 NOT NULL;