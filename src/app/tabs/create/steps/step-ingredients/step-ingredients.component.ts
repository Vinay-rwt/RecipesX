import { Component, Input } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { ItemReorderEventDetail } from '@ionic/angular';
import { INGREDIENT_UNITS } from '../../../../core/models/recipe.model';
import { RecipeFormStateService } from '../../services/recipe-form-state.service';

@Component({
  selector: 'app-step-ingredients',
  templateUrl: './step-ingredients.component.html',
  standalone: false,
})
export class StepIngredientsComponent {
  @Input() formState!: RecipeFormStateService;

  readonly units = INGREDIENT_UNITS;

  get ingredientsArray() {
    return this.formState.ingredientsArray;
  }

  getGroup(index: number): FormGroup {
    return this.ingredientsArray.at(index) as FormGroup;
  }

  addIngredient(): void {
    this.formState.addIngredient();
  }

  removeIngredient(index: number): void {
    this.formState.removeIngredient(index);
  }

  onReorder(event: CustomEvent<ItemReorderEventDetail>): void {
    this.formState.reorderIngredients(event.detail.from, event.detail.to);
    event.detail.complete();
  }
}
