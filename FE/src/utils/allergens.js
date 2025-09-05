// Hebrew-canonical allergen aliases and helpers for FE filtering

// Canonical Hebrew keys, with Hebrew and English variants mapped to them
export const ALLERGEN_ALIASES = {
  'ביצה': new Set([
    'ביצה', 'ביצים', 'ביצ', // Hebrew forms and stem
    'חלמון', 'חלמונים', 'חלבון', // yolk/white in Hebrew
    'egg', 'eggs', 'yolk', 'egg yolk', 'egg white', 'albumen',
    // Heuristic product names commonly containing eggs
    'פנקייק', 'pancake', 'בלינצס', "בלינצ'ס",
    // Shakshuka commonly contains eggs
    'שקשוקה', 'שקשוק', 'shakshuka', 'shakshouka'
  ]),
  'מוצרי חלב': new Set(['מוצרי חלב', 'חלב', 'לקטוז', 'גבינה', 'גבינות', 'חמאה', 'יוגורט', 'milk', 'dairy', 'lactose', 'cheese', 'butter', 'yogurt']),
  'גלוטן': new Set(['גלוטן', 'חיטה', 'wheat', 'gluten']),
  'בוטנים': new Set(['בוטן', 'בוטנים', 'peanut', 'peanuts']),
  'אגוזים': new Set(['אגוז', 'אגוזים', 'שקד', 'שקדים', 'קשיו', 'אגוז מלך', 'לוז', 'פיסטוק', 'פקאן', 'nut', 'nuts', 'almond', 'walnut', 'cashew', 'hazelnut', 'pistachio', 'pecan']),
  'סויה': new Set(['סויה', 'soy', 'soya']),
  'שומשום': new Set(['שומשום', 'טחינה', 'sesame', 'tahini']),
  'דגים': new Set(['דג', 'דגים', 'fish']),
  'פירות ים': new Set(['פירות ים', 'שרימפס', 'סרטנים', 'לובסטר', 'צדפות', 'mussel', 'clam', 'shrimp', 'prawn', 'crab', 'lobster', 'shellfish']),
};

export function normalizeToken(s) {
  return String(s || '').toLowerCase().trim();
}

// Map any variant to its Hebrew canonical key; return null for empty
export function canonicalizeAllergen(name) {
  const n = normalizeToken(name);
  if (!n) return null;
  for (const [heKey, variants] of Object.entries(ALLERGEN_ALIASES)) {
    if (variants.has(n)) return heKey;
  }
  return n; // fallback: keep normalized input
}

// Build a set of canonical allergen keys from an array of allergy names/objects
export function buildAllergenSetFromNames(allergies) {
  const keys = new Set();
  for (const a of (allergies || [])) {
    const name = a?.name ?? a;
    const key = canonicalizeAllergen(name);
    if (key) keys.add(key);
  }
  return keys;
}

function tokenizeItemFields(it) {
  const out = [];
  const toArr = (v) => {
    if (!v) return [];
    if (Array.isArray(v)) return v;
    return String(v).split(/[\s,;\/.()\-]+/);
  };
  out.push(...toArr(it.components));
  out.push(...toArr(it.ingredients));
  out.push(...toArr(it.allergens));
  out.push(...toArr([it.name, it.description].filter(Boolean).join(' ')));
  return out.map(normalizeToken).filter(Boolean);
}

// Return true if item has any of the user's canonical allergens
export function itemHasAllergen(it, userAllergenKeys) {
  if (!userAllergenKeys || userAllergenKeys.size === 0) return false;
  const tokens = tokenizeItemFields(it);
  const itemCanon = new Set();
  for (const t of tokens) {
    const k = canonicalizeAllergen(t);
    if (k) itemCanon.add(k);
  }
  for (const key of userAllergenKeys) {
    if (itemCanon.has(key)) return true;
    const variants = ALLERGEN_ALIASES[key];
    if (variants && [...variants].some(v => tokens.includes(v))) return true;
  }
  return false;
}

// Helpful for form UX: given a free-text input, return the Hebrew canonical
export function canonicalizeUserInputToHebrew(input) {
  return canonicalizeAllergen(input);
}
