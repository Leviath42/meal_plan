CREATE INDEX `meal_plans_date_idx` ON `meal_plans` (`date`);--> statement-breakpoint
CREATE INDEX `meal_plans_recipe_date_idx` ON `meal_plans` (`recipe_id`,`date`);--> statement-breakpoint
CREATE UNIQUE INDEX `meal_plans_slot_unique` ON `meal_plans` (`date`,`meal_type`,`recipe_id`);--> statement-breakpoint
CREATE INDEX `recipe_ingredients_recipe_idx` ON `recipe_ingredients` (`recipe_id`);