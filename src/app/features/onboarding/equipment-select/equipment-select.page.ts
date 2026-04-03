import { Component, inject } from '@angular/core';
import { OnboardingStateService } from '../services/onboarding-state.service';

@Component({
  selector: 'app-equipment-select',
  templateUrl: './equipment-select.page.html',
  styleUrls: ['./equipment-select.page.scss'],
  standalone: false,
})
export class EquipmentSelectPage {
  readonly onboardingState = inject(OnboardingStateService);

  get canProceed(): boolean {
    return this.onboardingState.selectedEquipment().length > 0;
  }

  onEquipmentChange(equipment: string[]): void {
    this.onboardingState.selectedEquipment.set(equipment);
  }
}
