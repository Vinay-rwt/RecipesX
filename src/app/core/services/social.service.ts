import { Injectable, inject, signal } from '@angular/core';
import {
  Firestore, doc, getDoc, setDoc, deleteDoc,
  updateDoc, increment, collection, getDocs,
} from '@angular/fire/firestore';

@Injectable({ providedIn: 'root' })
export class SocialService {
  private firestore = inject(Firestore);

  // Reactive set of uncategorized-saved recipe IDs — stays live across navigation
  private _uncategorizedSaveIds = signal<Set<string>>(new Set());
  readonly uncategorizedSaveIds = this._uncategorizedSaveIds.asReadonly();

  // ── Likes ────────────────────────────────────────────────────────────────

  async toggleLike(userId: string, recipeId: string): Promise<boolean> {
    const likeRef = doc(this.firestore, `users/${userId}/likes/${recipeId}`);
    const recipeRef = doc(this.firestore, `recipes/${recipeId}`);
    const exists = (await getDoc(likeRef)).exists();
    if (exists) {
      await deleteDoc(likeRef);
      await updateDoc(recipeRef, { likeCount: increment(-1) });
      return false;
    } else {
      await setDoc(likeRef, { createdAt: new Date() });
      await updateDoc(recipeRef, { likeCount: increment(1) });
      return true;
    }
  }

  async isLiked(userId: string, recipeId: string): Promise<boolean> {
    return (await getDoc(doc(this.firestore, `users/${userId}/likes/${recipeId}`))).exists();
  }

  async getUserLikes(userId: string): Promise<Set<string>> {
    const snap = await getDocs(collection(this.firestore, `users/${userId}/likes`));
    return new Set(snap.docs.map(d => d.id));
  }

  // ── Saves — uncategorized bucket ─────────────────────────────────────────

  async saveToUncategorized(userId: string, recipeId: string): Promise<void> {
    await setDoc(doc(this.firestore, `users/${userId}/saves/${recipeId}`), { createdAt: new Date() });
    await updateDoc(doc(this.firestore, `recipes/${recipeId}`), { saveCount: increment(1) });
    // Keep signal in sync
    this._uncategorizedSaveIds.update(s => new Set([...s, recipeId]));
  }

  async unsaveUncategorized(userId: string, recipeId: string): Promise<void> {
    await deleteDoc(doc(this.firestore, `users/${userId}/saves/${recipeId}`));
    await updateDoc(doc(this.firestore, `recipes/${recipeId}`), { saveCount: increment(-1) });
    // Keep signal in sync
    this._uncategorizedSaveIds.update(s => { const n = new Set(s); n.delete(recipeId); return n; });
  }

  async incrementSaveCount(recipeId: string): Promise<void> {
    await updateDoc(doc(this.firestore, `recipes/${recipeId}`), { saveCount: increment(1) });
  }

  async decrementSaveCount(recipeId: string): Promise<void> {
    await updateDoc(doc(this.firestore, `recipes/${recipeId}`), { saveCount: increment(-1) });
  }

  async isUncategorizedSave(userId: string, recipeId: string): Promise<boolean> {
    return (await getDoc(doc(this.firestore, `users/${userId}/saves/${recipeId}`))).exists();
  }

  /** Loads uncategorized saves from Firestore and seeds the reactive signal. */
  async getUserSaves(userId: string): Promise<Set<string>> {
    const snap = await getDocs(collection(this.firestore, `users/${userId}/saves`));
    const ids = new Set<string>(snap.docs.map(d => d.id));
    this._uncategorizedSaveIds.set(ids);
    return ids;
  }
}
