import { Component, inject } from '@angular/core';
import { Auth } from '@angular/fire/auth';
import { ViewWillEnter } from '@ionic/angular';
import { AuthService } from '../../core/services/auth.service';
import { UserProfileService } from '../../core/services/user-profile.service';
import { OnboardingStateService } from '../../features/onboarding/services/onboarding-state.service';
import { RecipeService } from '../../core/services/recipe.service';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.page.html',
  styleUrls: ['./profile.page.scss'],
  standalone: false,
})
export class ProfilePage implements ViewWillEnter {
  private auth = inject(Auth);
  private authService = inject(AuthService);
  private onboardingState = inject(OnboardingStateService);
  readonly profileService = inject(UserProfileService);
  readonly recipeService = inject(RecipeService);

  ionViewWillEnter(): void {
    this.loadData();
  }

  loadData(): void {
    const user = this.auth.currentUser;
    if (user) {
      this.profileService.loadProfile(user.uid);
      this.recipeService.loadMyRecipes(user.uid);
    }
  }

  async onEquipmentChange(equipment: string[]): Promise<void> {
    const user = this.auth.currentUser;
    if (user) {
      await this.profileService.updateEquipment(user.uid, equipment);
    }
  }

  async onMeasurementChange(event: CustomEvent): Promise<void> {
    const user = this.auth.currentUser;
    const profile = this.profileService.userProfile();
    if (user && profile) {
      await this.profileService.updatePreferences(user.uid, event.detail.value, profile.temperatureUnit);
    }
  }

  async onTemperatureChange(event: CustomEvent): Promise<void> {
    const user = this.auth.currentUser;
    const profile = this.profileService.userProfile();
    if (user && profile) {
      await this.profileService.updatePreferences(user.uid, profile.measurementSystem, event.detail.value);
    }
  }

  async onLogout(): Promise<void> {
    this.profileService.clear();
    this.onboardingState.reset();
    await this.authService.logout();
  }
}
