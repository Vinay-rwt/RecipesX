import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { Ingredient, Recipe } from '../models/recipe.model';
import { MacroNutrients, NutritionResult, UNIT_TO_GRAMS } from '../models/nutrition.model';
import { environment } from '../../../environments/environment';

// USDA FDC search API — nutrients are flat objects on each food result.
interface UsdaSearchNutrient {
  nutrientName: string;
  value: number;
  unitName: string;
}
interface UsdaFood {
  foodNutrients: UsdaSearchNutrient[];
}
interface UsdaSearchResponse {
  foods: UsdaFood[];
}

// USDA FDC detail API — each nutrient wraps a nested `nutrient` object with `amount` at the top level.
interface UsdaDetailNutrient {
  nutrient: { name: string; unitName: string };
  amount: number;
}
// foodPortions describes real-world serving sizes (e.g. "1 medium whole = 123g").
interface UsdaFoodPortion {
  amount: number;
  gramWeight: number;
  portionDescription?: string;
  modifier?: string;
}
interface UsdaDetailResponse {
  foodNutrients: UsdaDetailNutrient[];
  foodPortions?: UsdaFoodPortion[];
}

// Normalised shape used internally after parsing either API response.
interface NormalisedNutrient {
  name: string;
  value: number;
  unit: string;
}

// Internal result that also carries a flag for the 100g fallback path
interface IngredientMacros extends MacroNutrients {
  usedFallback: boolean;
}

const USDA_BASE = 'https://api.nal.usda.gov/fdc/v1/foods/search';

// Keywords that indicate a cooking medium not fully consumed — cap absorbed amount.
const COOKING_MEDIUM_KEYWORDS = ['oil for frying', 'frying oil', 'oil for deep', 'vegetable oil', 'neutral oil', 'cooking oil', 'canola oil', 'sunflower oil'];
const COOKING_MEDIUM_CAP_G = 15;

// Cooking/prep descriptors to strip before sending to USDA search so that
// e.g. "Cheddar, grated" → "cheddar" and "Whole milk" → "milk" match correctly.
// Words that describe preparation/cut/state — safe to strip before USDA search.
// Do NOT strip food-type adjectives like "whole", "plain", "skimmed" — they matter.
const STRIP_WORDS = [
  'fresh', 'raw', 'cooked', 'boiled', 'fried', 'roasted', 'baked',
  'grated', 'shredded', 'sliced', 'diced', 'chopped', 'minced', 'crushed',
  'peeled', 'pitted', 'boneless', 'skinless', 'bone-in',
  'thinly', 'finely', 'roughly', 'very', 'about', 'approx',
  'to serve', 'for frying', 'for serving', 'to taste',
  'large', 'small', 'medium',
];

// Direct fdcId lookups for common ingredients that the search API matches poorly.
// Keys are lowercase substrings matched against the ingredient name.
// Values are SR Legacy / Foundation fdcIds — stable permanent IDs, verified against USDA.
const FDCID_MAP: Record<string, number> = {
  // Dairy
  'whole milk':        172217,   // Milk, whole, 3.25% milkfat
  'butter':            173430,   // Butter, without salt
  'double cream':      170859,   // Cream, fluid, heavy whipping
  'heavy cream':       170859,
  'cheddar':           170899,   // Cheese, cheddar, sharp
  'parmesan':          171247,   // Cheese, parmesan, grated
  'pecorino':          171247,   // Cheese, parmesan, grated
  'mozzarella':        171248,   // Cheese, mozzarella, whole milk
  'gruyère':           170899,   // approximate with cheddar
  'gruyere':           170899,
  'greek yogurt':      2259794,  // Yogurt, Greek, plain, whole milk
  'greek yoghurt':     2259794,
  'yoghurt':           171284,   // Yogurt, plain, whole milk
  'yogurt':            171284,
  'sour cream':        171257,   // Cream, sour, cultured
  'buttermilk':        2259792,  // Buttermilk, low fat
  'ghee':              171314,   // Butter, clarified
  'feta':              173420,   // Cheese, feta
  // Proteins — meat
  'chicken breast':    2646170,  // Chicken, breast, boneless, skinless, raw
  'chicken thigh':     2646171,  // Chicken, thigh, boneless, skinless, raw
  'chicken wing':      2727568,  // Chicken, wing, meat and skin, raw
  'chicken piece':     2646171,
  'chicken':           2646171,  // fallback
  'beef mince':        168608,   // Beef, grass-fed, ground, raw
  'beef chuck':        2646174,  // Beef, chuck, roast, boneless, raw
  'beef sirloin':      169175,   // Beef, loin, top sirloin
  'lamb':              174370,   // Lamb, ground, raw
  'pork shoulder':     169187,   // Pork, shoulder breast, lean
  'pork belly':        2727576,  // Pork, belly, with skin, raw
  'pork mince':        168608,   // approximate with beef mince
  'bacon':             168324,   // Pork, cured, bacon, raw
  'chorizo':           168326,   // Pork, cured, chorizo
  'guanciale':         168324,   // approximate with bacon
  'pancetta':          168324,
  'lardons':           168324,
  // Proteins — seafood
  'salmon':            173687,   // Fish, salmon, chinook, smoked
  'prawn':             175179,   // Crustaceans, shrimp, raw
  'shrimp':            175179,
  'white fish':        175150,   // Fish, sucker, white, raw
  'sea bass':          175150,
  'halibut':           175150,
  'tuna':              175159,   // Fish, tuna, yellowfin, raw
  'cod':               171955,   // Fish, cod, Atlantic, raw
  // Proteins — poultry
  'turkey breast':     171098,   // Turkey, whole, breast, meat only, raw
  'turkey mince':      171098,   // approximate with turkey breast
  // Proteins — other
  'egg':               171287,   // Egg, whole, raw, fresh
  'tofu':              172475,   // Tofu, raw, firm, prepared with calcium sulfate
  // Grains & Pasta
  'macaroni':          169736,   // Pasta, dry, enriched
  'spaghetti':         169736,
  'pasta':             169736,
  'ramen noodle':      169736,   // approximate
  'rice noodle':       169736,   // approximate
  'glass noodle':      169736,
  'plain flour':       789890,   // Flour, wheat, all-purpose, enriched
  'bread flour':       168913,   // Wheat flours, bread, unenriched
  'strong bread flour':168913,
  'cornstarch':        169698,   // Cornstarch
  'long grain rice':   168877,   // Rice, white, long-grain, enriched
  'basmati rice':      168877,
  'basmati':           168877,
  'arborio':           168879,   // Rice, white, medium-grain, enriched
  'short grain rice':  168931,   // Rice, white, short-grain, raw
  'glutinous':         168931,
  'sticky rice':       168931,
  'jasmine rice':      168877,
  'bulgar':            169707,   // Bulgur, dry
  'bulgur':            169707,
  'quinoa':            168874,   // Quinoa, uncooked
  'oats':              173904,   // Cereals, oats, regular and quick, dry
  'rolled oats':       173904,
  'breadcrumb':        174928,   // Bread, crumbs, dry, grated, plain
  'bread crumb':       174928,
  // Zero-nutrition ingredients — mapped explicitly so search API is never called
  'water':             173647,   // Beverages, water, tap (0 protein, 0 cal)
  // Herbs & Spices
  'coriander':         169997,   // Coriander (cilantro) leaves, raw
  'cilantro':          169997,
  'chilli':            170106,   // Peppers, hot chili, red, raw
  'chili':             170106,
  'red chilli':        170106,
  'dried chilli':      170106,
  // Vegetables
  'onion':             170000,   // Onions, raw
  'garlic':            1104647,  // Garlic, raw
  'ginger':            169231,   // Ginger root, raw
  'tomato paste':      2685580,  // Tomato, paste, canned
  'tomato passata':    2685582,  // Tomato, puree, canned
  'tinned tomato':     2685582,
  'canned tomato':     2685582,
  'tomato':            170457,   // Tomatoes, red, ripe, raw
  'spinach':           168462,   // Spinach, raw
  'red pepper':        2258590,  // Peppers, bell, red, raw
  'avocado':           171706,   // Avocados, raw, California
  'sweet potato':      2346404,  // Sweet potatoes, orange flesh, without skin, raw
  'carrot':            170393,   // Carrots, raw
  'cucumber':          169225,   // Cucumber, peeled, raw
  'mushroom':          169251,   // Mushrooms, white, raw
  'aubergine':         169228,   // Eggplant, raw
  'eggplant':          169228,
  'peas':              170420,   // Peas, green, raw
  'courgette':         169291,   // Zucchini, raw
  'zucchini':          169291,
  'cabbage':           169975,   // Cabbage, raw
  'spring onion':      170000,   // approximate with onion
  'shallot':           170000,
  'potato':            170026,   // Potatoes, flesh and skin, raw
  'corn':              169998,   // Corn, sweet, yellow, raw
  'broccoli':          170379,   // Broccoli, raw
  'cauliflower':       2685573,  // Cauliflower, raw
  'celery':            169988,   // Celery, raw
  'kale':              168421,   // Kale, raw
  'green bean':        169141,   // Beans, snap, green, cooked
  'snap bean':         169141,
  'leek':              169246,   // Leeks, raw
  'green pepper':      2258588,  // Peppers, bell, green, raw
  'yellow pepper':     2258589,  // Peppers, bell, yellow, raw
  'orange pepper':     2258591,  // Peppers, bell, orange, raw
  'lemon':             167747,   // Lemon juice, raw
  'lime':              168155,   // Limes, raw
  'apple':             171688,   // Apples, raw, with skin
  'banana':            173944,   // Bananas, raw
  'orange':            169097,   // Oranges, raw, all commercial varieties
  // Oils
  'olive oil':         167737,   // Oil, corn, peanut, and olive
  'sesame oil':        171016,   // Oil, sesame
  // Stock & Broth
  'chicken stock':     172884,   // Soup, stock, chicken, home-prepared
  'chicken broth':     172884,
  'beef stock':        172883,   // Soup, stock, beef, home-prepared
  'beef broth':        172883,
  // Condiments & Sauces
  'soy sauce':         174278,   // Soy sauce (tamari)
  'fish sauce':        174531,   // Sauce, fish
  'honey':             169640,   // Honey
  'coconut milk':      170173,   // Nuts, coconut milk, canned
  'tahini':            168604,   // Seeds, sesame butter, tahini
  'mustard':           172234,   // Mustard, prepared, yellow
  'mirin':             174278,   // approximate with soy sauce (low protein condiment)
  'rice vinegar':      169750,   // Vinegar, rice
  'balsamic vinegar':  172241,   // Vinegar, balsamic
  'worcestershire':    171610,   // Sauce, worcestershire
  'hoisin':            172242,   // Sauce, hoisin
  'maple syrup':       169661,   // Syrups, maple
  'brown sugar':       168833,   // Sugars, brown
  // Legumes
  'chickpea':          2644288,  // Chickpeas, canned
  'kidney bean':       173741,   // Beans, kidney, canned
  'black bean':        175188,   // Beans, black turtle, canned
  'lentil':            172420,   // Lentils, raw
  'edamame':           168411,   // Edamame, frozen, prepared
  // Dairy extras
  'cream cheese':      173418,   // Cheese, cream
  'ricotta':           170851,   // Cheese, ricotta, whole milk
  // Nuts & Seeds
  'sesame seed':       170150,   // Seeds, sesame seeds, whole, dried
  'peanut':            172430,   // Peanuts, all types, raw
  'walnut':            170187,   // Nuts, walnuts, english
  'pistachio':         170184,   // Nuts, pistachio nuts, raw
  'cashew':            170162,   // Nuts, cashew nuts, raw
  'almond':            170567,   // Nuts, almonds
};

// Resolve an ingredient name to a USDA fdcId using longest-match on FDCID_MAP keys.
// Returns null if no match — caller falls back to keyword search.
function resolveFdcId(name: string): number | null {
  const lower = name.toLowerCase();
  let bestKey = '';
  let bestId: number | null = null;
  for (const [key, id] of Object.entries(FDCID_MAP)) {
    if (lower.includes(key) && key.length > bestKey.length) {
      bestKey = key;
      bestId = id;
    }
  }
  return bestId;
}

// Clean ingredient name for fallback search — strip prep descriptors, keep first segment.
function cleanForSearch(name: string): string {
  const primary = name.split(',')[0].trim();
  const noBrackets = primary.replace(/\(.*?\)/g, '').trim();
  const words = noBrackets.split(/\s+/);
  const cleaned = words
    .filter(w => !STRIP_WORDS.includes(w.toLowerCase()))
    .join(' ')
    .trim();
  return cleaned || primary;
}

// Keywords to match against USDA portionDescription for each count-based unit.
// Ordered by preference — first match wins.
const PORTION_KEYWORDS: Record<string, string[]> = {
  whole:  ['medium whole', 'whole', 'medium', 'fruit', 'large'],
  slice:  ['slice, medium', 'slice'],
  clove:  [],   // USDA garlic only has a "head" portion — use hardcoded weight below
  bunch:  [],   // no reliable USDA portion — use hardcoded weight below
  can:    [],   // no USDA portion — use hardcoded weight below
  '':     [],   // truly unknown unit — last-resort 100g
};

// Hardcoded gram weights for units where USDA portions are missing or unreliable.
// Used only when UNIT_TO_GRAMS[unit] === 0 AND no USDA portion match is found.
const UNIT_HARDCODED_G: Record<string, number> = {
  clove:  5,    // one garlic clove ≈ 5g
  whole:  80,   // generic "whole" item — rough median (small veg/fruit); USDA portions override this for fdcId ingredients
  slice:  20,   // one slice of bread/meat ≈ 20g
  bunch:  30,   // small herb bunch ≈ 30g
  can:    400,  // standard 400ml/g tin
  '':     100,  // unknown unit — least-bad fallback
};

// Resolve gram weight for count-based units using USDA foodPortions first,
// falling back to UNIT_HARDCODED_G, and finally 100g as a last resort.
// Returns { grams, usedFallback } — usedFallback=true if no USDA portion matched.
function resolveCountUnitGrams(
  unit: string,
  qty: number,
  portions: UsdaFoodPortion[],
): { grams: number; usedFallback: boolean } {
  const keywords = PORTION_KEYWORDS[unit] ?? [];

  // Try to match a USDA portion by keyword priority
  for (const kw of keywords) {
    const match = portions.find(p => {
      const desc = (p.portionDescription ?? p.modifier ?? '').toLowerCase();
      return desc.includes(kw);
    });
    if (match && match.gramWeight > 0) {
      // gramWeight in USDA is for `amount` units of that portion
      // e.g. amount=1, gramWeight=123 means "1 medium whole = 123g"
      return { grams: qty * (match.gramWeight / match.amount), usedFallback: false };
    }
  }

  // No USDA portion matched — use hardcoded weight or 100g
  const hardcoded = UNIT_HARDCODED_G[unit] ?? 100;
  return { grams: qty * hardcoded, usedFallback: true };
}

@Injectable({ providedIn: 'root' })
export class NutritionService {
  private http = inject(HttpClient);
  private cache = new Map<string, NutritionResult>();

  async getNutrition(recipe: Recipe): Promise<NutritionResult> {
    const key = recipe.id ?? recipe.title;
    if (this.cache.has(key)) {
      return this.cache.get(key)!;
    }
    const result = await this.estimateForIngredients(recipe.ingredients, recipe.baseServings);
    this.cache.set(key, result);
    return result;
  }

  private async estimateForIngredients(
    ingredients: Ingredient[],
    baseServings: number,
  ): Promise<NutritionResult> {
    const settled = await Promise.allSettled(
      ingredients.map(ing => this.fetchIngredientMacros(ing)),
    ) as PromiseSettledResult<IngredientMacros>[];

    const totals: MacroNutrients = { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 };
    let incomplete = false;

    for (const result of settled) {
      if (result.status === 'fulfilled') {
        totals.calories += result.value.calories;
        totals.protein  += result.value.protein;
        totals.carbs    += result.value.carbs;
        totals.fat      += result.value.fat;
        totals.fiber    += result.value.fiber;
        if (result.value.usedFallback) incomplete = true;
      } else {
        incomplete = true;
      }
    }

    const servings = baseServings > 0 ? baseServings : 1;
    const perBaseServing = {
      calories: Math.round(totals.calories / servings),
      protein:  Math.round(totals.protein  / servings * 10) / 10,
      carbs:    Math.round(totals.carbs    / servings * 10) / 10,
      fat:      Math.round(totals.fat      / servings * 10) / 10,
      fiber:    Math.round(totals.fiber    / servings * 10) / 10,
    };
    return { perBaseServing, incomplete };
  }

  private async fetchIngredientMacros(ing: Ingredient): Promise<IngredientMacros> {
    const gramsPerUnit = UNIT_TO_GRAMS[ing.unit];
    const isCountUnit = gramsPerUnit === undefined || gramsPerUnit === 0;
    let gramWeight: number;
    let usedFallback = false;

    // For measurable units (g, ml, tsp, tbsp, cup, oz, lb) resolve weight immediately.
    // For count units (whole, clove, slice, bunch, can, '') we defer until after the
    // USDA detail response arrives, because foodPortions gives us the real gram weight.
    if (!isCountUnit) {
      gramWeight = ing.quantity * gramsPerUnit;
    } else {
      gramWeight = 0; // will be set below after portions are fetched
    }

    // Cap frying/cooking oils at absorbed amount — the full volume is not consumed
    const ingNameLower = ing.name.toLowerCase();
    if (COOKING_MEDIUM_KEYWORDS.some(k => ingNameLower.includes(k)) && gramWeight > 200) {
      gramWeight = COOKING_MEDIUM_CAP_G;
      usedFallback = true;
    }

    // Prefer direct fdcId lookup — deterministic, always returns the right food.
    // Fall back to keyword search for unknown ingredients.
    const fdcId = resolveFdcId(ing.name);
    let nutrients: NormalisedNutrient[];

    if (fdcId) {
      // Detail API: { foodNutrients: [...], foodPortions: [...] }
      const detailUrl = `https://api.nal.usda.gov/fdc/v1/food/${fdcId}?api_key=${environment.usdaApiKey}`;
      const detail = await firstValueFrom(this.http.get<UsdaDetailResponse>(detailUrl));
      if (!detail.foodNutrients?.length) throw new Error(`No nutrient data for fdcId: ${fdcId}`);
      nutrients = detail.foodNutrients.map(n => ({
        name:  n.nutrient.name,
        value: n.amount ?? 0,
        unit:  n.nutrient.unitName?.toLowerCase() ?? '',
      }));

      // Resolve count-unit gram weight using USDA foodPortions now that we have the data.
      if (isCountUnit && gramWeight === 0) {
        const resolved = resolveCountUnitGrams(ing.unit, ing.quantity, detail.foodPortions ?? []);
        gramWeight = resolved.grams;
        if (resolved.usedFallback) usedFallback = true;
      }
    } else {
      // Search API: { foods: [{ foodNutrients: [{ nutrientName, value, unitName }] }] }
      const query = cleanForSearch(ing.name);
      const searchUrl =
        `${USDA_BASE}?query=${encodeURIComponent(query)}` +
        `&api_key=${environment.usdaApiKey}` +
        `&pageSize=1&dataType=SR%20Legacy,Foundation`;
      const response = await firstValueFrom(this.http.get<UsdaSearchResponse>(searchUrl));
      if (!response.foods?.length || !response.foods[0].foodNutrients?.length) {
        throw new Error(`No data for: ${ing.name}`);
      }
      nutrients = response.foods[0].foodNutrients.map(n => ({
        name:  n.nutrientName,
        value: n.value ?? 0,
        unit:  n.unitName?.toLowerCase() ?? '',
      }));
      usedFallback = true; // search result is less reliable

      // Search API has no foodPortions — use hardcoded weights for count units.
      if (isCountUnit && gramWeight === 0) {
        const resolved = resolveCountUnitGrams(ing.unit, ing.quantity, []);
        gramWeight = resolved.grams;
      }
    }

    // Both paths now produce NormalisedNutrient[] — same helpers work for both.
    const get = (name: string): number => {
      const match = nutrients.find(n =>
        n.name.toLowerCase().includes(name.toLowerCase()),
      );
      return match?.value ?? 0;
    };
    const getWithUnit = (name: string): { value: number; unit: string } | null => {
      const match = nutrients.find(n =>
        n.name.toLowerCase().includes(name.toLowerCase()),
      );
      return match ? { value: match.value, unit: match.unit } : null;
    };

    // USDA values are per 100g — scale to actual gram weight
    const scale = gramWeight / 100;

    // Energy: some foods return kcal, others kJ — detect and normalise to kcal
    const energyEntry = getWithUnit('energy');
    let calories = 0;
    if (energyEntry) {
      calories = energyEntry.unit === 'kj'
        ? (energyEntry.value / 4.184) * scale
        : energyEntry.value * scale; // already kcal
    }

    return {
      calories,
      protein:      get('protein')      * scale,
      carbs:        get('carbohydrate') * scale,
      fat:          get('total lipid')  * scale,
      fiber:        get('fiber')        * scale,
      usedFallback,
    };
  }
}
