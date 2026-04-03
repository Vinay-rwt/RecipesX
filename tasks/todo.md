# RecipeShare — Task Tracker

## Phase 1: Foundation (App Shell + Auth + Navigation)

- [x] Create feature/phase1-foundation branch from develop
- [x] Install dependencies (@angular/fire, firebase, @capacitor/share, @capacitor/camera, @capacitor/filesystem)
- [x] Add Firebase config to environment.ts and environment.prod.ts (placeholder values)
- [x] Create UserProfile model (core/models/user.model.ts)
- [x] Create AuthService (core/services/auth.service.ts) — login, register, logout, completeOnboarding
- [x] Create authGuard (core/guards/auth.guard.ts)
- [x] Create onboardingGuard (core/guards/onboarding.guard.ts)
- [x] Create Auth feature module with login + register pages
- [x] Create Onboarding feature module with placeholder pages (equipment-select, measurement-pref, complete)
- [x] Create Recipe feature module with placeholder detail page
- [x] Delete old tab1/tab2/tab3/explore-container
- [x] Create new tab pages (feed, create, profile)
- [x] Update tabs routing and tab bar HTML
- [x] Wire Firebase providers in app.module.ts
- [x] Rewrite app-routing.module.ts with guard chains
- [x] Build verification — ng build passes

## Review
- Build passes with zero errors
- All feature modules lazy-loaded correctly
- Guard chain: auth → onboarding → tabs
- Firebase config uses placeholder values (user must replace with real project config)
