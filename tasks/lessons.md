# Lessons Learned

## 1. Always create a new feature branch for each phase
**Date:** 2026-04-03
**Mistake:** Started Phase 2 implementation on the `feature/phase1-foundation` branch instead of creating `feature/phase2-onboarding-profile` from `develop`.
**Fix:** Stashed changes, switched to develop, created new branch, merged Phase 1 in, then popped stash.
**Rule:** When starting a new phase/feature, ALWAYS create a new branch from `develop` first — even if the previous phase's PR hasn't been merged yet. Merge the dependency branch into the new feature branch if needed.
