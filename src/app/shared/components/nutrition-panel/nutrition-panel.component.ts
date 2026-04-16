import { Component, computed, inject, input, signal } from '@angular/core';
import { Recipe } from '../../../core/models/recipe.model';
import { MacroNutrients, NutritionState } from '../../../core/models/nutrition.model';
import { NutritionService } from '../../../core/services/nutrition.service';

// Daily reference values used only for bar width proportions (visual, not dietary advice)
const DAILY_REF: MacroNutrients = {
  calories: 700,
  protein: 30,
  carbs: 90,
  fat: 30,
  fiber: 10,
};

@Component({
  selector: 'app-nutrition-panel',
  templateUrl: './nutrition-panel.component.html',
  styleUrls: ['./nutrition-panel.component.scss'],
  standalone: false,
})
export class NutritionPanelComponent {
  recipe = input<Recipe | null>(null);

  nutritionState = signal<NutritionState>({ status: 'idle' });
  isOpen         = signal(false);

  private nutritionService = inject(NutritionService);

  scaledMacros = computed<MacroNutrients | null>(() => {
    const state = this.nutritionState();
    if (state.status !== 'success') return null;
    return state.data.perBaseServing;
  });

  isIncomplete = computed(() => {
    const state = this.nutritionState();
    return state.status === 'success' && state.data.incomplete;
  });

  barWidth(value: number, macro: keyof MacroNutrients): number {
    const ref = DAILY_REF[macro];
    return Math.min(100, Math.round((value / ref) * 100));
  }

  async toggle() {
    const state = this.nutritionState();

    // On error: collapse if open, reset to idle so next open retries
    if (!this.isOpen() && state.status === 'error') {
      this.nutritionState.set({ status: 'idle' });
    }

    this.isOpen.update(v => !v);

    // Only fetch on first open (idle state)
    if (this.isOpen() && this.nutritionState().status === 'idle') {
      const r = this.recipe();
      if (!r) return;

      this.nutritionState.set({ status: 'loading' });
      try {
        const data = await this.nutritionService.getNutrition(r);
        this.nutritionState.set({ status: 'success', data });
      } catch {
        this.nutritionState.set({ status: 'error', message: 'Could not estimate nutrition.' });
      }
    }
  }
}
