/**
 * Seeds the Firestore conversionMatrix collection with initial conversion data.
 *
 * Usage (with emulators running):
 *   npx ts-node scripts/seed-conversion-matrix.ts
 *
 * Or via npm script:
 *   npm run seed:conversions
 *
 * This script connects to the Firestore emulator at localhost:8080.
 * It uses the Firebase client SDK (not Admin SDK) for simplicity.
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, connectFirestoreEmulator, doc, setDoc } from 'firebase/firestore';

const app = initializeApp({
  apiKey: 'demo-key',
  projectId: 'demo-recipeshare',
});

const db = getFirestore(app);
connectFirestoreEmulator(db, 'localhost', 8080);

interface ConversionEntry {
  sourceEquipment: string;
  targetEquipment: string;
  technique: string;
  tempFactor: number;
  tempOffset: number;     // Celsius
  timeFactor: number;
  timeOffset: number;     // minutes
  techniqueNotes: string;
  confidence: 'high' | 'medium' | 'low';
}

// Helper: creates a bidirectional pair with inverse factors
function pair(
  source: string,
  target: string,
  technique: string,
  tempFactor: number,
  tempOffset: number,
  timeFactor: number,
  timeOffset: number,
  notesForward: string,
  notesReverse: string,
  confidence: 'high' | 'medium' | 'low' = 'high',
): ConversionEntry[] {
  return [
    {
      sourceEquipment: source,
      targetEquipment: target,
      technique,
      tempFactor,
      tempOffset,
      timeFactor,
      timeOffset,
      techniqueNotes: notesForward,
      confidence,
    },
    {
      sourceEquipment: target,
      targetEquipment: source,
      technique,
      tempFactor: 1 / tempFactor,
      tempOffset: -tempOffset / tempFactor,
      timeFactor: 1 / timeFactor,
      timeOffset: -timeOffset / timeFactor,
      techniqueNotes: notesReverse,
      confidence,
    },
  ];
}

const entries: ConversionEntry[] = [
  // === Air Fryer <-> Conventional Oven ===
  ...pair('air_fryer', 'conventional_oven', 'default',
    1.0, 20, 1.25, 0,
    'Increase oven temp by 20°C. Cook 25% longer. Use middle rack.',
    'Decrease air fryer temp by 20°C. Cook 20% less time. Shake basket halfway.',
  ),
  ...pair('air_fryer', 'conventional_oven', 'bake',
    1.0, 15, 1.2, 0,
    'Increase oven temp by 15°C for baking. Time increases ~20%.',
    'Decrease air fryer temp by 15°C. Reduce baking time ~17%.',
  ),
  ...pair('air_fryer', 'conventional_oven', 'roast',
    1.0, 25, 1.3, 0,
    'Increase oven temp by 25°C for roasting. Cook 30% longer. Baste occasionally.',
    'Decrease air fryer temp by 25°C. Reduce roasting time ~23%.',
  ),

  // === Microwave <-> Conventional Oven ===
  ...pair('microwave', 'conventional_oven', 'default',
    1.0, 0, 4.0, 5,
    'Oven takes ~4x longer than microwave. Preheat oven. Add 5 min for warming up.',
    'Microwave is ~4x faster. Use 70% power for even heating. Cover to retain moisture.',
    'medium',
  ),
  ...pair('microwave', 'conventional_oven', 'reheat',
    1.0, 0, 3.0, 0,
    'Oven reheating takes ~3x longer. Use 175°C. Cover with foil to prevent drying.',
    'Microwave reheating is ~3x faster. Use 50-70% power. Stir halfway.',
  ),

  // === Toaster Oven <-> Conventional Oven ===
  ...pair('toaster_oven', 'conventional_oven', 'default',
    1.0, 0, 1.0, 0,
    'Same temp and time. Toaster ovens run slightly hotter — check 5 min early.',
    'Same temp and time. May need to rotate pan for even browning.',
  ),
  ...pair('toaster_oven', 'conventional_oven', 'bake',
    1.0, -10, 1.0, 0,
    'Reduce oven temp by 10°C (toaster ovens concentrate heat). Same time.',
    'Increase toaster oven temp by 10°C. Watch closely — smaller cavity heats faster.',
  ),

  // === Stovetop <-> Conventional Oven ===
  ...pair('stovetop', 'conventional_oven', 'default',
    1.0, 0, 1.5, 10,
    'Oven takes ~50% longer. Set to 175°C. Transfer to oven-safe dish.',
    'Stovetop is faster. Use medium heat. Stir frequently for even cooking.',
    'medium',
  ),
  ...pair('stovetop', 'conventional_oven', 'simmer',
    1.0, 0, 1.3, 5,
    'For simmering dishes, oven at 150°C works well. Add 5 min warmup.',
    'Transfer to stovetop on low heat. Stir occasionally.',
  ),

  // === Grill <-> Conventional Oven ===
  ...pair('grill', 'conventional_oven', 'default',
    1.0, -15, 1.1, 5,
    'Reduce oven temp by 15°C. Use broil setting for char. Add 5 min preheat.',
    'Grill runs hotter. Increase temp by 15°C. Watch for flare-ups.',
  ),
  ...pair('grill', 'conventional_oven', 'roast',
    1.0, -20, 1.2, 5,
    'For roasting, reduce oven temp 20°C. Use convection if available.',
    'Grill roasting: increase temp 20°C. Use indirect heat for large cuts.',
    'medium',
  ),

  // === Pressure Cooker <-> Conventional Oven ===
  ...pair('pressure_cooker', 'conventional_oven', 'default',
    1.0, 0, 3.5, 15,
    'Oven takes ~3.5x longer. Add 15 min for preheat. Use 160°C for stews/braises.',
    'Pressure cooker is ~3.5x faster. Use high pressure. Natural release for meats.',
    'medium',
  ),

  // === Slow Cooker <-> Conventional Oven ===
  ...pair('slow_cooker', 'conventional_oven', 'default',
    1.0, 0, 0.25, 0,
    'Oven at 150°C takes ~1/4 the time. Cover tightly with foil. Check liquid levels.',
    'Slow cooker on low takes ~4x longer. Add liquid. Do not open lid frequently.',
  ),
];

async function seed(): Promise<void> {
  console.log(`Seeding ${entries.length} conversion entries...`);

  for (const entry of entries) {
    const docId = `${entry.sourceEquipment}__${entry.targetEquipment}__${entry.technique}`;
    const ref = doc(db, 'conversionMatrix', docId);
    await setDoc(ref, entry);
    console.log(`  ✓ ${docId}`);
  }

  console.log('Done!');
  process.exit(0);
}

seed().catch(err => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
