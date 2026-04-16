import { Component, inject, signal } from '@angular/core';
import { Auth } from '@angular/fire/auth';
import { ViewWillEnter } from '@ionic/angular';
import { AuthService } from '../../core/services/auth.service';
import { UserProfileService } from '../../core/services/user-profile.service';
import { OnboardingStateService } from '../../features/onboarding/services/onboarding-state.service';
import { RecipeService } from '../../core/services/recipe.service';
import { SocialService } from '../../core/services/social.service';
import { CollectionService } from '../../core/services/collection.service';
import { Recipe } from '../../core/models/recipe.model';

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
  private socialService = inject(SocialService);
  private collectionService = inject(CollectionService);
  readonly profileService = inject(UserProfileService);
  readonly recipeService = inject(RecipeService);

  savedRecipes = signal<Recipe[]>([]);
  savedLoading = signal(false);

  ionViewWillEnter(): void {
    this.loadData();
  }

  loadData(): void {
    const user = this.auth.currentUser;
    if (user) {
      this.profileService.loadProfile(user.uid);
      this.recipeService.loadMyRecipes(user.uid);
      this._loadSavedRecipes(user.uid);
    }
  }

  private async _loadSavedRecipes(uid: string): Promise<void> {
    this.savedLoading.set(true);
    try {
      // Only uncategorized saves — recipes saved to a collection live in their collection, not here
      const uncategorizedIds = await this.socialService.getUserSaves(uid);
      if (uncategorizedIds.size === 0) {
        this.savedRecipes.set([]);
        return;
      }
      const recipes = await this.recipeService.getRecipesByIds(Array.from(uncategorizedIds));
      this.savedRecipes.set(recipes);
    } finally {
      this.savedLoading.set(false);
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
