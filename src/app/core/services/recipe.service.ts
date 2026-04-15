import { Injectable, inject, signal } from '@angular/core';
import {
  Firestore,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
} from '@angular/fire/firestore';
import { Recipe, generateSearchTokens } from '../models/recipe.model';

@Injectable({ providedIn: 'root' })
export class RecipeService {
  private firestore = inject(Firestore);

  private _myRecipes = signal<Recipe[]>([]);
  private _currentRecipe = signal<Recipe | null>(null);
  private _loading = signal(false);

  readonly myRecipes = this._myRecipes.asReadonly();
  readonly currentRecipe = this._currentRecipe.asReadonly();
  readonly loading = this._loading.asReadonly();

  async createRecipe(
    recipe: Omit<Recipe, 'id' | 'createdAt' | 'updatedAt' | 'likeCount' | 'saveCount'>,
  ): Promise<string> {
    const colRef = collection(this.firestore, 'recipes');
    const docRef = doc(colRef);
    const now = new Date();
    const newRecipe: Recipe = {
      ...recipe,
      id: docRef.id,
      likeCount: 0,
      saveCount: 0,
      searchTokens: generateSearchTokens(recipe.title, recipe.tags, recipe.cuisineType),
      createdAt: now,
      updatedAt: now,
    };
    await setDoc(docRef, newRecipe);
    return docRef.id;
  }

  async updateRecipe(id: string, changes: Partial<Recipe>): Promise<void> {
    const docRef = doc(this.firestore, `recipes/${id}`);
    const updatedAt = new Date();
    const updates: Partial<Recipe> = { ...changes, updatedAt };
    if (changes.title || changes.tags || changes.cuisineType) {
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const existing = snap.data() as Recipe;
        updates.searchTokens = generateSearchTokens(
          changes.title ?? existing.title,
          changes.tags ?? existing.tags,
          changes.cuisineType ?? existing.cuisineType,
        );
      }
    }
    await updateDoc(docRef, updates as Record<string, unknown>);
    this._currentRecipe.update(r => (r?.id === id ? { ...r, ...updates } : r));
  }

  async deleteRecipe(id: string): Promise<void> {
    const docRef = doc(this.firestore, `recipes/${id}`);
    await deleteDoc(docRef);
    this._myRecipes.update(list => list.filter(r => r.id !== id));
    if (this._currentRecipe()?.id === id) {
      this._currentRecipe.set(null);
    }
  }

  async getRecipe(id: string): Promise<void> {
    this._loading.set(true);
    try {
      const docRef = doc(this.firestore, `recipes/${id}`);
      const snap = await getDoc(docRef);
      this._currentRecipe.set(snap.exists() ? (snap.data() as Recipe) : null);
    } finally {
      this._loading.set(false);
    }
  }

  async loadMyRecipes(authorId: string): Promise<void> {
    this._loading.set(true);
    try {
      const q = query(
        collection(this.firestore, 'recipes'),
        where('authorId', '==', authorId),
        orderBy('updatedAt', 'desc'),
      );
      const snap = await getDocs(q);
      this._myRecipes.set(snap.docs.map(d => d.data() as Recipe));
    } finally {
      this._loading.set(false);
    }
  }

  async publishRecipe(id: string): Promise<void> {
    await this.updateRecipe(id, { status: 'published' });
    this._myRecipes.update(list =>
      list.map(r => (r.id === id ? { ...r, status: 'published' } : r)),
    );
  }

  /** Fetch a set of recipes by their IDs (used by collection detail). Skips missing docs. */
  async getRecipesByIds(ids: string[]): Promise<Recipe[]> {
    if (!ids.length) return [];
    const fetches = ids.map(id => getDoc(doc(this.firestore, `recipes/${id}`)));
    const snaps = await Promise.all(fetches);
    return snaps
      .filter(s => s.exists())
      .map(s => ({ ...(s.data() as Recipe), id: s.id }));
  }

  clearCurrentRecipe(): void {
    this._currentRecipe.set(null);
  }
}
