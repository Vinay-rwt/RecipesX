import { Injectable, inject, signal } from '@angular/core';
import {
  Firestore, doc, getDoc, collection, getDocs,
  increment, runTransaction, serverTimestamp,
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

    const nowFollowing = await runTransaction(this.firestore, async (tx) => {
      const exists = (await tx.get(followingRef)).exists();
      if (exists) {
        tx.delete(followingRef);
        tx.delete(followerRef);
        tx.update(currentUserRef, { followingCount: increment(-1), updatedAt: serverTimestamp() });
        tx.update(targetUserRef,  { followersCount: increment(-1), updatedAt: serverTimestamp() });
        return false;
      }
      tx.set(followingRef, { createdAt: serverTimestamp() });
      tx.set(followerRef,  { createdAt: serverTimestamp() });
      tx.update(currentUserRef, { followingCount: increment(1), updatedAt: serverTimestamp() });
      tx.update(targetUserRef,  { followersCount: increment(1), updatedAt: serverTimestamp() });
      return true;
    });

    this._followingIds.update(s => {
      const n = new Set(s);
      if (nowFollowing) n.add(targetUserId); else n.delete(targetUserId);
      return n;
    });
    return nowFollowing;
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

  clearOnLogout(): void {
    this._followingIds.set(new Set());
  }
}
