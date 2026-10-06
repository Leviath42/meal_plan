-- Migration: Ajout des timestamps createdAt et updatedAt à meal_plans
-- Date: 2026-10-06
-- Description: Ajout des champs createdAt et updatedAt pour le suivi des repas planifiés

ALTER TABLE meal_plans ADD COLUMN created_at TEXT DEFAULT (datetime('now'));
ALTER TABLE meal_plans ADD COLUMN updated_at TEXT DEFAULT (datetime('now'));

-- Mettre à jour les enregistrements existants
UPDATE meal_plans SET created_at = datetime('now'), updated_at = datetime('now') WHERE created_at IS NULL OR updated_at IS NULL;
