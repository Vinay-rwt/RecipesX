import { Injectable, inject, signal } from '@angular/core';
import {
  Firestore, doc, getDoc, setDoc, deleteDoc,
  collection, getDocs, updateDoc, increment, writeBatch,
} from '@angular/fire/firestore';

@Injectable({ providedIn: 'root' })
export class FollowService {
  private firestore = inject(Firestore);

  private _followingIds = signal<Set<string>>(new Set());
  readonly followingIds = this._followingIds.asReadonly();

  async toggleFollow(currentUserId: string, targetUserId: string): Promise<boolean> {
    const followingRef = doc(this.firestore, `users/${currentUserId}/following/${targetUserId}`);
    const followerRef  = doc(this.firestore, `users/${targetUserId}/followers/${currentUserId}`);
    const currentUserRef = doc(this.firestore, `users/${currentUserId}`);
    const targetUserRef  = doc(this.firestore, `users/${targetUserId}`);

    const exists = (await getDoc(followingRef)).exists();
    const batch = writeBatch(this.firestore);

    if (exists) {
      batch.delete(followingRef);
      batch.delete(followerRef);
      batch.update(currentUserRef, { followingCount: increment(-1), updatedAt: new Date() });
      batch.update(targetUserRef,  { followersCount: increment(-1), updatedAt: new Date() });
      await batch.commit();
      this._followingIds.update(s => { const n = new Set(s); n.delete(targetUserId); return n; });
      return false;
    } else {
      batch.set(followingRef, { createdAt: new Date() });
      batch.set(followerRef,  { createdAt: new Date() });
      batch.update(currentUserRef, { followingCount: increment(1), updatedAt: new Date() });
      batch.update(targetUserRef,  { followersCount: increment(1), updatedAt: new Date() });
      await batch.commit();
      this._followingIds.update(s => new Set([...s, targetUserId]));
      return true;
    }
  }

  async isFollowing(currentUserId: string, targetUserId: string): Promise<boolean> {
    return (await getDoc(doc(this.firestore, `users/${currentUserId}/following/${targetUserId}`))).exists();
  }

  async loadFollowing(userId: string): Promise<Set<string>> {
    const snap = await getDocs(collection(this.firestore, `users/${userId}/following`));
    const ids = new Set<string>(snap.docs.map(d => d.id));
    this._followingIds.set(ids);
    return ids;
  }

  async getFollowers(userId: string): Promise<string[]> {
    const snap = await getDocs(collection(this.firestore, `users/${userId}/followers`));
    return snap.docs.map(d => d.id);
  }
}
