import { Component, inject, signal } from '@angular/core';
import { Auth } from '@angular/fire/auth';
import { InfiniteScrollCustomEvent, RefresherCustomEvent, ViewWillEnter } from '@ionic/angular';
import { FeedService } from '../../core/services/feed.service';
import { SocialService } from '../../core/services/social.service';
import { ShareService } from '../../core/services/share.service';
import { CUISINE_TYPES, Recipe } from '../../core/models/recipe.model';

@Component({
  selector: 'app-feed',
  templateUrl: './feed.page.html',
  styleUrls: ['./feed.page.scss'],
  standalone: false,
})
export class FeedPage implements ViewWillEnter {
  readonly feedService = inject(FeedService);
  private socialService = inject(SocialService);
  private shareService = inject(ShareService);
  private auth = inject(Auth);

  likedRecipes = signal<Set<string>>(new Set());
  savedRecipes = signal<Set<string>>(new Set());

  searchQuery = '';
  selectedCuisine = '';
  selectedDifficulty = '';

  readonly cuisineTypes = CUISINE_TYPES;
  readonly difficulties = ['easy', 'medium', 'hard'];

  async ionViewWillEnter(): Promise<void> {
    await this.feedService.loadInitial();
    await this._loadSocialState();
  }

  async loadMore(event: InfiniteScrollCustomEvent): Promise<void> {
    await this.feedService.loadMore();
    event.target.complete();
    if (!this.feedService.hasMore()) {
      event.target.disabled = true;
    }
  }

  async onRefresh(event: RefresherCustomEvent): Promise<void> {
    await this.feedService.loadInitial();
    await this._loadSocialState();
    event.target.complete();
  }

  async onRefreshManual(): Promise<void> {
    await this.feedService.loadInitial();
    await this._loadSocialState();
  }

  async onToggleLike(recipeId: string): Promise<void> {
    const uid = this.auth.currentUser?.uid;
    if (!uid) return;
    const liked = await this.socialService.toggleLike(uid, recipeId);
    const newSet = new Set(this.likedRecipes());
    if (liked) newSet.add(recipeId); else newSet.delete(recipeId);
    this.likedRecipes.set(newSet);
  }

  async onToggleSave(recipeId: string): Promise<void> {
    const uid = this.auth.currentUser?.uid;
    if (!uid) return;
    const saved = await this.socialService.toggleSave(uid, recipeId);
    const newSet = new Set(this.savedRecipes());
    if (saved) newSet.add(recipeId); else newSet.delete(recipeId);
    this.savedRecipes.set(newSet);
  }

  onSearch(): void {
    this.feedService.setFilters({
      ...this.feedService.filters(),
      searchQuery: this.searchQuery || undefined,
    });
  }

  onCuisineChange(value: string): void {
    this.selectedCuisine = value;
    this.feedService.setFilters({
      ...this.feedService.filters(),
      cuisineType: value || undefined,
    });
  }

  onDifficultyChange(value: string): void {
    this.selectedDifficulty = value;
    this.feedService.setFilters({
      ...this.feedService.filters(),
      difficulty: (value as any) || undefined,
    });
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
    const [likes, saves] = await Promise.all([
      this.socialService.getUserLikes(uid),
      this.socialService.getUserSaves(uid),
    ]);
    this.likedRecipes.set(likes);
    this.savedRecipes.set(saves);
  }
}
