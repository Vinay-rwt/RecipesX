import { Injectable, inject, signal } from '@angular/core';
import {
  Firestore,
  collection,
  collectionData,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  arrayUnion,
  arrayRemove,
  serverTimestamp,
  query,
  orderBy,
  getDocs,
} from '@angular/fire/firestore';
import { Collection } from '../models/collection.model';

@Injectable({ providedIn: 'root' })
export class CollectionService {
  private firestore = inject(Firestore);

  private _collections = signal<Collection[]>([]);
  private _loading = signal(false);
  private _error = signal<string | null>(null);

  readonly collections = this._collections.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();

  async loadCollections(userId: string): Promise<void> {
    this._loading.set(true);
    this._error.set(null);
    try {
      const ref = collection(this.firestore, `users/${userId}/collections`);
      const q = query(ref, orderBy('updatedAt', 'desc'));
      const snap = await getDocs(q);
      const cols: Collection[] = snap.docs.map(d => ({
        id: d.id,
        ...(d.data() as Omit<Collection, 'id'>),
      }));
      this._collections.set(cols);
    } catch (e: any) {
      this._error.set('Failed to load collections');
    } finally {
      this._loading.set(false);
    }
  }

  async createCollection(userId: string, name: string, emoji: string): Promise<string> {
    const ref = collection(this.firestore, `users/${userId}/collections`);
    const now = new Date();
    const docRef = await addDoc(ref, {
      userId,
      name,
      emoji,
      recipeIds: [],
      recipeCount: 0,
      createdAt: now,
      updatedAt: now,
    });
    // Optimistic update
    const newCol: Collection = {
      id: docRef.id,
      userId,
      name,
      emoji,
      recipeIds: [],
      recipeCount: 0,
      createdAt: now,
      updatedAt: now,
    };
    this._collections.update(cols => [newCol, ...cols]);
    return docRef.id;
  }

  async deleteCollection(userId: string, collectionId: string): Promise<void> {
    const ref = doc(this.firestore, `users/${userId}/collections/${collectionId}`);
    await deleteDoc(ref);
    this._collections.update(cols => cols.filter(c => c.id !== collectionId));
  }

  async addRecipeToCollection(
    userId: string,
    collectionId: string,
    recipeId: string,
    coverPhotoURL?: string,
  ): Promise<void> {
    const ref = doc(this.firestore, `users/${userId}/collections/${collectionId}`);
    const updates: any = {
      recipeIds: arrayUnion(recipeId),
      updatedAt: new Date(),
    };
    // Set cover photo from first recipe added
    const existing = this._collections().find(c => c.id === collectionId);
    if (existing && existing.recipeCount === 0 && coverPhotoURL) {
      updates['coverPhotoURL'] = coverPhotoURL;
    }
    await updateDoc(ref, updates);

    // Optimistic update
    this._collections.update(cols =>
      cols.map(c => {
        if (c.id !== collectionId) return c;
        const alreadyIn = c.recipeIds.includes(recipeId);
        if (alreadyIn) return c;
        return {
          ...c,
          recipeIds: [...c.recipeIds, recipeId],
          recipeCount: c.recipeCount + 1,
          coverPhotoURL: c.recipeCount === 0 && coverPhotoURL ? coverPhotoURL : c.coverPhotoURL,
          updatedAt: new Date(),
        };
      })
    );
  }

  async removeRecipeFromCollection(
    userId: string,
    collectionId: string,
    recipeId: string,
  ): Promise<void> {
    const ref = doc(this.firestore, `users/${userId}/collections/${collectionId}`);
    await updateDoc(ref, {
      recipeIds: arrayRemove(recipeId),
      updatedAt: new Date(),
    });
    this._collections.update(cols =>
      cols.map(c => {
        if (c.id !== collectionId) return c;
        const newIds = c.recipeIds.filter(id => id !== recipeId);
        return {
          ...c,
          recipeIds: newIds,
          recipeCount: Math.max(0, c.recipeCount - 1),
          updatedAt: new Date(),
        };
      })
    );
  }

  clear(): void {
    this._collections.set([]);
    this._error.set(null);
  }
}
