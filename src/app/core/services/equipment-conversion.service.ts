import { Injectable, inject, signal } from '@angular/core';
import { Firestore, collection, getDocs } from '@angular/fire/firestore';
import { ConversionEntry, ConvertedRecipe } from '../models/conversion.model';
import { Recipe, RecipeStep } from '../models/recipe.model';

@Injectable({ providedIn: 'root' })
export class EquipmentConversionService {
  private firestore = inject(Firestore);

  private _matrix = signal<ConversionEntry[]>([]);
  private _loaded = signal(false);
  readonly loaded = this._loaded.asReadonly();

  // Similarity map: ordered fallback chain per equipment type
  private readonly SIMILARITY: Record<string, string[]> = {
    toaster_oven:      ['conventional_oven', 'air_fryer'],
    air_fryer:         ['toaster_oven', 'conventional_oven'],
    slow_cooker:       ['pressure_cooker', 'stovetop'],
    pressure_cooker:   ['slow_cooker', 'stovetop'],
    grill:             ['conventional_oven', 'stovetop'],
    microwave:         ['conventional_oven'],
    stovetop:          ['conventional_oven'],
    conventional_oven: ['toaster_oven', 'air_fryer'],
  };

  async loadMatrix(): Promise<void> {
    if (this._loaded()) return;
    const snap = await getDocs(collection(this.firestore, 'conversionMatrix'));
    this._matrix.set(snap.docs.map(d => d.data() as ConversionEntry));
    this._loaded.set(true);
  }

  /**
   * Find the best target equipment from what the user owns.
   * Returns null if the user has the source equipment (no conversion needed)
   * or if no suitable match exists.
   */
  getBestTarget(sourceEquipment: string, userEquipment: string[]): string | null {
    // User owns the source — no conversion needed
    if (userEquipment.includes(sourceEquipment)) return null;

    // Walk similarity chain and return first owned equipment
    const chain = this.SIMILARITY[sourceEquipment] ?? [];
    for (const candidate of chain) {
      if (userEquipment.includes(candidate)) return candidate;
    }
    return null;
  }

  /**
   * Get all equipment options the user can view the recipe for:
   * their owned equipment + the source equipment (original view).
   */
  getViewingOptions(sourceEquipment: string, userEquipment: string[]): string[] {
    const options = new Set([sourceEquipment, ...userEquipment]);
    return Array.from(options);
  }

  findConversion(source: string, target: string, technique: string): ConversionEntry | null {
    const matrix = this._matrix();
    // Technique-specific first
    const specific = matrix.find(
      e => e.sourceEquipment === source && e.targetEquipment === target && e.technique === technique,
    );
    if (specific) return specific;
    // Fall back to 'default'
    return matrix.find(
      e => e.sourceEquipment === source && e.targetEquipment === target && e.technique === 'default',
    ) ?? null;
  }

  convertStep(step: RecipeStep, entry: ConversionEntry): RecipeStep {
    return {
      ...step,
      temperature: step.temperature != null
        ? Math.round(step.temperature * entry.tempFactor + entry.tempOffset)
        : undefined,
      duration: step.duration != null
        ? Math.round(step.duration * entry.timeFactor + entry.timeOffset)
        : undefined,
      technique: entry.techniqueNotes || step.technique,
    };
  }

  convertRecipe(recipe: Recipe, targetEquipment: string): ConvertedRecipe {
    const source = recipe.sourceEquipment;

    // No conversion needed
    if (source === targetEquipment) {
      return {
        sourceEquipment: source,
        targetEquipment,
        steps: recipe.steps,
        overallConfidence: 'high',
        techniqueNotes: [],
      };
    }

    const convertedSteps: RecipeStep[] = [];
    const confidenceLevels: Array<'high' | 'medium' | 'low' | 'none'> = [];
    const notes = new Set<string>();

    for (const step of recipe.steps) {
      const technique = step.technique || 'default';
      const entry = this.findConversion(source, targetEquipment, technique);

      if (entry) {
        convertedSteps.push(this.convertStep(step, entry));
        confidenceLevels.push(entry.confidence);
        if (entry.techniqueNotes) notes.add(entry.techniqueNotes);
      } else {
        // No conversion found — keep original step, mark as low confidence
        convertedSteps.push(step);
        confidenceLevels.push('none');
      }
    }

    return {
      sourceEquipment: source,
      targetEquipment,
      steps: convertedSteps,
      overallConfidence: this.lowestConfidence(confidenceLevels),
      techniqueNotes: Array.from(notes),
    };
  }

  private lowestConfidence(
    levels: Array<'high' | 'medium' | 'low' | 'none'>,
  ): 'high' | 'medium' | 'low' | 'none' {
    if (levels.includes('none')) return 'none';
    if (levels.includes('low')) return 'low';
    if (levels.includes('medium')) return 'medium';
    return 'high';
  }
}
