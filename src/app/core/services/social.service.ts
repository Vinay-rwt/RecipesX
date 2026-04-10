import { Injectable, inject } from '@angular/core';
import {
  Firestore, doc, getDoc, setDoc, deleteDoc,
  updateDoc, increment, collection, getDocs,
} from '@angular/fire/firestore';

@Injectable({ providedIn: 'root' })
export class SocialService {
  private firestore = inject(Firestore);

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

  async toggleSave(userId: string, recipeId: string): Promise<boolean> {
    const saveRef = doc(this.firestore, `users/${userId}/saves/${recipeId}`);
    const recipeRef = doc(this.firestore, `recipes/${recipeId}`);
    const exists = (await getDoc(saveRef)).exists();

    if (exists) {
      await deleteDoc(saveRef);
      await updateDoc(recipeRef, { saveCount: increment(-1) });
      return false;
    } else {
      await setDoc(saveRef, { createdAt: new Date() });
      await updateDoc(recipeRef, { saveCount: increment(1) });
      return true;
    }
  }

  async isLiked(userId: string, recipeId: string): Promise<boolean> {
    const likeRef = doc(this.firestore, `users/${userId}/likes/${recipeId}`);
    return (await getDoc(likeRef)).exists();
  }

  async isSaved(userId: string, recipeId: string): Promise<boolean> {
    const saveRef = doc(this.firestore, `users/${userId}/saves/${recipeId}`);
    return (await getDoc(saveRef)).exists();
  }

  async getUserLikes(userId: string): Promise<Set<string>> {
    const likesRef = collection(this.firestore, `users/${userId}/likes`);
    const snapshot = await getDocs(likesRef);
    return new Set(snapshot.docs.map(d => d.id));
  }

  async getUserSaves(userId: string): Promise<Set<string>> {
    const savesRef = collection(this.firestore, `users/${userId}/saves`);
    const snapshot = await getDocs(savesRef);
    return new Set(snapshot.docs.map(d => d.id));
  }
}
