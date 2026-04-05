import { Injectable, inject, signal } from '@angular/core';
import {
  Firestore, collection, query, where, orderBy, limit,
  startAfter, getDocs, QueryDocumentSnapshot, DocumentData,
} from '@angular/fire/firestore';
import { Recipe } from '../models/recipe.model';

export interface FeedFilters {
  cuisineType?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  searchQuery?: string;
}

@Injectable({ providedIn: 'root' })
export class FeedService {
  private firestore = inject(Firestore);

  private _recipes = signal<Recipe[]>([]);
  private _loading = signal(false);
  private _hasMore = signal(true);
  private _lastDoc: QueryDocumentSnapshot<DocumentData> | null = null;
  private _filters = signal<FeedFilters>({});

  readonly recipes = this._recipes.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly hasMore = this._hasMore.asReadonly();
  readonly filters = this._filters.asReadonly();

  readonly PAGE_SIZE = 10;

  async loadInitial(): Promise<void> {
    this._recipes.set([]);
    this._lastDoc = null;
    this._hasMore.set(true);
    await this._fetchPage();
  }

  async loadMore(): Promise<void> {
    if (!this._hasMore() || this._loading()) return;
    await this._fetchPage();
  }

  setFilters(filters: FeedFilters): void {
    this._filters.set(filters);
    this.loadInitial();
  }

  resetFilters(): void {
    this._filters.set({});
    this.loadInitial();
  }

  private async _fetchPage(): Promise<void> {
    this._loading.set(true);
    try {
      const filters = this._filters();
      const recipesRef = collection(this.firestore, 'recipes');

      const constraints: any[] = [
        where('status', '==', 'published'),
        orderBy('createdAt', 'desc'),
        limit(this.PAGE_SIZE),
      ];

      if (filters.cuisineType) {
        constraints.unshift(where('cuisineType', '==', filters.cuisineType));
      }
      if (filters.difficulty) {
        constraints.unshift(where('difficulty', '==', filters.difficulty));
      }
      if (filters.searchQuery) {
        const tokens = filters.searchQuery.toLowerCase().split(/\s+/).filter(t => t.length > 1).slice(0, 10);
        if (tokens.length) {
          constraints.unshift(where('searchTokens', 'array-contains-any', tokens));
        }
      }

      if (this._lastDoc) {
        constraints.push(startAfter(this._lastDoc));
      }

      const q = query(recipesRef, ...constraints);
      const snapshot = await getDocs(q);

      const newRecipes = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data()['createdAt']?.toDate?.() ?? new Date(),
        updatedAt: doc.data()['updatedAt']?.toDate?.() ?? new Date(),
      } as Recipe));

      this._recipes.update(existing => [...existing, ...newRecipes]);

      if (snapshot.docs.length > 0) {
        this._lastDoc = snapshot.docs[snapshot.docs.length - 1];
      }
      if (snapshot.docs.length < this.PAGE_SIZE) {
        this._hasMore.set(false);
      }
    } finally {
      this._loading.set(false);
    }
  }
}
