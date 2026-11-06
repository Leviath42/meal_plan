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

// ---------------------------------------------------------------------------
// Analyse des lignes d'ingrédients (F07)
//
// Les sites_fragmentent les lignes : certains publient le nom et la quantité
// en entrées séparées de recipeIngredient (« Lentilles corail », « 250 g »,
// « rouge », « 1 Oignon »…), d'autres collent tout (« 1 cuillère à soupe
// Coriandre ») avec des unités multi-mots que le premier parseur découpait
// mal (unit: 'cuillère', name: 'à soupe Coriandre'). Les deux cas sont
// réconciliés ici (C-056) : parsing par ligne puis fusion des fragments.
// ---------------------------------------------------------------------------

// Unités connues (mot-à-mot, possiblement multi-mots) -> libellé canonique
// aligné sur le catalogue (g, pièce, bouquet…, cf. scripts/seed-ingredients.ts)
const UNIT_PATTERNS: Array<[RegExp, string]> = [
  [/^(g|gr|grammes?)$/i, 'g'],
  [/^(kg|kilogrammes?)$/i, 'kg'],
  [/^mgs?$/i, 'mg'],
  [/^(ml|millilitres?)$/i, 'ml'],
  [/^cls?$/i, 'cl'],
  [/^dls?$/i, 'dl'],
  [/^l$|^litres?$/i, 'l'],
  [/^(cuillères?|cuillere?s?)\s*(?:à|a)\s*soupe(s)?$/i, 'cuillère à soupe'],
  [/^(cuillères?|cuillere?s?)\s*(?:à|a)\s*caf[eé]s?$/i, 'cuillère à café'],
  [/^(c\.?\s*à\s*s\.?|cas|cs|c\.?\s*soupe)$/i, 'cuillère à soupe'],
  [/^(c\.?\s*à\s*c\.?|cac|cc|c\.?\s*caf[eé])$/i, 'cuillère à café'],
  [/^(pincées?|pincee?s?)$/i, 'pincée'],
  [/^gousses?$/i, 'gousse'],
  [/^bottes?$/i, 'botte'],
  [/^bouquets?$/i, 'bouquet'],
  [/^tranches?$/i, 'tranche'],
  [/^sachets?$/i, 'sachet'],
  [/^bo[iî]tes?$/i, 'boîte'],
  [/^verres?$/i, 'verre'],
  [/^tasses?$/i, 'tasse'],
  [/^noix$/i, 'noix'],
  [/^feuilles?$/i, 'feuille'],
  [/^branches?$/i, 'branche'],
  [/^pots?$/i, 'pot'],
  [/^barquettes?$/i, 'barquette'],
  [/^briques?$/i, 'brique'],
  [/^cubes?$/i, 'cube'],
  [/^poignées?$/i, 'poignée'],
  [/^paquets?$/i, 'paquet'],
  [/^boules?$/i, 'boule'],
  [/^(pièces?|pieces?)$/i, 'pièce'],
];

// Essaie de consommer une unité en tête des mots donnés ; la correspondance
// la PLUS LONGUE gagne (« cuillère à soupe » avant « soupe » éventuel).
function matchUnit(words: string[]): { unit: string; consumed: number } | null {
  for (let n = Math.min(4, words.length); n >= 1; n--) {
    const candidate = words.slice(0, n).join(' ');
    for (const [re, canonical] of UNIT_PATTERNS) {
      if (re.test(candidate)) return { unit: canonical, consumed: n };
    }
  }
  return null;
}

// Nombre en tête de ligne : fraction AVANT décimale (sinon « 1/2 » est lu
// « 1 »), puis entier/décimale (virgule FR ou point), plage « 1-2 » (première
// valeur), vulgaires (½)
const QUANTITY_RE = /^(\d+\s*\/\s*\d+|½|¼|¾|⅛|\d+(?:[.,]\d+)?(?:\s*[-–à]\s*\d+(?:[.,]\d+)?)?)\s*(.*)$/u;

function parseQuantityToken(token: string): number | null {
  const t = token.trim().replace(/\s+/g, '');
  if (t === '½') return 0.5;
  if (t === '¼') return 0.25;
  if (t === '¾') return 0.75;
  if (t === '⅛') return 0.125;
  const range = t.match(/^(\d+(?:[.,]\d+)?)[-–à](\d+(?:[.,]\d+)?)$/);
  if (range) return parseFloat(range[1].replace(',', '.'));
  const frac = t.match(/^(\d+)\/(\d+)$/);
  if (frac) return parseInt(frac[1], 10) / parseInt(frac[2], 10);
  const dec = t.match(/^(\d+(?:[.,]\d+)?)$/);
  return dec ? parseFloat(dec[1].replace(',', '.')) : null;
}

interface ParsedFragment {
  quantity?: number;
  unit?: string;
  name: string; // vide = fragment « quantité seule »
}

// Analyse UNE ligne : « 250 g de farine », « 1 cuillère à soupe Coriandre »,
// « Lentilles corail » (nom seul), « 250 g » (quantité seule)
function parseIngredientLine(line: string): ParsedFragment | null {
  const clean = line
    .replace(/^[\s\-–—•*·]+/, '')
    .replace(/^\d+[.)]\s+/, '')
    .trim();
  if (!clean || clean.length < 2) return null;

  const qm = clean.match(QUANTITY_RE);
  if (qm) {
    const quantity = parseQuantityToken(qm[1]);
    const rest = qm[2].trim().replace(/^[,;:]\s*/, '');
    if (quantity !== null) {
      if (!rest) return { quantity, unit: undefined, name: '' }; // « 250 » tout seul
      const words = rest.split(/\s+/);
      const unitMatch = matchUnit(words);
      if (unitMatch) {
        const name = words
          .slice(unitMatch.consumed)
          .join(' ')
          .replace(/^(?:de\s+|d')\s*/i, '')
          .replace(/[,;].*$/, '')
          .trim();
        if (name.length >= 2) return { quantity, unit: unitMatch.unit, name: name.slice(0, 100) };
        // « 250 g » / « 200 ml » sans nom : fragment quantité, l'unité est conservée
        return { quantity, unit: unitMatch.unit, name: '' };
      }
      const nameNoUnit = rest.replace(/[,;].*$/, '').trim();
      if (nameNoUnit.length >= 2) return { quantity, name: nameNoUnit.slice(0, 100) };
      return { quantity, unit: undefined, name: '' };
    }
  }
  return { name: clean.replace(/[,;].*$/, '').trim().slice(0, 100) };
}

// Fusionne les fragments d'une liste recipeIngredient :
//  - « quantité seule » -> rattache à l'ingrédient précédent sans quantité
//    (ou attend le prochain nom si aucun candidat) ;
//  - qualificatif culinaire isolé (« rouge ») -> suffixe l'ingrédient suivant
// Qualificatifs culinaires isolés : adjectifs de couleur/préparation qu'un
// site peut émettre comme entrée séparée (« rouge », « haché »…)
const QUALIFIER_RE =
  /^(rouge|verts?|vertes?|jaunes?|noirs?|noires?|blancs?|blanches?|frais|fraîch(es|e|es)?|fraich(es|e)?|hachés?|hachées?|haché|ciselés?|ciselées?|émincés?|émincées?|moulus?|moulues?|râpés?|râpées?|séchés?|séchées?|secs?|sèches?|bio|concassés?|concassées?|pelés?|épluchés?|épluchées?|détaillés?|tranchés?|tranchées?|décortiqués?|dénoyautés?|entier|entière|entiers?|entières?|surgelés?|surgelées?|cuits?|crus?|mûrs?|mûres?|moulu|mol?(?:les?)?)$/i;

function parseIngredientList(list: string[]): ImportedRecipe['ingredients'] {
  const out: Array<{ name: string; quantity?: number; unit?: string }> = [];
  let pendingQuantity: { quantity?: number; unit?: string } | null = null;
  let pendingQualifier: string | null = null;

  // Pré-analyse de toutes les lignes (le lookahead qualificatif en a besoin)
  const frags = list.map(parseIngredientLine).filter((f): f is ParsedFragment => !!f);

  for (let idx = 0; idx < frags.length; idx++) {
    const frag = frags[idx];

    if (!frag.name && frag.quantity !== undefined) {
      // fragment quantité seule
      const target = [...out].reverse().find((i) => i.quantity === undefined);
      if (target) {
        target.quantity = frag.quantity;
        target.unit = frag.unit ?? target.unit;
      } else {
        pendingQuantity = { quantity: frag.quantity, unit: frag.unit };
      }
      continue;
    }

    // Qualificatif culinaire isolé (« rouge » entre « 250 g » et « 1 Oignon ») :
    // uniquement les mots d'une liste fermée (adjectifs de préparation/couleur) —
    // un ingrédient d'un mot (Sel, Ail, Piment) ne doit jamais être avalé.
    // Il est suffixé à l'INGRÉDIENT SUIVANT (« Oignon » -> « Oignon rouge »),
    // l'ordre usuel du français.
    const wordCount = frag.name.split(/\s+/).length;
    const isOrphanQualifier =
      !frag.quantity && !frag.unit && wordCount === 1 && QUALIFIER_RE.test(frag.name);

    if (isOrphanQualifier) {
      pendingQualifier = pendingQualifier ? `${pendingQualifier} ${frag.name}` : frag.name;
      continue;
    }

    const ingredient: { name: string; quantity?: number; unit?: string } = {
      name: pendingQualifier ? `${frag.name} ${pendingQualifier}`.slice(0, 100) : frag.name,
      quantity: frag.quantity,
      unit: frag.unit,
    };
    pendingQualifier = null;
    if (pendingQuantity && ingredient.quantity === undefined) {
      ingredient.quantity = pendingQuantity.quantity;
      ingredient.unit = ingredient.unit ?? pendingQuantity.unit;
      pendingQuantity = null;
    }
    out.push(ingredient);
  }

  // Qualificatif en fin de liste sans ingrédient suivant : on ne le perd pas
  if (pendingQualifier) out.push({ name: pendingQualifier.slice(0, 100) });

  return out
    .filter((i) => i.name && i.name.length >= 2)
    .slice(0, 60);
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
  // ingrédients : string[] | HowToSection — les lignes fragmentées des sites
  // (nom / quantité en entrées séparées) sont fusionnées par parseIngredientList
  let ingredients: ImportedRecipe['ingredients'] = [];
  const ing = node.recipeIngredient;
  if (Array.isArray(ing)) {
    ingredients = parseIngredientList(ing.filter((v): v is string => typeof v === 'string'));
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

// Fallback générique pour les sites SANS JSON-LD Recipe : metas Open Graph
// (titre/description) + microdata Schema.org (itemprop="recipeIngredient" /
// "recipeInstructions") encore utilisées par beaucoup de blogs. Import
// partiel : les temps et portions sont à compléter dans la prévisualisation.
function fallbackOpenGraph(html: string, url: URL): ImportedRecipe | null {
  const meta = (property: string): string | null => {
    const m =
      html.match(new RegExp(`<meta[^>]+(?:property|name)=["']${property}["'][^>]+content=["']([^"']+)["']`, 'i')) ??
      html.match(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${property}["']`, 'i'));
    return m ? m[1].trim() : null;
  };
  const title = meta('og:title') ?? html.match(/<title>([^<]+)<\/title>/i)?.[1]?.replace(/\s*\|[^\n]*$/, '').trim();
  if (!title) return null;

  // Microdata : <li itemprop="recipeIngredient">…</li> (texte nu balisé)
  const ingredients: string[] = [];
  const ingRe = /itemprop=["']recipeIngredient["'][^>]*>([\s\S]*?)<\/(?:li|p|span|div)>/gi;
  let im: RegExpExecArray | null;
  while ((im = ingRe.exec(html)) !== null) {
    const text = im[1]
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (text) ingredients.push(text);
  }
  const instructions: string[] = [];
  const insRe = /itemprop=["']recipeInstructions["'][^>]*>([\s\S]*?)<\/(?:li|p|div)>/gi;
  let sm: RegExpExecArray | null;
  while ((sm = insRe.exec(html)) !== null) {
    const text = sm[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    if (text) instructions.push(text);
  }

  return {
    title: title.slice(0, 150) || url.host,
    description: meta('og:description')?.slice(0, 2000) ?? null,
    prepTime: 0,
    cookTime: 0,
    defaultServings: 4,
    instructions: instructions.join('\n').slice(0, 20000),
    tags: 'import partiel (site sans Schema.org) — temps et portions à compléter',
    source: url.toString(),
    ingredients: parseIngredientList(ingredients),
  };
}

// En-têtes de navigateur : le UA « bot » d'origine était bloqué (403) par
// plusieurs sites (Cloudflare & co). On se présente comme un navigateur
// lambda — l'import reste respectueux (timeout, taille max, pas de récrawling).
const FETCH_HEADERS = {
  'user-agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'accept-language': 'fr-FR,fr;q=0.9,en;q=0.8',
} as const;

export async function fetchRecipeFromUrl(input: string): Promise<ImportResult> {
  const url = normalizeRecipeUrl(input);
  if (!url) return { ok: false, error: 'URL invalide (http/https attendu).' };

  let res: Response;
  try {
    res = await fetch(url.toString(), {
      headers: FETCH_HEADERS,
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      redirect: 'follow',
    });
  } catch {
    return { ok: false, error: 'Site injoignable ou délai dépassé (15 s).' };
  }
  if (!res.ok) {
    if (res.status === 403 || res.status === 401) {
      return { ok: false, error: 'Le site refuse les requêtes automatiques (HTTP 403) — saisie manuelle nécessaire.' };
    }
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

  // Pas de JSON-LD : fallback générique og: + microdata, pour TOUS les sites
  const fb = fallbackOpenGraph(html, url);
  if (fb) return { ok: true, recipe: fb, host: url.host };

  return {
    ok: false,
    error: 'Aucune recette trouvable sur cette page (ni Schema.org, ni Open Graph). Saisie manuelle toujours possible.',
  };
}
