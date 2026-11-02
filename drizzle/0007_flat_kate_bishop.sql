CREATE TABLE `license_audit` (
	`id` text PRIMARY KEY NOT NULL,
	`license_id` text NOT NULL,
	`action` text NOT NULL,
	`reason` text,
	`by_user_id` text,
	`at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`license_id`) REFERENCES `licenses`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `licenses` (
	`id` text PRIMARY KEY NOT NULL,
	`license_key` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`cgv_version` text,
	`licensed_at` text,
	`stripe_session_id` text,
	`stripe_customer_id` text,
	`suspended_at` text,
	`suspension_reason` text,
	`reactivated_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `licenses_license_key_unique` ON `licenses` (`license_key`);--> statement-breakpoint
CREATE UNIQUE INDEX `licenses_stripe_session_id_unique` ON `licenses` (`stripe_session_id`);