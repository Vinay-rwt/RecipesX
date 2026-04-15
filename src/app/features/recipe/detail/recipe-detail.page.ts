import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Auth } from '@angular/fire/auth';
import { ActionSheetController, AlertController, ToastController, ViewWillEnter } from '@ionic/angular';
import { RecipeService } from '../../../core/services/recipe.service';
import { EquipmentConversionService } from '../../../core/services/equipment-conversion.service';
import { UserProfileService } from '../../../core/services/user-profile.service';
import { SocialService } from '../../../core/services/social.service';
import { ShareService } from '../../../core/services/share.service';
import { RecipeCardGeneratorService } from '../../../core/services/recipe-card-generator.service';
import { CommentService } from '../../../core/services/comment.service';
import { Comment, VoteValue } from '../../../core/models/comment.model';
import { getEquipmentById, EQUIPMENT_TYPES } from '../../../core/models/equipment.model';
import { Recipe } from '../../../core/models/recipe.model';
import { CollectionService } from '../../../core/services/collection.service';

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
  private alertCtrl = inject(AlertController);
  private toastCtrl = inject(ToastController);
  private commentService = inject(CommentService);
  readonly collectionService = inject(CollectionService);
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

  // ── Comment state ──────────────────────────────────────────────────────────
  private recipeId: string | null = null;
  readonly comments = signal<Comment[]>([]);
  readonly commentsLoading = signal(false);
  readonly commentError = signal<string | null>(null);
  readonly postingComment = signal(false);
  readonly replyingToId = signal<string | null>(null);
  readonly collapsedComments = signal<Set<string>>(new Set());
  readonly userVotes = signal<Map<string, VoteValue>>(new Map());

  newCommentBody = '';
  replyBody = '';

  readonly topLevelComments = computed(() => this.comments().filter(c => c.parentId === null));
  readonly totalCommentCount = computed(() => this.comments().length);

  repliesFor(parentId: string): Comment[] {
    return this.comments().filter(c => c.parentId === parentId);
  }

  get isLoggedIn(): boolean {
    return !!this.auth.currentUser;
  }
  // ──────────────────────────────────────────────────────────────────────────

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
    this.recipeId = id;
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
        // Load collections so we can check collection membership for isSaved
        await this.collectionService.loadCollections(uid);
        const [liked, uncategorizedSave] = await Promise.all([
          this.socialService.isLiked(uid, r.id),
          this.socialService.isUncategorizedSave(uid, r.id),
        ]);
        const inCollection = this.collectionService.isInAnyCollection(r.id);
        this.isLiked.set(liked);
        this.isSaved.set(uncategorizedSave || inCollection);
      }
    }

    if (id) {
      await this.loadComments();
    }
  }

  // ── Comment methods ────────────────────────────────────────────────────────

  async loadComments(): Promise<void> {
    if (!this.recipeId) return;
    this.commentsLoading.set(true);
    this.commentError.set(null);
    try {
      const loaded = await this.commentService.loadComments(this.recipeId);
      this.comments.set(loaded);

      const uid = this.auth.currentUser?.uid;
      if (uid && loaded.length > 0) {
        const votes = await this.commentService.getUserVotes(
          this.recipeId, uid, loaded.map(c => c.id)
        );
        this.userVotes.set(votes);
      }
    } catch {
      this.commentError.set('Could not load comments.');
    } finally {
      this.commentsLoading.set(false);
    }
  }

  async postComment(): Promise<void> {
    if (!this.recipeId || !this.newCommentBody.trim() || this.postingComment()) return;
    this.postingComment.set(true);
    try {
      const created = await this.commentService.addComment(this.recipeId, this.newCommentBody, null);
      this.comments.update(list => [created, ...list]);
      this.newCommentBody = '';
    } catch {
      const toast = await this.toastCtrl.create({ message: 'Failed to post comment.', duration: 2500, color: 'danger' });
      await toast.present();
    } finally {
      this.postingComment.set(false);
    }
  }

  async postReply(parentId: string): Promise<void> {
    if (!this.recipeId || !this.replyBody.trim()) return;
    try {
      const created = await this.commentService.addComment(this.recipeId, this.replyBody, parentId);
      this.comments.update(list => [...list, created]);
      this.replyBody = '';
      this.replyingToId.set(null);
    } catch {
      const toast = await this.toastCtrl.create({ message: 'Failed to post reply.', duration: 2500, color: 'danger' });
      await toast.present();
    }
  }

  async onVote(commentId: string, value: VoteValue): Promise<void> {
    if (!this.recipeId || !this.auth.currentUser) return;
    const prevVote = this.userVotes().get(commentId) ?? null;

    // Optimistic update
    this.comments.update(list => list.map(c => {
      if (c.id !== commentId) return c;
      let { score, upvotes, downvotes } = c;
      if (prevVote === value) {
        // Un-vote
        if (value === 1) { score--; upvotes--; } else { score++; downvotes--; }
      } else if (prevVote !== null) {
        // Switch vote
        if (value === 1) { score += 2; upvotes++; downvotes--; } else { score -= 2; upvotes--; downvotes++; }
      } else {
        // New vote
        if (value === 1) { score++; upvotes++; } else { score--; downvotes++; }
      }
      return { ...c, score, upvotes, downvotes };
    }));

    const newVotes = new Map(this.userVotes());
    if (prevVote === value) {
      newVotes.delete(commentId);
    } else {
      newVotes.set(commentId, value);
    }
    this.userVotes.set(newVotes);

    try {
      await this.commentService.vote(this.recipeId, commentId, value);
    } catch {
      // Revert optimistic update on failure
      await this.loadComments();
    }
  }

  toggleCollapse(commentId: string): void {
    const s = new Set(this.collapsedComments());
    if (s.has(commentId)) { s.delete(commentId); } else { s.add(commentId); }
    this.collapsedComments.set(s);
  }

  isCollapsed(commentId: string): boolean {
    return this.collapsedComments().has(commentId);
  }

  setReplyingTo(id: string | null): void {
    this.replyingToId.set(id);
    this.replyBody = '';
  }

  timeAgo(date: Date): string {
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d ago`;
    const months = Math.floor(days / 30);
    if (months < 12) return `${months}mo ago`;
    return `${Math.floor(months / 12)}y ago`;
  }

  // ──────────────────────────────────────────────────────────────────────────

  async toggleLike(): Promise<void> {
    const uid = this.auth.currentUser?.uid;
    const recipeId = this.recipe()?.id;
    if (!uid || !recipeId) return;
    const liked = await this.socialService.toggleLike(uid, recipeId);
    this.isLiked.set(liked);
  }

  async toggleSave(): Promise<void> {
    const uid = this.auth.currentUser?.uid;
    const recipe = this.recipe();
    if (!uid || !recipe?.id) return;

    if (this.isSaved()) {
      // Find where it lives and remove from exactly that place
      const collectionId = this.collectionService.findCollectionForRecipe(recipe.id);
      if (collectionId) {
        await this.collectionService.removeRecipeFromCollection(uid, collectionId, recipe.id);
        await this.socialService.decrementSaveCount(recipe.id);
      } else {
        await this.socialService.unsaveUncategorized(uid, recipe.id);
      }
      this.isSaved.set(false);
      const toast = await this.toastCtrl.create({ message: 'Removed from saves', duration: 2000, position: 'bottom' });
      await toast.present();
      return;
    }

    // Not saved → show collection picker
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
    if (collectionId) {
      // Collection save — no saves/ doc, just membership + saveCount
      await this.collectionService.addRecipeToCollection(uid, collectionId, recipe.id!, recipe.photoURLs?.[0]);
      await this.socialService.incrementSaveCount(recipe.id!);
      const colName = this.collectionService.collections().find(c => c.id === collectionId)?.name;
      const toast = await this.toastCtrl.create({ message: colName ? `Saved to "${colName}"` : 'Saved', duration: 2000, position: 'bottom' });
      await toast.present();
    } else {
      // Uncategorized save — write to saves/ bucket
      await this.socialService.saveToUncategorized(uid, recipe.id!);
      const toast = await this.toastCtrl.create({ message: 'Saved', duration: 2000, position: 'bottom' });
      await toast.present();
    }
    this.isSaved.set(true);
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
