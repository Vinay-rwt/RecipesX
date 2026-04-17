import { Component, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
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
  private route = inject(ActivatedRoute);
  private alertCtrl = inject(AlertController);
  private toastCtrl = inject(ToastController);
  private loadingCtrl = inject(LoadingController);

  readonly stepLabels = ['Basics', 'Equipment', 'Ingredients', 'Steps'];

  async ionViewWillEnter(): Promise<void> {
    const editId = this.route.snapshot.paramMap.get('id');

    if (editId) {
      // Edit mode: load the recipe and populate the form
      const loading = await this.loadingCtrl.create({ message: 'Loading recipe...' });
      await loading.present();
      try {
        await this.recipeService.getRecipe(editId);
        const recipe = this.recipeService.currentRecipe();
        if (recipe) {
          this.formState.loadRecipeForEdit(recipe);
        } else {
          await this.showToast('Recipe not found', 'danger');
          await this.router.navigate(['/tabs/profile']);
        }
      } catch {
        await this.showToast('Failed to load recipe', 'danger');
        await this.router.navigate(['/tabs/profile']);
      } finally {
        await loading.dismiss();
      }
      return;
    }

    // Create mode: check for existing local draft
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
    // Don't pollute the draft slot with edit state
    if (!this.formState.isEditMode() && this.formState.form.dirty) {
      this.formState.saveDraftToLocal();
    }
  }

  nextStep(): void {
    const current = this.formState.currentStep();
    if (current < this.stepLabels.length - 1) {
      this.formState.currentStep.set(current + 1);
      if (!this.formState.isEditMode()) {
        this.formState.saveDraftToLocal();
      }
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
      this.formState.coverEmoji.set(null); // clear emoji when photo chosen
    } catch {
      // User cancelled photo capture — no action needed
    }
  }

  onSelectEmoji(emoji: string): void {
    this.formState.coverEmoji.set(emoji);
    this.formState.coverPhotoBlob.set(null); // clear photo when emoji chosen
    if (this.formState.coverPhotoPreview()) {
      URL.revokeObjectURL(this.formState.coverPhotoPreview()!);
    }
    this.formState.coverPhotoPreview.set(null);
    this.formState.existingPhotoURLs.set([]); // user chose emoji, drop existing photos
  }

  async saveDraft(): Promise<void> {
    const user = this.auth.currentUser;
    if (!user) return;

    const loading = await this.loadingCtrl.create({ message: 'Saving draft...' });
    await loading.present();
    try {
      const formValue = this.formState.form.value;
      const draftId = this.formState.firestoreDraftId();
      const recipeData = this.buildRecipeData(user.uid, user.displayName ?? 'Unknown cook', formValue, [], 'draft', this.formState.coverEmoji() ?? undefined);

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

    const isEdit = this.formState.isEditMode();
    const loading = await this.loadingCtrl.create({ message: isEdit ? 'Saving changes...' : 'Publishing...' });
    await loading.present();
    try {
      const formValue = this.formState.form.value;
      const existingId = this.formState.firestoreDraftId();
      let recipeId: string;

      // In edit mode, preserve existing photos unless user picked a new one
      const photoURLs = this.formState.existingPhotoURLs();
      const recipeData = this.buildRecipeData(user.uid, user.displayName ?? 'Unknown cook', formValue, photoURLs, 'published', this.formState.coverEmoji() ?? undefined);

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
      await this.showToast(isEdit ? 'Recipe updated!' : 'Recipe published!', 'success');
      await this.router.navigate(['/recipe', recipeId]);
    } catch (err) {
      console.error(err);
      await this.showToast(isEdit ? 'Failed to save changes' : 'Failed to publish', 'danger');
    } finally {
      await loading.dismiss();
    }
  }

  async discard(): Promise<void> {
    const isEdit = this.formState.isEditMode();
    const recipeId = this.formState.firestoreDraftId();

    const alert = await this.alertCtrl.create({
      header: isEdit ? 'Discard Changes?' : 'Discard Recipe?',
      message: isEdit
        ? 'Your changes will not be saved.'
        : 'Your draft will be deleted. This cannot be undone.',
      buttons: [
        { text: 'Keep Editing', role: 'cancel' },
        {
          text: 'Discard',
          role: 'destructive',
          handler: async () => {
            if (!isEdit && recipeId) {
              // Only delete the Firestore doc for new drafts, not published recipes
              try { await this.recipeService.deleteRecipe(recipeId); } catch { /* ignore */ }
            }
            this.formState.reset();
            if (isEdit && recipeId) {
              await this.router.navigate(['/recipe', recipeId]);
            }
          },
        },
      ],
    });
    await alert.present();
  }

  private buildRecipeData(
    authorId: string,
    authorName: string,
    formValue: Record<string, unknown>,
    photoURLs: string[],
    status: 'draft' | 'published',
    coverEmoji?: string,
  ): Omit<Recipe, 'id' | 'createdAt' | 'updatedAt' | 'likeCount' | 'saveCount'> {
    return {
      authorId,
      authorName,
      title: (formValue['title'] as string) || '',
      description: (formValue['description'] as string) || '',
      photoURLs,
      ...(coverEmoji ? { coverEmoji } : {}),
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
