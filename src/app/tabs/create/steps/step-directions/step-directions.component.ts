import { Component, Input } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { ItemReorderEventDetail } from '@ionic/angular';
import { EQUIPMENT_TYPES, EquipmentType } from '../../../../core/models/equipment.model';
import { RecipeFormStateService } from '../../services/recipe-form-state.service';

@Component({
  selector: 'app-step-directions',
  templateUrl: './step-directions.component.html',
  standalone: false,
})
export class StepDirectionsComponent {
  @Input() formState!: RecipeFormStateService;

  readonly equipmentTypes: EquipmentType[] = EQUIPMENT_TYPES;

  // Track which steps have the optional fields panel expanded
  expandedSteps: Set<number> = new Set();

  get stepsArray() {
    return this.formState.stepsArray;
  }

  getGroup(index: number): FormGroup {
    return this.stepsArray.at(index) as FormGroup;
  }

  addStep(): void {
    this.formState.addStep();
  }

  removeStep(index: number): void {
    this.expandedSteps.delete(index);
    this.formState.removeStep(index);
  }

  onReorder(event: CustomEvent<ItemReorderEventDetail>): void {
    this.formState.reorderSteps(event.detail.from, event.detail.to);
    event.detail.complete();
  }

  toggleExpanded(index: number): void {
    if (this.expandedSteps.has(index)) {
      this.expandedSteps.delete(index);
    } else {
      this.expandedSteps.add(index);
    }
  }

  isExpanded(index: number): boolean {
    return this.expandedSteps.has(index);
  }
}
