import { Component, effect, inject, signal } from '@angular/core';
import { Auth } from '@angular/fire/auth';
import { ViewWillEnter } from '@ionic/angular';
import { AuthService } from '../../core/services/auth.service';
import { UserProfileService } from '../../core/services/user-profile.service';
import { OnboardingStateService } from '../../features/onboarding/services/onboarding-state.service';
import { RecipeService } from '../../core/services/recipe.service';
import { SocialService } from '../../core/services/social.service';
import { CollectionService } from '../../core/services/collection.service';
import { Recipe } from '../../core/models/recipe.model';
import { CookingLevel } from '../../core/models/user.model';

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
  readonly socialService = inject(SocialService);
  readonly collectionService = inject(CollectionService);
  readonly profileService = inject(UserProfileService);
  readonly recipeService = inject(RecipeService);

  savedRecipes = signal<Recipe[]>([]);
  savedLoading = signal(false);

  constructor() {
    // Re-derive savedRecipes whenever the uncategorized save set changes.
    // collectionService.collections() is NOT included here — collection recipes
    // live in their collection, not in the saved list.
    effect(() => {
      const ids = this.socialService.uncategorizedSaveIds();
      this._fetchSavedRecipes(Array.from(ids));
    });
  }

  ionViewWillEnter(): void {
    this.loadData();
  }

  loadData(): void {
    const user = this.auth.currentUser;
    if (user) {
      this.profileService.loadProfile(user.uid);
      this.recipeService.loadMyRecipes(user.uid);
      // Seed the signal — effect() will fire once the signal updates
      this.socialService.getUserSaves(user.uid);
      this.collectionService.loadCollections(user.uid);
    }
  }

  private async _fetchSavedRecipes(ids: string[]): Promise<void> {
    if (ids.length === 0) {
      this.savedRecipes.set([]);
      return;
    }
    this.savedLoading.set(true);
    try {
      const recipes = await this.recipeService.getRecipesByIds(ids);
      this.savedRecipes.set(recipes);
    } finally {
      this.savedLoading.set(false);
    }
  }

  async onEquipmentChange(equipment: string[]): Promise<void> {
    const user = this.auth.currentUser;
    if (user) await this.profileService.updateEquipment(user.uid, equipment);
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

  cookingLevelLabel(level: CookingLevel | null): string {
    const map: Record<CookingLevel, string> = {
      beginner: 'Beginner',
      home_cook: 'Home Cook',
      advanced: 'Advanced',
      professional: 'Professional',
    };
    return level ? map[level] : '';
  }

  async onLogout(): Promise<void> {
    this.profileService.clear();
    this.onboardingState.reset();
    await this.authService.logout();
  }
}
