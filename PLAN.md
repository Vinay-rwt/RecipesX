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

## Phase 4: Equipment Conversion Engine (Core Feature) — NOT STARTED

### Conversion formula:
`newTemp = sourceTemp * tempFactor + tempOffset`
`newTime = sourceDuration * timeFactor + timeOffset`

### Implementation:
1. `equipment-conversion.service.ts` — loads full matrix on app init, caches in memory + localStorage (~200 entries)
2. Equipment similarity map for "best match" when user lacks exact equipment
3. `convertRecipe(recipe, userEquipment[])` — picks best target, converts all steps
4. Fallback chain: technique-specific → default technique → "no conversion available" warning
5. `recipe-detail.page.ts` — conversion banner, equipment switcher dropdown, converted step display
6. `temperature.pipe.ts`, `measurement.pipe.ts` — C↔F, metric↔imperial at view layer
7. Serving size scaler: `displayQty = (quantity / baseServings) * selectedServings`

### Key decisions:
- All temps stored as Celsius, all durations as minutes — conversion is display-only
- Client-side engine (zero latency, matrix is tiny)
- Signals + computed() for reactive recalculation

---

## Phase 5: Feed & Discovery — NOT STARTED

1. Feed page with paginated Firestore queries (limit + startAfter)
2. Reusable `recipe-card.component.ts`
3. Like + Save (bookmark) functionality
4. Basic search by title/tags (Firestore array-contains)
5. Filters: cuisine, difficulty, tags
6. Pull-to-refresh

---

## Phase 6: Sharing System — NOT STARTED

| Target | Format | How |
|--------|--------|-----|
| Instagram | Recipe card image | HTML Canvas → PNG → Capacitor Share |
| WhatsApp/Discord | Text + link | Clean text summary + universal web URL |
| Gmail | Rich text + link | HTML formatted recipe |
| Generic | Native share sheet | Capacitor Share.share() |

1. `share.service.ts` — format selection + native share
2. `recipe-card-generator.service.ts` — Canvas-based visual card generation
3. Share preview bottom sheet
4. Firebase Hosting + Cloud Function for universal web link with OG meta tags
5. Deep links / Universal Links

---

## Phase 7: Polish & Platform — NOT STARTED

1. Google + Apple Sign-In
2. Firestore security rules
3. Capacitor iOS + Android platforms, device testing
4. Offline support (Firestore persistence)
5. Skeleton screens, error states, empty states
6. Accessibility pass
