# RecipeShare — Master Implementation Plan

## Overview
Social recipe-sharing app where the **killer feature** is equipment-aware recipe conversion. When a user creates a recipe using an air fryer, anyone viewing it with only a conventional oven sees automatically converted temperatures, times, and technique tips.

**Stack:** Angular 20 + Ionic 8 + Capacitor 8 + Firebase (Firestore, Auth, Storage, Cloud Functions)
**Pattern:** NgModule (not standalone), inject() DI, Angular signals for service state, *ngIf/*ngFor template syntax
**Dev:** Firebase emulators (Auth 9099, Firestore 8080, UI 4000) + `ng serve` on port 8100

---

## Firestore Data Model

**`users/{userId}`**: uid, displayName, email, photoURL, equipment[], measurementSystem, temperatureUnit, onboardingComplete, createdAt, updatedAt

**`recipes/{recipeId}`**: authorId, title, description, photoURLs, sourceEquipment, ingredients[{name, quantity, unit, group}], baseServings, steps[{order, instruction, temperature, duration, equipment, technique}], tags[], cuisineType, difficulty, prepTime, cookTime, likeCount, saveCount, status, searchTokens[], createdAt, updatedAt

**`conversionMatrix/{id}`**: sourceEquipment, targetEquipment, technique, tempOffset, tempFactor, timeFactor, timeOffset, techniqueNotes, confidence

**`users/{userId}/likes/{recipeId}`** and **`users/{userId}/saves/{recipeId}`**: subcollections for social features

---

## Project Structure

```
src/app/
  core/services/          — auth, recipe, conversion, share, user-profile, photo
  core/guards/            — auth.guard, onboarding.guard
  core/models/            — user, recipe, equipment, conversion-matrix interfaces
  features/auth/          — login, register pages
  features/onboarding/    — equipment-select, measurement-pref, complete pages + onboarding-state service
  features/recipe/        — detail page (+ edit in future)
  shared/components/      — equipment-selector, equipment-badge, recipe-card, my-recipes, etc.
  shared/pipes/           — temperature, time-format, measurement (Phase 4+)
  tabs/                   — tabs shell, feed, create, profile pages
assets/icons/equipment/   — SVG icons (future)
scripts/                  — seed-conversion-matrix.ts
```

---

## Phase 1: Foundation (App Shell + Auth + Navigation) — COMPLETED

**Branch:** `feature/phase1-foundation` (merged to develop)
**PR:** #1

### What was built:
- Ionic Angular tabs project scaffold
- Firebase + Capacitor dependencies installed
- Firebase config in environment.ts / environment.prod.ts
- `UserProfile` model (`core/models/user.model.ts`)
- `AuthService` (`core/services/auth.service.ts`) — login, register, logout, completeOnboarding
- `authGuard` + `onboardingGuard` (functional guards)
- Auth feature module (login + register pages)
- Onboarding feature module (placeholder pages)
- Recipe feature module (placeholder detail page)
- Tab shell restructured: Feed, Create, Profile tabs
- App routing with guard chains: auth → onboarding → tabs
- Firebase emulator setup (Auth 9099, Firestore 8080, UI 4000)
- `npm run dev` script for concurrent emulators + dev server

### Key files:
- `src/app/core/models/user.model.ts` — UserProfile interface
- `src/app/core/services/auth.service.ts` — Firebase Auth + Firestore user doc
- `src/app/core/guards/auth.guard.ts` — redirects unauthenticated to /auth/login
- `src/app/core/guards/onboarding.guard.ts` — redirects to /onboarding/equipment if not complete
- `src/app/app.module.ts` — provideFirebaseApp, provideAuth, provideFirestore (with emulator support)
- `src/app/app-routing.module.ts` — lazy-loaded feature routes with guards

---

## Phase 2: Onboarding + User Profile — COMPLETED

**Branch:** `feature/phase2-onboarding-profile` (PR #2 targeting develop)
**Commit:** d07b352

### What was built:
- `EquipmentType` model + `EQUIPMENT_TYPES` constant (8 types) + `getEquipmentById()` helper
- `UserProfileService` — signal-based state, Firestore CRUD (loadProfile, updateEquipment, updatePreferences, saveOnboardingData)
- `OnboardingStateService` — temporary signals for onboarding flow (selectedEquipment, measurementSystem, temperatureUnit)
- `SharedModule` with `EquipmentSelectorComponent` (grid, multi-select) and `EquipmentBadgeComponent` (ion-chip)
- Onboarding flow: equipment-select → measurement-pref → complete (batch Firestore write on "Get Started")
- Profile page: user info card, equipment management, preference segments, logout
- `ConversionEntry` model (`core/models/conversion.model.ts`)
- Conversion matrix seed script (`scripts/seed-conversion-matrix.ts`)

### Key files:
- `src/app/core/models/equipment.model.ts` — EQUIPMENT_TYPES, getEquipmentById()
- `src/app/core/models/conversion.model.ts` — ConversionEntry interface
- `src/app/core/services/user-profile.service.ts` — signal-based profile state
- `src/app/features/onboarding/services/onboarding-state.service.ts` — temporary flow state
- `src/app/shared/shared.module.ts` — declares EquipmentSelectorComponent, EquipmentBadgeComponent
- `src/app/shared/components/equipment-selector/` — responsive grid, multi-select toggle
- `src/app/shared/components/equipment-badge/` — ion-chip with icon
- `src/app/tabs/profile/profile.page.ts` — loads profile, saves equipment/preference changes

### Design patterns established:
- Services: `providedIn: 'root'`, Firestore ops, signal-based state with write-through pattern
- OnboardingStateService: ephemeral state, no Firestore until completion (prevents orphaned data)
- SharedModule: declares+exports reusable components, imported by feature modules
- Components: `standalone: false`, `inject()` for DI

---

## Phase 3: Recipe Creation — COMPLETED

**Branch:** `feature/phase3-recipe-creation` (PR targeting develop)

### Architecture Decisions:
1. **Single-page stepper** — CreatePage hosts 4 child components via ion-segment (not separate routes). Users can jump between steps.
2. **Reactive Forms** — FormGroup with nested FormArrays for ingredients/steps (dynamic add/remove/reorder)
3. **PhotoService** — Capacitor Camera on native, `<input type="file">` fallback on web. Both produce Blob for Firebase Storage upload.
4. **Draft persistence** — Auto-save to localStorage on step changes. Optional "Save Draft" to Firestore (status: 'draft').
5. **"My Recipes"** — New section on profile page with horizontal scrolling recipe cards.

### Implementation Steps:

#### Step 1: Recipe Model + Constants
**Create** `src/app/core/models/recipe.model.ts`
- Recipe, Ingredient, RecipeStep interfaces
- RecipeStatus ('draft' | 'published'), Difficulty ('easy' | 'medium' | 'hard')
- CUISINE_TYPES constant array
- INGREDIENT_UNITS constant array
- generateSearchTokens() helper

#### Step 2: Firebase Storage Setup
**Modify** `src/app/app.module.ts` — add provideStorage with emulator on port 9199
**Modify** `firebase.json` — add storage emulator entry

#### Step 3: PhotoService
**Create** `src/app/core/services/photo.service.ts`
- capturePhoto() — platform-aware (Capacitor Camera vs file input)
- uploadRecipePhoto(recipeId, blob, index) — uploads to `recipes/{id}/photos/`, returns download URL
- deleteRecipePhoto(fullPath) — cleanup

#### Step 4: RecipeService (CRUD)
**Create** `src/app/core/services/recipe.service.ts`
- Signal state: myRecipes, currentRecipe, loading
- createRecipe(), updateRecipe(), deleteRecipe(), getRecipe()
- loadMyRecipes(authorId) — query by authorId, order by updatedAt desc
- publishRecipe(id), saveDraft()

#### Step 5: RecipeFormStateService
**Create** `src/app/tabs/create/services/recipe-form-state.service.ts`
- Owns FormGroup with all recipe fields + FormArrays for ingredients/steps/tags
- Signals: currentStep, firestoreDraftId, coverPhotoPreview
- Ingredient helpers: add/remove/reorder
- Step helpers: add/remove/reorder
- localStorage draft: save/load/clear
- isStepValid(stepIndex) — per-step validation
- reset()

#### Step 6: Step Components (4 child components, declared in CreatePageModule)
**Create** `src/app/tabs/create/steps/step-basics/` (ts + html)
- Title, description, cover photo, cuisine select, difficulty segment, tags chips

**Create** `src/app/tabs/create/steps/step-equipment/` (ts + html)
- Equipment radio-group (single-select from EQUIPMENT_TYPES)
- Servings, prep time, cook time inputs

**Create** `src/app/tabs/create/steps/step-ingredients/` (ts + html)
- Dynamic ingredient list with ion-reorder-group
- Each: quantity, unit (ion-select), name
- Swipe-to-delete, "Add Ingredient" button

**Create** `src/app/tabs/create/steps/step-directions/` (ts + html)
- Dynamic step list with ion-reorder-group
- Each: step number, instruction, expandable optional fields (temp, duration, equipment, technique)
- Swipe-to-delete, "Add Step" button

#### Step 7: CreatePage Rewrite
**Modify** `src/app/tabs/create/create.page.ts` — stepper host with publish/draft/discard
**Modify** `src/app/tabs/create/create.page.html` — segment stepper + step components + footer nav
**Modify** `src/app/tabs/create/create.page.scss`
**Modify** `src/app/tabs/create/create.module.ts` — import ReactiveFormsModule, SharedModule; declare step components

#### Step 8: Shared Components
**Create** `src/app/shared/components/recipe-card/` (ts + html + scss) — thumbnail card
**Create** `src/app/shared/components/my-recipes/` (ts + html + scss) — horizontal scroll list
**Modify** `src/app/shared/shared.module.ts` — declare+export both, add RouterModule import

#### Step 9: Profile Page "My Recipes"
**Modify** `src/app/tabs/profile/profile.page.ts` — inject RecipeService, load recipes
**Modify** `src/app/tabs/profile/profile.page.html` — add My Recipes section

#### Step 10: Recipe Detail Page
**Modify** `src/app/features/recipe/detail/recipe-detail.page.ts` — load real recipe
**Modify** `src/app/features/recipe/detail/recipe-detail.page.html` — full detail layout
**Modify** `src/app/features/recipe/detail/recipe-detail.page.scss`
**Modify** `src/app/features/recipe/recipe.module.ts` — import SharedModule

### Key files:
- `src/app/core/models/recipe.model.ts` — Recipe, Ingredient, RecipeStep interfaces + CUISINE_TYPES, INGREDIENT_UNITS, generateSearchTokens()
- `src/app/core/services/recipe.service.ts` — signal-based CRUD (myRecipes, currentRecipe, loading signals)
- `src/app/core/services/photo.service.ts` — Capacitor Camera (native) + file input (web) + Firebase Storage upload
- `src/app/tabs/create/services/recipe-form-state.service.ts` — owns FormGroup/FormArrays, localStorage draft, per-step validation
- `src/app/tabs/create/steps/` — StepBasics, StepEquipment, StepIngredients, StepDirections components
- `src/app/tabs/create/create.page.ts` — stepper host, publish/draft/discard flow
- `src/app/shared/components/recipe-card/` — thumbnail card with status badge
- `src/app/shared/components/my-recipes/` — horizontal scrolling list with empty state
- `src/app/features/recipe/detail/recipe-detail.page.*` — full recipe display (photo, meta, ingredients, steps)
- `src/app/app.module.ts` — added provideStorage with emulator on port 9199
- `firebase.json` — added Storage emulator port 9199
- `storage.rules` — Storage security rules

### Verification:
- [x] `ng build` passes — zero errors
- [ ] Create recipe through all 4 steps + publish (runtime test)
- [ ] Recipe appears in Firestore (runtime test)
- [ ] Profile shows "My Recipes" with the published recipe (runtime test)
- [ ] Recipe detail page renders full content (runtime test)
- [ ] Draft save/resume works — localStorage (runtime test)
- [ ] Discard cleans up draft (runtime test)

---

## Phase 4: Equipment Conversion Engine (Core Feature) — COMPLETED

**Branch:** `feature/phase4-conversion-engine` (PR targeting develop)

### Key files:
- `src/app/core/services/equipment-conversion.service.ts` — matrix loading, similarity map, getBestTarget(), convertStep(), convertRecipe()
- `src/app/core/models/conversion.model.ts` — added ConvertedRecipe interface
- `src/app/shared/pipes/temperature.pipe.ts` — C↔F display pipe
- `src/app/shared/pipes/measurement.pipe.ts` — metric↔imperial ingredient display pipe
- `src/app/features/recipe/detail/recipe-detail.page.ts` — conversion signals (selectedEquipment, convertedData, displaySteps), serving scaler
- `src/app/features/recipe/detail/recipe-detail.page.html` — equipment switcher, conversion banner, technique notes, serving scaler, piped temperatures/measurements

### Key decisions:
- Client-side engine: load full Firestore matrix once, cache in memory (signal) — zero latency
- Signals + `computed()` for reactive recalculation when equipment or servings change
- Auto-selects best-match equipment on page load using similarity map
- Fallback chain: technique-specific → 'default' technique → keep original step + 'none' confidence

### Verification:
- [x] `ng build` passes — zero errors
- [ ] Seed matrix: `npm run seed:conversions` (runtime)
- [ ] Air fryer recipe viewed by oven-only user → conversion banner + converted steps (runtime)
- [ ] Equipment switcher changes → instant recalculation (runtime)
- [ ] Serving scaler → ingredient quantities scale correctly (runtime)
- [ ] Source equipment matches user's equipment → no conversion banner (runtime)

---

## Phase 5: Feed & Discovery — NOT STARTED

**Branch:** `feature/phase5-feed-discovery` (create from develop, merge phase4 in)

### What already exists (do not recreate):
- `src/app/tabs/feed/` — placeholder FeedPage + module + routing (lazy-loaded at `/tabs/feed`)
- `src/app/shared/components/recipe-card/` — RecipeCardComponent with `@Input() recipe: Recipe`, renders thumbnail + title + cuisine chip + cook time + status badge, navigates to `/recipe/:id`
- `src/app/core/services/recipe.service.ts` — RecipeService with `loadMyRecipes(authorId)`, signal-based `myRecipes`, `currentRecipe`, `loading`
- `src/app/core/models/recipe.model.ts` — Recipe interface with `searchTokens: string[]`, `tags: string[]`, `cuisineType`, `difficulty`, `status`, `likeCount`, `saveCount`
- `src/app/shared/shared.module.ts` — exports RecipeCardComponent, EquipmentBadgeComponent, pipes
- Firestore `recipes` collection with `searchTokens[]` field for search

### Architecture Decisions:
1. **Cursor-based pagination** — use Firestore `limit()` + `startAfter(lastDoc)` on `createdAt` desc. Load 10 recipes at a time. Ionic's `ion-infinite-scroll` triggers next page load.
2. **Search** — Firestore `array-contains-any` on `searchTokens` field. Tokenized on write (already done by `generateSearchTokens()`). Limited to 10 tokens per query (Firestore constraint).
3. **Filters** — `cuisineType`, `difficulty`, `tags` applied as Firestore `where()` clauses. Combined with search where possible (Firestore allows one `array-contains` + other equality filters in the same query with a composite index).
4. **Like/Save subcollections** — `users/{userId}/likes/{recipeId}` and `users/{userId}/saves/{recipeId}`. Toggle writes the subcollection doc + atomically increments/decrements `likeCount`/`saveCount` on the recipe doc. Uses Firestore `increment()` for atomicity.
5. **Feed card enhancement** — extend RecipeCardComponent with like/save count display and a like button.
6. **Pull-to-refresh** — Ionic `ion-refresher` component resets pagination and reloads.

### Implementation Steps:

#### Step 1: FeedService (new)
**Create** `src/app/core/services/feed.service.ts`

```
@Injectable({ providedIn: 'root' })
export class FeedService {
  private firestore = inject(Firestore);

  // Signal state
  private _recipes = signal<Recipe[]>([]);
  private _loading = signal(false);
  private _hasMore = signal(true);
  private _lastDoc: QueryDocumentSnapshot | null = null;

  readonly recipes = this._recipes.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly hasMore = this._hasMore.asReadonly();

  // Current filter state
  private _filters = signal<FeedFilters>({});
  readonly filters = this._filters.asReadonly();

  readonly PAGE_SIZE = 10;

  async loadInitial(): Promise<void>
    - Reset state: _recipes.set([]), _lastDoc = null, _hasMore.set(true)
    - Build Firestore query: collection('recipes'), where('status','==','published'), orderBy('createdAt','desc'), limit(PAGE_SIZE)
    - Apply active filters (cuisineType, difficulty, searchTokens)
    - getDocs, set _recipes, store _lastDoc for cursor

  async loadMore(): Promise<void>
    - If !_hasMore() or _loading(), return
    - Same query as above but add startAfter(_lastDoc)
    - Append to _recipes
    - If results.length < PAGE_SIZE, _hasMore.set(false)

  setFilters(filters: FeedFilters): void
    - _filters.set(filters)
    - Call loadInitial() to reset with new filters

  resetFilters(): void
    - _filters.set({})
    - loadInitial()
}
```

**New type:**
```typescript
export interface FeedFilters {
  cuisineType?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  searchQuery?: string;  // tokenized before query
}
```

#### Step 2: SocialService (new — like/save logic)
**Create** `src/app/core/services/social.service.ts`

```
@Injectable({ providedIn: 'root' })
export class SocialService {
  private firestore = inject(Firestore);

  async toggleLike(userId: string, recipeId: string): Promise<boolean>
    - Check if users/{userId}/likes/{recipeId} doc exists
    - If exists: delete it, increment recipes/{recipeId}.likeCount by -1 → return false
    - If not: set it, increment likeCount by +1 → return true
    - Use Firestore increment() for atomic counter update

  async toggleSave(userId: string, recipeId: string): Promise<boolean>
    - Same pattern as toggleLike but for saves subcollection and saveCount

  async isLiked(userId: string, recipeId: string): Promise<boolean>
    - getDoc(users/{userId}/likes/{recipeId}).exists()

  async isSaved(userId: string, recipeId: string): Promise<boolean>
    - getDoc(users/{userId}/saves/{recipeId}).exists()

  async getUserLikes(userId: string): Promise<Set<string>>
    - getDocs(collection(users/{userId}/likes))
    - Return Set of recipeIds (for batch checking on feed load)

  async getUserSaves(userId: string): Promise<Set<string>>
    - Same pattern for saves
}
```

#### Step 3: Enhance RecipeCardComponent
**Modify** `src/app/shared/components/recipe-card/recipe-card.component.ts`
- Add `@Input() showSocialActions = false` (false by default to not break MyRecipes on profile)
- Add `@Input() isLiked = false`, `@Input() isSaved = false`
- Add `@Output() likeToggled`, `@Output() saveToggled`

**Modify** `src/app/shared/components/recipe-card/recipe-card.component.html`
- Below the card subtitle, add a row with like count + heart icon and save count + bookmark icon
- Only shown when `showSocialActions` is true
- Like button: filled heart when isLiked, outline otherwise
- Save button: filled bookmark when isSaved, outline otherwise

**Modify** `src/app/shared/components/recipe-card/recipe-card.component.scss`
- Style the social actions row

#### Step 4: FeedPage Rewrite
**Modify** `src/app/tabs/feed/feed.module.ts`
- Add imports: `SharedModule`, `FormsModule`

**Modify** `src/app/tabs/feed/feed.page.ts`
```
export class FeedPage implements ViewWillEnter {
  readonly feedService = inject(FeedService);
  readonly socialService = inject(SocialService);
  private auth = inject(Auth);

  likedRecipes = signal<Set<string>>(new Set());
  savedRecipes = signal<Set<string>>(new Set());

  // Filter UI state
  showFilters = false;
  searchQuery = '';

  readonly cuisineTypes = CUISINE_TYPES;

  async ionViewWillEnter(): Promise<void>
    - feedService.loadInitial()
    - Load user likes/saves in parallel

  async loadMore(event: InfiniteScrollCustomEvent): Promise<void>
    - await feedService.loadMore()
    - event.target.complete()
    - If !feedService.hasMore(), event.target.disabled = true

  async onRefresh(event: RefresherCustomEvent): Promise<void>
    - await feedService.loadInitial()
    - Reload likes/saves
    - event.target.complete()

  async onToggleLike(recipeId: string): Promise<void>
    - Call socialService.toggleLike(uid, recipeId)
    - Update likedRecipes signal

  async onToggleSave(recipeId: string): Promise<void>
    - Call socialService.toggleSave(uid, recipeId)
    - Update savedRecipes signal

  onSearch(): void
    - feedService.setFilters({ ...feedService.filters(), searchQuery: this.searchQuery })

  onFilterChange(key: string, value: string): void
    - feedService.setFilters({ ...feedService.filters(), [key]: value || undefined })

  clearFilters(): void
    - this.searchQuery = ''
    - feedService.resetFilters()
}
```

**Modify** `src/app/tabs/feed/feed.page.html`
```html
<ion-header [translucent]="true">
  <ion-toolbar>
    <ion-title>Feed</ion-title>
    <ion-buttons slot="end">
      <ion-button (click)="showFilters = !showFilters">
        <ion-icon slot="icon-only" name="filter-outline"></ion-icon>
      </ion-button>
    </ion-buttons>
  </ion-toolbar>

  <!-- Search bar -->
  <ion-toolbar>
    <ion-searchbar
      [(ngModel)]="searchQuery"
      (ionInput)="onSearch()"
      debounce="400"
      placeholder="Search recipes...">
    </ion-searchbar>
  </ion-toolbar>

  <!-- Filter row (collapsible) -->
  <ion-toolbar *ngIf="showFilters">
    <ion-segment>cuisine select</ion-segment>
    <ion-segment>difficulty select</ion-segment>
    <ion-button>Clear</ion-button>
  </ion-toolbar>
</ion-header>

<ion-content>
  <!-- Pull to refresh -->
  <ion-refresher slot="fixed" (ionRefresh)="onRefresh($event)">
    <ion-refresher-content></ion-refresher-content>
  </ion-refresher>

  <!-- Empty state -->
  ...

  <!-- Recipe grid/list -->
  <div class="feed-list">
    <app-recipe-card
      *ngFor="let recipe of feedService.recipes()"
      [recipe]="recipe"
      [showSocialActions]="true"
      [isLiked]="likedRecipes().has(recipe.id!)"
      [isSaved]="savedRecipes().has(recipe.id!)"
      (likeToggled)="onToggleLike(recipe.id!)"
      (saveToggled)="onToggleSave(recipe.id!)">
    </app-recipe-card>
  </div>

  <!-- Infinite scroll -->
  <ion-infinite-scroll (ionInfinite)="loadMore($event)">
    <ion-infinite-scroll-content></ion-infinite-scroll-content>
  </ion-infinite-scroll>
</ion-content>
```

**Modify** `src/app/tabs/feed/feed.page.scss`
- Card list: vertical list layout, full-width cards
- Search and filter styling

#### Step 5: Recipe Detail Page — Like/Save buttons
**Modify** `src/app/features/recipe/detail/recipe-detail.page.ts`
- Inject `SocialService`
- Add `isLiked` and `isSaved` signals
- Check like/save status in `ionViewWillEnter()`
- Add `toggleLike()` and `toggleSave()` methods

**Modify** `src/app/features/recipe/detail/recipe-detail.page.html`
- Add a toolbar below the cover photo with like and save buttons
- Heart icon (filled/outline) with like count
- Bookmark icon (filled/outline) with save count

#### Step 6: Firestore Composite Index
**Create/Update** `firestore.indexes.json`
- Index for feed query: `recipes` → `status` ASC, `createdAt` DESC
- Index for cuisine filter: `recipes` → `status` ASC, `cuisineType` ASC, `createdAt` DESC
- Index for difficulty filter: `recipes` → `status` ASC, `difficulty` ASC, `createdAt` DESC
- Index for search: `recipes` → `status` ASC, `searchTokens` CONTAINS, `createdAt` DESC

### File Summary:
**New files (3):**
- `src/app/core/services/feed.service.ts`
- `src/app/core/services/social.service.ts`
- `firestore.indexes.json`

**Modified files (8):**
- `src/app/tabs/feed/feed.page.ts` — full rewrite
- `src/app/tabs/feed/feed.page.html` — full rewrite
- `src/app/tabs/feed/feed.page.scss` — full rewrite
- `src/app/tabs/feed/feed.module.ts` — add SharedModule, FormsModule
- `src/app/shared/components/recipe-card/recipe-card.component.ts` — add social inputs/outputs
- `src/app/shared/components/recipe-card/recipe-card.component.html` — add social row
- `src/app/shared/components/recipe-card/recipe-card.component.scss` — style social row
- `src/app/features/recipe/detail/recipe-detail.page.ts` + `.html` — like/save buttons

### Verification:
- [ ] `ng build` passes
- [ ] Feed loads published recipes, scroll triggers infinite load
- [ ] Pull-to-refresh reloads the feed
- [ ] Search by keyword filters results (uses searchTokens)
- [ ] Cuisine and difficulty filters work
- [ ] Like button toggles heart and increments/decrements likeCount in Firestore
- [ ] Save button toggles bookmark and updates saveCount
- [ ] Like/save state persists across page navigations
- [ ] Recipe detail page shows like/save buttons

---

## Phase 6: Sharing System — COMPLETED

**Branch:** `feature/phase6-sharing` (PR targeting develop)

### What already exists (do not recreate):
- `@capacitor/share` plugin already installed (v8.0.1) in package.json
- Recipe detail page at `src/app/features/recipe/detail/` with full recipe data
- RecipeService with `getRecipe(id)` and `currentRecipe` signal
- Recipe model with all fields needed for share content generation

### Architecture Decisions:
1. **ShareService** — single entry point for all share operations. Detects platform (native vs web) and adapts. On native, uses Capacitor `Share.share()`. On web, uses `navigator.share()` with clipboard fallback.
2. **RecipeCardGeneratorService** — uses an offscreen `<canvas>` element to render a visual recipe card as a PNG. Template: cover photo + title + cuisine + equipment badge + prep/cook time. The canvas is 1080x1350 (Instagram-friendly 4:5 ratio).
3. **Share bottom sheet** — Ionic `ion-action-sheet` letting user choose: Share as Image, Share as Text, Copy Link. Simplicity over a custom modal.
4. **No Cloud Functions for v1** — skip the universal link/OG-tags server for now. Share a plain text summary with a placeholder URL. Cloud Function can be added in Phase 7 or as a follow-up. This keeps Phase 6 client-side only and avoids a deploy pipeline dependency.
5. **Share button placement** — FAB button on recipe detail page + share icon in the recipe card overflow.

### Implementation Steps:

#### Step 1: ShareService
**Create** `src/app/core/services/share.service.ts`

```
@Injectable({ providedIn: 'root' })
export class ShareService {

  async shareText(recipe: Recipe): Promise<void>
    - Build plain text:
      "🍳 {title}\n\n{description}\n\nCuisine: {cuisineType} | Difficulty: {difficulty}\n
      Prep: {prepTime}m | Cook: {cookTime}m | Servings: {baseServings}\n\n
      Ingredients:\n{ingredients list}\n\nDirections:\n{numbered steps}\n\n
      Shared from RecipeShare"
    - On native: Share.share({ title: recipe.title, text, dialogTitle: 'Share Recipe' })
    - On web: navigator.share({ title, text }) or fallback to navigator.clipboard.writeText(text)

  async shareImage(recipe: Recipe, imageBlob: Blob): Promise<void>
    - Convert Blob to File
    - On native: write to temp dir via Filesystem, then Share.share({ url: fileUri })
    - On web: navigator.share({ files: [file] }) if supported, else download the image

  async copyLink(recipeId: string): Promise<void>
    - URL = `https://recipeshare.app/recipe/${recipeId}` (placeholder, real URL in Phase 7)
    - navigator.clipboard.writeText(URL)
    - Return for toast display
}
```

#### Step 2: RecipeCardGeneratorService
**Create** `src/app/core/services/recipe-card-generator.service.ts`

```
@Injectable({ providedIn: 'root' })
export class RecipeCardGeneratorService {

  async generateCard(recipe: Recipe): Promise<Blob>
    - Create offscreen canvas 1080x1350
    - Background: white with subtle gradient
    - If recipe.photoURLs[0]: load image, draw cropped to top 60% of canvas
    - Else: draw placeholder icon area
    - Draw semi-transparent overlay on bottom 40%
    - Draw title (bold, 48px)
    - Draw cuisine + difficulty chips
    - Draw prep/cook time icons + text
    - Draw "RecipeShare" watermark at bottom
    - canvas.toBlob() → resolve as Blob

  private loadImage(url: string): Promise<HTMLImageElement>
    - Return promise that resolves when image loads
    - Handle CORS: use crossOrigin = 'anonymous'

  private drawRoundedRect(ctx, x, y, w, h, r): void
    - Canvas rounded rectangle helper

  private drawChip(ctx, text, x, y, color): void
    - Draw a pill-shaped chip with text
}
```

#### Step 3: Share Button on Recipe Detail Page
**Modify** `src/app/features/recipe/detail/recipe-detail.page.ts`
- Inject `ShareService`, `RecipeCardGeneratorService`, `ActionSheetController`, `ToastController`
- Add method:
```
  async onShare(): Promise<void>
    - Present action sheet with options:
      'Share as Image' → generate card, then shareImage()
      'Share as Text' → shareText()
      'Copy Link' → copyLink(), show toast "Link copied"
      'Cancel'
```

**Modify** `src/app/features/recipe/detail/recipe-detail.page.html`
- Add a FAB button (bottom-right):
```html
<ion-fab vertical="bottom" horizontal="end" slot="fixed">
  <ion-fab-button (click)="onShare()" color="primary">
    <ion-icon name="share-outline"></ion-icon>
  </ion-fab-button>
</ion-fab>
```

#### Step 4: Share from Feed Card (optional)
**Modify** `src/app/shared/components/recipe-card/recipe-card.component.ts`
- Add `@Output() shareClicked = new EventEmitter<void>()`

**Modify** `src/app/shared/components/recipe-card/recipe-card.component.html`
- Add a small share icon button in the card footer (next to like/save if present)

**Modify** `src/app/tabs/feed/feed.page.ts`
- Handle `(shareClicked)` — call shareService.shareText(recipe)

### File Summary:
**New files (2):**
- `src/app/core/services/share.service.ts`
- `src/app/core/services/recipe-card-generator.service.ts`

**Modified files (4-5):**
- `src/app/features/recipe/detail/recipe-detail.page.ts` + `.html` — share FAB + action sheet
- `src/app/shared/components/recipe-card/recipe-card.component.ts` + `.html` — optional share button
- `src/app/tabs/feed/feed.page.ts` — handle share from card

### Key files added/modified:
- `src/app/core/services/share.service.ts` — platform-aware sharing (native Capacitor, navigator.share, clipboard/download fallback)
- `src/app/core/services/recipe-card-generator.service.ts` — offscreen canvas 1080×1350 PNG, cover-fit photo crop, chip overlays, watermark
- `src/app/features/recipe/detail/recipe-detail.page.ts` — onShare() with ActionSheet (Image/Text/Copy Link); FAB button added to HTML
- `src/app/shared/components/recipe-card/recipe-card.component.ts` — shareClicked EventEmitter; share icon in social-actions row
- `src/app/tabs/feed/feed.page.ts` — onShare(recipe) → shareService.shareText()

### Verification:
- [x] `ng build` passes — zero errors (12.6s)
- [ ] Tap share FAB on recipe detail → action sheet appears (runtime)
- [ ] "Share as Text" → native share dialog (or clipboard on web) with recipe content (runtime)
- [ ] "Share as Image" → generates canvas card image, opens share dialog (runtime)
- [ ] "Copy Link" → clipboard contains URL, toast shown (runtime)
- [ ] Share from feed card → shares recipe text (runtime)
- [ ] On web: file sharing fallback (download) works when navigator.share({ files }) not supported (runtime)

---

## Phase 7: Polish & Platform — NOT STARTED

**Branch:** `feature/phase7-polish` (create from develop, merge phase6 in)

### What already exists (do not recreate):
- `src/app/core/services/auth.service.ts` — email/password login and register
- `src/app/features/auth/login/` and `register/` — existing auth pages
- `firestore.rules` — basic rules file
- `storage.rules` — basic Storage rules
- `src/app/app.module.ts` — provideFirebaseApp, provideAuth, provideFirestore, provideStorage (all with emulator support)
- Capacitor platform plugins already installed: `@capacitor/app`, `@capacitor/status-bar`, `@capacitor/haptics`, `@capacitor/keyboard`

### Phase 7 is a collection of independent improvements. Each sub-step can be done in isolation.

### Step 1: Google + Apple Sign-In
**Modify** `src/app/core/services/auth.service.ts`
- Add methods:
```
  async loginWithGoogle(): Promise<void>
    - Use signInWithPopup(this.auth, new GoogleAuthProvider())
    - Check if user doc exists; if not, createUserDoc()
    - On native: use @codetrix-studio/capacitor-google-auth plugin

  async loginWithApple(): Promise<void>
    - Use signInWithPopup(this.auth, new OAuthProvider('apple.com'))
    - On native: use @capacitor-community/apple-sign-in plugin
```

**Install** (if needed):
- `npm install @codetrix-studio/capacitor-google-auth` (for native Google sign-in)
- `npm install @capacitor-community/apple-sign-in` (for native Apple sign-in)

**Modify** `src/app/features/auth/login/login.page.html`
- Add Google and Apple sign-in buttons below the email/password form
- "Or sign in with" divider
- Google button: `ion-button` with Google icon
- Apple button: `ion-button` with Apple icon (only shown on iOS or web)

**Modify** `src/app/features/auth/login/login.page.ts`
- Add `onGoogleLogin()` and `onAppleLogin()` methods
- Detect platform for Apple button visibility

### Step 2: Firestore Security Rules
**Modify** `firestore.rules`
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users: read own profile, write own profile
    match /users/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth.uid == userId;

      // Likes and saves subcollections
      match /likes/{recipeId} {
        allow read, write: if request.auth.uid == userId;
      }
      match /saves/{recipeId} {
        allow read, write: if request.auth.uid == userId;
      }
    }

    // Recipes: anyone authenticated can read published, only author can write
    match /recipes/{recipeId} {
      allow read: if request.auth != null && (resource.data.status == 'published' || resource.data.authorId == request.auth.uid);
      allow create: if request.auth != null && request.resource.data.authorId == request.auth.uid;
      allow update: if request.auth != null && resource.data.authorId == request.auth.uid;
      allow delete: if request.auth != null && resource.data.authorId == request.auth.uid;
    }

    // Conversion matrix: read-only for authenticated users
    match /conversionMatrix/{entry} {
      allow read: if request.auth != null;
      allow write: if false;  // seed script uses emulator bypass
    }
  }
}
```

**Modify** `storage.rules`
```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /recipes/{recipeId}/photos/{photo} {
      allow read: if true;
      allow write: if request.auth != null;
      allow delete: if request.auth != null;
    }
  }
}
```

### Step 3: Capacitor iOS + Android Platforms
**Commands:**
```bash
npx cap add ios
npx cap add android
npx ionic build
npx cap sync
```

**Modify** `capacitor.config.ts` (if needed)
- Set appId, appName
- Configure plugins: StatusBar, Keyboard, Camera permissions

**Verify:**
- `npx cap open ios` → opens Xcode → build and run on simulator
- `npx cap open android` → opens Android Studio → build and run on emulator

### Step 4: Offline Support
**Modify** `src/app/app.module.ts`
- Enable Firestore persistence:
```typescript
provideFirestore(() => {
  const firestore = getFirestore();
  if (environment.useEmulators) {
    connectFirestoreEmulator(firestore, 'localhost', 8080);
  }
  enableIndexedDbPersistence(firestore).catch(() => {
    // Persistence fails when multiple tabs are open — acceptable
  });
  return firestore;
}),
```

Note: `enableIndexedDbPersistence` is from `@angular/fire/firestore`. In production, Firestore caches documents locally and serves them when offline. Pending writes queue and sync when back online. No additional code needed for basic offline reads/writes.

### Step 5: Skeleton Screens, Error States, Empty States
For each major page, add three states: loading skeleton, error, and empty.

**Feed page** (`feed.page.html`):
- Loading: 3-4 skeleton recipe cards using `ion-skeleton-text`
- Empty: "No recipes yet. Be the first to share!" with illustration icon
- Error: "Failed to load recipes. Pull to retry."

**Profile page** (`profile.page.html`):
- My Recipes loading state already exists via `MyRecipesComponent` `[loading]` input
- Add error state for profile load failure

**Recipe detail page** (`recipe-detail.page.html`):
- Loading skeleton already exists
- Add error state: "Failed to load recipe" with retry button

**Create page** — no skeleton needed (form starts empty)

### Step 6: Accessibility Pass
- Ensure all `ion-icon` elements have `aria-label` or are wrapped in labelled buttons
- All `img` tags have meaningful `alt` attributes (already done for recipe photos)
- Form inputs have associated `<ion-label>` (already done)
- Color contrast: verify Ionic default theme meets WCAG AA
- Add `role` attributes where semantic HTML isn't sufficient
- Test with VoiceOver (iOS) and TalkBack (Android) on key flows:
  - Login → Onboarding → Feed → Recipe Detail → Create Recipe

### File Summary:
**New files (0-2):**
- Possibly platform configs generated by `npx cap add ios/android`

**Modified files (~8-10):**
- `src/app/core/services/auth.service.ts` — Google/Apple sign-in
- `src/app/features/auth/login/login.page.ts` + `.html` — social login buttons
- `firestore.rules` — production security rules
- `storage.rules` — production storage rules
- `src/app/app.module.ts` — Firestore persistence
- `src/app/tabs/feed/feed.page.html` — skeleton/empty/error states
- `src/app/tabs/profile/profile.page.html` — error state
- `src/app/features/recipe/detail/recipe-detail.page.html` — error state
- Various templates — aria-labels, alt attributes

### Verification:
- [ ] `ng build` passes
- [ ] Google sign-in works on web (popup flow)
- [ ] Apple sign-in works on web (popup flow)
- [ ] Firestore rules: cannot read other users' drafts, can read all published recipes
- [ ] Firestore rules: cannot modify another user's recipe
- [ ] iOS build succeeds in Xcode simulator
- [ ] Android build succeeds in Android Studio emulator
- [ ] Offline: open app, disconnect network, browse cached feed and recipes
- [ ] Offline: create recipe while offline, reconnect, verify it syncs
- [ ] Skeleton screens show during loading for feed, detail, and profile
- [ ] Empty state shows when feed has no recipes
- [ ] VoiceOver can navigate login → feed → recipe detail
