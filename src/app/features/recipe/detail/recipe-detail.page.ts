import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Auth } from '@angular/fire/auth';
import { ActionSheetController, ToastController, ViewWillEnter } from '@ionic/angular';
import { RecipeService } from '../../../core/services/recipe.service';
import { EquipmentConversionService } from '../../../core/services/equipment-conversion.service';
import { UserProfileService } from '../../../core/services/user-profile.service';
import { SocialService } from '../../../core/services/social.service';
import { ShareService } from '../../../core/services/share.service';
import { RecipeCardGeneratorService } from '../../../core/services/recipe-card-generator.service';
import { getEquipmentById, EQUIPMENT_TYPES } from '../../../core/models/equipment.model';
import { Recipe } from '../../../core/models/recipe.model';

@Component({
  selector: 'app-recipe-detail',
  templateUrl: './recipe-detail.page.html',
  styleUrls: ['./recipe-detail.page.scss'],
  standalone: false,
})
export class RecipeDetailPage implements ViewWillEnter {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private auth = inject(Auth);
  private recipeService = inject(RecipeService);
  private conversionService = inject(EquipmentConversionService);
  private socialService = inject(SocialService);
  private shareService = inject(ShareService);
  private cardGenerator = inject(RecipeCardGeneratorService);
  private actionSheetCtrl = inject(ActionSheetController);
  private toastCtrl = inject(ToastController);
  readonly profileService = inject(UserProfileService);

  readonly recipe = this.recipeService.currentRecipe;
  readonly loading = this.recipeService.loading;

  readonly selectedEquipment = signal<string | null>(null);
  readonly selectedServings = signal<number>(1);
  readonly isLiked = signal(false);
  readonly isSaved = signal(false);

  readonly isAuthor = computed(() => {
    const r = this.recipe();
    const uid = this.auth.currentUser?.uid;
    return !!r && !!uid && r.authorId === uid;
  });

  readonly viewingOptions = computed(() => {
    const r = this.recipe();
    if (!r) return [];
    const userEq = this.profileService.equipment();
    return this.conversionService.getViewingOptions(r.sourceEquipment, userEq);
  });

  readonly convertedData = computed(() => {
    const r = this.recipe();
    const target = this.selectedEquipment();
    if (!r || !target || target === r.sourceEquipment) return null;
    return this.conversionService.convertRecipe(r, target);
  });

  readonly displaySteps = computed(() => {
    return this.convertedData()?.steps ?? this.recipe()?.steps ?? [];
  });

  async ionViewWillEnter(): Promise<void> {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      await this.recipeService.getRecipe(id);
    }

    const user = this.auth.currentUser;
    if (user) {
      await this.profileService.loadProfile(user.uid);
    }

    await this.conversionService.loadMatrix();

    const r = this.recipe();
    if (r) {
      const userEq = this.profileService.equipment();
      const bestTarget = this.conversionService.getBestTarget(r.sourceEquipment, userEq);
      this.selectedEquipment.set(bestTarget ?? r.sourceEquipment);
      this.selectedServings.set(r.baseServings);

      const uid = this.auth.currentUser?.uid;
      if (uid && r.id) {
        const [liked, saved] = await Promise.all([
          this.socialService.isLiked(uid, r.id),
          this.socialService.isSaved(uid, r.id),
        ]);
        this.isLiked.set(liked);
        this.isSaved.set(saved);
      }
    }
  }

  async toggleLike(): Promise<void> {
    const uid = this.auth.currentUser?.uid;
    const recipeId = this.recipe()?.id;
    if (!uid || !recipeId) return;
    const liked = await this.socialService.toggleLike(uid, recipeId);
    this.isLiked.set(liked);
  }

  async toggleSave(): Promise<void> {
    const uid = this.auth.currentUser?.uid;
    const recipeId = this.recipe()?.id;
    if (!uid || !recipeId) return;
    const saved = await this.socialService.toggleSave(uid, recipeId);
    this.isSaved.set(saved);
  }

  navigateToEdit(): void {
    const id = this.recipe()?.id;
    if (id) {
      this.router.navigate(['/tabs/create/edit', id]);
    }
  }

  onEquipmentChange(id: string): void {
    this.selectedEquipment.set(id);
  }

  incrementServings(): void {
    this.selectedServings.update(s => Math.min(s + 1, 100));
  }

  decrementServings(): void {
    this.selectedServings.update(s => Math.max(s - 1, 1));
  }

  getDisplayQty(qty: number): number {
    const r = this.recipe();
    if (!r || r.baseServings === 0) return qty;
    const scaled = (qty / r.baseServings) * this.selectedServings();
    return Math.round(scaled * 10) / 10;
  }

  getEquipmentLabel(id: string): string {
    return getEquipmentById(id)?.label ?? id;
  }

  getDifficultyColor(difficulty: string): string {
    return ({ easy: 'success', medium: 'warning', hard: 'danger' } as Record<string, string>)[difficulty] ?? 'medium';
  }

  getConfidenceColor(confidence: string): string {
    return ({ high: 'success', medium: 'warning', low: 'danger', none: 'medium' } as Record<string, string>)[confidence] ?? 'medium';
  }

  hasOptionalDetails(step: { temperature?: number; duration?: number; technique?: string }): boolean {
    return !!(step.temperature || step.duration || step.technique);
  }

  readonly allEquipmentTypes = EQUIPMENT_TYPES;

  async onShare(): Promise<void> {
    const recipe = this.recipe();
    if (!recipe) return;

    const sheet = await this.actionSheetCtrl.create({
      header: 'Share Recipe',
      buttons: [
        {
          text: 'Share as Image',
          icon: 'image-outline',
          handler: () => { this._shareAsImage(recipe); },
        },
        {
          text: 'Share as Text',
          icon: 'document-text-outline',
          handler: () => { this.shareService.shareText(recipe); },
        },
        {
          text: 'Copy Link',
          icon: 'link-outline',
          handler: () => { this._copyLink(recipe.id!); },
        },
        {
          text: 'Cancel',
          role: 'cancel',
          icon: 'close-outline',
        },
      ],
    });
    await sheet.present();
  }

  private async _shareAsImage(recipe: Recipe): Promise<void> {
    try {
      const blob = await this.cardGenerator.generateCard(recipe);
      await this.shareService.shareImage(recipe, blob);
    } catch (err) {
      console.error('Share image failed:', err);
      const toast = await this.toastCtrl.create({
        message: 'Could not generate image. Sharing as text instead.',
        duration: 3000,
        color: 'warning',
      });
      await toast.present();
      await this.shareService.shareText(recipe);
    }
  }

  private async _copyLink(recipeId: string): Promise<void> {
    await this.shareService.copyLink(recipeId);
    const toast = await this.toastCtrl.create({
      message: 'Link copied to clipboard',
      duration: 2000,
      color: 'success',
    });
    await toast.present();
  }
}
