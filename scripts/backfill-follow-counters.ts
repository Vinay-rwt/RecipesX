/**
 * Backfills `followersCount` and `followingCount` on legacy user documents.
 *
 * Pre-Phase-13 user docs do not have these fields. The new firestore.rules
 * non-owner update branch does `resource.data.followersCount + 1`, which fails
 * with undefined arithmetic and silently breaks every follow attempt against a
 * pre-existing user. Also `increment(-1)` on a missing field sets it to -1
 * rather than 0, leaving counters in an invalid state.
 *
 * Run this script ONCE against the target environment before deploying the
 * tightened rules.
 *
 * Usage:
 *   # Emulator (safe, idempotent test run):
 *   FIRESTORE_EMULATOR_HOST=localhost:8080 \
 *     npx ts-node --compiler-options '{"module":"commonjs"}' scripts/backfill-follow-counters.ts
 *
 *   # Production (use with care — needs a service account):
 *   GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json \
 *   GCLOUD_PROJECT=<your-prod-project-id> \
 *     npx ts-node --compiler-options '{"module":"commonjs"}' scripts/backfill-follow-counters.ts
 */

import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

const isEmulator = !!process.env['FIRESTORE_EMULATOR_HOST'];
const isProd = !!process.env['GOOGLE_APPLICATION_CREDENTIALS'];

if (!isEmulator && !isProd) {
  throw new Error(
    'Refusing to run: set FIRESTORE_EMULATOR_HOST=localhost:8080 (for emulator) ' +
    'or GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json (for production).'
  );
}

initializeApp(
  isEmulator
    ? { projectId: process.env['GCLOUD_PROJECT'] ?? 'demo-recipeshare' }
    : { credential: applicationDefault() }
);

const db = getFirestore();
const BATCH_SIZE = 400;

async function backfill(): Promise<void> {
  console.error(
    `[backfill] Mode: ${isEmulator ? 'EMULATOR' : 'PRODUCTION'}` +
    (isProd ? ` (project: ${process.env['GCLOUD_PROJECT'] ?? '<default>'})` : '')
  );

  const snap = await db.collection('users').get();
  console.error(`[backfill] Found ${snap.size} user document(s).`);

  let updated = 0;
  let alreadyOk = 0;
  let batch = db.batch();
  let pending = 0;

  for (const doc of snap.docs) {
    const data = doc.data();
    const needsFollowers = typeof data['followersCount'] !== 'number';
    const needsFollowing = typeof data['followingCount'] !== 'number';

    if (!needsFollowers && !needsFollowing) {
      alreadyOk++;
      continue;
    }

    const updates: Record<string, unknown> = { updatedAt: FieldValue.serverTimestamp() };
    if (needsFollowers) updates['followersCount'] = 0;
    if (needsFollowing) updates['followingCount'] = 0;

    batch.set(doc.ref, updates, { merge: true });
    pending++;
    updated++;

    if (pending >= BATCH_SIZE) {
      await batch.commit();
      console.error(`[backfill] Committed batch (${pending} writes). Total updated: ${updated}.`);
      batch = db.batch();
      pending = 0;
    }
  }

  if (pending > 0) {
    await batch.commit();
    console.error(`[backfill] Committed final batch (${pending} writes).`);
  }

  console.error(`[backfill] Done. Updated: ${updated}. Already OK: ${alreadyOk}.`);
}

backfill().catch(err => {
  console.error('[backfill] Failed:', err);
  process.exit(1);
});
