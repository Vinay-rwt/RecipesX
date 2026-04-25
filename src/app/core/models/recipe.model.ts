export type RecipeStatus = 'draft' | 'published';
export type Difficulty = 'easy' | 'medium' | 'hard';

export interface Ingredient {
  name: string;
  quantity: number;
  unit: string;
  group: string; // empty string for ungrouped
}

export interface RecipeStep {
  order: number;
  instruction: string;
  temperature?: number;  // Celsius always
  duration?: number;     // minutes always
  equipment?: string;    // equipment id from EQUIPMENT_TYPES
  technique?: string;
}

export interface Recipe {
  id?: string;
  authorId: string;
  authorName: string;
  title: string;
  description: string;
  photoURLs: string[];
  coverEmoji?: string;
  sourceEquipment: string;
  ingredients: Ingredient[];
  baseServings: number;
  steps: RecipeStep[];
  tags: string[];
  cuisineType: string;
  difficulty: Difficulty;
  prepTime: number;   // minutes
  cookTime: number;   // minutes
  likeCount: number;
  saveCount: number;
  status: RecipeStatus;
  searchTokens: string[];
  createdAt: Date;
  updatedAt: Date;
}

export const CUISINE_TYPES = [
  'Italian', 'Mexican', 'Indian', 'Chinese', 'Japanese',
  'Thai', 'American', 'French', 'Mediterranean', 'Korean', 'Other',
];

export const INGREDIENT_UNITS = [
  '', 'tsp', 'tbsp', 'cup', 'oz', 'lb', 'g', 'kg', 'ml', 'L',
  'pinch', 'whole', 'clove', 'slice', 'can', 'bunch',
];

export function generateSearchTokens(title: string, tags: string[], cuisineType: string): string[] {
  const tokens = new Set<string>();
  const addWords = (text: string) => {
    text.toLowerCase().split(/\s+/).forEach(word => {
      if (!word) return;
      // Store prefixes from 2 chars up: "butter" → "bu", "but", "butt", "butte", "butter"
      for (let i = 2; i <= word.length; i++) {
        tokens.add(word.slice(0, i));
      }
    });
  };
  addWords(title);
  tags.forEach(t => addWords(t));
  addWords(cuisineType);
  return Array.from(tokens);
}
