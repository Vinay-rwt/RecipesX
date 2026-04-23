# Phase 13: Follow Users + Following Feed

**Branch:** `feature/phase13-follow-feed` (create from `main`)
**Goal:** Users can follow other cooks. A "Following" tab on the feed shows only recipes from followed authors.

---

## Architecture Decisions

### Data Model: Subcollections (not arrays on user doc)
Use `users/{uid}/following/{followedUid}` and `users/{uid}/followers/{followerUid}` subcollections — same pattern as `likes` and `saves` already in the app. Do NOT put `following: string[]` on the `UserProfile` doc (unbounded array, Firestore 1MB doc limit, no easy pagination).

Store follower/following **counts** on the `UserProfile` doc (`followingCount`, `followersCount`) for display — updated atomically via `increment()` on toggle, same pattern as `likeCount`/`saveCount` on recipes.

### Following Feed: batch `authorId in [...]` queries, merge client-side
Firestore v9 supports `where('authorId', 'in', [...])` with up to **30 values**. When following > 30 users, split IDs into batches of 30, run queries in parallel, and merge results client-side sorted by `createdAt desc`. This is ~20 extra lines but avoids silent data loss from a naive `slice(0, 30)`. MVP implements full batch-merge.

### User Profile Page: Routed, not modal
Other users' profiles are viewed at `/tabs/feed/user/:uid` (child of feed tab). Own profile stays at `/tabs/profile`. This mirrors how most social apps handle it — tap author chip on recipe card → navigate to author's public profile.

### FollowService: New service (not added to SocialService)
SocialService handles recipe interactions (likes, saves). Follow is a user-to-user interaction — keep concerns separate.

### FollowingFeedService: New service (not extending FeedService)
FollowingFeedService duplicates the pagination pattern from FeedService but with a different base query (`authorId in followingIds`). Duplication is acceptable — shared base class would add complexity for little gain.

---

## Phase 0: Documentation Discovery (DONE — embedded below)

**Confirmed APIs from codebase:**

```typescript
// Angular Fire Firestore (from feed.service.ts:1-5)
import { Firestore, collection, query, where, orderBy, limit,
  startAfter, getDocs, QueryDocumentSnapshot, DocumentData,
  doc, getDoc, setDoc, deleteDoc, updateDoc, increment,
  writeBatch } from '@angular/fire/firestore';

// Ionic (from feed.page.ts imports)
import { ViewWillEnter, ToastController, ActionSheetController } from '@ionic/angular';

// Angular signals (from social.service.ts:1)
import { Injectable, inject, signal } from '@angular/core';
```

**Firestore `in` operator** — supports up to 30 values per query. For > 30, run parallel queries in batches of 30 and merge.

**Existing signal pattern** (from `social.service.ts`):
```typescript
private _state = signal<Set<string>>(new Set());
readonly state = this._state.asReadonly();
```

**Existing toggle+writeBatch pattern** — follow toggle must use `writeBatch` (unlike likes/saves which do two separate awaits). Both the subcollection entries and both count increments must commit atomically.

**Existing pagination pattern** (from `feed.service.ts:65-118`):
```typescript
const constraints: any[] = [
  where('status', '==', 'published'),
  orderBy('createdAt', 'desc'),
];
if (this._lastDoc) constraints.push(startAfter(this._lastDoc));
constraints.push(limit(this.PAGE_SIZE));
const q = query(recipesRef, ...constraints);
const snapshot = await getDocs(q);
```

**Existing lazy-load routing** (from `profile-routing.module.ts`):
```typescript
{
  path: 'user/:uid',
  loadChildren: () =>
    import('./user-profile/user-profile.module').then(m => m.UserProfilePageModule),
}
```

**Existing module pattern** (from `collections.module.ts`):
```typescript
@NgModule({
  imports: [CommonModule, IonicModule, RouterModule.forChild(routes), SharedModule],
  declarations: [MyPage],
})
```

**Feed routing file** — `src/app/tabs/feed/feed-routing.module.ts` exports `FeedPageRoutingModule`. Routes array currently has only `{ path: '', component: FeedPage }` — child route for user profile added here.

**`firestore.indexes.json`** — file already exists at project root with 4 existing indexes. Append to `indexes` array, do not replace.

---

## Step 1: Data Model + UserProfile Extension

**Files to modify/create:**
- `src/app/core/models/user.model.ts`
- `src/app/core/models/follow.model.ts` (new)

### `user.model.ts` — add follow counts

```typescript
export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  photoURL: string | null;
  equipment: string[];
  measurementSystem: 'metric' | 'imperial';
  temperatureUnit: 'celsius' | 'fahrenheit';
  onboardingComplete: boolean;
  followingCount: number;   // ADD — default 0 for new users
  followersCount: number;   // ADD — default 0 for new users
  createdAt: Date;
  updatedAt: Date;
}
```

**Important:** Existing user docs in Firestore lack these fields and will read as `undefined`. Always use `profile.followingCount ?? 0` and `profile.followersCount ?? 0` everywhere — in templates, services, and the UserProfilePage. Never assume the field exists.

### `follow.model.ts` — follow subcollection entry

```typescript
export interface FollowEntry {
  createdAt: Date;
}
// Stored at users/{uid}/following/{followedUid} and users/{uid}/followers/{followerUid}
```

**Verification:**
- [ ] `ng build` passes with new model fields

---

## Step 1.5: AuthService — Initialize Follow Counts for New Users

**File to modify:** `src/app/core/services/auth.service.ts`

`createUserDoc()` (line 88) currently creates the UserProfile without `followingCount`/`followersCount`. New users created after this phase would be missing these fields, causing `undefined` reads.

Add to the `profile` object in `createUserDoc()`:
```typescript
const profile: UserProfile = {
  // existing fields...
  followingCount: 0,   // ADD
  followersCount: 0,   // ADD
  createdAt: new Date(),
  updatedAt: new Date(),
};
```

**Note:** Existing users are handled by the `?? 0` fallback everywhere. No Firestore backfill script needed — the defensive read pattern covers it.

**Verification:**
- [ ] Register a new user → Firestore doc has `followingCount: 0` and `followersCount: 0`

---

## Step 2: FollowService

**File to create:** `src/app/core/services/follow.service.ts`

**Pattern:** Mirror `SocialService` — subcollection toggle + `increment()` on user doc counts. Key difference: use `writeBatch` (not two separate `await`s) so both subcollection entries and both count updates are atomic.

```typescript
@Injectable({ providedIn: 'root' })
export class FollowService {
  private firestore = inject(Firestore);

  // Reactive set of followed user IDs — stays live across navigation
  private _followingIds = signal<Set<string>>(new Set());
  readonly followingIds = this._followingIds.asReadonly();

  // Toggle follow — returns true if now following, false if unfollowed
  async toggleFollow(currentUserId: string, targetUserId: string): Promise<boolean> {
    const followingRef = doc(this.firestore, `users/${currentUserId}/following/${targetUserId}`);
    const followerRef  = doc(this.firestore, `users/${targetUserId}/followers/${currentUserId}`);
    const currentUserRef = doc(this.firestore, `users/${currentUserId}`);
    const targetUserRef  = doc(this.firestore, `users/${targetUserId}`);

    const exists = (await getDoc(followingRef)).exists();
    const batch = writeBatch(this.firestore);

    if (exists) {
      batch.delete(followingRef);
      batch.delete(followerRef);
      batch.update(currentUserRef, { followingCount: increment(-1), updatedAt: new Date() });
      batch.update(targetUserRef,  { followersCount: increment(-1), updatedAt: new Date() });
      await batch.commit();
      this._followingIds.update(s => { const n = new Set(s); n.delete(targetUserId); return n; });
      return false;
    } else {
      batch.set(followingRef, { createdAt: new Date() });
      batch.set(followerRef,  { createdAt: new Date() });
      batch.update(currentUserRef, { followingCount: increment(1), updatedAt: new Date() });
      batch.update(targetUserRef,  { followersCount: increment(1), updatedAt: new Date() });
      await batch.commit();
      this._followingIds.update(s => new Set([...s, targetUserId]));
      return true;
    }
  }

  async isFollowing(currentUserId: string, targetUserId: string): Promise<boolean> {
    return (await getDoc(doc(this.firestore, `users/${currentUserId}/following/${targetUserId}`))).exists();
  }

  // Load all following IDs — seeds the reactive signal. Call once per session from FeedPage.
  async loadFollowing(userId: string): Promise<Set<string>> {
    const snap = await getDocs(collection(this.firestore, `users/${userId}/following`));
    const ids = new Set<string>(snap.docs.map(d => d.id));
    this._followingIds.set(ids);
    return ids;
  }

  async getFollowers(userId: string): Promise<string[]> {
    const snap = await getDocs(collection(this.firestore, `users/${userId}/followers`));
    return snap.docs.map(d => d.id);
  }
}
```

**Why `writeBatch`:** Both the following and followers subcollection writes, plus both count fields on two different user docs, must succeed or fail together. Four operations in one atomic commit.

**Verification:**
- [ ] `ng build` passes
- [ ] Follow a user: `users/{uid}/following/{targetUid}` and `users/{targetUid}/followers/{uid}` appear in Firestore emulator UI
- [ ] `followingCount` on current user increments; `followersCount` on target user increments
- [ ] Unfollow: both subcollection docs deleted, both counts decrement

---

## Step 3: FollowingFeedService

**File to create:** `src/app/core/services/following-feed.service.ts`

**Pattern:** Copy `FeedService` pagination structure. Key difference: base query filters by `authorId in batchOfIds`. For > 30 following IDs, run parallel queries and merge-sort by `createdAt desc` before paginating.

```typescript
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

  // Call before loadInitial — supply IDs from FollowService.loadFollowing()
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
      list.map(r => r.id === recipeId ? { ...r, [field]: Math.max(0, (r[field] ?? 0) + delta) } : r)
    );
  }

  private async _fetchPage(): Promise<void> {
    if (this._followingIds.length === 0) {
      this._hasMore.set(false);
      return; // No one followed — show empty state
    }
    this._loading.set(true);
    this._error.set(null);
    try {
      // Split into chunks of 30 (Firestore 'in' limit)
      const chunks: string[][] = [];
      for (let i = 0; i < this._followingIds.length; i += 30) {
        chunks.push(this._followingIds.slice(i, i + 30));
      }

      // Run all chunk queries in parallel
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

      // Merge all docs, sort by createdAt desc, take PAGE_SIZE
      const allDocs = snapshots.flatMap(s => s.docs);
      allDocs.sort((a, b) => {
        const aTime = a.data()['createdAt']?.toMillis?.() ?? 0;
        const bTime = b.data()['createdAt']?.toMillis?.() ?? 0;
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
```

**Note on `_lastDoc` with multi-batch:** Using a single `_lastDoc` cursor across batches is an approximation — it works correctly for the most common case (following ≤ 30 users). For > 30, the merge-sort handles the first page well but subsequent pages may have slight ordering gaps. Acceptable for MVP; document as known limitation.

**Firestore Composite Index required:**
```
Collection: recipes
Fields: authorId (ASC), status (ASC), createdAt (DESC)
```
The emulator will log the exact index creation URL in the console when the query first runs.

**Verification:**
- [ ] `ng build` passes
- [ ] Empty state shows when following nobody
- [ ] Recipes from followed users appear in `createdAt desc` order
- [ ] More than 30 following IDs: all users' recipes appear (batch-merge works)

---

## Step 4: Firestore Security Rules Update

**File to modify:** `firestore.rules`

Add rules for the two new subcollections inside the existing `match /users/{userId}` block. Following lists are readable by any authenticated user (supports "is this person following me" and mutual-follow checks):

```
// Following: owner writes, any authenticated user reads
match /following/{followedUserId} {
  allow read: if request.auth != null;
  allow write: if request.auth.uid == userId;
}

// Followers: owner writes, any authenticated user reads
match /followers/{followerUserId} {
  allow read: if request.auth != null;
  allow write: if request.auth.uid == userId;
}
```

Update the `users/{userId}` update rule to allow non-owners to increment/decrement `followersCount` (the batch write from the follower's side updates the target user's doc). Add a numeric delta guard to prevent arbitrary value overwrites:

```
allow update: if request.auth != null
  && (
    // Owner can update any field
    request.auth.uid == userId
    // Non-owner may only touch followersCount (±1) and updatedAt
    || (
      request.resource.data.diff(resource.data).affectedKeys()
        .hasOnly(['followersCount', 'updatedAt'])
      && (request.resource.data.followersCount == resource.data.followersCount + 1
          || request.resource.data.followersCount == resource.data.followersCount - 1)
    )
  );
```

**Why the delta guard:** Without it, any authenticated user could set another user's `followersCount` to an arbitrary number. The `+1`/`-1` constraint limits non-owner writes to legitimate follow/unfollow operations.

**Verification:**
- [ ] Owner can write to `/following` and `/followers`
- [ ] Other authenticated user can read `/following` list
- [ ] Unauthenticated user cannot read following list
- [ ] Non-owner cannot set `followersCount` to arbitrary value (emulator rules test)

---

## Step 5: UserProfilePage (Public — Author Profile)

**Files to create:**
- `src/app/tabs/feed/user-profile/user-profile.page.ts`
- `src/app/tabs/feed/user-profile/user-profile.page.html`
- `src/app/tabs/feed/user-profile/user-profile.page.scss`
- `src/app/tabs/feed/user-profile/user-profile.module.ts`

**Route:** Add child route to `src/app/tabs/feed/feed-routing.module.ts`. The current routes array only has `{ path: '', component: FeedPage }` — extend it:
```typescript
const routes: Routes = [
  { path: '', component: FeedPage },
  {
    path: 'user/:uid',
    loadChildren: () =>
      import('./user-profile/user-profile.module').then(m => m.UserProfilePageModule),
  },
];
```

**Module** (`user-profile.module.ts`) — inline routing, same pattern as collections:
```typescript
const routes: Routes = [{ path: '', component: UserProfilePage }];

@NgModule({
  imports: [CommonModule, IonicModule, RouterModule.forChild(routes), SharedModule],
  declarations: [UserProfilePage],
})
export class UserProfilePageModule {}
```

**Component structure:**
```typescript
@Component({ selector: 'app-user-profile', templateUrl: '...', standalone: false })
export class UserProfilePage implements ViewWillEnter {
  private route = inject(ActivatedRoute);
  private auth = inject(Auth);
  private router = inject(Router);
  readonly followService = inject(FollowService);
  private authService = inject(AuthService);   // use getUserProfile()
  private recipeService = inject(RecipeService);
  private toastCtrl = inject(ToastController);

  targetUid = signal<string>('');
  profile = signal<UserProfile | null>(null);
  recipes = signal<Recipe[]>([]);
  isFollowing = signal(false);
  loading = signal(true);
  isOwnProfile = signal(false);

  async ionViewWillEnter(): Promise<void> {
    const uid = this.route.snapshot.paramMap.get('uid')!;
    this.targetUid.set(uid);
    const currentUid = this.auth.currentUser?.uid;
    this.isOwnProfile.set(uid === currentUid);
    this.loading.set(true);
    await Promise.all([
      this._loadProfile(uid),
      this._loadRecipes(uid),
      currentUid && !this.isOwnProfile()
        ? this.followService.isFollowing(currentUid, uid).then(v => this.isFollowing.set(v))
        : Promise.resolve(),
    ]);
    this.loading.set(false);
  }

  async onToggleFollow(): Promise<void> {
    const currentUid = this.auth.currentUser?.uid;
    if (!currentUid) return;
    const wasFollowing = this.isFollowing();
    this.isFollowing.set(!wasFollowing);   // optimistic
    try {
      await this.followService.toggleFollow(currentUid, this.targetUid());
      const name = this.profile()?.displayName ?? 'this cook';
      await this._showToast(wasFollowing ? `Unfollowed ${name}` : `Now following ${name}`);
    } catch {
      this.isFollowing.set(wasFollowing);  // revert on error
      await this._showToast('Something went wrong. Please try again.');
    }
  }

  private async _loadProfile(uid: string): Promise<void> {
    this.profile.set(await this.authService.getUserProfile(uid));
  }

  private async _loadRecipes(uid: string): Promise<void> {
    // Query published recipes by this author — reuse RecipeService pattern
    // getDocs with where('authorId','==',uid) + where('status','==','published') + orderBy('createdAt','desc')
    // Set recipes signal
  }

  private async _showToast(message: string): Promise<void> {
    const toast = await this.toastCtrl.create({ message, duration: 2000, position: 'bottom' });
    await toast.present();
  }
}
```

**Template layout (user-profile.page.html):**
- `ion-back-button` in toolbar
- Avatar + displayName
- Stats row: `followersCount ?? 0` Followers · `followingCount ?? 0` Following · recipe count
- Follow / Unfollow button (hidden when `isOwnProfile`)
- RecipeCardComponent list (`[showAuthor]="false"` — they're on that author's page already)
- Loading skeleton + empty state: "No recipes yet"

**Verification:**
- [ ] Navigating to `/tabs/feed/user/:uid` loads correct profile and recipes
- [ ] Follow button hidden on own profile
- [ ] Toggle follow: optimistic update, reverts on error
- [ ] Recipe list shows only published recipes from that author

---

## Step 6: RecipeCard — Tappable Author Chip

**Files to modify:**
- `src/app/shared/components/recipe-card/recipe-card.component.ts`
- `src/app/shared/components/recipe-card/recipe-card.component.html`

Current component has `@Input() showSocialActions`, `featured`, `isLiked`, `isSaved`, `commentCount` — extend with `showAuthor`.

```typescript
// Add to recipe-card.component.ts:
private router = inject(Router);   // ADD — needed for goToAuthor navigation

@Input() showAuthor = false;       // ADD — off by default, on in feed

goToAuthor(event: Event): void {
  event.stopPropagation();  // prevent card navigation to recipe detail
  this.router.navigate(['/tabs/feed/user', this.recipe.authorId]);
}
```

In template, inside the card but outside any existing `(click)` wrapper — add conditionally:
```html
<div *ngIf="showAuthor" class="author-row" (click)="goToAuthor($event)">
  <ion-avatar class="author-avatar">
    <!-- fallback icon if no photoURL -->
  </ion-avatar>
  <span class="author-name">{{ recipe.authorName ?? 'Unknown cook' }}</span>
</div>
```

**`showAuthor` usage:**
- Feed (`feed.page.html`): `[showAuthor]="true"` 
- Profile My Recipes + Collection detail: no attribute → defaults `false` ✅

**Important:** `Router` must be injected via `inject(Router)` — not via constructor — consistent with the rest of the codebase.

**Verification:**
- [ ] Tapping author row navigates to `/tabs/feed/user/:authorId`
- [ ] Tapping the card body still navigates to recipe detail (stopPropagation works)
- [ ] `showAuthor` not set → no author row shown
- [ ] `recipe.authorName` is `undefined` on old recipes → shows "Unknown cook" fallback

---

## Step 7: FeedPage — Following Tab Toggle

**Files to modify:**
- `src/app/tabs/feed/feed.page.ts`
- `src/app/tabs/feed/feed.page.html`

Add a segment toggle: **"For You"** (existing `FeedService`) vs **"Following"** (`FollowingFeedService`).

```typescript
// Add to FeedPage:
readonly followingFeedService = inject(FollowingFeedService);
private followService = inject(FollowService);

activeTab = signal<'forYou' | 'following'>('forYou');

async ionViewWillEnter(): Promise<void> {
  const uid = this.auth.currentUser?.uid!;
  // Seed following IDs for both the segment and the following feed
  const followingSet = await this.followService.loadFollowing(uid);
  this.followingFeedService.setFollowingIds([...followingSet]);

  await this.feedService.loadInitial();
  await this._loadSocialState();
  // Note: following feed is NOT loaded here — only on first tab switch (lazy)
}

async switchTab(tab: 'forYou' | 'following'): Promise<void> {
  this.activeTab.set(tab);
  // Lazy-load: only fetch if never loaded (same pattern as collections page)
  if (tab === 'following' && this.followingFeedService.recipes().length === 0) {
    await this.followingFeedService.loadInitial();
  }
}

async onRefresh(event: RefresherCustomEvent): Promise<void> {
  const uid = this.auth.currentUser?.uid!;
  const followingSet = await this.followService.loadFollowing(uid);
  this.followingFeedService.setFollowingIds([...followingSet]);

  if (this.activeTab() === 'following') {
    await this.followingFeedService.loadInitial();
  } else {
    await this.feedService.loadInitial();
  }
  await this._loadSocialState();
  event.target.complete();
}
```

**patchRecipeCount must route to the active service:**
```typescript
// In onToggleLike / onToggleSave — replace single feedService.patchRecipeCount call with:
const activeService = this.activeTab() === 'following'
  ? this.followingFeedService
  : this.feedService;
activeService.patchRecipeCount(recipeId, 'likeCount', delta);
```

**Template changes:**
```html
<!-- Segment toggle -->
<ion-segment [value]="activeTab()" (ionChange)="switchTab($event.detail.value)">
  <ion-segment-button value="forYou">For You</ion-segment-button>
  <ion-segment-button value="following">Following</ion-segment-button>
</ion-segment>

<!-- For You feed -->
<ng-container *ngIf="activeTab() === 'forYou'">
  <!-- existing recipe list + infinite scroll -->
</ng-container>

<!-- Following feed -->
<ng-container *ngIf="activeTab() === 'following'">
  <ng-container *ngIf="followingFeedService.recipes().length === 0 && !followingFeedService.loading()">
    <div class="empty-state">
      <p>Follow some cooks to see their recipes here.</p>
    </div>
  </ng-container>
  <app-recipe-card
    *ngFor="let recipe of followingFeedService.recipes()"
    [recipe]="recipe"
    [showSocialActions]="true"
    [showAuthor]="true"
    ...
  ></app-recipe-card>
  <!-- infinite scroll for following feed -->
</ng-container>
```

**Module:** Both `FollowService` and `FollowingFeedService` are `providedIn: 'root'` — no `feed.module.ts` change needed.

**Verification:**
- [ ] Switching to Following tab triggers load only on first switch
- [ ] Subsequent switches do not re-fetch (lazy guard)
- [ ] Pull-to-refresh re-seeds following IDs and reloads active tab
- [ ] Empty state shows when following nobody
- [ ] Infinite scroll works on both tabs
- [ ] Like/save `patchRecipeCount` routes to the correct active service

---

## Step 8: Profile Page — Following/Followers Counts

**Files to modify:**
- `src/app/tabs/profile/profile.page.html`

Display counts from the already-loaded `profileService.profile()` signal. No new service calls needed.

```html
<div class="stats-row">
  <div class="stat">
    <span class="stat-value">{{ profileService.profile()?.followingCount ?? 0 }}</span>
    <span class="stat-label">Following</span>
  </div>
  <div class="stat">
    <span class="stat-value">{{ profileService.profile()?.followersCount ?? 0 }}</span>
    <span class="stat-label">Followers</span>
  </div>
  <div class="stat">
    <span class="stat-value">{{ recipeService.myRecipes().length }}</span>
    <span class="stat-label">Recipes</span>
  </div>
</div>
```

**`?? 0` is mandatory** — existing user docs lack these fields and will read as `undefined` until they follow/get followed for the first time.

**Verification:**
- [ ] Stats row renders with `0` for existing users (no `undefined` shown)
- [ ] After following someone: navigate back to profile → `followingCount` updated
- [ ] After being followed: `followersCount` reflects correctly

---

## Step 9: Recipe Model — `authorName` Denormalized Field

**Files to modify:**
- `src/app/core/models/recipe.model.ts`
- `src/app/core/services/recipe.service.ts`

`authorName` is **not** currently on the `Recipe` interface (confirmed from `recipe.model.ts`). Add it:

```typescript
export interface Recipe {
  // existing fields...
  authorId: string;
  authorName: string;  // ADD — display name at time of creation
  // ...
}
```

In `RecipeService.createRecipe()` (line 29), the method receives `Omit<Recipe, 'id' | 'createdAt' | 'updatedAt' | 'likeCount' | 'saveCount'>` — `authorName` is already part of the spread. The **caller** (CreatePage) must pass `authorName: auth.currentUser?.displayName ?? 'Unknown cook'`. Update `CreatePage` accordingly.

**Backfill for existing recipes:** No server-side backfill script. Instead, `RecipeCardComponent` uses `recipe.authorName ?? 'Unknown cook'` fallback — old recipes show "Unknown cook" in the author chip. This is explicitly acceptable per the Known Limitations section.

**Verification:**
- [ ] `ng build` passes (no TS errors on Recipe interface change)
- [ ] Create a new recipe → Firestore doc has `authorName` field
- [ ] RecipeCard shows `authorName` for new recipes, "Unknown cook" for old ones

---

## Step 10: Firestore Composite Index

**File to modify:** `firestore.indexes.json` (already exists — **append** to `indexes` array)

The following feed query (`authorId in [...] + status == published + orderBy createdAt desc`) requires a composite index not yet present.

Add to the `indexes` array in `firestore.indexes.json`:
```json
{
  "collectionGroup": "recipes",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "authorId", "order": "ASCENDING" },
    { "fieldPath": "status", "order": "ASCENDING" },
    { "fieldPath": "createdAt", "order": "DESCENDING" }
  ]
}
```

**How to verify during development:**
1. Run app with emulators, switch to "Following" tab
2. Firestore emulator logs a clickable index creation URL — use it to confirm the exact fields needed
3. Add that index to `firestore.indexes.json` for production deployment

**Verification:**
- [ ] `firestore.indexes.json` has 5 indexes (4 existing + 1 new)
- [ ] Following feed loads without "requires an index" error in console

---

## Anti-Patterns to Avoid

| Anti-Pattern | Correct Approach |
|---|---|
| Storing `following: string[]` on user doc | Subcollection `users/{uid}/following/{id}` |
| Using two separate `await updateDoc` for follow toggle | `writeBatch` — 4 ops commit atomically |
| `array-contains` with > 30 values | Batch into chunks of 30, run in parallel, merge-sort |
| `slice(0, 30)` silent truncation | Full batch-merge — no data loss |
| Non-owner setting `followersCount` to arbitrary value | Firestore rule: delta guard `+1` or `-1` only |
| Assuming `followingCount`/`followersCount` exist on old docs | Always `?? 0` — fields absent on pre-phase-13 users |
| Using `collection().get()` | `getDocs(query(...))` — Angular Fire v9 modular API |
| Extending FeedService with inheritance | Separate FollowingFeedService — composition |
| Re-fetching following feed on every tab switch | Lazy guard: load only when `recipes().length === 0` |
| Using `auth.currentUser` without null check | Always `?.uid` or early return guard |
| Creating `firestore.indexes.json` from scratch | File exists — **append** to existing `indexes` array |

---

## File Summary

### New Files
| File | Purpose |
|---|---|
| `src/app/core/models/follow.model.ts` | `FollowEntry` interface |
| `src/app/core/services/follow.service.ts` | Follow/unfollow toggle, signal, batch atomicity |
| `src/app/core/services/following-feed.service.ts` | Paginated feed from followed authors (batch-merge) |
| `src/app/tabs/feed/user-profile/user-profile.page.ts` | Public author profile page |
| `src/app/tabs/feed/user-profile/user-profile.page.html` | Author profile template |
| `src/app/tabs/feed/user-profile/user-profile.page.scss` | Author profile styles |
| `src/app/tabs/feed/user-profile/user-profile.module.ts` | Module + inline routing for lazy-load |

### Modified Files
| File | Change |
|---|---|
| `src/app/core/models/user.model.ts` | Add `followingCount`, `followersCount` |
| `src/app/core/models/recipe.model.ts` | Add `authorName: string` |
| `src/app/core/services/auth.service.ts` | Initialize `followingCount: 0`, `followersCount: 0` in `createUserDoc()` |
| `src/app/core/services/recipe.service.ts` | `createRecipe` caller passes `authorName` (update CreatePage) |
| `src/app/shared/components/recipe-card/recipe-card.component.ts` | Add `showAuthor` input, `inject(Router)`, `goToAuthor()` |
| `src/app/shared/components/recipe-card/recipe-card.component.html` | Author chip row |
| `src/app/tabs/feed/feed.page.ts` | `activeTab` signal, `FollowingFeedService`, `FollowService`, lazy tab switch, patch routing |
| `src/app/tabs/feed/feed.page.html` | Segment toggle + conditional feed lists |
| `src/app/tabs/feed/feed-routing.module.ts` | Add `user/:uid` child route |
| `src/app/tabs/profile/profile.page.html` | Following/Followers stats row with `?? 0` guards |
| `firestore.rules` | following/followers subcollection rules + delta-guarded followersCount update |
| `firestore.indexes.json` | **Append** composite index for following feed query |

---

## Final Verification Checklist

- [ ] `ng build` — zero TypeScript errors
- [ ] New user registered → Firestore doc has `followingCount: 0`, `followersCount: 0`
- [ ] Follow a user: both subcollection docs created, both counts increment atomically
- [ ] Unfollow: both docs deleted, both counts decrement
- [ ] Following feed: recipes from followed users appear in `createdAt desc` order
- [ ] Following feed: empty state when following nobody
- [ ] Following feed: lazy-loads only on first tab switch
- [ ] Pull-to-refresh re-seeds following IDs before reloading feed
- [ ] Like/save `patchRecipeCount` routes to active tab's service
- [ ] Tapping author chip navigates to `/tabs/feed/user/:uid`
- [ ] Card body tap still navigates to recipe detail (author chip `stopPropagation` works)
- [ ] UserProfilePage: correct profile + published recipes + follower counts
- [ ] UserProfilePage: Follow button hidden on own profile
- [ ] UserProfilePage: optimistic follow toggle, reverts on error with toast
- [ ] Profile page stats row: `0` for existing users (no `undefined`)
- [ ] `firestore.indexes.json` has 5 indexes total (4 existing + 1 new)
- [ ] Security rules: following list readable by auth users, writable only by owner
- [ ] Security rules: non-owner `followersCount` update restricted to ±1 delta

---

## Known Limitations (document for future phases)

1. **Multi-batch `_lastDoc` cursor approximation** — For > 30 following, pagination cursor is based on the last doc of the merged first page. Subsequent pages may have slight ordering gaps across batch boundaries. Acceptable for MVP.
2. **`authorName` is denormalized** — if user changes `displayName`, old recipes show old name. Old recipes show "Unknown cook". Future: cloud function to backfill on displayName change.
3. **No followers list UI** — counts shown on profile but tapping does nothing. Future: `/tabs/feed/user/:uid/followers` page.
4. **No push notifications** for new followers — future: Cloud Functions trigger on `/followers` subcollection write.
5. **`followingCount`/`followersCount` on existing users** — reads as `undefined` until first follow activity. Handled everywhere by `?? 0` fallback, not by backfill.
