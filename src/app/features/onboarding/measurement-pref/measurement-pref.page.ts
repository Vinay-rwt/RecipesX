import { Component, inject } from '@angular/core';
import { OnboardingStateService } from '../services/onboarding-state.service';

@Component({
  selector: 'app-measurement-pref',
  templateUrl: './measurement-pref.page.html',
  styleUrls: ['./measurement-pref.page.scss'],
  standalone: false,
})
export class MeasurementPrefPage {
  readonly onboardingState = inject(OnboardingStateService);

  onMeasurementChange(event: CustomEvent): void {
    this.onboardingState.measurementSystem.set(event.detail.value);
  }

  onTemperatureChange(event: CustomEvent): void {
    this.onboardingState.temperatureUnit.set(event.detail.value);
  }
}
