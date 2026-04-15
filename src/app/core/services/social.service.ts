import { Injectable, inject } from '@angular/core';
import {
  Firestore, doc, getDoc, setDoc, deleteDoc,
  updateDoc, increment, collection, getDocs,
} from '@angular/fire/firestore';

@Injectable({ providedIn: 'root' })
export class SocialService {
  private firestore = inject(Firestore);

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

  // ── Saves — uncategorized bucket (users/{uid}/saves/{recipeId}) ──────────
  // Used only when the user saves without choosing a collection.

  async saveToUncategorized(userId: string, recipeId: string): Promise<void> {
    await setDoc(doc(this.firestore, `users/${userId}/saves/${recipeId}`), { createdAt: new Date() });
    await updateDoc(doc(this.firestore, `recipes/${recipeId}`), { saveCount: increment(1) });
  }

  async unsaveUncategorized(userId: string, recipeId: string): Promise<void> {
    await deleteDoc(doc(this.firestore, `users/${userId}/saves/${recipeId}`));
    await updateDoc(doc(this.firestore, `recipes/${recipeId}`), { saveCount: increment(-1) });
  }

  /** Increment saveCount only — used when saving into a collection (no saves/ doc written). */
  async incrementSaveCount(recipeId: string): Promise<void> {
    await updateDoc(doc(this.firestore, `recipes/${recipeId}`), { saveCount: increment(1) });
  }

  /** Decrement saveCount only — used when removing from a collection. */
  async decrementSaveCount(recipeId: string): Promise<void> {
    await updateDoc(doc(this.firestore, `recipes/${recipeId}`), { saveCount: increment(-1) });
  }

  /** True if recipe exists in the flat saves/ subcollection (uncategorized). */
  async isUncategorizedSave(userId: string, recipeId: string): Promise<boolean> {
    return (await getDoc(doc(this.firestore, `users/${userId}/saves/${recipeId}`))).exists();
  }

  /** All recipe IDs in the uncategorized saves bucket. */
  async getUserSaves(userId: string): Promise<Set<string>> {
    const snap = await getDocs(collection(this.firestore, `users/${userId}/saves`));
    return new Set(snap.docs.map(d => d.id));
  }
}
