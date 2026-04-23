import { Injectable, inject, signal } from '@angular/core';
import {
  Firestore, collection, query, where, orderBy, limit,
  startAfter, getDocs, QueryDocumentSnapshot, DocumentData,
} from '@angular/fire/firestore';
import { Recipe } from '../models/recipe.model';

@Injectable({ providedIn: 'root' })
export class FollowingFeedService {
  private firestore = inject(Firestore);

  private _recipes = signal<Recipe[]>([]);
  private _loading = signal(false);
  private _hasMore = signal(true);
  private _error = signal<string | null>(null);
  private _lastDoc: QueryDocumentSnapshot<DocumentData> | null = null;
  private _followingIds: string[] = [];

  readonly recipes = this._recipes.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly hasMore = this._hasMore.asReadonly();
  readonly error = this._error.asReadonly();

  readonly PAGE_SIZE = 10;

  setFollowingIds(ids: string[]): void {
    this._followingIds = ids;
  }

  async loadInitial(): Promise<void> {
    this._recipes.set([]);
    this._lastDoc = null;
    this._hasMore.set(true);
    this._error.set(null);
    await this._fetchPage();
  }

  async loadMore(): Promise<void> {
    if (!this._hasMore() || this._loading()) return;
    await this._fetchPage();
  }

  patchRecipeCount(recipeId: string, field: 'likeCount' | 'saveCount', delta: 1 | -1): void {
    this._recipes.update(list =>
      list.map(r =>
        r.id === recipeId ? { ...r, [field]: Math.max(0, (r[field] ?? 0) + delta) } : r
      )
    );
  }

  private async _fetchPage(): Promise<void> {
    if (this._followingIds.length === 0) {
      this._hasMore.set(false);
      return;
    }
    this._loading.set(true);
    this._error.set(null);
    try {
      // Split into chunks of 30 (Firestore 'in' limit), run in parallel
      const chunks: string[][] = [];
      for (let i = 0; i < this._followingIds.length; i += 30) {
        chunks.push(this._followingIds.slice(i, i + 30));
      }

      const recipesRef = collection(this.firestore, 'recipes');
      const snapshots = await Promise.all(chunks.map(chunk => {
        const constraints: any[] = [
          where('authorId', 'in', chunk),
          where('status', '==', 'published'),
          orderBy('createdAt', 'desc'),
        ];
        if (this._lastDoc) constraints.push(startAfter(this._lastDoc));
        constraints.push(limit(this.PAGE_SIZE));
        return getDocs(query(recipesRef, ...constraints));
      }));

      // Merge all chunk results, sort by createdAt desc, take PAGE_SIZE
      const allDocs = snapshots.flatMap(s => s.docs);
      allDocs.sort((a, b) => {
        const aTime = (a.data()['createdAt']?.toMillis?.() as number) ?? 0;
        const bTime = (b.data()['createdAt']?.toMillis?.() as number) ?? 0;
        return bTime - aTime;
      });
      const pageDocs = allDocs.slice(0, this.PAGE_SIZE);

      const newRecipes = pageDocs.map(d => ({
        id: d.id,
        ...d.data(),
        createdAt: d.data()['createdAt']?.toDate?.() ?? new Date(),
        updatedAt: d.data()['updatedAt']?.toDate?.() ?? new Date(),
      } as Recipe));

      this._recipes.update(existing => [...existing, ...newRecipes]);

      if (pageDocs.length > 0) {
        this._lastDoc = pageDocs[pageDocs.length - 1];
      }
      if (pageDocs.length < this.PAGE_SIZE) {
        this._hasMore.set(false);
      }
    } catch {
      this._error.set('Failed to load recipes. Pull down to retry.');
    } finally {
      this._loading.set(false);
    }
  }
}
