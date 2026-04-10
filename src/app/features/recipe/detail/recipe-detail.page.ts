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
import { CommentService } from '../../../core/services/comment.service';
import { Comment, VoteValue } from '../../../core/models/comment.model';
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
  private commentService = inject(CommentService);
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
        const [liked, saved] = await Promise.all([
          this.socialService.isLiked(uid, r.id),
          this.socialService.isSaved(uid, r.id),
        ]);
        this.isLiked.set(liked);
        this.isSaved.set(saved);
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
