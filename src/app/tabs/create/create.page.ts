import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Auth } from '@angular/fire/auth';
import { AlertController, LoadingController, ToastController, ViewWillEnter, ViewWillLeave } from '@ionic/angular';
import { RecipeFormStateService } from './services/recipe-form-state.service';
import { RecipeService } from '../../core/services/recipe.service';
import { PhotoService } from '../../core/services/photo.service';
import { Recipe } from '../../core/models/recipe.model';

@Component({
  selector: 'app-create',
  templateUrl: './create.page.html',
  styleUrls: ['./create.page.scss'],
  standalone: false,
})
export class CreatePage implements ViewWillEnter, ViewWillLeave {
  readonly formState = inject(RecipeFormStateService);
  private recipeService = inject(RecipeService);
  private photoService = inject(PhotoService);
  private auth = inject(Auth);
  private router = inject(Router);
  private alertCtrl = inject(AlertController);
  private toastCtrl = inject(ToastController);
  private loadingCtrl = inject(LoadingController);

  readonly stepLabels = ['Basics', 'Equipment', 'Ingredients', 'Steps'];

  async ionViewWillEnter(): Promise<void> {
    const hasDraft = this.formState.loadDraftFromLocal();
    if (hasDraft) {
      const alert = await this.alertCtrl.create({
        header: 'Resume Draft?',
        message: 'You have an unfinished recipe. Would you like to continue editing it?',
        buttons: [
          {
            text: 'Discard',
            role: 'cancel',
            handler: () => { this.formState.reset(); },
          },
          { text: 'Resume', role: 'confirm' },
        ],
      });
      await alert.present();
    }
  }

  ionViewWillLeave(): void {
    if (this.formState.form.dirty) {
      this.formState.saveDraftToLocal();
    }
  }

  nextStep(): void {
    const current = this.formState.currentStep();
    if (current < this.stepLabels.length - 1) {
      this.formState.currentStep.set(current + 1);
      this.formState.saveDraftToLocal();
    }
  }

  prevStep(): void {
    const current = this.formState.currentStep();
    if (current > 0) {
      this.formState.currentStep.set(current - 1);
    }
  }

  onStepSegmentChange(event: CustomEvent): void {
    this.formState.currentStep.set(Number(event.detail.value));
  }

  async onCapturePhoto(): Promise<void> {
    try {
      const blob = await this.photoService.capturePhoto();
      const url = URL.createObjectURL(blob);
      this.formState.coverPhotoBlob.set(blob);
      this.formState.coverPhotoPreview.set(url);
    } catch {
      // User cancelled photo capture — no action needed
    }
  }

  async saveDraft(): Promise<void> {
    const user = this.auth.currentUser;
    if (!user) return;

    const loading = await this.loadingCtrl.create({ message: 'Saving draft...' });
    await loading.present();
    try {
      const formValue = this.formState.form.value;
      const draftId = this.formState.firestoreDraftId();
      const recipeData = this.buildRecipeData(user.uid, formValue, [], 'draft');

      if (draftId) {
        await this.recipeService.updateRecipe(draftId, recipeData);
      } else {
        const newId = await this.recipeService.createRecipe(recipeData);
        this.formState.firestoreDraftId.set(newId);
        if (this.formState.coverPhotoBlob()) {
          const url = await this.photoService.uploadRecipePhoto(newId, this.formState.coverPhotoBlob()!, 0);
          await this.recipeService.updateRecipe(newId, { photoURLs: [url] });
        }
      }
      this.formState.saveDraftToLocal();
      await this.showToast('Draft saved');
    } catch (err) {
      console.error(err);
      await this.showToast('Failed to save draft', 'danger');
    } finally {
      await loading.dismiss();
    }
  }

  async publish(): Promise<void> {
    const invalidSteps = this.stepLabels
      .map((label, i) => ({ label, valid: this.formState.isStepValid(i) }))
      .filter(s => !s.valid)
      .map(s => s.label);

    if (invalidSteps.length > 0) {
      const alert = await this.alertCtrl.create({
        header: 'Incomplete Recipe',
        message: `Please complete: ${invalidSteps.join(', ')}`,
        buttons: ['OK'],
      });
      await alert.present();
      return;
    }

    const user = this.auth.currentUser;
    if (!user) return;

    const loading = await this.loadingCtrl.create({ message: 'Publishing...' });
    await loading.present();
    try {
      const formValue = this.formState.form.value;
      const existingId = this.formState.firestoreDraftId();
      let recipeId: string;

      const recipeData = this.buildRecipeData(user.uid, formValue, [], 'published');
      if (existingId) {
        await this.recipeService.updateRecipe(existingId, recipeData);
        recipeId = existingId;
      } else {
        recipeId = await this.recipeService.createRecipe(recipeData);
      }

      if (this.formState.coverPhotoBlob()) {
        const url = await this.photoService.uploadRecipePhoto(recipeId, this.formState.coverPhotoBlob()!, 0);
        await this.recipeService.updateRecipe(recipeId, { photoURLs: [url] });
      }

      this.formState.reset();
      await this.showToast('Recipe published!', 'success');
      await this.router.navigate(['/recipe', recipeId]);
    } catch (err) {
      console.error(err);
      await this.showToast('Failed to publish', 'danger');
    } finally {
      await loading.dismiss();
    }
  }

  async discard(): Promise<void> {
    const alert = await this.alertCtrl.create({
      header: 'Discard Recipe?',
      message: 'Your draft will be deleted. This cannot be undone.',
      buttons: [
        { text: 'Keep Editing', role: 'cancel' },
        {
          text: 'Discard',
          role: 'destructive',
          handler: async () => {
            const draftId = this.formState.firestoreDraftId();
            if (draftId) {
              try { await this.recipeService.deleteRecipe(draftId); } catch { /* ignore */ }
            }
            this.formState.reset();
          },
        },
      ],
    });
    await alert.present();
  }

  private buildRecipeData(
    authorId: string,
    formValue: Record<string, unknown>,
    photoURLs: string[],
    status: 'draft' | 'published',
  ): Omit<Recipe, 'id' | 'createdAt' | 'updatedAt' | 'likeCount' | 'saveCount'> {
    return {
      authorId,
      title: (formValue['title'] as string) || '',
      description: (formValue['description'] as string) || '',
      photoURLs,
      sourceEquipment: (formValue['sourceEquipment'] as string) || '',
      ingredients: (formValue['ingredients'] as Recipe['ingredients']) || [],
      baseServings: Number(formValue['baseServings']) || 4,
      steps: (formValue['steps'] as Recipe['steps']) || [],
      tags: (formValue['tags'] as string[]) || [],
      cuisineType: (formValue['cuisineType'] as string) || '',
      difficulty: ((formValue['difficulty'] as Recipe['difficulty']) || 'easy'),
      prepTime: Number(formValue['prepTime']) || 0,
      cookTime: Number(formValue['cookTime']) || 0,
      status,
      searchTokens: [],
    };
  }

  private async showToast(message: string, color = 'medium'): Promise<void> {
    const toast = await this.toastCtrl.create({ message, duration: 2000, color, position: 'bottom' });
    await toast.present();
  }
}
