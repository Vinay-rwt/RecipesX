import { Injectable, inject } from '@angular/core';
import {
  Firestore, collection, query, orderBy, getDocs,
  addDoc, doc, getDoc, runTransaction, serverTimestamp, deleteDoc,
} from '@angular/fire/firestore';
import { Auth } from '@angular/fire/auth';
import { Comment, VoteValue } from '../models/comment.model';

@Injectable({ providedIn: 'root' })
export class CommentService {
  private firestore = inject(Firestore);
  private auth = inject(Auth);

  async loadComments(recipeId: string): Promise<Comment[]> {
    const ref = collection(this.firestore, `recipes/${recipeId}/comments`);
    const q = query(ref, orderBy('score', 'desc'), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({
      id: d.id,
      ...d.data(),
      createdAt: d.data()['createdAt']?.toDate?.() ?? new Date(),
    } as Comment));
  }

  async addComment(recipeId: string, body: string, parentId: string | null = null): Promise<Comment> {
    const user = this.auth.currentUser;
    if (!user) throw new Error('Must be signed in to comment');

    const ref = collection(this.firestore, `recipes/${recipeId}/comments`);
    const docRef = await addDoc(ref, {
      recipeId,
      authorId: user.uid,
      authorName: user.displayName ?? 'Anonymous',
      body: body.trim(),
      score: 0,
      upvotes: 0,
      downvotes: 0,
      parentId,
      createdAt: serverTimestamp(),
    });

    return {
      id: docRef.id,
      recipeId,
      authorId: user.uid,
      authorName: user.displayName ?? 'Anonymous',
      body: body.trim(),
      score: 0,
      upvotes: 0,
      downvotes: 0,
      parentId,
      createdAt: new Date(),
    };
  }

  async vote(recipeId: string, commentId: string, value: VoteValue): Promise<void> {
    const user = this.auth.currentUser;
    if (!user) return;

    const commentRef = doc(this.firestore, `recipes/${recipeId}/comments/${commentId}`);
    const voteRef = doc(this.firestore, `recipes/${recipeId}/comments/${commentId}/votes/${user.uid}`);

    await runTransaction(this.firestore, async (tx) => {
      const voteSnap = await tx.get(voteRef);
      const commentSnap = await tx.get(commentRef);
      if (!commentSnap.exists()) return;

      const prevValue: VoteValue | null = voteSnap.exists() ? voteSnap.data()['value'] : null;

      if (prevValue === value) {
        // Same vote again — remove vote
        tx.delete(voteRef);
        if (value === 1) {
          tx.update(commentRef, { score: commentSnap.data()['score'] - 1, upvotes: commentSnap.data()['upvotes'] - 1 });
        } else {
          tx.update(commentRef, { score: commentSnap.data()['score'] + 1, downvotes: commentSnap.data()['downvotes'] - 1 });
        }
      } else if (prevValue !== null) {
        // Switching vote direction
        tx.set(voteRef, { value });
        if (value === 1) {
          tx.update(commentRef, {
            score: commentSnap.data()['score'] + 2,
            upvotes: commentSnap.data()['upvotes'] + 1,
            downvotes: commentSnap.data()['downvotes'] - 1,
          });
        } else {
          tx.update(commentRef, {
            score: commentSnap.data()['score'] - 2,
            upvotes: commentSnap.data()['upvotes'] - 1,
            downvotes: commentSnap.data()['downvotes'] + 1,
          });
        }
      } else {
        // New vote
        tx.set(voteRef, { value });
        if (value === 1) {
          tx.update(commentRef, { score: commentSnap.data()['score'] + 1, upvotes: commentSnap.data()['upvotes'] + 1 });
        } else {
          tx.update(commentRef, { score: commentSnap.data()['score'] - 1, downvotes: commentSnap.data()['downvotes'] + 1 });
        }
      }
    });
  }

  async getUserVotes(recipeId: string, userId: string, commentIds: string[]): Promise<Map<string, VoteValue>> {
    const results = await Promise.all(
      commentIds.map(id =>
        getDoc(doc(this.firestore, `recipes/${recipeId}/comments/${id}/votes/${userId}`))
          .then(snap => ({ id, value: snap.exists() ? (snap.data()['value'] as VoteValue) : null }))
      )
    );
    const map = new Map<string, VoteValue>();
    for (const r of results) {
      if (r.value !== null) map.set(r.id, r.value);
    }
    return map;
  }
}
