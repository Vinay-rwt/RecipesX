import { Component, effect, inject, signal } from '@angular/core';
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

  constructor() {
    // Whenever the collection signal changes (optimistic updates from remove/add),
    // re-derive the recipe list immediately — no Firestore round-trip needed.
    effect(() => {
      const col = this.collection();
      if (!col) { this.recipes.set([]); return; }

      // Re-read the latest version of this collection from the service signal
      const latest = this.collectionService.collections().find(c => c.id === col.id);
      if (!latest) { this.recipes.set([]); return; }

      // Keep only recipes still in recipeIds, preserving current order
      this.recipes.update(current =>
        current.filter(r => latest.recipeIds.includes(r.id!))
      );
      this.collection.set(latest);
    });
  }

  async ionViewWillEnter(): Promise<void> {
    const uid = this.auth.currentUser?.uid;
    const collectionId = this.route.snapshot.paramMap.get('id');
    if (!collectionId || !uid) return;

    // Load collections if not yet loaded (first entry)
    if (this.collectionService.collections().length === 0) {
      await this.collectionService.loadCollections(uid);
    }

    const col = this.collectionService.collections().find(c => c.id === collectionId) ?? null;
    this.collection.set(col);

    // Fetch actual recipe docs (only on first entry — effect handles subsequent updates)
    if (col?.recipeIds?.length && this.recipes().length === 0) {
      this.loading.set(true);
      try {
        const fetched = await this.recipeService.getRecipesByIds(col.recipeIds);
        const ordered = col.recipeIds
          .map(id => fetched.find(r => r.id === id))
          .filter((r): r is Recipe => r !== undefined);
        this.recipes.set(ordered);
      } finally {
        this.loading.set(false);
      }
    } else if (!col?.recipeIds?.length) {
      this.recipes.set([]);
    }
  }

  async onRemoveRecipe(recipe: Recipe): Promise<void> {
    const uid = this.auth.currentUser?.uid;
    const col = this.collection();
    if (!uid || !col?.id) return;
    try {
      // Service does optimistic signal update → effect() fires → recipes filtered instantly
      await this.collectionService.removeRecipeFromCollection(uid, col.id, recipe.id!);
      const toast = await this.toastCtrl.create({
        message: `Removed from "${col.name}"`,
        duration: 2000,
        position: 'bottom',
        positionAnchor: 'main-tab-bar',
      });
      await toast.present();
    } catch {
      const toast = await this.toastCtrl.create({
        message: 'Failed to remove recipe',
        duration: 2000,
        position: 'bottom',
        positionAnchor: 'main-tab-bar',
      });
      await toast.present();
    }
  }
}
