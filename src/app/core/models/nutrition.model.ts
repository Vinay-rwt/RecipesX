export interface MacroNutrients {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
}

export interface NutritionResult {
  perBaseServing: MacroNutrients;
  incomplete: boolean; // true if any ingredient couldn't be looked up
}

export type NutritionState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: NutritionResult }
  | { status: 'error'; message: string };

// Maps ingredient units to approximate gram equivalents.
// Units that can't be converted (whole, clove, etc.) map to 0 —
// the service uses a 100g fallback for these and sets incomplete=true.
export const UNIT_TO_GRAMS: Record<string, number> = {
  '':      0,
  tsp:     4.2,
  tbsp:    14.3,
  cup:     240,
  oz:      28.35,
  lb:      453.592,
  g:       1,
  kg:      1000,
  ml:      1,
  L:       1000,
  pinch:   0.3,
  whole:   0,
  clove:   0,
  slice:   0,
  can:     0,
  bunch:   0,
};
