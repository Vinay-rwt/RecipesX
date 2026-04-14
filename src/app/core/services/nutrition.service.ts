import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { Ingredient, Recipe } from '../models/recipe.model';
import { MacroNutrients, NutritionResult, UNIT_TO_GRAMS } from '../models/nutrition.model';
import { environment } from '../../../environments/environment';

// Narrow interface for the USDA FDC search response — only what we parse.
interface UsdaFoodNutrient {
  nutrientName: string;
  value: number;
  unitName: string;
}
interface UsdaFood {
  foodNutrients: UsdaFoodNutrient[];
}
interface UsdaSearchResponse {
  foods: UsdaFood[];
}

// Internal result that also carries a flag for the 100g fallback path
interface IngredientMacros extends MacroNutrients {
  usedFallback: boolean;
}

const USDA_BASE = 'https://api.nal.usda.gov/fdc/v1/foods/search';

// Keywords that indicate a cooking medium (oil/water for frying/boiling) rather than
// a consumed ingredient. When the quantity is large (>200ml/g), we cap it at 15g —
// the approximate amount absorbed during frying.
const COOKING_MEDIUM_KEYWORDS = ['oil for frying', 'frying oil', 'oil for deep', 'vegetable oil', 'neutral oil', 'cooking oil', 'canola oil', 'sunflower oil'];
const COOKING_MEDIUM_CAP_G = 15;

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
    let gramWeight: number;
    let usedFallback = false;

    if (gramsPerUnit === undefined || gramsPerUnit === 0) {
      // Non-convertible unit (whole, clove, slice, etc.) — use 100g as a neutral fallback
      gramWeight = 100;
      usedFallback = true;
    } else {
      gramWeight = ing.quantity * gramsPerUnit;
    }

    // Cap frying/cooking oils at absorbed amount — the full volume is not consumed
    const ingNameLower = ing.name.toLowerCase();
    if (COOKING_MEDIUM_KEYWORDS.some(k => ingNameLower.includes(k)) && gramWeight > 200) {
      gramWeight = COOKING_MEDIUM_CAP_G;
      usedFallback = true;
    }

    const url =
      `${USDA_BASE}?query=${encodeURIComponent(ing.name)}` +
      `&api_key=${environment.usdaApiKey}` +
      `&pageSize=1&dataType=Foundation,SR%20Legacy`;

    const response = await firstValueFrom(this.http.get<UsdaSearchResponse>(url));

    if (!response.foods?.length || !response.foods[0].foodNutrients?.length) {
      throw new Error(`No data for: ${ing.name}`);
    }

    const nutrients = response.foods[0].foodNutrients;
    const get = (name: string): number => {
      const match = nutrients.find(n =>
        n.nutrientName.toLowerCase().includes(name.toLowerCase()),
      );
      return match?.value ?? 0;
    };
    const getWithUnit = (name: string): { value: number; unit: string } | null => {
      const match = nutrients.find(n =>
        n.nutrientName.toLowerCase().includes(name.toLowerCase()),
      );
      return match ? { value: match.value, unit: match.unitName.toLowerCase() } : null;
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
