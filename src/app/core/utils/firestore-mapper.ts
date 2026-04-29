import { DocumentSnapshot } from '@angular/fire/firestore';
import { Recipe } from '../models/recipe.model';
import { Collection } from '../models/collection.model';

type WithToDate = { toDate?: () => Date };

function tsToDate(value: unknown): Date {
  return (value as WithToDate)?.toDate?.() ?? new Date();
}

export function mapRecipeDoc(snap: DocumentSnapshot): Recipe {
  const data = snap.data() as Recipe;
  return {
    ...data,
    id: snap.id,
    createdAt: tsToDate(data.createdAt),
    updatedAt: tsToDate(data.updatedAt),
  };
}

export function mapCollectionDoc(snap: DocumentSnapshot): Collection {
  const data = snap.data() as Omit<Collection, 'id'>;
  const recipeIds: string[] = (data as { recipeIds?: string[] }).recipeIds ?? [];
  return {
    ...data,
    id: snap.id,
    recipeIds,
    recipeCount: recipeIds.length,
    createdAt: tsToDate(data.createdAt),
    updatedAt: tsToDate(data.updatedAt),
  };
}
