CREATE TABLE `assets` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`namespace` text NOT NULL,
	`key` text NOT NULL,
	`hash_etag` text NOT NULL,
	`size_bytes` integer NOT NULL,
	`last_modified` integer NOT NULL,
	`synced_at` integer NOT NULL,
	`routing_type` text NOT NULL,
	`storage_class` text DEFAULT 'archived' NOT NULL,
	`generation_source` text,
	`generation_params` text,
	`is_dirty` integer DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `namespace_key_idx` ON `assets` (`namespace`,`key`);--> statement-breakpoint
CREATE TABLE `groups` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`key_version` integer DEFAULT 1 NOT NULL,
	`master_key` blob NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `groups_name_unique` ON `groups` (`name`);--> statement-breakpoint
CREATE TABLE `memberships` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`group_id` integer NOT NULL,
	`role` text,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`group_id`) REFERENCES `groups`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `memberships_user_id_group_id_unique` ON `memberships` (`user_id`,`group_id`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`firebase_guid` text NOT NULL,
	`app_guid` text NOT NULL,
	`public_key` text NOT NULL,
	`created_at` integer NOT NULL,
	`email` text,
	`display_name` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_firebase_guid_unique` ON `users` (`firebase_guid`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_app_guid_unique` ON `users` (`app_guid`);