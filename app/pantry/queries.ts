// app/pantry/queries.ts
// Helpers DB du garde-manger (F11) : lus/écrits par les Server Actions ET par
// scripts/test-pantry.ts — le test exécute les requêtes de production, pas
// une réplique (leçon C-055). Ce module n'est PAS un fichier « use server » :
// les gardes de session restent dans app/actions/pantry.ts.
//
// F17 multi-tenant (C-062) : chaque helper prend le foyer en dernier argument.
// Le code applicatif passe TOUJOURS le foyer de session (requireSession) ;
// l'argument optionnel (tests runtime historiques, base mono-foyer) retombe
// sur le foyer principal via le backfill idempotent — aucune requête ne
// tourne non filtrée.

import { db } from '@/lib/db';
import { ingredients, pantryItems } from '@/lib/db/schema';
import { ensurePrimaryHousehold } from '@/lib/household';
import { and, asc, eq, sql } from 'drizzle-orm';

// ---------------------------------------------------------------------------
// CRUD stock
// ---------------------------------------------------------------------------

// Foyer effectif d'un appel : explicite (production) ou foyer principal
// (backfill idempotent — tests runtime et dérivés mono-foyer)
function resolveHousehold(householdId?: string): string {
  return householdId ?? ensurePrimaryHousehold();
}

// Ligne de stock jointe au catalogue (nom + rayon pour l'affichage)
export interface PantryRow {
  id: string;
  ingredientId: string;
  quantity: number;
  unit: string;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
  name: string;
  category: string;
}

export function listPantryItems(householdId?: string): PantryRow[] {
  const hid = resolveHousehold(householdId);
  return db
    .select({
      id: pantryItems.id,
      ingredientId: pantryItems.ingredientId,
      quantity: pantryItems.quantity,
      unit: pantryItems.unit,
      expiresAt: pantryItems.expiresAt,
      createdAt: pantryItems.createdAt,
      updatedAt: pantryItems.updatedAt,
      name: ingredients.name,
      category: ingredients.category,
    })
    .from(pantryItems)
    .innerJoin(ingredients, eq(pantryItems.ingredientId, ingredients.id))
    .where(and(eq(pantryItems.householdId, hid), eq(ingredients.householdId, hid)))
    .orderBy(asc(ingredients.name))
    .all();
}

// L'ingrédient doit exister au CATALOGUE DU FOYER : renvoie son unité par
// défaut (pré-remplissage de l'UI) ou null
export function findIngredientById(
  id: string,
  householdId?: string
): { id: string; name: string; defaultUnit: string | null } | undefined {
  const hid = resolveHousehold(householdId);
  return db
    .select({ id: ingredients.id, name: ingredients.name, defaultUnit: ingredients.defaultUnit })
    .from(ingredients)
    .where(and(eq(ingredients.id, id), eq(ingredients.householdId, hid)))
    .limit(1)
    .get();
}

// Enregistre une ligne de stock : une seule ligne par ingrédient
// (contrainte unique ingredient_id) → upsert en transaction synchrone.
// Gère la concurrence éventuelle en retombant sur l'update si la ligne
// a été créée entre-temps.
export function upsertPantryItem(input: {
  ingredientId: string;
  quantity: number;
  unit: string;
  expiresAt: string | null;
  householdId?: string;
}): void {
  const hid = resolveHousehold(input.householdId);
  db.transaction((tx) => {
    const existing = tx
      .select({ id: pantryItems.id })
      .from(pantryItems)
      .where(and(eq(pantryItems.ingredientId, input.ingredientId), eq(pantryItems.householdId, hid)))
      .limit(1)
      .get();
    if (existing) {
      tx.update(pantryItems)
        .set({
          quantity: input.quantity,
          unit: input.unit,
          expiresAt: input.expiresAt,
          updatedAt: sql`CURRENT_TIMESTAMP`,
        })
        .where(eq(pantryItems.id, existing.id))
        .run();
    } else {
      tx.insert(pantryItems)
        .values({
          ingredientId: input.ingredientId,
          householdId: hid,
          quantity: input.quantity,
          unit: input.unit,
          expiresAt: input.expiresAt,
        })
        .run();
    }
  });
}

export function deletePantryItemById(id: string, householdId?: string): number {
  const hid = resolveHousehold(householdId);
  const existing = db
    .select({ id: pantryItems.id })
    .from(pantryItems)
    .where(and(eq(pantryItems.id, id), eq(pantryItems.householdId, hid)))
    .limit(1)
    .get();
  if (!existing) return 0;
  return db.delete(pantryItems).where(eq(pantryItems.id, existing.id)).run().changes;
}

// ---------------------------------------------------------------------------
// Intégration courses : le stock couvre une partie du besoin
// ---------------------------------------------------------------------------

export interface PantryStockRow {
  ingredientId: string;
  quantity: number;
  unit: string;
}

// Tout le stock du garde-manger du foyer (lecture récente à chaque génération :
// les listes sont recalculées depuis la base, jamais depuis un cache)
export function fetchPantryStock(householdId?: string): PantryStockRow[] {
  const hid = resolveHousehold(householdId);
  return db
    .select({ ingredientId: pantryItems.ingredientId, quantity: pantryItems.quantity, unit: pantryItems.unit })
    .from(pantryItems)
    .where(eq(pantryItems.householdId, hid))
    .all();
}

export interface DeductibleRow {
  ingredientId: string;
  unit: string;
  quantity: number;
}

// Déduit le stock d'une liste d'articles fusionnés : la correspondance se
// fait par (ingrédient, unité) — un stock exprimé dans une autre unité ne
// couvre pas le besoin (pas de conversion automatique). Résultat :
// - quantité réduite (500 g demandés, 200 g en stock → 300 g) ;
// - article exclu si le stock couvre tout le besoin (<= 0 après soustraction) ;
// - aucune déduction sur les articles sans ligne de stock correspondante.
export function deductPantryStock<Row extends DeductibleRow>(
  rows: Row[],
  stock: PantryStockRow[]
): { rows: Row[]; deducted: number; excluded: number } {
  const stockByKey = new Map(stock.map((row) => [`${row.ingredientId}|${row.unit}`, row.quantity]));
  let deducted = 0;
  let excluded = 0;
  const result: Row[] = [];
  for (const row of rows) {
    const available = stockByKey.get(`${row.ingredientId}|${row.unit}`);
    if (available === undefined) {
      result.push(row);
      continue;
    }
    const remainder = Math.round((row.quantity - available) * 1000) / 1000;
    if (remainder <= 0) {
      excluded++;
      continue;
    }
    deducted++;
    result.push({ ...row, quantity: remainder });
  }
  return { rows: result, deducted, excluded };
}
