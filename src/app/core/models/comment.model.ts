export type VoteValue = 1 | -1;

export interface Comment {
  id: string;
  recipeId: string;
  authorId: string;
  authorName: string;
  body: string;
  score: number;
  upvotes: number;
  downvotes: number;
  parentId: string | null;
  createdAt: Date;
}
