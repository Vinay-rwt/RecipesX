import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import {
  Firestore, collection, getDocs,
} from '@angular/fire/firestore';
import { ViewWillEnter } from '@ionic/angular';
import { AuthService } from '../../../core/services/auth.service';
import { UserProfile } from '../../../core/models/user.model';

@Component({
  selector: 'app-follow-list',
  templateUrl: './follow-list.page.html',
  styleUrls: ['./follow-list.page.scss'],
  standalone: false,
})
export class FollowListPage implements ViewWillEnter {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private firestore = inject(Firestore);
  private authService = inject(AuthService);

  uid = signal('');
  type = signal<'followers' | 'following'>('followers');
  users = signal<UserProfile[]>([]);
  loading = signal(true);

  get title(): string {
    return this.type() === 'followers' ? 'Followers' : 'Following';
  }

  async ionViewWillEnter(): Promise<void> {
    const uid = this.route.snapshot.paramMap.get('uid')!;
    const type = (this.route.snapshot.paramMap.get('type') ?? 'followers') as 'followers' | 'following';
    this.uid.set(uid);
    this.type.set(type);
    this.loading.set(true);
    this.users.set([]);
    await this._loadUsers(uid, type);
    this.loading.set(false);
  }

  goToProfile(user: UserProfile): void {
    this.router.navigate(['/tabs/feed/user', user.uid]);
  }

  private async _loadUsers(uid: string, type: 'followers' | 'following'): Promise<void> {
    const subCol = collection(this.firestore, `users/${uid}/${type}`);
    const snap = await getDocs(subCol);
    if (snap.empty) return;

    // IDs stored as document IDs in the subcollection
    const uids = snap.docs.map(d => d.id);
    const profiles = await Promise.all(uids.map(id => this.authService.getUserProfile(id)));
    this.users.set(profiles.filter((p): p is UserProfile => p !== null));
  }
}
