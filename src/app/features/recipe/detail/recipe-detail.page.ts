import { Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ViewWillEnter } from '@ionic/angular';
import { RecipeService } from '../../../core/services/recipe.service';
import { getEquipmentById } from '../../../core/models/equipment.model';

@Component({
  selector: 'app-recipe-detail',
  templateUrl: './recipe-detail.page.html',
  styleUrls: ['./recipe-detail.page.scss'],
  standalone: false,
})
export class RecipeDetailPage implements ViewWillEnter {
  private route = inject(ActivatedRoute);
  private recipeService = inject(RecipeService);

  readonly recipe = this.recipeService.currentRecipe;
  readonly loading = this.recipeService.loading;

  ionViewWillEnter(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.recipeService.getRecipe(id);
    }
  }

  getEquipmentLabel(id: string): string {
    return getEquipmentById(id)?.label ?? id;
  }

  getDifficultyColor(difficulty: string): string {
    return { easy: 'success', medium: 'warning', hard: 'danger' }[difficulty] ?? 'medium';
  }

  hasOptionalDetails(step: { temperature?: number; duration?: number; technique?: string }): boolean {
    return !!(step.temperature || step.duration || step.technique);
  }
}
