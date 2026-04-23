export interface Collection {
  id?: string;
  userId: string;
  name: string;
  emoji: string;
  recipeIds: string[];
  recipeCount: number;
  coverPhotoURL?: string;
  createdAt: Date;
  updatedAt: Date;
}
