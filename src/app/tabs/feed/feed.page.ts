import { Component, inject, signal } from '@angular/core';
import { Auth } from '@angular/fire/auth';
import { ActionSheetController, AlertController, InfiniteScrollCustomEvent, RefresherCustomEvent, ToastController, ViewWillEnter } from '@ionic/angular';
import { FeedService } from '../../core/services/feed.service';
import { FollowingFeedService } from '../../core/services/following-feed.service';
import { FollowService } from '../../core/services/follow.service';
import { SocialService } from '../../core/services/social.service';
import { ShareService } from '../../core/services/share.service';
import { CollectionService } from '../../core/services/collection.service';
import { CUISINE_TYPES, Recipe } from '../../core/models/recipe.model';

@Component({
  selector: 'app-feed',
  templateUrl: './feed.page.html',
  styleUrls: ['./feed.page.scss'],
  standalone: false,
})
export class FeedPage implements ViewWillEnter {
  readonly feedService = inject(FeedService);
  readonly followingFeedService = inject(FollowingFeedService);
  private followService = inject(FollowService);
  private socialService = inject(SocialService);
  private shareService = inject(ShareService);
  readonly collectionService = inject(CollectionService);
  private auth = inject(Auth);
  private toastCtrl = inject(ToastController);
  private actionSheetCtrl = inject(ActionSheetController);
  private alertCtrl = inject(AlertController);

  likedRecipes = signal<Set<string>>(new Set());
  savedRecipes = signal<Set<string>>(new Set());
  activeTab = signal<'forYou' | 'following'>('forYou');

  searchQuery = '';
  selectedCuisine = '';
  selectedDifficulty = '';

  readonly cuisineTypes = CUISINE_TYPES;
  readonly difficulties = ['easy', 'medium', 'hard'];

  async ionViewWillEnter(): Promise<void> {
    const uid = this.auth.currentUser?.uid;
    if (uid) {
      const followingSet = await this.followService.loadFollowing(uid);
      this.followingFeedService.setFollowingIds([...followingSet]);
    }
    await this.feedService.loadInitial();
    await this._loadSocialState();
  }

  async switchTab(tab: 'forYou' | 'following'): Promise<void> {
    this.activeTab.set(tab);
    if (tab === 'following' && this.followingFeedService.recipes().length === 0) {
      await this.followingFeedService.loadInitial();
    }
  }

  async loadMore(event: InfiniteScrollCustomEvent): Promise<void> {
    if (this.activeTab() === 'following') {
      await this.followingFeedService.loadMore();
      event.target.complete();
      if (!this.followingFeedService.hasMore()) event.target.disabled = true;
    } else {
      await this.feedService.loadMore();
      event.target.complete();
      if (!this.feedService.hasMore()) event.target.disabled = true;
    }
  }

  async onRefresh(event: RefresherCustomEvent): Promise<void> {
    const uid = this.auth.currentUser?.uid;
    if (uid) {
      const followingSet = await this.followService.loadFollowing(uid);
      this.followingFeedService.setFollowingIds([...followingSet]);
    }
    if (this.activeTab() === 'following') {
      await this.followingFeedService.loadInitial();
    } else {
      await this.feedService.loadInitial();
    }
    await this._loadSocialState();
    event.target.complete();
  }

  async onRefreshManual(): Promise<void> {
    if (this.activeTab() === 'following') {
      await this.followingFeedService.loadInitial();
    } else {
      await this.feedService.loadInitial();
    }
    await this._loadSocialState();
  }

  async onToggleLike(recipeId: string): Promise<void> {
    const uid = this.auth.currentUser?.uid;
    if (!uid) { this._showToast('Sign in to like recipes'); return; }
    try {
      const liked = await this.socialService.toggleLike(uid, recipeId);
      const newSet = new Set(this.likedRecipes());
      const delta: 1 | -1 = liked ? 1 : -1;
      if (liked) newSet.add(recipeId); else newSet.delete(recipeId);
      this._activeService().patchRecipeCount(recipeId, 'likeCount', delta);
      this.likedRecipes.set(newSet);
    } catch {
      this._showToast('Could not update like — please try again');
    }
  }

  async onToggleSave(recipe: Recipe): Promise<void> {
    const uid = this.auth.currentUser?.uid;
    if (!uid) { this._showToast('Sign in to save recipes'); return; }

    const recipeId = recipe.id!;

    if (this.savedRecipes().has(recipeId)) {
      // Already saved — find where it lives and remove from exactly that place
      await this._doUnsave(uid, recipeId);
      return;
    }

    // Not yet saved — show collection picker
    await this._showSaveToCollectionSheet(uid, recipe);
  }

  private async _doUnsave(uid: string, recipeId: string): Promise<void> {
    try {
      const collectionId = this.collectionService.findCollectionForRecipe(recipeId);

      if (collectionId) {
        // Saved in a collection → remove from that collection only
        await this.collectionService.removeRecipeFromCollection(uid, collectionId, recipeId);
        await this.socialService.decrementSaveCount(recipeId);
      } else {
        // Saved without a collection → remove from uncategorized bucket
        await this.socialService.unsaveUncategorized(uid, recipeId);
      }

      const newSet = new Set(this.savedRecipes());
      newSet.delete(recipeId);
      this.savedRecipes.set(newSet);
      this._activeService().patchRecipeCount(recipeId, 'saveCount', -1);
      this._showToast('Removed from saves');
    } catch {
      this._showToast('Could not update save — please try again');
    }
  }

  private async _showSaveToCollectionSheet(uid: string, recipe: Recipe): Promise<void> {
    await this.collectionService.loadCollections(uid);
    const cols = this.collectionService.collections();

    const collectionButtons = cols.map(col => ({
      text: `${col.emoji} ${col.name}`,
      handler: async () => { await this._doSave(uid, recipe, col.id!); },
    }));

    const sheet = await this.actionSheetCtrl.create({
      header: 'Save to…',
      buttons: [
        ...collectionButtons,
        {
          text: '+ New collection',
          icon: 'add-circle-outline',
          handler: () => this._promptNewCollection(uid, recipe),
        },
        {
          text: 'Save without collection',
          icon: 'bookmark-outline',
          handler: () => this._doSave(uid, recipe, null),
        },
        { text: 'Cancel', role: 'cancel' },
      ],
    });
    await sheet.present();
  }

  private async _promptNewCollection(uid: string, recipe: Recipe): Promise<void> {
    const DEFAULT_EMOJIS = ['📚', '🍝', '🥗', '🍜', '🍱', '🥘', '🍲', '🥩', '🫕', '🍛'];
    const alert = await this.alertCtrl.create({
      header: 'New Collection',
      inputs: [
        { name: 'name', type: 'text', placeholder: 'e.g. Weeknight Dinners', attributes: { maxlength: 40 } },
        { name: 'emoji', type: 'text', placeholder: 'Emoji', value: DEFAULT_EMOJIS[Math.floor(Math.random() * DEFAULT_EMOJIS.length)], attributes: { maxlength: 4 } },
      ],
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Create & Save',
          handler: async (data): Promise<boolean> => {
            const name = data.name?.trim();
            if (!name) return false;
            const colId = await this.collectionService.createCollection(uid, name, data.emoji?.trim() || '📚');
            await this._doSave(uid, recipe, colId);
            return true;
          },
        },
      ],
    });
    await alert.present();
  }

  private async _doSave(uid: string, recipe: Recipe, collectionId: string | null): Promise<void> {
    const recipeId = recipe.id!;
    try {
      if (collectionId) {
        // Save into a specific collection — no saves/ doc, just collection membership + saveCount
        await this.collectionService.addRecipeToCollection(uid, collectionId, recipeId, recipe.photoURLs?.[0]);
        await this.socialService.incrementSaveCount(recipeId);
        const colName = this.collectionService.collections().find(c => c.id === collectionId)?.name;
        this._showToast(colName ? `Saved to "${colName}"` : 'Saved');
      } else {
        // Save without collection — write to uncategorized saves/ bucket
        await this.socialService.saveToUncategorized(uid, recipeId);
        this._showToast('Saved');
      }

      const newSet = new Set(this.savedRecipes());
      newSet.add(recipeId);
      this.savedRecipes.set(newSet);
      this._activeService().patchRecipeCount(recipeId, 'saveCount', 1);
    } catch {
      this._showToast('Could not save recipe — please try again');
    }
  }

  private _activeService(): FeedService | FollowingFeedService {
    return this.activeTab() === 'following' ? this.followingFeedService : this.feedService;
  }

  private async _showToast(message: string): Promise<void> {
    const toast = await this.toastCtrl.create({ message, duration: 2500, position: 'bottom' });
    await toast.present();
  }

  onSearch(): void {
    // Search and filter controls only apply to the For You feed.
    // The Following feed is the followed-users-only stream and ignores text/cuisine/difficulty filters.
    if (this.activeTab() !== 'forYou') return;
    this.feedService.setFilters({ ...this.feedService.filters(), searchQuery: this.searchQuery || undefined });
  }

  onCuisineChange(value: string): void {
    if (this.activeTab() !== 'forYou') return;
    this.selectedCuisine = value;
    this.feedService.setFilters({ ...this.feedService.filters(), cuisineType: value || undefined });
  }

  onDifficultyChange(value: string): void {
    if (this.activeTab() !== 'forYou') return;
    this.selectedDifficulty = value;
    this.feedService.setFilters({ ...this.feedService.filters(), difficulty: (value as any) || undefined });
  }

  clearFilters(): void {
    this.searchQuery = '';
    this.selectedCuisine = '';
    this.selectedDifficulty = '';
    this.feedService.resetFilters();
  }

  async onShare(recipe: Recipe): Promise<void> {
    await this.shareService.shareText(recipe);
  }

  private async _loadSocialState(): Promise<void> {
    const uid = this.auth.currentUser?.uid;
    if (!uid) return;

    const [likes, uncategorizedSaves, collections] = await Promise.all([
      this.socialService.getUserLikes(uid),
      this.socialService.getUserSaves(uid),
      this.collectionService.loadCollections(uid),
    ]);

    // savedRecipes = uncategorized saves ∪ all recipes in any collection
    const collectionSaves = new Set(
      this.collectionService.collections().flatMap(c => c.recipeIds)
    );
    const allSaved = new Set([...uncategorizedSaves, ...collectionSaves]);

    this.likedRecipes.set(likes);
    this.savedRecipes.set(allSaved);
  }
}
