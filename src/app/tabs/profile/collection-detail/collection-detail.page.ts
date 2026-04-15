import { Component, inject, signal } from '@angular/core';
import { Auth } from '@angular/fire/auth';
import { ActivatedRoute } from '@angular/router';
import { ToastController, ViewWillEnter } from '@ionic/angular';
import { CollectionService } from '../../../core/services/collection.service';
import { RecipeService } from '../../../core/services/recipe.service';
import { Collection } from '../../../core/models/collection.model';
import { Recipe } from '../../../core/models/recipe.model';

@Component({
  selector: 'app-collection-detail',
  templateUrl: './collection-detail.page.html',
  styleUrls: ['./collection-detail.page.scss'],
  standalone: false,
})
export class CollectionDetailPage implements ViewWillEnter {
  private auth = inject(Auth);
  private route = inject(ActivatedRoute);
  private toastCtrl = inject(ToastController);
  readonly collectionService = inject(CollectionService);
  private recipeService = inject(RecipeService);

  collection = signal<Collection | null>(null);
  recipes = signal<Recipe[]>([]);
  loading = signal(false);

  async ionViewWillEnter(): Promise<void> {
    const collectionId = this.route.snapshot.paramMap.get('id');
    if (!collectionId) return;

    const col = this.collectionService.collections().find(c => c.id === collectionId) ?? null;
    this.collection.set(col);

    if (col?.recipeIds?.length) {
      this.loading.set(true);
      try {
        const recipes = await this.recipeService.getRecipesByIds(col.recipeIds);
        // Preserve collection order
        const ordered = col.recipeIds
          .map(id => recipes.find(r => r.id === id))
          .filter((r): r is Recipe => r !== undefined);
        this.recipes.set(ordered);
      } finally {
        this.loading.set(false);
      }
    } else {
      this.recipes.set([]);
    }
  }

  async onRemoveRecipe(recipe: Recipe): Promise<void> {
    const uid = this.auth.currentUser?.uid;
    const col = this.collection();
    if (!uid || !col?.id) return;
    try {
      await this.collectionService.removeRecipeFromCollection(uid, col.id, recipe.id!);
      this.recipes.update(list => list.filter(r => r.id !== recipe.id));
      const toast = await this.toastCtrl.create({
        message: `Removed from "${col.name}"`,
        duration: 2000,
        position: 'bottom',
      });
      await toast.present();
    } catch {
      const toast = await this.toastCtrl.create({
        message: 'Failed to remove recipe',
        duration: 2000,
        position: 'bottom',
      });
      await toast.present();
    }
  }
}
