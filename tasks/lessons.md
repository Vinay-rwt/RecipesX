# Lessons Learned

## 1. Always create a new feature branch for each phase
**Date:** 2026-04-03
**Mistake:** Started Phase 2 implementation on the `feature/phase1-foundation` branch instead of creating `feature/phase2-onboarding-profile` from `develop`.
**Fix:** Stashed changes, switched to develop, created new branch, merged Phase 1 in, then popped stash.
**Rule:** When starting a new phase/feature, ALWAYS create a new branch from `develop` first — even if the previous phase's PR hasn't been merged yet. Merge the dependency branch into the new feature branch if needed.

## 2. Use PLAN.md as the single source of truth
**Date:** 2026-04-04
**Mistake:** Spent excessive tokens at the start of a session exploring the entire codebase, reading session memory, and re-deriving context that should have already been documented.
**Fix:** Created `PLAN.md` at project root with all 7 phases, completion status, architecture decisions, and file inventory.
**Rule:** ALWAYS read `PLAN.md` first. Update it after completing each phase. Never re-explore the full project to figure out what's done — it's all in the plan file.
