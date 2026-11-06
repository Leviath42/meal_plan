DROP INDEX `ingredients_name_unique`;--> statement-breakpoint
ALTER TABLE `ingredients` ADD `household_id` text;--> statement-breakpoint
CREATE UNIQUE INDEX `ingredients_household_name_unique` ON `ingredients` (`household_id`,`name`);--> statement-breakpoint
DROP INDEX `meal_plans_slot_unique`;--> statement-breakpoint
ALTER TABLE `meal_plans` ADD `household_id` text;--> statement-breakpoint
CREATE UNIQUE INDEX `meal_plans_slot_household_unique` ON `meal_plans` (`household_id`,`date`,`meal_type`,`recipe_id`);--> statement-breakpoint
ALTER TABLE `access_tokens` ADD `household_id` text;--> statement-breakpoint
ALTER TABLE `feedback` ADD `household_id` text;--> statement-breakpoint
ALTER TABLE `ingredient_standards` ADD `household_id` text;--> statement-breakpoint
ALTER TABLE `pantry_items` ADD `household_id` text;--> statement-breakpoint
ALTER TABLE `recipe_ingredients` ADD `household_id` text;--> statement-breakpoint
ALTER TABLE `recipes` ADD `household_id` text;--> statement-breakpoint
ALTER TABLE `shopping_items` ADD `household_id` text;