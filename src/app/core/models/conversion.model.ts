import { RecipeStep } from './recipe.model';

export interface ConversionEntry {
  sourceEquipment: string;
  targetEquipment: string;
  technique: string;
  tempFactor: number;
  tempOffset: number;
  timeFactor: number;
  timeOffset: number;
  techniqueNotes: string;
  confidence: 'high' | 'medium' | 'low';
}

export interface ConvertedRecipe {
  sourceEquipment: string;
  targetEquipment: string;
  steps: RecipeStep[];
  overallConfidence: 'high' | 'medium' | 'low' | 'none';
  techniqueNotes: string[]; // unique non-empty notes across all steps
}
