import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Auth } from '@angular/fire/auth';
import {
  Firestore, collection, query, where, orderBy, getDocs,
} from '@angular/fire/firestore';
import { ToastController, ViewWillEnter } from '@ionic/angular';
import { FollowService } from '../../../core/services/follow.service';
import { AuthService } from '../../../core/services/auth.service';
import { UserProfile } from '../../../core/models/user.model';
import { Recipe } from '../../../core/models/recipe.model';

@Component({
  selector: 'app-user-profile',
  templateUrl: './user-profile.page.html',
  styleUrls: ['./user-profile.page.scss'],
  standalone: false,
})
export class UserProfilePage implements ViewWillEnter {
  private route = inject(ActivatedRoute);
  private auth = inject(Auth);
  private firestore = inject(Firestore);
  private router = inject(Router);
  readonly followService = inject(FollowService);
  private authService = inject(AuthService);
  private toastCtrl = inject(ToastController);

  targetUid = signal<string>('');
  profile = signal<UserProfile | null>(null);
  recipes = signal<Recipe[]>([]);
  isFollowing = signal(false);
  loading = signal(true);
  isOwnProfile = signal(false);

  async ionViewWillEnter(): Promise<void> {
    const uid = this.route.snapshot.paramMap.get('uid')!;
    this.targetUid.set(uid);
    const currentUid = this.auth.currentUser?.uid;
    this.isOwnProfile.set(uid === currentUid);
    this.loading.set(true);
    await Promise.all([
      this._loadProfile(uid),
      this._loadRecipes(uid),
      currentUid && uid !== currentUid
        ? this.followService.isFollowing(currentUid, uid).then(v => this.isFollowing.set(v))
        : Promise.resolve(),
    ]);
    this.loading.set(false);
  }

  async onToggleFollow(): Promise<void> {
    const currentUid = this.auth.currentUser?.uid;
    if (!currentUid) return;
    const wasFollowing = this.isFollowing();
    const delta = wasFollowing ? -1 : 1;
    this.isFollowing.set(!wasFollowing);
    this.profile.update(p => p ? { ...p, followersCount: (p.followersCount ?? 0) + delta } : p);
    try {
      await this.followService.toggleFollow(currentUid, this.targetUid());
      const name = this.profile()?.displayName ?? 'this cook';
      await this._showToast(wasFollowing ? `Unfollowed ${name}` : `Now following ${name}`);
    } catch {
      this.isFollowing.set(wasFollowing);
      this.profile.update(p => p ? { ...p, followersCount: (p.followersCount ?? 0) - delta } : p);
      await this._showToast('Something went wrong. Please try again.');
    }
  }

  private async _loadProfile(uid: string): Promise<void> {
    this.profile.set(await this.authService.getUserProfile(uid));
  }

  private async _loadRecipes(uid: string): Promise<void> {
    const q = query(
      collection(this.firestore, 'recipes'),
      where('authorId', '==', uid),
      where('status', '==', 'published'),
      orderBy('createdAt', 'desc'),
    );
    const snap = await getDocs(q);
    this.recipes.set(snap.docs.map(d => ({
      id: d.id,
      ...d.data(),
      createdAt: d.data()['createdAt']?.toDate?.() ?? new Date(),
      updatedAt: d.data()['updatedAt']?.toDate?.() ?? new Date(),
    } as Recipe)));
  }

  private async _showToast(message: string): Promise<void> {
    const toast = await this.toastCtrl.create({ message, duration: 2000, position: 'bottom' });
    await toast.present();
  }
}
