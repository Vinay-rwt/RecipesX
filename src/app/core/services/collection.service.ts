import { Injectable, inject, signal } from '@angular/core';
import {
  Firestore,
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  arrayUnion,
  arrayRemove,
  increment,
  query,
  orderBy,
  getDocs,
  serverTimestamp,
} from '@angular/fire/firestore';
import { Collection } from '../models/collection.model';
import { mapCollectionDoc } from '../utils/firestore-mapper';

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
      this._collections.set(snap.docs.map(mapCollectionDoc));
    } catch {
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
    const existing = this._collections().find(c => c.id === collectionId);
    if (!existing) return;

    // Guard: already in collection
    if (existing.recipeIds.includes(recipeId)) return;

    const newIds = [...existing.recipeIds, recipeId];
    const updates: Record<string, unknown> = {
      recipeIds: arrayUnion(recipeId),
      recipeCount: increment(1),
      updatedAt: serverTimestamp(),
    };
    if (existing.recipeCount === 0 && coverPhotoURL) {
      updates['coverPhotoURL'] = coverPhotoURL;
    }

    await updateDoc(doc(this.firestore, `users/${userId}/collections/${collectionId}`), updates);

    // Optimistic local update
    this._collections.update(cols =>
      cols.map(c => {
        if (c.id !== collectionId) return c;
        return {
          ...c,
          recipeIds: newIds,
          recipeCount: newIds.length,
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
    const existing = this._collections().find(c => c.id === collectionId);
    if (!existing) return;
    // Guard: not in collection — avoid spurious decrement
    if (!existing.recipeIds.includes(recipeId)) return;

    const newIds = existing.recipeIds.filter(id => id !== recipeId);

    await updateDoc(doc(this.firestore, `users/${userId}/collections/${collectionId}`), {
      recipeIds: arrayRemove(recipeId),
      recipeCount: increment(-1),
      updatedAt: serverTimestamp(),
    });

    this._collections.update(cols =>
      cols.map(c => {
        if (c.id !== collectionId) return c;
        return { ...c, recipeIds: newIds, recipeCount: newIds.length, updatedAt: new Date() };
      })
    );
  }

  /** Returns the collection ID that contains this recipe, or null if none. */
  findCollectionForRecipe(recipeId: string): string | null {
    return this._collections().find(c => c.recipeIds.includes(recipeId))?.id ?? null;
  }

  /** True if the recipe is in any loaded collection. */
  isInAnyCollection(recipeId: string): boolean {
    return this._collections().some(c => c.recipeIds.includes(recipeId));
  }

  clear(): void {
    this._collections.set([]);
    this._error.set(null);
  }

  clearOnLogout(): void {
    this.clear();
  }
}
