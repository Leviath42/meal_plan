-- Migration: Add meal_course column to recipes and meal_plans tables
-- This allows ordering meals chronologically (apéritif, entrée, plat, accompagnement, dessert, boisson)

-- Add meal_course to recipes table
ALTER TABLE recipes ADD COLUMN meal_course TEXT;

-- Add meal_course to meal_plans table  
ALTER TABLE meal_plans ADD COLUMN meal_course TEXT;
