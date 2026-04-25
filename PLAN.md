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

## Phase 7: Polish & Platform — COMPLETED

**Branch:** `feature/phase7-polish` (PR targeting develop)

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

### What was built:
- **Step 1 (Google Sign-In):** `loginWithGoogle()` added to AuthService using `signInWithPopup` + `GoogleAuthProvider`. Auto-creates Firestore user doc on first sign-in. Google button + divider added to login page with `isSocialLoading` flag. Google SVG icon at `src/assets/icons/google.svg`. Apple sign-in deferred (requires Apple Developer account + portal config).
- **Step 2 (Security Rules):** `firestore.rules` — scoped reads (published or own draft), author-only writes, subcollection ownership. `storage.rules` — public read on recipe photos, auth-required write/delete.
- **Step 3 (Native Platforms):** `npm install @capacitor/ios @capacitor/android`, `npx cap add ios`, `npx cap add android`, `npx cap sync`. All 7 plugins confirmed. `ios/` and `android/` native project dirs generated.
- **Step 4 (Offline):** `app.module.ts` uses `initializeFirestore` with `persistentLocalCache({ tabManager: persistentMultipleTabManager() })` — correct v9+ API, multi-tab safe.
- **Step 5 (Error/Skeleton states):** `UserProfileService` gains `loading` + `error` signals with try/catch in `loadProfile`. `FeedService` gains `error` signal. Profile page: loading skeleton + error state + retry button. Feed page: error state + retry button. Recipe detail: improved not-found state with retry.
- **Step 6 (Accessibility):** `aria-label` on filter toggle (with `aria-expanded`), serving scaler +/- buttons, share FAB, like/save buttons (dynamic labels with counts), share button on recipe cards. `aria-hidden="true"` on all decorative icons. `aria-live="polite"` on serving count for screen reader announcements.

### Verification:
- [x] `ng build` passes — zero errors (15s)
- [ ] Google sign-in popup works on web (runtime — requires Firebase console Google provider enabled)
- [ ] Apple sign-in — deferred (requires Apple Developer account)
- [ ] Firestore rules: cannot read other users' drafts, can read all published recipes (runtime)
- [ ] Firestore rules: cannot modify another user's recipe (runtime)
- [ ] `npx cap open ios` → Xcode opens with ios/ project (runtime)
- [ ] `npx cap open android` → Android Studio opens with android/ project (runtime)
- [ ] Offline: cached feed/recipes accessible when network disconnected (runtime)
- [ ] Skeleton screen shows during profile/feed load (runtime)
- [ ] Error state + retry button shows on network failure (runtime)
- [ ] VoiceOver/TalkBack reads meaningful labels for like/save/share/filter buttons (runtime)

---

## Phase 15: Pre-Release Security & Production Hardening — IN PROGRESS

**Branch:** `feature/phase15-pre-release-security` (create from develop)

### Goals
Harden the app for real-world production use before publishing to app stores or sharing publicly. This phase covers: locking down security rules, wiring up real Firebase credentials, protecting secrets, auditing authentication flows, tightening Storage rules, removing dev artifacts, and validating the production build end-to-end.

---

### Step 1: Firebase Production Project Setup
**What to do:**
- Create a new Firebase project in the Firebase console (if not already done): `recipeshare-prod`
- Enable providers in Firebase console:
  - Authentication → Sign-in methods → Email/Password ✓
  - Authentication → Sign-in methods → Google ✓
- Register the web app in Firebase console → copy the real `firebaseConfig`
- Register the Android app: package name from `android/app/build.gradle` (`applicationId`)
- Register the iOS app: bundle ID from Xcode (`ios/App/App.xcodeproj`)
- Download `google-services.json` → place in `android/app/`
- Download `GoogleService-Info.plist` → place in `ios/App/App/`

**Modify** `src/environments/environment.prod.ts`
- Replace all `YOUR_*` placeholders with real Firebase config values
- Keep `useEmulators: false`
- Keep `usdaApiKey` (already real)

**Key concern:** Never commit `environment.prod.ts` with real API keys to a public repo. See Step 2.

---

### Step 2: Secret Management — Protect Real Secrets, Not Public Identifiers
**Important framing:** Firebase web API keys are *public identifiers*, not secrets — they ship in every client bundle by design. Security comes from Firestore/Storage rules + App Check, **not** from hiding the key. Hiding it via gitignore adds CI/dev friction for ~zero security benefit. The **USDA FDC key**, however, *is* a real secret currently shipped to clients.

**What to do:**

1. **USDA FDC key — move off-client (real fix):**
   - Create a Cloud Function `proxyUsdaSearch` that takes a query, calls FDC server-side with the secret key, returns results
   - Store the USDA key as a Cloud Functions secret: `firebase functions:secrets:set USDA_API_KEY`
   - Update `NutritionService` (or equivalent) in the app to call the Cloud Function endpoint instead of `api.nal.usda.gov` directly
   - Remove `usdaApiKey` from `environment.ts` and `environment.prod.ts`
   - **Why:** Anyone can extract the key from the bundle today and burn through your quota.

2. **Firebase API key — restrict, don't hide:**
   - Google Cloud Console → APIs & Services → Credentials → restrict by HTTP referrer (your domain + `localhost`) and Android/iOS app fingerprints
   - Leave `environment.prod.ts` checked in (it's normal practice for Firebase web config)

3. **Firebase App Check** — add proper client attestation:
   - Web: reCAPTCHA v3 provider
   - iOS: DeviceCheck / App Attest provider
   - Android: Play Integrity provider
   - Wire `provideAppCheck(...)` into `app.module.ts` with `initializeAppCheck`
   - Enable App Check enforcement in Firebase Console for Firestore, Storage, and (eventually) Functions
   - **Why:** Without App Check, anyone who scrapes the API key can hit your Firestore/Storage from anywhere. App Check is what actually stops automated abuse on a public app.

**Modify** `src/environments/environment.ts` and `environment.prod.ts`
- Remove `usdaApiKey` field entirely after #1 lands

**Modify** `src/app/app.module.ts`
- Add `provideAppCheck(() => initializeAppCheck(...))`

---

### Step 3: Firestore Security Rules Audit & Hardening
**Current state:** Rules are functionally correct but have one open door: `conversionMatrix` allows `write: if true` (left for seed script dev convenience).

**What to fix:**

**Modify** `firestore.rules`

1. **Lock conversionMatrix writes** — remove `allow write: if true`, replace with admin-only pattern:
   ```
   match /conversionMatrix/{entry} {
     allow read: if request.auth != null;
     allow write: if false;  // only writable via Firebase Admin SDK (server-side)
   }
   ```

2. **Add field validation on recipe create/update** — prevent clients from writing arbitrary fields:
   ```
   // On create: enforce required fields and types
   // Note: use explicit OR rather than `in [...]` for status — `in` literal-array
   //       syntax is not supported across all rules versions.
   allow create: if request.auth != null
     && request.resource.data.authorId == request.auth.uid
     && request.resource.data.title is string
     && request.resource.data.title.size() > 0
     && request.resource.data.title.size() <= 200
     && (request.resource.data.status == 'draft'
         || request.resource.data.status == 'published');
   ```

3. **Tighten counter-update rules to ±1 deltas** (CodeRabbit, blocking) — currently any authenticated user can set `likeCount`/`saveCount` to *any* number (e.g. 1,000,000 or negative) as long as those are the only fields touched. The `affectedKeys().hasOnly(...)` clause prevents writing other fields but does **not** bound the value. Replace with a delta check:
   ```
   allow update: if request.auth != null
     && (
       resource.data.authorId == request.auth.uid
       || (
         request.resource.data.diff(resource.data).affectedKeys()
           .hasOnly(['likeCount', 'saveCount'])
         && (request.resource.data.likeCount == resource.data.likeCount
             || request.resource.data.likeCount == resource.data.likeCount + 1
             || request.resource.data.likeCount == resource.data.likeCount - 1)
         && (request.resource.data.saveCount == resource.data.saveCount
             || request.resource.data.saveCount == resource.data.saveCount + 1
             || request.resource.data.saveCount == resource.data.saveCount - 1)
       )
     );
   ```
   Apply the same pattern to comment vote counters (`score`, `upvotes`, `downvotes`) at `recipes/{recipeId}/comments/{commentId}`.

4. **Lock down `followersCount` writes entirely** (CodeRabbit, blocking) — the current non-owner branch lets any authenticated user bump *any* user's `followersCount` by ±1, with no requirement that they wrote a corresponding `followers/{uid}` doc. A malicious client can loop and inflate/deflate counts arbitrarily. Two acceptable fixes:
   - **Preferred:** Move counter maintenance to a Cloud Function trigger on `followers/{...}` create/delete; deny client writes to `followersCount` entirely from the rules.
   - **Stopgap (no Cloud Functions):** Keep the ±1 delta but add a `getAfter()` check requiring the matching `followers/{request.auth.uid}` document to exist (on follow) or not exist (on unfollow). Note: `getAfter()` adds a Firestore read per write and is brittle.
   This pairs with the `toggleFollow` transaction fix in Step 5.

5. **Add size limits on user profile writes** — bio, displayName, location should have max-length guards:
   ```
   allow update: if request.auth.uid == userId
     && (!('bio' in request.resource.data) || request.resource.data.bio.size() <= 500)
     && (!('displayName' in request.resource.data) || request.resource.data.displayName.size() <= 100)
     && (!('websiteUrl' in request.resource.data) || request.resource.data.websiteUrl.size() <= 200);
   ```

6. **Validate follower/following subcollection document shape** (CodeRabbit, defense-in-depth) — the current rule only checks who's writing, not what. Add:
   ```
   match /following/{followedUserId} {
     allow read: if request.auth != null;
     allow create: if request.auth.uid == userId
       && request.resource.data.keys().hasOnly(['createdAt'])
       && request.resource.data.createdAt is timestamp;
     allow delete: if request.auth.uid == userId;
   }
   match /followers/{followerUserId} {
     allow read: if request.auth != null;
     allow create: if request.auth.uid == followerUserId
       && request.resource.data.keys().hasOnly(['createdAt'])
       && request.resource.data.createdAt is timestamp;
     allow delete: if request.auth.uid == followerUserId;
   }
   ```

7. **Add comment body size enforcement** — already in rules (`<= 2000`). Verify still present after any rule edits.

8. **Block rate-limiting via rules** (best-effort): Firestore rules don't have native rate limiting, but ensure no collection is world-writable.

**Run** Firebase Rules Simulator (Firebase console → Firestore → Rules → Rules Playground) to test:
- Unauthenticated user cannot read any document
- User A cannot read User B's draft recipe
- User A cannot update User B's recipe (non-counter fields)
- User A cannot write to conversionMatrix
- User A cannot set `likeCount` to 1,000,000 on any recipe (delta rejected)
- User A cannot set `followersCount` on User B's profile

---

### Step 3.5: Counter Integrity, Race Conditions & Data Correctness
This step lands code-side fixes that pair with the tightened rules in Step 3. CodeRabbit flagged these on PR #14 and they would silently corrupt production data on launch.

**1. Backfill `followersCount` / `followingCount` on legacy user docs** (HARD PREREQUISITE for tightened rules)

Pre-Phase-13 user documents do not have these fields. The new rules and follow logic do `resource.data.followersCount + 1` — undefined arithmetic fails the rule, **silently breaking every follow attempt against a pre-existing user**. Also `increment(-1)` on a missing field sets it to `-1`, not `0`.

**Create** `scripts/backfill-follow-counters.ts` (mirror seed-recipes.ts structure):
- Use `firebase-admin` SDK with a service-account JSON for the **production** project
- Iterate `users` collection in batches of 500
- For each doc, `set({ followersCount: existing ?? 0, followingCount: existing ?? 0 }, { merge: true })`
- Print progress + total updated count
- **Must run before deploying the new firestore.rules.**

**2. Replace `writeBatch` with `runTransaction` in `FollowService.toggleFollow`** (CodeRabbit, critical)

Current code (`follow.service.ts:14-40`): `getDoc(...)` then `writeBatch(...)` is **not atomic**. A double-tap or two-device follow runs the "follow" branch twice → `increment(+1)` runs twice → counter permanently diverges.

**Modify** `src/app/core/services/follow.service.ts`:
- Replace the `getDoc` + `writeBatch` flow with `runTransaction(this.firestore, async (tx) => { ... })`
- Inside the transaction: `tx.get(followingRef)` → existence check → `tx.set` / `tx.delete` + `tx.update` with `increment(±1)`
- Swap `new Date()` for `serverTimestamp()` on persisted timestamps to avoid client clock skew
- Update `_followingIds` signal **after** the transaction resolves successfully

**3. Add `pending` guard on follow button** (CodeRabbit)

**Modify** `src/app/tabs/feed/user-profile/user-profile.page.ts`:
- Add `pending = signal(false)` to the component
- In `onToggleFollow()`: early-return if `pending()` is true; `pending.set(true)` before the call; `pending.set(false)` in `finally`

**Modify** `src/app/tabs/feed/user-profile/user-profile.page.html`:
- Bind `[disabled]="pending()"` on the follow `<ion-button>`

**4. Use atomic `increment()` for collection `recipeCount`** (CodeRabbit)

**Modify** `src/app/core/services/collection.service.ts`:
- In `addRecipeToCollection`: replace `recipeCount: newIds.length` with `recipeCount: increment(1)`
- In `removeRecipeFromCollection`: replace with `recipeCount: increment(-1)`
- Add an existence guard on the remove path (`arrayRemove` is no-op if the id isn't in the array, but the increment isn't — guard prevents under-counting)
- Add `increment` to the Firestore import

**5. Centralize Firestore Timestamp → Date conversion** (CodeRabbit)

Multiple readers cast `s.data() as Recipe` / `as Collection` without converting Firestore `Timestamp` fields. The model declares `createdAt: Date`, but consumers receive `Timestamp` instances — any `.getTime()`, sort, or date-arithmetic call silently misbehaves.

**Create** small helpers (in `recipe.service.ts` and `collection.service.ts` respectively, or a shared `core/utils/firestore-mapper.ts`):
```typescript
export function mapRecipeDoc(snap: DocumentSnapshot): Recipe {
  const data = snap.data() as Recipe;
  return {
    ...data,
    id: snap.id,
    createdAt: (data.createdAt as any)?.toDate?.() ?? new Date(),
    updatedAt: (data.updatedAt as any)?.toDate?.() ?? new Date(),
  };
}
```

**Modify** `src/app/core/services/recipe.service.ts`:
- Apply `mapRecipeDoc` in `getRecipe`, `loadMyRecipes`, and `getRecipesByIds`

**Modify** `src/app/core/services/collection.service.ts`:
- Apply equivalent `mapCollectionDoc` in `loadCollections`

**6. Fix feed search/refresh routing on Following tab** (CodeRabbit, outside-diff)

**Modify** `src/app/tabs/feed/feed.page.ts` and `feed.page.html`:
- `onSearch()` currently always calls `feedService.setFilters()`, ignoring `activeTab()` — searching on the Following tab silently filters the forYou feed
- Either hide the searchbar with `*ngIf="activeTab() === 'forYou'"`, or branch on `activeTab()` and dispatch to `followingFeedService` when active
- Apply the same fix to the pull-to-refresh handler

---

### Step 4: Storage Security Rules Hardening
**Current state:** recipe photos allow `write: if request.auth != null` with no size limit. Avatars are locked to owner.

**Modify** `storage.rules`

1. **Add file size limits** — prevent uploading massive files:
   ```
   match /recipes/{recipeId}/photos/{photo} {
     allow read: if true;
     allow write: if request.auth != null
       && request.resource.size < 10 * 1024 * 1024  // 10 MB max
       && request.resource.contentType.matches('image/.*');
     allow delete: if request.auth != null;
   }
   match /avatars/{uid}/{fileName} {
     allow read: if true;
     allow write: if request.auth != null
       && request.auth.uid == uid
       && request.resource.size < 5 * 1024 * 1024   // 5 MB max
       && request.resource.contentType.matches('image/.*');
     allow delete: if request.auth != null && request.auth.uid == uid;
   }
   ```

2. **Authorization bug — restrict recipe-photo delete to the author** (real bug, not "acceptable")

   The current rule lets *any* authenticated user delete *any* recipe photo. This is broken authorization — pick one of two fixes:
   - **(a) Path-encode authorId** — switch upload path to `recipes/{authorId}/{recipeId}/photos/{photo}` and rule:
     ```
     match /recipes/{authorId}/{recipeId}/photos/{photo} {
       allow read: if true;
       allow write: if request.auth != null && request.auth.uid == authorId
         && request.resource.size < 10 * 1024 * 1024
         && request.resource.contentType.matches('image/.*');
       allow delete: if request.auth != null && request.auth.uid == authorId;
     }
     ```
     Requires changes in `PhotoService.uploadRecipePhoto` and any code that reads/derives photo paths.
   - **(b) Cross-check Firestore from the rule** — `firestore.get(/databases/(default)/documents/recipes/$(recipeId)).data.authorId == request.auth.uid`. Costs one Firestore read per Storage write/delete; simpler to ship if you don't want to migrate paths.

   Pick (a) for cleaner long-term semantics and zero per-request read cost.

---

### Step 5: Authentication Hardening

**1. Remove dead enumeration-leaking error branches in login**

The current `login.page.ts:60-72` already maps `auth/invalid-credential` correctly, but it *also* keeps the legacy `auth/user-not-found` ("No account found with this email") and `auth/wrong-password` ("Incorrect password") branches. Modern Firebase Auth (v9.14+) returns only `auth/invalid-credential`, but if a downgrade or future regression ever surfaces the old codes, those branches would leak account-existence info.

**Modify** `src/app/features/auth/login/login.page.ts`:
- Remove the `auth/user-not-found` and `auth/wrong-password` cases entirely
- Keep `auth/invalid-credential` → "Invalid email or password."
- Keep `auth/invalid-email`, `auth/too-many-requests` cases

**2. Add password reset flow (currently missing)**

- Add a "Forgot password?" link on `login.page.html`
- Create `forgot-password.page.ts` (or reuse a modal): single email input → `sendPasswordResetEmail(this.auth, email)` → success toast
- Add route under the `auth` feature module

**3. Add email verification flow (currently missing)**

After `register()`:
- Call `sendEmailVerification(credential.user)` immediately
- After login (and on `ionViewWillEnter` of feed/profile), check `auth.currentUser.emailVerified`
- If not verified, show a non-blocking banner with a "Resend verification email" button
- (Optional, post-launch) gate destructive actions (publish recipe, follow) on verification

**Modify** `src/app/core/services/auth.service.ts`:
- `register()` — add `sendEmailVerification(credential.user)` after `createUserDoc`
- Add public `resendVerification()` and `sendPasswordReset(email)` methods

**4. Validate displayName non-blank** (CodeRabbit)

`Validators.required` accepts `"   "`. After the trim on save, displayName becomes empty and is persisted.

**Modify** `src/app/tabs/profile/edit-profile/edit-profile.page.ts`:
- Add `Validators.pattern(/\S/)` on the `displayName` control (or a custom non-blank validator)
- In `onSave()`, set the trimmed value back into the control and call `updateValueAndValidity()` before the `valid` check
- Apply the same to register form's `displayName`

**5. Surface error toast on profile save failure** (CodeRabbit)

`edit-profile.page.ts:onSave` currently uses `try/finally` only — a failed `updateProfile` silently stops the spinner with no feedback or navigation.

**Modify** `src/app/tabs/profile/edit-profile/edit-profile.page.ts`:
- Add `catch` block: present a toast "Failed to save profile. Please try again." (use injected `ToastController`)

**6. Logout state cleanup**

Currently `logout()` calls `signOut` and navigates, but in-memory signals (`UserProfileService.profile`, `RecipeService.myRecipes`, `FeedService.recipes`, `FollowService._followingIds`) still hold the previous user's data. If any non-guarded route renders before the next `ionViewWillEnter`, that data is briefly visible.

**Modify** `src/app/core/services/auth.service.ts`:
- After `signOut`, call a `clearOnLogout()` on each service that holds user-scoped state
- Each affected service exposes a `clearOnLogout()` that resets its signals to initial values

**7. Token refresh** — AngularFire handles automatically via the `Auth` observable. No action needed.

**8. Guard ordering** — `authGuard` → `onboardingGuard` chain confirmed correct in Phase 1. No changes.

---

### Step 6: Remove Development Artifacts & Fix Build Reproducibility

1. **`conversionMatrix` open write rule** — addressed in Step 3.

2. **Console.log cleanup** — only one debug `console.log` exists in `src/`: `main.ts:6` in the bootstrap error catch. Replace it with `console.error` (or leave — bootstrap errors are legitimately worth logging).

3. **`useEmulators: true` in dev environment** — intentional and correct. Verify `environment.prod.ts` has `useEmulators: false`.

4. **Restore missing devDependencies** (CodeRabbit, blocking)

   `scripts/seed-recipes.ts` imports from `firebase-admin/app` and `firebase-admin/firestore`, and both seed scripts run via `npx ts-node`. Neither `firebase-admin` nor `ts-node` is currently declared in `package.json`. They work today only because `npx` resolves them on demand — fragile, fails in CI/offline, and breaks reproducible builds.

   **Modify** `package.json`:
   ```diff
     "devDependencies": {
       ...
   +    "firebase-admin": "^13.8.0",
   +    "ts-node": "^10.9.2",
       "typescript": "~5.9.0"
     }
   ```
   Then `npm install` and verify both seed scripts run without npx fetching anything.

5. **Fix Capacitor appId from scaffold default** (HARD PREREQUISITE for Step 1's Firebase native registration)

   Both `capacitor.config.ts` (`appId: 'io.ionic.starter'`) and `android/app/build.gradle` (`applicationId "io.ionic.starter"`) still have the Ionic scaffold default. This blocks Firebase iOS/Android app registration — the bundle ID *must* match what's registered in Firebase, and `io.ionic.starter` is not a real owned identifier.

   **Modify** `capacitor.config.ts`:
   - `appId: 'com.recipeshare.app'` (or your chosen reverse-DNS ID)
   - `appName: 'RecipeShare'` (consistent branding)

   **Modify** `android/app/build.gradle`:
   - `applicationId "com.recipeshare.app"`

   **Modify** Xcode project bundle identifier (in `ios/App/App.xcodeproj`)

   Then `npx cap sync` to propagate.

6. **Duplicate android asset artifacts** — 26 files + 3 directories from macOS copy artifacts:
   ```bash
   find android/ -name "* 2.*" -type f -delete
   find android/ -depth -name "*\ 2" -type d -exec rm -rf {} +
   ```

7. **`graphify-out/` and other dev tooling output** — add to `.gitignore`:
   ```
   graphify-out/
   ```

8. **Seed scripts must not target production**

   Both `scripts/seed-recipes.ts` and `scripts/seed-conversion-matrix.ts` set `process.env['FIRESTORE_EMULATOR_HOST']` and use `projectId: 'demo-recipeshare'`. Add a header comment + an explicit env-guard at the top of each:
   ```typescript
   if (!process.env['FIRESTORE_EMULATOR_HOST']) {
     throw new Error('Seed scripts must only run against the emulator. Aborting.');
   }
   ```
   Plus a one-line warning in their headers: "DO NOT RUN AGAINST PRODUCTION."

9. **Unused imports / dead code** — run `ng build` and check for warnings. Run TypeScript compiler in strict mode to surface unused variables.

10. **Avatar storage hygiene (optional / minor)** (CodeRabbit) — `PhotoService.uploadAvatarPhoto` writes to a fresh timestamped path on each upload, leaving previous avatars in Storage forever. Either switch to a deterministic path (`avatars/{uid}/avatar.jpg`) and append `?v=${Date.now()}` cache-buster on `<img>`, or delete the prior object after the new URL is persisted. Defer if launch timing is tight.

---

### Step 7: Production Build Validation
**What to do:**

1. **Angular production build:**
   ```bash
   ng build --configuration production
   ```
   - Must pass with zero errors
   - Check bundle sizes (warn if any chunk > 1 MB)
   - Verify `environment.prod.ts` values are baked in (not emulator URLs)

2. **Capacitor sync for production:**
   ```bash
   npx cap sync
   ```
   - Updates native projects with latest web build

3. **iOS build (Xcode):**
   ```bash
   npx cap open ios
   ```
   - Build in Xcode with Release scheme
   - Run on physical device or simulator
   - Verify: Google Sign-In, camera, Firebase Storage uploads work

4. **Android build (Android Studio):**
   ```bash
   npx cap open android
   ```
   - Build → Generate Signed APK/AAB
   - Test on device/emulator

5. **Wire up `firestore.indexes.json` for deploy** (currently disconnected)

   The repo has `firestore.indexes.json` with 5 indexes the feed depends on, but `firebase.json` does not reference it — `firebase deploy --only firestore` will *not* push them. Without these indexes, the prod feed will fail with "missing index" errors as soon as filters are applied.

   **Modify** `firebase.json`:
   ```diff
     "firestore": {
   -    "rules": "firestore.rules"
   +    "rules": "firestore.rules",
   +    "indexes": "firestore.indexes.json"
     },
   ```

6. **Firebase deploy (rules, indexes, storage, hosting):**
   ```bash
   firebase deploy --only firestore   # deploys rules + indexes (after firebase.json fix)
   firebase deploy --only storage
   firebase deploy --only functions   # for the USDA proxy from Step 2
   firebase deploy --only hosting     # if web hosting is set up
   ```

7. **Crash & error reporting (currently missing)**

   The app has zero runtime error visibility once deployed. Add **Firebase Crashlytics** (Capacitor plugin: `@capacitor-firebase/crashlytics`) for native crashes, and **Sentry** (or Firebase Performance) for web error tracking. Without this, you'll have no signal when something breaks for users.

   - Install plugin, register in `app.module.ts`, wire a global `ErrorHandler` that forwards to Crashlytics/Sentry
   - For native, add the `google-services.json` / `GoogleService-Info.plist` from Step 1

8. **Pre-deploy regression smoke test on prod project** (CRITICAL)

   Before announcing or onboarding real users, run the full happy-path manually against the deployed prod backend (with emulators OFF):
   - Register → email verification arrives → onboarding → publish recipe → like/save/comment → follow another user → edit profile → upload avatar → logout → login → password reset → repeat on a second account
   - Verify all Firestore writes appear in the Firebase console (no rules rejections in logs)
   - Check Crashlytics/Sentry dashboards stay empty

---

### Step 8: App Store Pre-Flight Checklist

**iOS (App Store Connect):**
- [ ] Bundle ID matches Firebase iOS app registration (and is no longer `io.ionic.starter` — see Step 6)
- [ ] `GoogleService-Info.plist` present in Xcode project
- [ ] Privacy usage strings in `Info.plist`:
  - `NSCameraUsageDescription` — "RecipeShare uses the camera to capture recipe photos."
  - `NSPhotoLibraryUsageDescription` — "RecipeShare reads your photo library to attach recipe images."
  - `NSPhotoLibraryAddUsageDescription` — for sharing generated recipe cards
- [ ] App icons: all required sizes present (1024×1024 for App Store Connect)
- [ ] Launch screen configured
- [ ] App version + build number set in Xcode
- [ ] Sign with distribution certificate

**Android (Google Play Console):**
- [ ] `google-services.json` present in `android/app/`
- [ ] `applicationId` matches Firebase Android app registration (no longer `io.ionic.starter`)
- [ ] `versionName` + `versionCode` set in `android/app/build.gradle`
- [ ] Signed with release keystore (not debug key)
- [ ] ProGuard/R8 rules configured if needed
- [ ] Permissions declared in `AndroidManifest.xml`:
  - `CAMERA`
  - `READ_MEDIA_IMAGES` (API 33+) — replaces `READ_EXTERNAL_STORAGE` for image access
  - `INTERNET` (auto-included)
- [ ] Runtime permission requests verified for camera + media on Android 13+

**Compliance & legal:**
- [ ] **Privacy Policy URL** — required by both stores. Host a real privacy policy describing what's collected (email, displayName, recipe content, photos, follow graph) and how it's used.
- [ ] **Terms of Service URL** — required for accounts + UGC.
- [ ] **In-app links** — settings page entries linking out to both URLs.
- [ ] **Apple App Privacy report** — declare data types collected in App Store Connect.
- [ ] **GDPR / CCPA** — if you ship analytics or Crashlytics, add a consent prompt on first launch (or, simpler for MVP, disable analytics until consent is added).

**Both platforms:**
- [ ] Deep links / universal links configured (for share URLs — can defer to post-launch)
- [ ] App description, screenshots (5.5"/6.5" iPhone, 7"/10" tablet, Android equivalents), and metadata ready in store listings
- [ ] Test accounts ready for store review (Apple/Google reviewers will need a working login)

---

### File Summary

**Modified files:**
- `src/environments/environment.prod.ts` — real Firebase config, `useEmulators: false`, USDA key removed
- `src/environments/environment.ts` — USDA key removed
- `firestore.rules` — lock conversionMatrix, ±1 counter deltas, deny non-owner `followersCount` writes, follow-doc shape, size guards
- `firestore.indexes.json` — wired through `firebase.json`
- `firebase.json` — add `firestore.indexes` reference
- `storage.rules` — size + MIME guards, author-only delete on recipe photos
- `src/app/app.module.ts` — `provideAppCheck`
- `src/app/core/services/auth.service.ts` — `sendEmailVerification` on register, `sendPasswordReset`, `clearOnLogout` orchestration
- `src/app/core/services/follow.service.ts` — `runTransaction` + `serverTimestamp`
- `src/app/core/services/collection.service.ts` — atomic `increment()` for `recipeCount`, Timestamp→Date mapper
- `src/app/core/services/recipe.service.ts` — `mapRecipeDoc` helper applied
- `src/app/core/services/photo.service.ts` — author-encoded recipe photo path; (optional) deterministic avatar path
- `src/app/features/auth/login/login.page.ts` — drop legacy enumeration branches, "Forgot password" entry point
- `src/app/features/auth/register/register.page.ts` — non-blank displayName, password strength
- `src/app/tabs/profile/edit-profile/edit-profile.page.ts` — non-blank displayName validator, save error toast
- `src/app/tabs/feed/user-profile/user-profile.page.ts` + `.html` — `pending` signal + button `[disabled]`
- `src/app/tabs/feed/feed.page.ts` + `.html` — search + pull-to-refresh route by `activeTab()`
- `src/main.ts` — bootstrap error → `console.error`
- `package.json` — add `firebase-admin` + `ts-node` as devDependencies
- `capacitor.config.ts` — real `appId` (no longer `io.ionic.starter`)
- `android/app/build.gradle` — real `applicationId`
- iOS Xcode project — real bundle identifier
- `.gitignore` — `graphify-out/`

**New files:**
- `scripts/backfill-follow-counters.ts` — one-shot backfill before deploying tightened rules
- `functions/src/proxyUsdaSearch.ts` — Cloud Function proxying the USDA FDC API with a server-side secret
- `forgot-password.page.ts` (+ module + routing) — password reset entry
- Privacy Policy + Terms of Service hosted pages (and in-app links)

**Deleted:**
- Duplicate android assets (`* 2.*` files + `java 2/`, `io 2/` directories)
- `usdaApiKey` field from environment files (after Cloud Function cutover)

---

### Verification Checklist

**Rules & data integrity:**
- [ ] Backfill script run; every existing user doc has numeric `followersCount` + `followingCount`
- [ ] `firestore.rules` deployed — Rules Playground passes all adversarial cases (User A cannot bump User B's `followersCount`, cannot set `likeCount` to 1,000,000, cannot write to `conversionMatrix`)
- [ ] `firestore.indexes.json` wired in `firebase.json` and deployed
- [ ] `storage.rules` deployed — oversized upload rejected, wrong MIME rejected, recipe photo delete blocked for non-author
- [ ] Double-tap follow does not double-increment counters (transaction works)
- [ ] All `Recipe` / `Collection` consumers receive real `Date` instances (no `Timestamp.toDate is not a function` errors)

**Auth:**
- [ ] Login shows "Invalid email or password" for both bad-user and bad-password cases
- [ ] Register sends a verification email; resend works
- [ ] "Forgot password" sends a reset email; reset link works
- [ ] Whitespace-only `displayName` is rejected on register and edit-profile
- [ ] Profile save failure shows an error toast
- [ ] Logout clears in-memory user state across services

**Build & deploy:**
- [ ] `ng build --configuration production` passes — zero errors, no emulator URLs in output, no `usdaApiKey` in bundle (search the prod bundle to confirm)
- [ ] `npm install` resolves cleanly with `firebase-admin` + `ts-node` declared
- [ ] Capacitor `appId` no longer `io.ionic.starter`; matches Firebase native registration
- [ ] App Check enforced; unauthorized clients receive 403 from Firestore/Storage
- [ ] USDA Cloud Function deployed and called from app; key never appears client-side
- [ ] iOS production build runs on device with real Firebase + Crashlytics receiving test crash
- [ ] Android production build runs on device with real Firebase + Crashlytics receiving test crash

**Cleanup:**
- [ ] One `console.log` in `main.ts` converted to `console.error`
- [ ] Duplicate android `* 2.*` files + dirs removed
- [ ] `graphify-out/` ignored
- [ ] Seed scripts have env-guard preventing prod execution

**Compliance:**
- [ ] Privacy Policy + ToS URLs live and linked from in-app settings
- [ ] Apple App Privacy report submitted in App Store Connect
- [ ] If analytics enabled, consent prompt shipped
