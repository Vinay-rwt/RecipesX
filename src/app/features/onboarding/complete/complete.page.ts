import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Auth } from '@angular/fire/auth';
import { OnboardingStateService } from '../services/onboarding-state.service';
import { UserProfileService } from '../../../core/services/user-profile.service';

@Component({
  selector: 'app-complete',
  templateUrl: './complete.page.html',
  styleUrls: ['./complete.page.scss'],
  standalone: false,
})
export class CompletePage {
  private auth = inject(Auth);
  private router = inject(Router);
  readonly onboardingState = inject(OnboardingStateService);
  private userProfileService = inject(UserProfileService);

  isLoading = false;

  get measurementLabel(): string {
    return this.onboardingState.measurementSystem() === 'metric' ? 'Metric (g, ml)' : 'Imperial (oz, cups)';
  }

  get temperatureLabel(): string {
    return this.onboardingState.temperatureUnit() === 'celsius' ? 'Celsius' : 'Fahrenheit';
  }

  async onGetStarted(): Promise<void> {
    const user = this.auth.currentUser;
    if (!user) return;

    this.isLoading = true;
    try {
      await this.userProfileService.saveOnboardingData(
        user.uid,
        this.onboardingState.selectedEquipment(),
        this.onboardingState.measurementSystem(),
        this.onboardingState.temperatureUnit(),
      );
      this.onboardingState.reset();
      this.router.navigate(['/tabs/feed']);
    } finally {
      this.isLoading = false;
    }
  }
}
