import { z } from 'zod';

// F07 — Import de recette depuis une URL : extraction des métadonnées
// Schema.org (JSON-LD `Recipe`), avec fallback spécifique Marmiton / 750g.
// Aucune dépendance externe : fetch natif + parse regex/JSON-LD maison.

export const MAX_HTML_BYTES = 512 * 1024; // 512 Ko : au-delà, on refuse (page trop lourde)
const FETCH_TIMEOUT_MS = 15_000;

export const importedRecipeSchema = z.object({
  title: z.string().min(1).max(150),
  description: z.string().max(2000).optional().nullable(),
  prepTime: z.number().int().min(0).default(0),
  cookTime: z.number().int().min(0).default(0),
  defaultServings: z.number().int().min(1).default(4),
  instructions: z.string().max(20000).default(''),
  tags: z.string().max(300).optional().nullable(),
  source: z.string().max(500),
  ingredients: z
    .array(
      z.object({
        name: z.string().min(1).max(100),
        quantity: z.number().gt(0).optional(),
        unit: z.string().max(50).optional(),
      })
    )
    .max(60)
    .default([]),
});

export type ImportedRecipe = z.infer<typeof importedRecipeSchema>;

export type ImportResult =
  | { ok: true; recipe: ImportedRecipe; host: string }
  | { ok: false; error: string };

// Normalise une URL saisie par l'utilisateur : ajoute https:// si absent,
// refuse tout schéma autre que http(s)
export function normalizeRecipeUrl(input: string): URL | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const url = new URL(withScheme);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
    return url;
  } catch {
    return null;
  }
}

// Extrait les blocs JSON-LD du HTML (script type="application/ld+json")
function extractJsonLdBlocks(html: string): unknown[] {
  const blocks: unknown[] = [];
  const re = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const raw = m[1].trim();
    if (!raw) continue;
    try {
      blocks.push(JSON.parse(raw));
    } catch {
      // bloc illisible : on ignore
    }
  }
  return blocks;
}

// Aplati les structures @graph / tableaux pour trouver un nœud Recipe
function findRecipeNodes(node: unknown, out: any[] = []): any[] {
  if (!node || typeof node !== 'object') return out;
  if (Array.isArray(node)) {
    for (const item of node) findRecipeNodes(item, out);
    return out;
  }
  const n = node as Record<string, unknown>;
  const type = n['@type'];
  const types = Array.isArray(type) ? type : [type];
  if (types.includes('Recipe')) out.push(n);
  if (n['@graph']) findRecipeNodes(n['@graph'], out);
  return out;
}

// Parse une durée ISO 8601 (PT1H30M) ou "1 h 30" en minutes
function parseDurationToMinutes(value: unknown): number {
  if (typeof value !== 'string') return 0;
  const iso = value.trim().toUpperCase();
  const m = iso.match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/);
  if (m) {
    return (parseInt(m[1] ?? '0', 10) * 60) + parseInt(m[2] ?? '0', 10) + Math.ceil(parseInt(m[3] ?? '0', 10) / 60);
  }
  // "1h30", "45 min", "1 h 30 min"
  let total = 0;
  const h = value.match(/(\d+)\s*h/i);
  const min = value.match(/(\d+)\s*(?:min|mn|m\b)/i);
  if (h) total += parseInt(h[1], 10) * 60;
  if (min) total += parseInt(min[1], 10);
  if (!total && /^\d+$/.test(value.trim())) total = parseInt(value.trim(), 10); // nombre nu = minutes
  return total;
}

function asString(v: unknown): string | null {
  if (typeof v === 'string') return v.trim() || null;
  if (Array.isArray(v) && v.length > 0) return asString(v[0]);
  return null;
}

function parseServings(v: unknown): number {
  const s = asString(v);
  if (!s) return 4;
  const m = s.match(/(\d+)/);
  if (!m) return 4;
  const n = parseInt(m[1], 10);
  return n >= 1 && n <= 50 ? n : 4;
}

// "500 g de farine" -> { name: 'farine', quantity: 500, unit: 'g' }
function parseIngredientLine(line: string): { name: string; quantity?: number; unit?: string } | null {
  const clean = line.replace(/^[\s\-–—•*]+/, '').trim();
  if (!clean || clean.length < 2) return null;
  const m = clean.match(/^(\d+(?:[.,]\d+)?)\s*([a-zA-Zàâäéèêëîïôöùûüç°]+)?\s+(.+)$/u);
  if (m) {
    const quantity = parseFloat(m[1].replace(',', '.'));
    const unit = m[2] && !/^[a-z]{2,}$/i.test(m[2]) ? m[2] : (m[2] ? m[2] : undefined);
    const name = (m[3] ?? '').replace(/[,;].*$/, '').trim();
    if (name.length >= 2) {
      return { name, quantity: Number.isFinite(quantity) ? quantity : undefined, unit: unit?.slice(0, 20) };
    }
  }
  return { name: clean.replace(/[,;].*$/, '').trim().slice(0, 100) };
}

function fromSchemaRecipe(node: Record<string, unknown>): ImportedRecipe | null {
  const title = asString(node.name);
  if (!title) return null;
  const description = asString(node.description);
  const prepTime = parseDurationToMinutes(node.prepTime);
  const cookTime = parseDurationToMinutes(node.totalTime) || parseDurationToMinutes(node.cookTime);
  const servings = parseServings(node.recipeYield ?? node.servings);
  // instructions : HowToStep[] | string
  let instructions = '';
  const ri = node.recipeInstructions;
  if (typeof ri === 'string') instructions = ri;
  else if (Array.isArray(ri)) {
    instructions = ri
      .map((step) => {
        if (typeof step === 'string') return step;
        if (step && typeof step === 'object') return asString((step as any).text) ?? '';
        return '';
      })
      .filter(Boolean)
      .join('\n');
  }
  // ingrédients : string[] | HowToSection
  let ingredients: ImportedRecipe['ingredients'] = [];
  const ing = node.recipeIngredient;
  if (Array.isArray(ing)) {
    ingredients = ing
      .map((v) => (typeof v === 'string' ? parseIngredientLine(v) : null))
      .filter((x): x is NonNullable<typeof x> => !!x);
  }
  const keywords = node.keywords;
  const tags = Array.isArray(keywords) ? keywords.join(', ') : asString(keywords);
  const source = asString(node.url) ?? asString(node.identifier) ?? '';
  return {
    title: title.slice(0, 150),
    description: description?.slice(0, 2000) ?? null,
    prepTime,
    cookTime,
    defaultServings: servings,
    instructions: (instructions || '').slice(0, 20000),
    tags: tags ? tags.slice(0, 300) : null,
    source: source.slice(0, 500),
    ingredients,
  };
}

// Fallback spécifique Marmiton : la recette est dans les metas og: et le JSON
// embarqué ; on reste sur une extraction prudente (titre + description + temps)
function fallbackMarmiton(html: string, url: URL): ImportedRecipe | null {
  const title =
    html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i)?.[1] ??
    html.match(/<title>([^<]+)<\/title>/i)?.[1];
  if (!title) return null;
  const description =
    html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i)?.[1] ?? null;
  return {
    title: title.replace(/\s*\|.*$/, '').trim().slice(0, 150) || url.host,
    description: description?.slice(0, 2000) ?? null,
    prepTime: 0,
    cookTime: 0,
    defaultServings: 4,
    instructions: '',
    tags: 'importé (site non supporté en détail — à compléter manuellement)',
    source: url.toString(),
    ingredients: [],
  };
}

export async function fetchRecipeFromUrl(input: string): Promise<ImportResult> {
  const url = normalizeRecipeUrl(input);
  if (!url) return { ok: false, error: 'URL invalide (http/https attendu).' };

  let res: Response;
  try {
    res = await fetch(url.toString(), {
      headers: {
        'user-agent': 'Mozilla/5.0 (compatible; MealPlanBot/1.0; +recette locale)',
        accept: 'text/html,application/xhtml+xml',
      },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      redirect: 'follow',
    });
  } catch {
    return { ok: false, error: 'Site injoignable ou délai dépassé (15 s).' };
  }
  if (!res.ok) {
    return { ok: false, error: `Le site a répondu HTTP ${res.status}.` };
  }
  const contentType = res.headers.get('content-type') ?? '';
  if (!contentType.includes('text/html') && !contentType.includes('application/xhtml')) {
    return { ok: false, error: 'La page n’est pas du HTML (recette introuvable).' };
  }
  const html = (await res.text()).slice(0, MAX_HTML_BYTES);

  const blocks = extractJsonLdBlocks(html);
  for (const block of blocks) {
    for (const node of findRecipeNodes(block)) {
      const recipe = fromSchemaRecipe(node);
      if (recipe) {
        recipe.source = url.toString();
        return { ok: true, recipe, host: url.host };
      }
    }
  }

  if (/marmiton\.org|750g\.com/i.test(url.host)) {
    const fb = fallbackMarmiton(html, url);
    if (fb) return { ok: true, recipe: fb, host: url.host };
  }

  return {
    ok: false,
    error: 'Aucune recette Schema.org trouvée sur cette page. Saisie manuelle toujours possible.',
  };
}
