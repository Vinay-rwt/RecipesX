/**
 * Seeds the Firestore recipes collection with 40 sample recipes.
 *
 * Usage (with emulators running):
 *   npm run seed:recipes
 *
 * Connects to the Firestore emulator at localhost:8080.
 */

import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Point Admin SDK at the local emulator — no service account needed
process.env['FIRESTORE_EMULATOR_HOST'] = 'localhost:8080';

initializeApp({ projectId: 'demo-recipeshare' });

const db = getFirestore();

// ─── Types ────────────────────────────────────────────────────────────────────

interface Ingredient {
  name: string;
  quantity: number;
  unit: string;
  group: string;
}

interface RecipeStep {
  order: number;
  instruction: string;
  temperature?: number;
  duration?: number;
  equipment?: string;
  technique?: string;
}

interface Recipe {
  id: string;
  authorId: string;
  authorName: string;
  title: string;
  description: string;
  photoURLs: string[];
  coverEmoji: string;
  sourceEquipment: string;
  ingredients: Ingredient[];
  baseServings: number;
  steps: RecipeStep[];
  tags: string[];
  cuisineType: string;
  difficulty: 'easy' | 'medium' | 'hard';
  prepTime: number;
  cookTime: number;
  likeCount: number;
  saveCount: number;
  status: 'published';
  searchTokens: string[];
  createdAt: Date;
  updatedAt: Date;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const SYSTEM_AUTHOR_ID = 'system_seed';

function tokens(...parts: string[]): string[] {
  const set = new Set<string>();
  parts.forEach(p =>
    p.toLowerCase().split(/\s+/).forEach(word => {
      for (let i = 2; i <= word.length; i++) set.add(word.slice(0, i));
    }),
  );
  return Array.from(set);
}

function makeId(title: string): string {
  // Stable slug from title so re-runs overwrite the same documents
  return 'seed_' + title.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
}

function recipe(r: Omit<Recipe, 'id' | 'authorId' | 'authorName' | 'photoURLs' | 'likeCount' | 'saveCount' | 'status' | 'createdAt' | 'updatedAt' | 'searchTokens'>): Recipe {
  return {
    ...r,
    id: makeId(r.title),
    authorId: SYSTEM_AUTHOR_ID,
    authorName: 'RecipeShare Kitchen',
    photoURLs: [],
    likeCount: Math.floor(Math.random() * 120),
    saveCount: Math.floor(Math.random() * 60),
    status: 'published',
    searchTokens: tokens(r.title, r.cuisineType, ...r.tags),
    createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
    updatedAt: new Date(),
  };
}

// ─── Recipe Data ──────────────────────────────────────────────────────────────

const RECIPES: Recipe[] = [

  // ── ITALIAN ────────────────────────────────────────────────────────────────

  recipe({
    title: 'Spaghetti Carbonara',
    coverEmoji: '🍝',
    cuisineType: 'Italian',
    difficulty: 'medium',
    prepTime: 10,
    cookTime: 20,
    baseServings: 2,
    sourceEquipment: 'stovetop',
    description: 'Classic Roman pasta with eggs, Pecorino, guanciale and black pepper. Silky, rich and no cream needed.',
    tags: ['pasta', 'quick', 'italian classic'],
    ingredients: [
      { name: 'Spaghetti', quantity: 200, unit: 'g', group: '' },
      { name: 'Guanciale or pancetta', quantity: 100, unit: 'g', group: '' },
      { name: 'Egg yolks', quantity: 3, unit: 'whole', group: '' },
      { name: 'Pecorino Romano, grated', quantity: 60, unit: 'g', group: '' },
      { name: 'Black pepper, coarsely ground', quantity: 1, unit: 'tsp', group: '' },
      { name: 'Salt', quantity: 1, unit: 'tsp', group: '' },
    ],
    steps: [
      { order: 1, instruction: 'Bring a large pot of salted water to a boil. Cook spaghetti until al dente per package directions.', duration: 10, equipment: 'stovetop' },
      { order: 2, instruction: 'While pasta cooks, fry guanciale in a pan over medium heat until crispy. Remove from heat.', duration: 8, equipment: 'stovetop' },
      { order: 3, instruction: 'Whisk egg yolks with grated Pecorino and black pepper in a bowl until combined.' },
      { order: 4, instruction: 'Reserve 1 cup pasta water. Drain pasta and add immediately to the guanciale pan (off heat).', technique: 'The residual heat is key — no direct flame or eggs will scramble.' },
      { order: 5, instruction: 'Pour egg mixture over pasta and toss vigorously, adding pasta water a splash at a time until sauce is glossy and coats every strand.' },
    ],
  }),

  recipe({
    title: 'Margherita Pizza',
    coverEmoji: '🍕',
    cuisineType: 'Italian',
    difficulty: 'medium',
    prepTime: 90,
    cookTime: 12,
    baseServings: 2,
    sourceEquipment: 'conventional_oven',
    description: 'The queen of pizzas — thin, blistered crust with tomato, fresh mozzarella and basil.',
    tags: ['pizza', 'baking', 'vegetarian'],
    ingredients: [
      { name: 'Strong bread flour', quantity: 300, unit: 'g', group: 'Dough' },
      { name: 'Instant yeast', quantity: 7, unit: 'g', group: 'Dough' },
      { name: 'Salt', quantity: 1, unit: 'tsp', group: 'Dough' },
      { name: 'Olive oil', quantity: 1, unit: 'tbsp', group: 'Dough' },
      { name: 'Warm water', quantity: 180, unit: 'ml', group: 'Dough' },
      { name: 'Crushed San Marzano tomatoes', quantity: 200, unit: 'g', group: 'Topping' },
      { name: 'Fresh mozzarella', quantity: 125, unit: 'g', group: 'Topping' },
      { name: 'Fresh basil leaves', quantity: 10, unit: 'whole', group: 'Topping' },
      { name: 'Extra virgin olive oil', quantity: 1, unit: 'tbsp', group: 'Topping' },
    ],
    steps: [
      { order: 1, instruction: 'Mix flour, yeast, salt and olive oil. Add warm water gradually and knead for 10 minutes until smooth. Rest 1 hour.', duration: 70 },
      { order: 2, instruction: 'Preheat oven to its maximum temperature (250°C+) with a baking tray inside.', temperature: 250, duration: 30, equipment: 'conventional_oven' },
      { order: 3, instruction: 'Stretch dough on a floured surface into a thin 30cm round.' },
      { order: 4, instruction: 'Spread tomatoes thinly, tear mozzarella over the top, drizzle with olive oil.' },
      { order: 5, instruction: 'Slide onto the hot tray and bake 10-12 min until crust is blistered and golden.', duration: 12, temperature: 250, equipment: 'conventional_oven' },
      { order: 6, instruction: 'Scatter fresh basil over pizza immediately after removing from oven.' },
    ],
  }),

  recipe({
    title: 'Risotto alla Milanese',
    coverEmoji: '🍚',
    cuisineType: 'Italian',
    difficulty: 'hard',
    prepTime: 10,
    cookTime: 30,
    baseServings: 4,
    sourceEquipment: 'stovetop',
    description: 'Golden saffron risotto from Milan — buttery, creamy and deeply satisfying.',
    tags: ['risotto', 'saffron', 'italian classic'],
    ingredients: [
      { name: 'Arborio rice', quantity: 320, unit: 'g', group: '' },
      { name: 'Chicken stock, warm', quantity: 1, unit: 'L', group: '' },
      { name: 'Dry white wine', quantity: 100, unit: 'ml', group: '' },
      { name: 'Saffron threads', quantity: 0.5, unit: 'tsp', group: '' },
      { name: 'Shallot, finely diced', quantity: 1, unit: 'whole', group: '' },
      { name: 'Butter', quantity: 60, unit: 'g', group: '' },
      { name: 'Parmesan, grated', quantity: 80, unit: 'g', group: '' },
      { name: 'Salt and pepper', quantity: 1, unit: 'pinch', group: '' },
    ],
    steps: [
      { order: 1, instruction: 'Steep saffron in 3 tbsp warm stock for 10 minutes.' },
      { order: 2, instruction: 'Melt half the butter in a wide pan over medium heat. Soften shallot 3 minutes.', duration: 3, equipment: 'stovetop' },
      { order: 3, instruction: 'Add rice and toast, stirring, for 2 minutes until translucent at edges.', duration: 2, equipment: 'stovetop', technique: 'Toasting the rice builds a starch shell that helps it hold its shape while absorbing liquid.' },
      { order: 4, instruction: 'Pour in wine and stir until absorbed. Add saffron stock.' },
      { order: 5, instruction: 'Add warm stock one ladle at a time, stirring continuously. Wait until each addition is absorbed before adding more.', duration: 18, equipment: 'stovetop' },
      { order: 6, instruction: 'When rice is al dente and mixture is creamy, remove from heat. Beat in remaining butter and Parmesan. Rest 2 minutes, then serve.' },
    ],
  }),

  // ── MEXICAN ────────────────────────────────────────────────────────────────

  recipe({
    title: 'Chicken Enchiladas',
    coverEmoji: '🫔',
    cuisineType: 'Mexican',
    difficulty: 'medium',
    prepTime: 20,
    cookTime: 25,
    baseServings: 4,
    sourceEquipment: 'conventional_oven',
    description: 'Corn tortillas filled with tender chicken, smothered in red chilli sauce and melted cheese.',
    tags: ['enchiladas', 'chicken', 'baked'],
    ingredients: [
      { name: 'Corn tortillas', quantity: 8, unit: 'whole', group: '' },
      { name: 'Cooked chicken, shredded', quantity: 400, unit: 'g', group: '' },
      { name: 'Red enchilada sauce', quantity: 400, unit: 'ml', group: '' },
      { name: 'Cheddar or Monterey Jack, grated', quantity: 200, unit: 'g', group: '' },
      { name: 'Sour cream, to serve', quantity: 4, unit: 'tbsp', group: '' },
      { name: 'Fresh coriander', quantity: 1, unit: 'bunch', group: '' },
    ],
    steps: [
      { order: 1, instruction: 'Preheat oven to 190°C.', temperature: 190, equipment: 'conventional_oven' },
      { order: 2, instruction: 'Spread a thin layer of enchilada sauce on the base of a baking dish.' },
      { order: 3, instruction: 'Warm tortillas in microwave for 30 sec to make pliable. Fill each with chicken and 2 tbsp cheese, roll up and place seam-side down in dish.', duration: 1, equipment: 'microwave' },
      { order: 4, instruction: 'Pour remaining sauce over rolls, scatter remaining cheese on top.' },
      { order: 5, instruction: 'Bake 20-25 min until sauce is bubbling and cheese is golden.', duration: 25, temperature: 190, equipment: 'conventional_oven' },
      { order: 6, instruction: 'Serve with sour cream and fresh coriander.' },
    ],
  }),

  recipe({
    title: 'Guacamole',
    coverEmoji: '🥑',
    cuisineType: 'Mexican',
    difficulty: 'easy',
    prepTime: 10,
    cookTime: 0,
    baseServings: 4,
    sourceEquipment: 'stovetop',
    description: 'Fresh, chunky guacamole — the only recipe you\'ll ever need. Ready in 10 minutes.',
    tags: ['dip', 'vegetarian', 'vegan', 'quick', 'no-cook'],
    ingredients: [
      { name: 'Ripe avocados', quantity: 3, unit: 'whole', group: '' },
      { name: 'Lime juice', quantity: 2, unit: 'tbsp', group: '' },
      { name: 'Red onion, finely diced', quantity: 0.25, unit: 'cup', group: '' },
      { name: 'Fresh coriander, chopped', quantity: 2, unit: 'tbsp', group: '' },
      { name: 'Jalapeño, finely minced', quantity: 1, unit: 'whole', group: '' },
      { name: 'Salt', quantity: 0.5, unit: 'tsp', group: '' },
    ],
    steps: [
      { order: 1, instruction: 'Halve and pit avocados. Scoop flesh into a bowl.' },
      { order: 2, instruction: 'Add lime juice and salt, then mash with a fork — leave some chunks for texture.', technique: 'Lime juice prevents browning as well as adding brightness.' },
      { order: 3, instruction: 'Fold in onion, coriander and jalapeño. Taste and adjust salt and lime.' },
      { order: 4, instruction: 'Serve immediately or press plastic wrap directly onto the surface to prevent browning.' },
    ],
  }),

  recipe({
    title: 'Tacos al Pastor',
    coverEmoji: '🌮',
    cuisineType: 'Mexican',
    difficulty: 'medium',
    prepTime: 30,
    cookTime: 20,
    baseServings: 4,
    sourceEquipment: 'grill',
    description: 'Marinated pork tacos with pineapple, onion and coriander — a street-food classic.',
    tags: ['tacos', 'pork', 'street food', 'spicy'],
    ingredients: [
      { name: 'Pork shoulder, thinly sliced', quantity: 600, unit: 'g', group: '' },
      { name: 'Dried guajillo chillies', quantity: 3, unit: 'whole', group: 'Marinade' },
      { name: 'Dried ancho chilli', quantity: 1, unit: 'whole', group: 'Marinade' },
      { name: 'Pineapple juice', quantity: 100, unit: 'ml', group: 'Marinade' },
      { name: 'Achiote paste', quantity: 2, unit: 'tbsp', group: 'Marinade' },
      { name: 'Garlic cloves', quantity: 3, unit: 'clove', group: 'Marinade' },
      { name: 'White vinegar', quantity: 2, unit: 'tbsp', group: 'Marinade' },
      { name: 'Corn tortillas (small)', quantity: 12, unit: 'whole', group: '' },
      { name: 'Pineapple chunks', quantity: 200, unit: 'g', group: 'To serve' },
      { name: 'White onion, diced', quantity: 1, unit: 'whole', group: 'To serve' },
      { name: 'Fresh coriander', quantity: 1, unit: 'bunch', group: 'To serve' },
    ],
    steps: [
      { order: 1, instruction: 'Toast dried chillies in a dry pan 30 sec each side. Remove seeds and soak in hot water 15 min.', duration: 20, equipment: 'stovetop' },
      { order: 2, instruction: 'Blend soaked chillies with pineapple juice, achiote, garlic and vinegar into a smooth marinade.' },
      { order: 3, instruction: 'Coat pork slices thoroughly in marinade. Rest at least 30 min (or overnight).', duration: 30 },
      { order: 4, instruction: 'Grill pork over high heat 3-4 min per side until charred at edges and cooked through.', duration: 8, equipment: 'grill', technique: 'High heat caramelises the achiote and creates those essential charred bits.' },
      { order: 5, instruction: 'Warm tortillas on grill 30 sec each side. Load with pork, pineapple, onion and coriander.' },
    ],
  }),

  // ── CHINESE ────────────────────────────────────────────────────────────────

  recipe({
    title: 'Kung Pao Chicken',
    coverEmoji: '🍗',
    cuisineType: 'Chinese',
    difficulty: 'medium',
    prepTime: 20,
    cookTime: 15,
    baseServings: 3,
    sourceEquipment: 'stovetop',
    description: 'Sichuan classic with tender chicken, peanuts, dried chillies and a punchy sweet-spicy sauce.',
    tags: ['stir-fry', 'spicy', 'chicken', 'sichuan'],
    ingredients: [
      { name: 'Chicken breast, diced 2cm', quantity: 400, unit: 'g', group: '' },
      { name: 'Roasted peanuts', quantity: 60, unit: 'g', group: '' },
      { name: 'Dried red chillies', quantity: 8, unit: 'whole', group: '' },
      { name: 'Sichuan peppercorns', quantity: 1, unit: 'tsp', group: '' },
      { name: 'Spring onions, sliced', quantity: 3, unit: 'whole', group: '' },
      { name: 'Soy sauce', quantity: 2, unit: 'tbsp', group: 'Sauce' },
      { name: 'Dark vinegar (Chinkiang)', quantity: 1, unit: 'tbsp', group: 'Sauce' },
      { name: 'Sugar', quantity: 1, unit: 'tsp', group: 'Sauce' },
      { name: 'Sesame oil', quantity: 1, unit: 'tsp', group: 'Sauce' },
      { name: 'Cornstarch', quantity: 1, unit: 'tsp', group: 'Sauce' },
      { name: 'Neutral oil', quantity: 2, unit: 'tbsp', group: '' },
    ],
    steps: [
      { order: 1, instruction: 'Mix sauce ingredients together in a small bowl. Set aside.' },
      { order: 2, instruction: 'Heat oil in a wok or pan over high heat until smoking. Add dried chillies and Sichuan peppercorns, stir 20 seconds.', duration: 1, equipment: 'stovetop', technique: 'Blooming spices in hot oil extracts their fat-soluble flavour compounds.' },
      { order: 3, instruction: 'Add chicken and stir-fry 4-5 min until golden all over.', duration: 5, equipment: 'stovetop' },
      { order: 4, instruction: 'Pour in sauce and toss to coat. Cook 1 min until glossy.' },
      { order: 5, instruction: 'Add peanuts and spring onions. Toss once more and serve immediately with rice.' },
    ],
  }),

  recipe({
    title: 'Egg Fried Rice',
    coverEmoji: '🍳',
    cuisineType: 'Chinese',
    difficulty: 'easy',
    prepTime: 5,
    cookTime: 10,
    baseServings: 2,
    sourceEquipment: 'stovetop',
    description: 'The best use of day-old rice — smoky, savory and on the table in 10 minutes.',
    tags: ['rice', 'quick', 'leftover', 'vegetarian option'],
    ingredients: [
      { name: 'Cooked rice (day-old)', quantity: 2, unit: 'cup', group: '' },
      { name: 'Eggs', quantity: 2, unit: 'whole', group: '' },
      { name: 'Spring onions, sliced', quantity: 3, unit: 'whole', group: '' },
      { name: 'Soy sauce', quantity: 2, unit: 'tbsp', group: '' },
      { name: 'Sesame oil', quantity: 1, unit: 'tsp', group: '' },
      { name: 'Neutral oil', quantity: 2, unit: 'tbsp', group: '' },
      { name: 'Frozen peas', quantity: 0.5, unit: 'cup', group: '' },
    ],
    steps: [
      { order: 1, instruction: 'Heat oil in a wok or large frying pan over very high heat.', equipment: 'stovetop' },
      { order: 2, instruction: 'Add rice and press flat. Let it sit untouched 1 min to crisp, then toss.', duration: 3, technique: 'Day-old rice has less moisture, which creates better crisping.' },
      { order: 3, instruction: 'Push rice to the side, pour eggs into the empty space and scramble quickly.', duration: 1 },
      { order: 4, instruction: 'Mix eggs through rice. Add peas, soy sauce and sesame oil. Toss 2 min.' },
      { order: 5, instruction: 'Scatter spring onions over top and serve.' },
    ],
  }),

  recipe({
    title: 'Pork & Cabbage Dumplings',
    coverEmoji: '🥟',
    cuisineType: 'Chinese',
    difficulty: 'hard',
    prepTime: 60,
    cookTime: 15,
    baseServings: 4,
    sourceEquipment: 'stovetop',
    description: 'Handmade dumplings with juicy pork-cabbage filling — worth every fold.',
    tags: ['dumplings', 'pork', 'dim sum', 'handmade'],
    ingredients: [
      { name: 'Plain flour', quantity: 300, unit: 'g', group: 'Dough' },
      { name: 'Boiling water', quantity: 150, unit: 'ml', group: 'Dough' },
      { name: 'Pork mince', quantity: 300, unit: 'g', group: 'Filling' },
      { name: 'Napa cabbage, finely shredded', quantity: 200, unit: 'g', group: 'Filling' },
      { name: 'Ginger, grated', quantity: 1, unit: 'tsp', group: 'Filling' },
      { name: 'Soy sauce', quantity: 2, unit: 'tbsp', group: 'Filling' },
      { name: 'Sesame oil', quantity: 1, unit: 'tsp', group: 'Filling' },
      { name: 'Soy sauce & black vinegar', quantity: 2, unit: 'tbsp', group: 'Dipping' },
    ],
    steps: [
      { order: 1, instruction: 'Mix flour with boiling water, knead 8 min into a smooth dough. Rest covered 30 min.', duration: 40 },
      { order: 2, instruction: 'Salt shredded cabbage, leave 10 min, then squeeze out all moisture. Mix with pork, ginger, soy sauce and sesame oil.', duration: 15 },
      { order: 3, instruction: 'Roll dough into a log, cut into 30 pieces, roll each into a thin 8cm round.' },
      { order: 4, instruction: 'Place 1 tsp filling in center of each wrapper. Fold and pleat to seal.', technique: 'Pinch 5-7 pleats along one side for the classic crescent shape.' },
      { order: 5, instruction: 'Bring water to a boil. Add dumplings in batches, cook 6-8 min until they float and skin is translucent.', duration: 8, equipment: 'stovetop' },
      { order: 6, instruction: 'Serve with soy-vinegar dipping sauce.' },
    ],
  }),

  // ── INDIAN ─────────────────────────────────────────────────────────────────

  recipe({
    title: 'Butter Chicken',
    coverEmoji: '🍛',
    cuisineType: 'Indian',
    difficulty: 'medium',
    prepTime: 20,
    cookTime: 35,
    baseServings: 4,
    sourceEquipment: 'stovetop',
    description: 'Creamy, mildly spiced tomato-butter sauce with tender marinated chicken. The world\'s favourite curry.',
    tags: ['curry', 'chicken', 'comfort food', 'popular'],
    ingredients: [
      { name: 'Chicken thighs, boneless, cubed', quantity: 700, unit: 'g', group: 'Chicken' },
      { name: 'Greek yoghurt', quantity: 4, unit: 'tbsp', group: 'Chicken' },
      { name: 'Lemon juice', quantity: 1, unit: 'tbsp', group: 'Chicken' },
      { name: 'Garam masala', quantity: 1, unit: 'tsp', group: 'Chicken' },
      { name: 'Butter', quantity: 40, unit: 'g', group: 'Sauce' },
      { name: 'Onion, diced', quantity: 1, unit: 'whole', group: 'Sauce' },
      { name: 'Garlic cloves', quantity: 4, unit: 'clove', group: 'Sauce' },
      { name: 'Ginger, grated', quantity: 1, unit: 'tbsp', group: 'Sauce' },
      { name: 'Tomato passata', quantity: 400, unit: 'ml', group: 'Sauce' },
      { name: 'Double cream', quantity: 150, unit: 'ml', group: 'Sauce' },
      { name: 'Cumin, coriander, chilli powder', quantity: 1, unit: 'tsp', group: 'Sauce' },
      { name: 'Kashmiri red chilli powder', quantity: 1, unit: 'tsp', group: 'Sauce' },
    ],
    steps: [
      { order: 1, instruction: 'Marinate chicken in yoghurt, lemon juice and garam masala for at least 30 min.', duration: 30 },
      { order: 2, instruction: 'Cook marinated chicken in a hot pan with a little oil until charred and cooked through. Set aside.', duration: 10, equipment: 'stovetop' },
      { order: 3, instruction: 'In same pan, melt butter and cook onion until golden, 8 min. Add garlic and ginger, cook 2 min.', duration: 10, equipment: 'stovetop' },
      { order: 4, instruction: 'Add spices and cook 1 min. Pour in passata, simmer 10 min.', duration: 11, equipment: 'stovetop' },
      { order: 5, instruction: 'Blend sauce until smooth. Return to pan with cream and chicken. Simmer 5 min.', duration: 5 },
    ],
  }),

  recipe({
    title: 'Dal Tadka',
    coverEmoji: '🥘',
    cuisineType: 'Indian',
    difficulty: 'easy',
    prepTime: 10,
    cookTime: 30,
    baseServings: 4,
    sourceEquipment: 'stovetop',
    description: 'Comforting yellow lentil dal with a smoky spiced butter temper. Ready in 30 minutes.',
    tags: ['lentils', 'vegan', 'vegetarian', 'comfort food', 'quick'],
    ingredients: [
      { name: 'Yellow split lentils (toor dal)', quantity: 250, unit: 'g', group: '' },
      { name: 'Water', quantity: 750, unit: 'ml', group: '' },
      { name: 'Turmeric', quantity: 0.5, unit: 'tsp', group: '' },
      { name: 'Ghee', quantity: 2, unit: 'tbsp', group: 'Tadka' },
      { name: 'Cumin seeds', quantity: 1, unit: 'tsp', group: 'Tadka' },
      { name: 'Garlic, thinly sliced', quantity: 4, unit: 'clove', group: 'Tadka' },
      { name: 'Dried red chillies', quantity: 2, unit: 'whole', group: 'Tadka' },
      { name: 'Tomato, chopped', quantity: 2, unit: 'whole', group: '' },
      { name: 'Salt', quantity: 1, unit: 'tsp', group: '' },
      { name: 'Fresh coriander', quantity: 1, unit: 'bunch', group: '' },
    ],
    steps: [
      { order: 1, instruction: 'Rinse lentils until water runs clear. Cook with water and turmeric over medium heat until completely soft, about 25 min. Stir in salt and tomatoes.', duration: 25, equipment: 'stovetop' },
      { order: 2, instruction: 'For the tadka: heat ghee in a small pan over high heat. Add cumin seeds — they should sizzle immediately.', duration: 2, equipment: 'stovetop', technique: 'The sizzle tells you the ghee is hot enough to bloom the spices properly.' },
      { order: 3, instruction: 'Add garlic and dried chillies to the tadka. Fry 30 seconds until garlic is golden.' },
      { order: 4, instruction: 'Pour the hot tadka directly over the dal. Top with fresh coriander and serve with rice or roti.' },
    ],
  }),

  recipe({
    title: 'Chicken Biryani',
    coverEmoji: '🍚',
    cuisineType: 'Indian',
    difficulty: 'hard',
    prepTime: 45,
    cookTime: 45,
    baseServings: 6,
    sourceEquipment: 'stovetop',
    description: 'Fragrant layered rice and chicken slow-cooked with whole spices and saffron.',
    tags: ['biryani', 'chicken', 'rice', 'celebration'],
    ingredients: [
      { name: 'Basmati rice', quantity: 400, unit: 'g', group: '' },
      { name: 'Chicken pieces, bone-in', quantity: 1, unit: 'kg', group: '' },
      { name: 'Onions, thinly sliced', quantity: 3, unit: 'whole', group: '' },
      { name: 'Yoghurt', quantity: 150, unit: 'ml', group: '' },
      { name: 'Biryani masala', quantity: 2, unit: 'tbsp', group: '' },
      { name: 'Saffron in warm milk', quantity: 2, unit: 'tbsp', group: '' },
      { name: 'Bay leaves, cardamom, cloves', quantity: 3, unit: 'whole', group: '' },
      { name: 'Ghee', quantity: 3, unit: 'tbsp', group: '' },
      { name: 'Fresh mint and coriander', quantity: 1, unit: 'bunch', group: '' },
    ],
    steps: [
      { order: 1, instruction: 'Marinate chicken in yoghurt, biryani masala and salt for at least 2 hours.', duration: 120 },
      { order: 2, instruction: 'Fry onions in ghee until deep golden brown (birista). This takes 20-25 min on medium heat.', duration: 25, equipment: 'stovetop', technique: 'Truly golden, crispy fried onions are non-negotiable for authentic biryani flavour.' },
      { order: 3, instruction: 'Parboil rice with whole spices until 70% cooked (4 min in boiling salted water). Drain.', duration: 4, equipment: 'stovetop' },
      { order: 4, instruction: 'Cook marinated chicken in a heavy pot until half-done, 10 min.', duration: 10, equipment: 'stovetop' },
      { order: 5, instruction: 'Layer parboiled rice over chicken. Top with fried onions, saffron milk, mint and coriander.' },
      { order: 6, instruction: 'Seal pot tightly with foil then lid. Cook on low heat 25 min (dum cooking).', duration: 25, equipment: 'stovetop', technique: 'Dum cooking traps steam so rice and chicken cook together, absorbing each other\'s flavour.' },
    ],
  }),

  // ── JAPANESE ───────────────────────────────────────────────────────────────

  recipe({
    title: 'Chicken Teriyaki',
    coverEmoji: '🍱',
    cuisineType: 'Japanese',
    difficulty: 'easy',
    prepTime: 10,
    cookTime: 15,
    baseServings: 2,
    sourceEquipment: 'stovetop',
    description: 'Glossy, sweet-savoury chicken that\'s faster than takeout. A weeknight hero.',
    tags: ['chicken', 'quick', 'weeknight', 'sweet'],
    ingredients: [
      { name: 'Chicken thighs, boneless skin-on', quantity: 400, unit: 'g', group: '' },
      { name: 'Soy sauce', quantity: 3, unit: 'tbsp', group: 'Sauce' },
      { name: 'Mirin', quantity: 3, unit: 'tbsp', group: 'Sauce' },
      { name: 'Sake', quantity: 2, unit: 'tbsp', group: 'Sauce' },
      { name: 'Sugar', quantity: 1, unit: 'tbsp', group: 'Sauce' },
      { name: 'Neutral oil', quantity: 1, unit: 'tbsp', group: '' },
    ],
    steps: [
      { order: 1, instruction: 'Mix sauce ingredients together. Score chicken skin a few times to prevent curling.' },
      { order: 2, instruction: 'Heat oil in a pan over medium-high. Cook chicken skin-side down 6-7 min without moving.', duration: 7, equipment: 'stovetop', technique: 'Uninterrupted contact renders the fat and crisps the skin.' },
      { order: 3, instruction: 'Flip chicken, cook 3 min more until cooked through.', duration: 3 },
      { order: 4, instruction: 'Pour sauce into pan. Cook 2-3 min, spooning sauce over chicken, until thickened and glossy.', duration: 3 },
      { order: 5, instruction: 'Slice chicken and serve over steamed rice with sauce drizzled on top.' },
    ],
  }),

  recipe({
    title: 'Tonkotsu Ramen',
    coverEmoji: '🍜',
    cuisineType: 'Japanese',
    difficulty: 'hard',
    prepTime: 30,
    cookTime: 240,
    baseServings: 4,
    sourceEquipment: 'stovetop',
    description: 'Creamy pork bone broth ramen with chashu, soft-boiled eggs and noodles. A labour of love.',
    tags: ['ramen', 'pork', 'noodles', 'soup', 'weekend project'],
    ingredients: [
      { name: 'Pork trotters or neck bones', quantity: 1, unit: 'kg', group: 'Broth' },
      { name: 'Water', quantity: 3, unit: 'L', group: 'Broth' },
      { name: 'Ginger slices', quantity: 4, unit: 'whole', group: 'Broth' },
      { name: 'Pork belly (for chashu)', quantity: 400, unit: 'g', group: 'Chashu' },
      { name: 'Soy sauce', quantity: 4, unit: 'tbsp', group: 'Chashu' },
      { name: 'Mirin', quantity: 3, unit: 'tbsp', group: 'Chashu' },
      { name: 'Ramen noodles', quantity: 400, unit: 'g', group: '' },
      { name: 'Soft boiled eggs, halved', quantity: 4, unit: 'whole', group: '' },
      { name: 'Spring onions & nori', quantity: 4, unit: 'slice', group: '' },
    ],
    steps: [
      { order: 1, instruction: 'Blanch pork bones in boiling water 5 min. Drain, rinse and return to a clean pot.', duration: 5, equipment: 'stovetop' },
      { order: 2, instruction: 'Cover bones with 3L cold water. Boil hard on high heat 3-4 hours until broth turns milky white.', duration: 240, equipment: 'stovetop', technique: 'The vigorous boil is essential — it emulsifies fat and collagen into the broth, creating that signature creamy opacity.' },
      { order: 3, instruction: 'Roll pork belly tightly, tie with string. Braise in soy sauce, mirin and 200ml water 2 hours on low.', duration: 120, equipment: 'stovetop' },
      { order: 4, instruction: 'Strain broth and season with salt. Cook ramen noodles separately per package directions.', duration: 5 },
      { order: 5, instruction: 'Divide noodles into bowls. Pour hot broth over. Top with sliced chashu, soft egg, spring onion and nori.' },
    ],
  }),

  recipe({
    title: 'Maki Sushi Rolls',
    coverEmoji: '🍣',
    cuisineType: 'Japanese',
    difficulty: 'medium',
    prepTime: 45,
    cookTime: 20,
    baseServings: 4,
    sourceEquipment: 'stovetop',
    description: 'Homemade maki rolls with seasoned sushi rice — customise fillings to your preference.',
    tags: ['sushi', 'rice', 'fresh', 'fun'],
    ingredients: [
      { name: 'Japanese short grain rice', quantity: 400, unit: 'g', group: '' },
      { name: 'Rice vinegar', quantity: 60, unit: 'ml', group: '' },
      { name: 'Sugar', quantity: 2, unit: 'tbsp', group: '' },
      { name: 'Salt', quantity: 1, unit: 'tsp', group: '' },
      { name: 'Nori sheets', quantity: 6, unit: 'whole', group: '' },
      { name: 'Cucumber, julienned', quantity: 1, unit: 'whole', group: 'Filling' },
      { name: 'Avocado, sliced', quantity: 1, unit: 'whole', group: 'Filling' },
      { name: 'Smoked salmon or cooked prawn', quantity: 150, unit: 'g', group: 'Filling' },
      { name: 'Soy sauce, wasabi, pickled ginger', quantity: 2, unit: 'tbsp', group: 'To serve' },
    ],
    steps: [
      { order: 1, instruction: 'Cook rice per package instructions. While hot, fold through vinegar, sugar and salt. Fan to cool to room temperature.', duration: 25, equipment: 'stovetop', technique: 'Fanning cools rice quickly and gives it a sheen without going gluey.' },
      { order: 2, instruction: 'Place a nori sheet shiny-side down on a bamboo mat. Spread a thin layer of rice over two-thirds of the sheet, leaving a strip clear at the top.' },
      { order: 3, instruction: 'Lay fillings in a line across the center of the rice.' },
      { order: 4, instruction: 'Roll firmly away from you, using the mat to shape into a tight cylinder. Seal with a little water on the bare nori edge.' },
      { order: 5, instruction: 'Wet a sharp knife and slice each roll into 8 pieces with one smooth cut per slice. Serve with soy, wasabi and pickled ginger.' },
    ],
  }),

  // ── AMERICAN ───────────────────────────────────────────────────────────────

  recipe({
    title: 'Classic Beef Burger',
    coverEmoji: '🍔',
    cuisineType: 'American',
    difficulty: 'easy',
    prepTime: 10,
    cookTime: 10,
    baseServings: 2,
    sourceEquipment: 'grill',
    description: 'Juicy smash-style beef burger with American cheese, pickles and special sauce.',
    tags: ['burger', 'beef', 'grill', 'quick'],
    ingredients: [
      { name: 'Beef mince (80/20 fat)', quantity: 300, unit: 'g', group: '' },
      { name: 'Brioche buns', quantity: 2, unit: 'whole', group: '' },
      { name: 'American cheese slices', quantity: 2, unit: 'slice', group: '' },
      { name: 'Pickles', quantity: 6, unit: 'slice', group: '' },
      { name: 'Lettuce, tomato, onion', quantity: 1, unit: 'whole', group: '' },
      { name: 'Mayo, ketchup, mustard', quantity: 2, unit: 'tbsp', group: '' },
      { name: 'Salt and pepper', quantity: 1, unit: 'pinch', group: '' },
    ],
    steps: [
      { order: 1, instruction: 'Divide mince into 2 loose balls. Season generously with salt and pepper. Do not overwork the meat.', technique: 'Loose, uncompressed patties give a better texture after smashing.' },
      { order: 2, instruction: 'Heat grill or cast iron pan to maximum heat. Place ball and smash flat with a spatula. Cook 2-3 min until crust forms.', duration: 3, equipment: 'grill' },
      { order: 3, instruction: 'Flip once. Immediately add cheese slice. Cook 1 min more.', duration: 1 },
      { order: 4, instruction: 'Toast cut side of buns on grill 1 min.', duration: 1, equipment: 'grill' },
      { order: 5, instruction: 'Build burger: sauce on both buns, then patty, pickles, lettuce, tomato and onion.' },
    ],
  }),

  recipe({
    title: 'Mac and Cheese',
    coverEmoji: '🧀',
    cuisineType: 'American',
    difficulty: 'easy',
    prepTime: 10,
    cookTime: 20,
    baseServings: 4,
    sourceEquipment: 'stovetop',
    description: 'Creamy stovetop mac and cheese — rich, gooey and on the table in 30 minutes.',
    tags: ['pasta', 'cheese', 'comfort food', 'vegetarian', 'quick'],
    ingredients: [
      { name: 'Macaroni', quantity: 300, unit: 'g', group: '' },
      { name: 'Butter', quantity: 30, unit: 'g', group: 'Sauce' },
      { name: 'Plain flour', quantity: 2, unit: 'tbsp', group: 'Sauce' },
      { name: 'Whole milk', quantity: 500, unit: 'ml', group: 'Sauce' },
      { name: 'Cheddar, grated', quantity: 150, unit: 'g', group: 'Sauce' },
      { name: 'Gruyère or American cheese, grated', quantity: 100, unit: 'g', group: 'Sauce' },
      { name: 'Dijon mustard', quantity: 1, unit: 'tsp', group: 'Sauce' },
      { name: 'Salt, pepper, nutmeg', quantity: 1, unit: 'pinch', group: '' },
    ],
    steps: [
      { order: 1, instruction: 'Cook macaroni in salted boiling water until al dente. Drain, reserving 100ml pasta water.', duration: 10, equipment: 'stovetop' },
      { order: 2, instruction: 'In a separate saucepan melt butter. Whisk in flour and cook 1 min.', duration: 2, equipment: 'stovetop' },
      { order: 3, instruction: 'Gradually whisk in milk. Cook over medium heat, stirring constantly, until thick, about 5 min.', duration: 5, equipment: 'stovetop', technique: 'Constant stirring prevents lumps forming in the béchamel.' },
      { order: 4, instruction: 'Remove from heat. Add cheese and mustard, stir until melted. Season with salt, pepper and nutmeg.' },
      { order: 5, instruction: 'Fold pasta into sauce. Loosen with pasta water if needed. Serve immediately.' },
    ],
  }),

  recipe({
    title: 'BBQ Pulled Pork',
    coverEmoji: '🥩',
    cuisineType: 'American',
    difficulty: 'medium',
    prepTime: 20,
    cookTime: 480,
    baseServings: 8,
    sourceEquipment: 'slow_cooker',
    description: 'Fall-apart tender pulled pork with smoky BBQ sauce. Practically makes itself in the slow cooker.',
    tags: ['pork', 'bbq', 'slow cook', 'crowd pleaser'],
    ingredients: [
      { name: 'Pork shoulder, bone-in', quantity: 2, unit: 'kg', group: '' },
      { name: 'Brown sugar', quantity: 3, unit: 'tbsp', group: 'Rub' },
      { name: 'Smoked paprika', quantity: 2, unit: 'tbsp', group: 'Rub' },
      { name: 'Garlic powder, onion powder, cayenne', quantity: 1, unit: 'tsp', group: 'Rub' },
      { name: 'Salt and black pepper', quantity: 1, unit: 'tbsp', group: 'Rub' },
      { name: 'BBQ sauce', quantity: 300, unit: 'ml', group: '' },
      { name: 'Apple cider vinegar', quantity: 2, unit: 'tbsp', group: '' },
      { name: 'Brioche buns, coleslaw', quantity: 8, unit: 'whole', group: 'To serve' },
    ],
    steps: [
      { order: 1, instruction: 'Mix rub ingredients and coat pork shoulder all over. Rest at room temperature 30 min.', duration: 30 },
      { order: 2, instruction: 'Place pork in slow cooker. Add vinegar and half the BBQ sauce. Cook on LOW 8 hours.', duration: 480, equipment: 'slow_cooker', technique: 'Low and slow breaks down the collagen into gelatin, giving that silky pull-apart texture.' },
      { order: 3, instruction: 'Remove pork, rest 15 min. Pull apart with two forks, discarding any excess fat.' },
      { order: 4, instruction: 'Strain cooking juices, skim fat. Mix into pulled pork with remaining BBQ sauce.' },
      { order: 5, instruction: 'Pile into brioche buns with coleslaw and extra BBQ sauce.' },
    ],
  }),

  // ── MEDITERRANEAN ──────────────────────────────────────────────────────────

  recipe({
    title: 'Greek Salad',
    coverEmoji: '🥗',
    cuisineType: 'Mediterranean',
    difficulty: 'easy',
    prepTime: 15,
    cookTime: 0,
    baseServings: 4,
    sourceEquipment: 'stovetop',
    description: 'No-cook classic — ripe tomatoes, cucumber, olives, red onion and a slab of feta.',
    tags: ['salad', 'vegetarian', 'no-cook', 'quick', 'summer'],
    ingredients: [
      { name: 'Ripe tomatoes, cut in wedges', quantity: 4, unit: 'whole', group: '' },
      { name: 'Cucumber, chunked', quantity: 1, unit: 'whole', group: '' },
      { name: 'Red onion, thinly sliced', quantity: 0.5, unit: 'whole', group: '' },
      { name: 'Kalamata olives', quantity: 80, unit: 'g', group: '' },
      { name: 'Feta cheese block', quantity: 200, unit: 'g', group: '' },
      { name: 'Extra virgin olive oil', quantity: 3, unit: 'tbsp', group: '' },
      { name: 'Dried oregano', quantity: 1, unit: 'tsp', group: '' },
      { name: 'Salt and pepper', quantity: 1, unit: 'pinch', group: '' },
    ],
    steps: [
      { order: 1, instruction: 'Combine tomatoes, cucumber, onion and olives in a large bowl.' },
      { order: 2, instruction: 'Place feta block on top whole (do not crumble — this is the traditional way).' },
      { order: 3, instruction: 'Drizzle generously with olive oil. Sprinkle with oregano, salt and pepper.' },
      { order: 4, instruction: 'Serve immediately — no tossing needed.' },
    ],
  }),

  recipe({
    title: 'Hummus',
    coverEmoji: '🫘',
    cuisineType: 'Mediterranean',
    difficulty: 'easy',
    prepTime: 10,
    cookTime: 0,
    baseServings: 6,
    sourceEquipment: 'stovetop',
    description: 'Silky smooth hummus made from scratch. A blender and 15 minutes is all you need.',
    tags: ['dip', 'vegan', 'vegetarian', 'no-cook', 'quick'],
    ingredients: [
      { name: 'Canned chickpeas, drained', quantity: 400, unit: 'g', group: '' },
      { name: 'Tahini', quantity: 3, unit: 'tbsp', group: '' },
      { name: 'Lemon juice', quantity: 3, unit: 'tbsp', group: '' },
      { name: 'Garlic clove', quantity: 1, unit: 'clove', group: '' },
      { name: 'Ice cold water', quantity: 3, unit: 'tbsp', group: '' },
      { name: 'Olive oil', quantity: 2, unit: 'tbsp', group: '' },
      { name: 'Salt', quantity: 0.5, unit: 'tsp', group: '' },
      { name: 'Paprika, to garnish', quantity: 0.5, unit: 'tsp', group: '' },
    ],
    steps: [
      { order: 1, instruction: 'Blend chickpeas, tahini, lemon juice, garlic and salt until completely smooth, about 3 min.', duration: 3, technique: 'Blending for longer than you think necessary is what creates silky hummus.' },
      { order: 2, instruction: 'With blender running, drizzle in cold water until hummus lightens in colour and is ultra-creamy.' },
      { order: 3, instruction: 'Spread into a bowl, swirl with the back of a spoon, drizzle with olive oil and dust with paprika.' },
    ],
  }),

  recipe({
    title: 'Shakshuka',
    coverEmoji: '🍳',
    cuisineType: 'Mediterranean',
    difficulty: 'easy',
    prepTime: 10,
    cookTime: 20,
    baseServings: 2,
    sourceEquipment: 'stovetop',
    description: 'Eggs poached in a spiced tomato-pepper sauce. Impressive, healthy and on the table in 30 minutes.',
    tags: ['eggs', 'brunch', 'vegetarian', 'one pan', 'quick'],
    ingredients: [
      { name: 'Eggs', quantity: 4, unit: 'whole', group: '' },
      { name: 'Canned whole tomatoes', quantity: 400, unit: 'g', group: '' },
      { name: 'Red pepper, diced', quantity: 1, unit: 'whole', group: '' },
      { name: 'Onion, diced', quantity: 1, unit: 'whole', group: '' },
      { name: 'Garlic cloves', quantity: 3, unit: 'clove', group: '' },
      { name: 'Cumin, paprika, chilli flakes', quantity: 1, unit: 'tsp', group: '' },
      { name: 'Olive oil', quantity: 2, unit: 'tbsp', group: '' },
      { name: 'Feta and fresh parsley, to top', quantity: 50, unit: 'g', group: '' },
    ],
    steps: [
      { order: 1, instruction: 'Heat oil in a wide pan over medium. Cook onion and pepper until soft, 8 min.', duration: 8, equipment: 'stovetop' },
      { order: 2, instruction: 'Add garlic and spices, cook 1 min. Crush tomatoes into the pan and simmer 8 min.', duration: 9, equipment: 'stovetop' },
      { order: 3, instruction: 'Make 4 wells in the sauce. Crack an egg into each well.', technique: 'Spacing eggs evenly ensures they cook at the same rate.' },
      { order: 4, instruction: 'Cover pan and cook 5-7 min until whites are set but yolks still runny.', duration: 7, equipment: 'stovetop' },
      { order: 5, instruction: 'Crumble feta on top, scatter parsley and serve directly from the pan with crusty bread.' },
    ],
  }),

  // ── FRENCH ─────────────────────────────────────────────────────────────────

  recipe({
    title: 'French Onion Soup',
    coverEmoji: '🧅',
    cuisineType: 'French',
    difficulty: 'medium',
    prepTime: 15,
    cookTime: 75,
    baseServings: 4,
    sourceEquipment: 'stovetop',
    description: 'Deep, sweet caramelised onions in a rich beef broth under a gruyère crouton crust.',
    tags: ['soup', 'onion', 'cheese', 'winter warmer'],
    ingredients: [
      { name: 'Onions, thinly sliced', quantity: 6, unit: 'whole', group: '' },
      { name: 'Butter', quantity: 50, unit: 'g', group: '' },
      { name: 'Olive oil', quantity: 1, unit: 'tbsp', group: '' },
      { name: 'Dry white wine', quantity: 200, unit: 'ml', group: '' },
      { name: 'Beef stock', quantity: 1, unit: 'L', group: '' },
      { name: 'Fresh thyme', quantity: 3, unit: 'whole', group: '' },
      { name: 'Bay leaf', quantity: 2, unit: 'whole', group: '' },
      { name: 'Baguette slices', quantity: 8, unit: 'slice', group: '' },
      { name: 'Gruyère, grated', quantity: 200, unit: 'g', group: '' },
    ],
    steps: [
      { order: 1, instruction: 'Melt butter and oil in a heavy pot over medium-low. Add onions and a pinch of salt. Cook 45-60 min stirring every 5 min until deeply caramelised.', duration: 60, equipment: 'stovetop', technique: 'Patience is everything here. Properly caramelised onions are the entire flavour base.' },
      { order: 2, instruction: 'Add wine, scrape the bottom. Simmer 5 min until reduced by half.', duration: 5 },
      { order: 3, instruction: 'Add stock, thyme and bay. Simmer 15 min. Season.', duration: 15 },
      { order: 4, instruction: 'Ladle soup into oven-safe bowls. Float baguette slices on top. Pile gruyère over bread.' },
      { order: 5, instruction: 'Grill under broiler 3-4 min until cheese is bubbly and golden.', duration: 4, equipment: 'conventional_oven', temperature: 220 },
    ],
  }),

  recipe({
    title: 'Classic Crêpes',
    coverEmoji: '🥞',
    cuisineType: 'French',
    difficulty: 'easy',
    prepTime: 5,
    cookTime: 20,
    baseServings: 4,
    sourceEquipment: 'stovetop',
    description: 'Thin, delicate French crêpes — perfect with lemon and sugar or Nutella.',
    tags: ['breakfast', 'brunch', 'dessert', 'vegetarian', 'quick'],
    ingredients: [
      { name: 'Plain flour', quantity: 120, unit: 'g', group: '' },
      { name: 'Eggs', quantity: 2, unit: 'whole', group: '' },
      { name: 'Whole milk', quantity: 300, unit: 'ml', group: '' },
      { name: 'Butter, melted', quantity: 30, unit: 'g', group: '' },
      { name: 'Pinch of salt', quantity: 1, unit: 'pinch', group: '' },
      { name: 'Butter for the pan', quantity: 20, unit: 'g', group: '' },
    ],
    steps: [
      { order: 1, instruction: 'Whisk flour and salt. Make a well and add eggs. Whisk eggs, gradually incorporating flour, then add milk and melted butter. Rest batter 30 min.', duration: 35, technique: 'Resting relaxes the gluten and allows flour to absorb fully — no raw flour taste.' },
      { order: 2, instruction: 'Heat a 20cm non-stick pan over medium-high. Add a tiny knob of butter.', equipment: 'stovetop' },
      { order: 3, instruction: 'Pour 3-4 tbsp batter into center, tilting immediately to spread into a thin round.', duration: 1 },
      { order: 4, instruction: 'Cook 1 min until edges colour and surface looks dry. Flip and cook 30 sec more.', duration: 2 },
      { order: 5, instruction: 'Stack with parchment between crêpes. Serve with lemon, sugar, jam or Nutella.' },
    ],
  }),

  recipe({
    title: 'Beef Bourguignon',
    coverEmoji: '🥩',
    cuisineType: 'French',
    difficulty: 'hard',
    prepTime: 30,
    cookTime: 180,
    baseServings: 6,
    sourceEquipment: 'conventional_oven',
    description: 'Julia Child\'s great French classic — braised beef in Burgundy wine with mushrooms and pearl onions.',
    tags: ['beef', 'braised', 'wine', 'weekend project', 'celebration'],
    ingredients: [
      { name: 'Beef chuck, cut in 5cm cubes', quantity: 1.5, unit: 'kg', group: '' },
      { name: 'Burgundy or Pinot Noir', quantity: 750, unit: 'ml', group: '' },
      { name: 'Beef stock', quantity: 300, unit: 'ml', group: '' },
      { name: 'Lardons or bacon', quantity: 150, unit: 'g', group: '' },
      { name: 'Pearl onions', quantity: 200, unit: 'g', group: '' },
      { name: 'Button mushrooms', quantity: 300, unit: 'g', group: '' },
      { name: 'Carrot, thickly sliced', quantity: 2, unit: 'whole', group: '' },
      { name: 'Garlic cloves', quantity: 4, unit: 'clove', group: '' },
      { name: 'Tomato paste', quantity: 1, unit: 'tbsp', group: '' },
      { name: 'Fresh thyme and bay leaves', quantity: 3, unit: 'whole', group: '' },
      { name: 'Butter and oil', quantity: 3, unit: 'tbsp', group: '' },
    ],
    steps: [
      { order: 1, instruction: 'Pat beef dry, season well. Sear in batches in butter and oil over high heat until deep brown on all sides. Transfer to a Dutch oven.', duration: 20, equipment: 'stovetop', technique: 'Dry surface + very hot fat = Maillard reaction. This flavour base cannot be rushed.' },
      { order: 2, instruction: 'In same pan, cook lardons and onions until coloured. Add to beef.' },
      { order: 3, instruction: 'Deglaze pan with wine, scraping up all the browned bits. Add stock, tomato paste, garlic, thyme and bay. Pour over beef.' },
      { order: 4, instruction: 'Cover and braise in a 160°C oven 2.5-3 hours until beef is completely tender.', duration: 180, temperature: 160, equipment: 'conventional_oven' },
      { order: 5, instruction: 'Sauté mushrooms in butter until golden. Add to stew for the last 30 min of cooking.' },
      { order: 6, instruction: 'Remove beef. Reduce sauce on stovetop to desired consistency. Return beef. Serve with mashed potato or crusty bread.' },
    ],
  }),

  // ── THAI ───────────────────────────────────────────────────────────────────

  recipe({
    title: 'Pad Thai',
    coverEmoji: '🍜',
    cuisineType: 'Thai',
    difficulty: 'medium',
    prepTime: 20,
    cookTime: 15,
    baseServings: 2,
    sourceEquipment: 'stovetop',
    description: 'The definitive Thai noodle dish — tangy, sweet, savoury and slightly smoky.',
    tags: ['noodles', 'stir-fry', 'quick', 'prawn'],
    ingredients: [
      { name: 'Rice noodles (3mm wide)', quantity: 200, unit: 'g', group: '' },
      { name: 'Raw prawns', quantity: 200, unit: 'g', group: '' },
      { name: 'Eggs', quantity: 2, unit: 'whole', group: '' },
      { name: 'Bean sprouts', quantity: 100, unit: 'g', group: '' },
      { name: 'Spring onions', quantity: 3, unit: 'whole', group: '' },
      { name: 'Roasted peanuts, chopped', quantity: 40, unit: 'g', group: '' },
      { name: 'Tamarind paste', quantity: 2, unit: 'tbsp', group: 'Sauce' },
      { name: 'Fish sauce', quantity: 2, unit: 'tbsp', group: 'Sauce' },
      { name: 'Palm or brown sugar', quantity: 1, unit: 'tbsp', group: 'Sauce' },
      { name: 'Neutral oil', quantity: 2, unit: 'tbsp', group: '' },
      { name: 'Lime wedges', quantity: 2, unit: 'whole', group: 'To serve' },
    ],
    steps: [
      { order: 1, instruction: 'Soak noodles in cold water 30 min. Mix sauce ingredients together.', duration: 30 },
      { order: 2, instruction: 'Heat oil in a wok over highest heat. Stir-fry prawns until just pink, push to side.', duration: 2, equipment: 'stovetop' },
      { order: 3, instruction: 'Add noodles to wok and pour sauce over. Toss constantly 2 min.', duration: 2, technique: 'Keep everything moving — wok hei (breath of the wok) is what makes it taste authentic.' },
      { order: 4, instruction: 'Push noodles to side. Crack eggs into the gap, scramble quickly, then fold through noodles.' },
      { order: 5, instruction: 'Add bean sprouts and spring onions. Toss 30 seconds. Plate and top with peanuts. Serve with lime.' },
    ],
  }),

  recipe({
    title: 'Thai Green Curry',
    coverEmoji: '🍲',
    cuisineType: 'Thai',
    difficulty: 'medium',
    prepTime: 15,
    cookTime: 25,
    baseServings: 4,
    sourceEquipment: 'stovetop',
    description: 'Fragrant, creamy Thai green curry with chicken and vegetables in coconut milk.',
    tags: ['curry', 'chicken', 'coconut', 'aromatic'],
    ingredients: [
      { name: 'Chicken thighs, sliced', quantity: 600, unit: 'g', group: '' },
      { name: 'Coconut milk', quantity: 400, unit: 'ml', group: '' },
      { name: 'Green curry paste', quantity: 3, unit: 'tbsp', group: '' },
      { name: 'Fish sauce', quantity: 2, unit: 'tbsp', group: '' },
      { name: 'Palm or brown sugar', quantity: 1, unit: 'tbsp', group: '' },
      { name: 'Baby aubergine or courgette', quantity: 200, unit: 'g', group: '' },
      { name: 'Thai basil leaves', quantity: 1, unit: 'bunch', group: '' },
      { name: 'Kaffir lime leaves', quantity: 4, unit: 'whole', group: '' },
      { name: 'Neutral oil', quantity: 1, unit: 'tbsp', group: '' },
    ],
    steps: [
      { order: 1, instruction: 'Heat oil in a wok over high. Fry curry paste 1 min until fragrant.', duration: 1, equipment: 'stovetop', technique: 'Frying the paste in oil before adding liquid blooms its aromatics.' },
      { order: 2, instruction: 'Pour in half the coconut milk and stir until it splits slightly and oil pools on surface.', duration: 3 },
      { order: 3, instruction: 'Add chicken and cook 5 min. Add remaining coconut milk, fish sauce and sugar.', duration: 5 },
      { order: 4, instruction: 'Add vegetables and lime leaves. Simmer 10-15 min until chicken is cooked through.', duration: 15, equipment: 'stovetop' },
      { order: 5, instruction: 'Stir in Thai basil, adjust seasoning. Serve with jasmine rice.' },
    ],
  }),

  recipe({
    title: 'Mango Sticky Rice',
    coverEmoji: '🥭',
    cuisineType: 'Thai',
    difficulty: 'easy',
    prepTime: 5,
    cookTime: 30,
    baseServings: 4,
    sourceEquipment: 'stovetop',
    description: 'Thailand\'s iconic dessert — sweet glutinous rice with ripe mango and coconut cream sauce.',
    tags: ['dessert', 'mango', 'coconut', 'vegan', 'sweet'],
    ingredients: [
      { name: 'Glutinous sticky rice', quantity: 300, unit: 'g', group: '' },
      { name: 'Coconut milk', quantity: 300, unit: 'ml', group: '' },
      { name: 'Sugar', quantity: 4, unit: 'tbsp', group: '' },
      { name: 'Salt', quantity: 0.5, unit: 'tsp', group: '' },
      { name: 'Ripe mangoes', quantity: 2, unit: 'whole', group: '' },
      { name: 'Sesame seeds, to garnish', quantity: 1, unit: 'tsp', group: '' },
    ],
    steps: [
      { order: 1, instruction: 'Soak rice in cold water for at least 1 hour (or overnight). Drain well.' },
      { order: 2, instruction: 'Steam rice 20 min until translucent and cooked through.', duration: 20, equipment: 'stovetop' },
      { order: 3, instruction: 'While rice steams, warm coconut milk with sugar and salt until dissolved. Do not boil.' },
      { order: 4, instruction: 'Pour two-thirds of coconut sauce over hot rice. Stir gently and rest 15 min to absorb.', duration: 15, technique: 'The rice must be hot when you add the sauce so it absorbs fully.' },
      { order: 5, instruction: 'Serve rice in a mound alongside sliced mango. Drizzle remaining coconut sauce over the top. Garnish with sesame seeds.' },
    ],
  }),

  // ── MIDDLE EASTERN ─────────────────────────────────────────────────────────

  recipe({
    title: 'Falafel',
    coverEmoji: '🧆',
    cuisineType: 'Other',
    difficulty: 'medium',
    prepTime: 20,
    cookTime: 20,
    baseServings: 4,
    sourceEquipment: 'stovetop',
    description: 'Crispy on the outside, fluffy and herby inside — the definitive falafel from dried chickpeas.',
    tags: ['middle eastern', 'vegan', 'vegetarian', 'chickpeas', 'street food'],
    ingredients: [
      { name: 'Dried chickpeas, soaked overnight', quantity: 250, unit: 'g', group: '' },
      { name: 'Red onion, roughly chopped', quantity: 0.5, unit: 'whole', group: '' },
      { name: 'Garlic cloves', quantity: 3, unit: 'clove', group: '' },
      { name: 'Fresh parsley and coriander', quantity: 1, unit: 'bunch', group: '' },
      { name: 'Cumin and coriander powder', quantity: 1, unit: 'tsp', group: '' },
      { name: 'Baking powder', quantity: 1, unit: 'tsp', group: '' },
      { name: 'Salt', quantity: 1, unit: 'tsp', group: '' },
      { name: 'Neutral oil for frying', quantity: 500, unit: 'ml', group: '' },
    ],
    steps: [
      { order: 1, instruction: 'Drain soaked chickpeas. Pulse in food processor with onion, garlic, herbs, spices and salt until a coarse paste forms. Do NOT use canned chickpeas.', technique: 'Raw soaked chickpeas bind naturally when fried. Canned chickpeas will fall apart.' },
      { order: 2, instruction: 'Mix in baking powder. Refrigerate 30 min.', duration: 30 },
      { order: 3, instruction: 'Shape into small patties or balls.' },
      { order: 4, instruction: 'Heat oil to 180°C in a deep pan. Fry falafel in batches 3-4 min until deep golden brown.', duration: 8, equipment: 'stovetop' },
      { order: 5, instruction: 'Drain on paper towels. Serve in flatbread with hummus, tahini, salad and pickles.' },
    ],
  }),

  recipe({
    title: 'Lamb Shawarma',
    coverEmoji: '🥙',
    cuisineType: 'Other',
    difficulty: 'medium',
    prepTime: 20,
    cookTime: 240,
    baseServings: 6,
    sourceEquipment: 'conventional_oven',
    description: 'Oven-roasted lamb marinated in warm Middle Eastern spices — the closest to a spit without a spit.',
    tags: ['middle eastern', 'lamb', 'spiced', 'wrap'],
    ingredients: [
      { name: 'Lamb leg, bone-in', quantity: 2, unit: 'kg', group: '' },
      { name: 'Yoghurt', quantity: 150, unit: 'ml', group: 'Marinade' },
      { name: 'Lemon juice', quantity: 3, unit: 'tbsp', group: 'Marinade' },
      { name: 'Cumin, coriander, turmeric, cinnamon', quantity: 1, unit: 'tsp', group: 'Marinade' },
      { name: 'Smoked paprika', quantity: 2, unit: 'tsp', group: 'Marinade' },
      { name: 'Garlic cloves', quantity: 6, unit: 'clove', group: 'Marinade' },
      { name: 'Flatbreads, hummus, pickles, tomatoes', quantity: 6, unit: 'whole', group: 'To serve' },
    ],
    steps: [
      { order: 1, instruction: 'Score lamb deeply. Mix marinade ingredients into a paste and rub all over and into scores. Marinate overnight.', duration: 720 },
      { order: 2, instruction: 'Remove from fridge 1 hour before cooking. Preheat oven to 170°C.', temperature: 170, equipment: 'conventional_oven' },
      { order: 3, instruction: 'Place lamb on a rack over a roasting tray with 200ml water. Cover tightly with foil. Roast 3.5 hours.', duration: 210, temperature: 170, equipment: 'conventional_oven' },
      { order: 4, instruction: 'Remove foil. Roast 30 min more at 200°C until crispy and caramelised.', duration: 30, temperature: 200, equipment: 'conventional_oven' },
      { order: 5, instruction: 'Rest 20 min. Shred with forks. Serve in warm flatbreads with hummus, pickles and tomatoes.' },
    ],
  }),

  recipe({
    title: 'Tabbouleh',
    coverEmoji: '🌿',
    cuisineType: 'Other',
    difficulty: 'easy',
    prepTime: 20,
    cookTime: 0,
    baseServings: 4,
    sourceEquipment: 'stovetop',
    description: 'Lebanese parsley salad with bulgar, mint, tomato and lemon. Fresh, bright and entirely no-cook.',
    tags: ['middle eastern', 'salad', 'vegan', 'no-cook', 'herby'],
    ingredients: [
      { name: 'Fine bulgar wheat', quantity: 50, unit: 'g', group: '' },
      { name: 'Flat-leaf parsley, very finely chopped', quantity: 100, unit: 'g', group: '' },
      { name: 'Fresh mint, finely chopped', quantity: 30, unit: 'g', group: '' },
      { name: 'Ripe tomatoes, finely diced', quantity: 3, unit: 'whole', group: '' },
      { name: 'Spring onions, thinly sliced', quantity: 4, unit: 'whole', group: '' },
      { name: 'Lemon juice', quantity: 4, unit: 'tbsp', group: '' },
      { name: 'Extra virgin olive oil', quantity: 3, unit: 'tbsp', group: '' },
      { name: 'Salt', quantity: 0.5, unit: 'tsp', group: '' },
    ],
    steps: [
      { order: 1, instruction: 'Soak bulgar in cold water 20 min until just tender. Drain and squeeze out all excess moisture.', duration: 20, technique: 'Bulgar should be a background texture, not the star. Never let it take over the parsley.' },
      { order: 2, instruction: 'Combine parsley, mint, tomatoes and spring onions in a bowl.' },
      { order: 3, instruction: 'Add drained bulgar. Dress with lemon juice, olive oil and salt.' },
      { order: 4, instruction: 'Toss well and taste. Tabbouleh should be very lemony and very herby. Serve immediately.' },
    ],
  }),

  // ── 10 ADDITIONAL POPULAR DISHES ──────────────────────────────────────────

  recipe({
    title: 'Chicken & Chorizo Paella',
    coverEmoji: '🥘',
    cuisineType: 'Other',
    difficulty: 'hard',
    prepTime: 20,
    cookTime: 45,
    baseServings: 6,
    sourceEquipment: 'stovetop',
    description: 'Spanish rice dish with saffron, chicken, chorizo and the all-important socarrat crust.',
    tags: ['spanish', 'rice', 'saffron', 'one pan', 'crowd pleaser'],
    ingredients: [
      { name: 'Paella or Calasparra rice', quantity: 400, unit: 'g', group: '' },
      { name: 'Chicken thighs, bone-in', quantity: 600, unit: 'g', group: '' },
      { name: 'Cooking chorizo, sliced', quantity: 200, unit: 'g', group: '' },
      { name: 'Saffron threads in 100ml warm stock', quantity: 0.5, unit: 'tsp', group: '' },
      { name: 'Chicken stock', quantity: 900, unit: 'ml', group: '' },
      { name: 'Tinned tomatoes, crushed', quantity: 200, unit: 'g', group: '' },
      { name: 'Red pepper, sliced', quantity: 2, unit: 'whole', group: '' },
      { name: 'Garlic, smoked paprika, onion', quantity: 3, unit: 'clove', group: '' },
      { name: 'Olive oil', quantity: 3, unit: 'tbsp', group: '' },
    ],
    steps: [
      { order: 1, instruction: 'Brown chicken pieces in olive oil in a wide, flat pan until golden. Remove.', duration: 8, equipment: 'stovetop' },
      { order: 2, instruction: 'Fry chorizo until oils release, 3 min. Add onion and pepper, cook 5 min.', duration: 8, equipment: 'stovetop' },
      { order: 3, instruction: 'Add garlic and paprika. Add tomatoes and cook down 5 min to a sofrito.', duration: 5 },
      { order: 4, instruction: 'Add rice and stir to coat. Pour in stock and saffron. Nestle chicken pieces on top.', technique: 'Once stock is added, NEVER stir. Stirring breaks down the starch and prevents socarrat.' },
      { order: 5, instruction: 'Cook on medium-high 10 min, then reduce to medium-low 15 min until stock is absorbed.', duration: 25, equipment: 'stovetop' },
      { order: 6, instruction: 'Increase heat 1-2 min to caramelise the base (socarrat). Rest 5 min before serving.' },
    ],
  }),

  recipe({
    title: 'Moussaka',
    coverEmoji: '🍆',
    cuisineType: 'Mediterranean',
    difficulty: 'hard',
    prepTime: 30,
    cookTime: 90,
    baseServings: 6,
    sourceEquipment: 'conventional_oven',
    description: 'Layers of spiced lamb mince, roasted aubergine and creamy béchamel — the great Greek bake.',
    tags: ['greek', 'lamb', 'aubergine', 'baked', 'weekend project'],
    ingredients: [
      { name: 'Aubergines, sliced 1cm', quantity: 2, unit: 'whole', group: '' },
      { name: 'Lamb mince', quantity: 600, unit: 'g', group: 'Meat sauce' },
      { name: 'Onion, diced', quantity: 1, unit: 'whole', group: 'Meat sauce' },
      { name: 'Tinned tomatoes', quantity: 400, unit: 'g', group: 'Meat sauce' },
      { name: 'Red wine', quantity: 100, unit: 'ml', group: 'Meat sauce' },
      { name: 'Cinnamon, allspice', quantity: 1, unit: 'tsp', group: 'Meat sauce' },
      { name: 'Butter', quantity: 60, unit: 'g', group: 'Béchamel' },
      { name: 'Plain flour', quantity: 60, unit: 'g', group: 'Béchamel' },
      { name: 'Whole milk', quantity: 600, unit: 'ml', group: 'Béchamel' },
      { name: 'Egg yolks', quantity: 2, unit: 'whole', group: 'Béchamel' },
      { name: 'Parmesan or kefalotiri, grated', quantity: 60, unit: 'g', group: 'Béchamel' },
    ],
    steps: [
      { order: 1, instruction: 'Brush aubergine slices with oil, season. Roast at 200°C 20-25 min until golden.', duration: 25, temperature: 200, equipment: 'conventional_oven' },
      { order: 2, instruction: 'Brown lamb mince with onion. Add wine and simmer 2 min. Add tomatoes and spices. Simmer 20 min until thick.', duration: 25, equipment: 'stovetop' },
      { order: 3, instruction: 'Make béchamel: melt butter, stir in flour, add milk gradually, stir until thick. Remove from heat, whisk in egg yolks and half the cheese.', duration: 10, equipment: 'stovetop' },
      { order: 4, instruction: 'Layer in a baking dish: aubergine, meat sauce, aubergine, meat sauce. Pour béchamel over top. Scatter remaining cheese.' },
      { order: 5, instruction: 'Bake at 180°C 40-45 min until top is golden brown and set.', duration: 45, temperature: 180, equipment: 'conventional_oven' },
      { order: 6, instruction: 'Rest 20 min before cutting — it needs to set to hold its layers.' },
    ],
  }),

  recipe({
    title: 'Pierogi with Potato & Cheese',
    coverEmoji: '🥟',
    cuisineType: 'Other',
    difficulty: 'medium',
    prepTime: 60,
    cookTime: 20,
    baseServings: 4,
    sourceEquipment: 'stovetop',
    description: 'Polish dumplings filled with mashed potato and cheese, boiled then pan-fried in butter.',
    tags: ['polish', 'dumplings', 'vegetarian', 'comfort food'],
    ingredients: [
      { name: 'Plain flour', quantity: 300, unit: 'g', group: 'Dough' },
      { name: 'Warm water', quantity: 150, unit: 'ml', group: 'Dough' },
      { name: 'Egg', quantity: 1, unit: 'whole', group: 'Dough' },
      { name: 'Mashed potato', quantity: 400, unit: 'g', group: 'Filling' },
      { name: 'Cheddar or farmer\'s cheese', quantity: 150, unit: 'g', group: 'Filling' },
      { name: 'Caramelised onion', quantity: 3, unit: 'tbsp', group: 'Filling' },
      { name: 'Salt and pepper', quantity: 1, unit: 'pinch', group: '' },
      { name: 'Butter for frying', quantity: 40, unit: 'g', group: '' },
      { name: 'Soured cream to serve', quantity: 4, unit: 'tbsp', group: '' },
    ],
    steps: [
      { order: 1, instruction: 'Mix flour, water and egg into a soft dough. Knead 5 min. Rest covered 20 min.', duration: 25 },
      { order: 2, instruction: 'Mix mashed potato, cheese and caramelised onion. Season.' },
      { order: 3, instruction: 'Roll dough thin. Cut into 8cm rounds. Place 1 tsp filling in center. Fold, press edges firmly to seal.' },
      { order: 4, instruction: 'Boil in salted water until they float plus 2 min more. Drain.', duration: 6, equipment: 'stovetop' },
      { order: 5, instruction: 'Fry boiled pierogi in butter until golden on both sides.', duration: 6, equipment: 'stovetop', technique: 'The butter fry after boiling gives pierogi their characteristic golden crust.' },
      { order: 6, instruction: 'Serve with soured cream and more caramelised onion.' },
    ],
  }),

  recipe({
    title: 'Jollof Rice',
    coverEmoji: '🍚',
    cuisineType: 'Other',
    difficulty: 'medium',
    prepTime: 20,
    cookTime: 45,
    baseServings: 6,
    sourceEquipment: 'stovetop',
    description: 'West African smoky tomato rice — rich, aromatic and the star of every celebration table.',
    tags: ['west african', 'rice', 'tomato', 'spiced', 'party food'],
    ingredients: [
      { name: 'Long grain rice', quantity: 400, unit: 'g', group: '' },
      { name: 'Tomatoes, blended', quantity: 400, unit: 'g', group: 'Base' },
      { name: 'Red peppers, blended', quantity: 2, unit: 'whole', group: 'Base' },
      { name: 'Scotch bonnet chilli', quantity: 1, unit: 'whole', group: 'Base' },
      { name: 'Tomato paste', quantity: 3, unit: 'tbsp', group: '' },
      { name: 'Onion, diced', quantity: 1, unit: 'whole', group: '' },
      { name: 'Chicken stock', quantity: 500, unit: 'ml', group: '' },
      { name: 'Curry powder, thyme, bay leaves', quantity: 1, unit: 'tsp', group: '' },
      { name: 'Neutral oil', quantity: 4, unit: 'tbsp', group: '' },
    ],
    steps: [
      { order: 1, instruction: 'Blend tomatoes, peppers and scotch bonnet into a smooth purée.' },
      { order: 2, instruction: 'Fry onion in oil until golden. Add tomato paste and cook 5 min until darkened.', duration: 8, equipment: 'stovetop' },
      { order: 3, instruction: 'Add blended tomato mixture. Cook on high heat, stirring often, 20 min until sauce is very thick and oil floats on top.', duration: 20, equipment: 'stovetop', technique: 'Frying the tomato base until oil separates creates the deep, concentrated flavour.' },
      { order: 4, instruction: 'Add rice and stir to coat. Pour in stock, add spices. Stir once, cover tightly.' },
      { order: 5, instruction: 'Cook on medium 10 min, then low 15 min. The slight scorching on the bottom is prized — it adds smokiness.', duration: 25, equipment: 'stovetop' },
    ],
  }),

  recipe({
    title: 'Beef Pho',
    coverEmoji: '🍲',
    cuisineType: 'Other',
    difficulty: 'hard',
    prepTime: 30,
    cookTime: 180,
    baseServings: 6,
    sourceEquipment: 'stovetop',
    description: 'Vietnamese aromatic beef bone broth with rice noodles, tender beef and fresh herbs.',
    tags: ['vietnamese', 'soup', 'beef', 'noodles', 'weekend project'],
    ingredients: [
      { name: 'Beef bones and oxtail', quantity: 2, unit: 'kg', group: 'Broth' },
      { name: 'Charred ginger and onion', quantity: 2, unit: 'whole', group: 'Broth' },
      { name: 'Star anise, cinnamon, cloves', quantity: 4, unit: 'whole', group: 'Broth' },
      { name: 'Fish sauce', quantity: 3, unit: 'tbsp', group: '' },
      { name: 'Rice noodles (flat, medium)', quantity: 400, unit: 'g', group: '' },
      { name: 'Beef sirloin, thinly sliced raw', quantity: 300, unit: 'g', group: '' },
      { name: 'Bean sprouts, Thai basil, lime', quantity: 100, unit: 'g', group: 'To serve' },
      { name: 'Hoisin sauce and sriracha', quantity: 2, unit: 'tbsp', group: 'To serve' },
    ],
    steps: [
      { order: 1, instruction: 'Char ginger and halved onion directly over flame or under broiler until blackened. Rinse.', equipment: 'stovetop', duration: 5 },
      { order: 2, instruction: 'Blanch bones 5 min to remove impurities. Drain and rinse. Return to a large pot with cold water.', duration: 5, equipment: 'stovetop' },
      { order: 3, instruction: 'Add charred aromatics, dry-toasted whole spices and fish sauce. Simmer gently 3+ hours. Do not boil hard.', duration: 180, equipment: 'stovetop', technique: 'A gentle simmer produces a clear, clean broth. A hard boil makes it cloudy.' },
      { order: 4, instruction: 'Strain broth. Season with fish sauce and salt.' },
      { order: 5, instruction: 'Soak rice noodles in warm water 20 min. Blanch briefly. Divide into bowls.' },
      { order: 6, instruction: 'Lay raw sirloin slices over noodles. Pour boiling broth over — it cooks the beef. Serve with bean sprouts, basil and lime.' },
    ],
  }),

  recipe({
    title: 'Chili con Carne',
    coverEmoji: '🫘',
    cuisineType: 'American',
    difficulty: 'easy',
    prepTime: 15,
    cookTime: 90,
    baseServings: 6,
    sourceEquipment: 'stovetop',
    description: 'Deep, hearty Tex-Mex chili with beef, beans and a complex spice base. Better the next day.',
    tags: ['tex-mex', 'beef', 'beans', 'spicy', 'meal prep'],
    ingredients: [
      { name: 'Beef mince', quantity: 700, unit: 'g', group: '' },
      { name: 'Kidney beans, drained', quantity: 400, unit: 'g', group: '' },
      { name: 'Tinned chopped tomatoes', quantity: 800, unit: 'g', group: '' },
      { name: 'Onion, diced', quantity: 1, unit: 'whole', group: '' },
      { name: 'Garlic cloves', quantity: 3, unit: 'clove', group: '' },
      { name: 'Chilli powder, cumin, smoked paprika', quantity: 2, unit: 'tbsp', group: '' },
      { name: 'Beef stock', quantity: 200, unit: 'ml', group: '' },
      { name: 'Tomato paste', quantity: 2, unit: 'tbsp', group: '' },
      { name: 'Dark chocolate square', quantity: 1, unit: 'whole', group: '' },
      { name: 'Soured cream, cheese, coriander', quantity: 4, unit: 'tbsp', group: 'To serve' },
    ],
    steps: [
      { order: 1, instruction: 'Brown mince in batches over high heat — don\'t crowd the pan. Remove and set aside.', duration: 10, equipment: 'stovetop' },
      { order: 2, instruction: 'In same pan, cook onion 5 min until soft. Add garlic and spices, cook 1 min.', duration: 6, equipment: 'stovetop' },
      { order: 3, instruction: 'Return mince. Add tomato paste, tinned tomatoes and stock. Bring to a boil.', duration: 5 },
      { order: 4, instruction: 'Simmer on low 1 hour uncovered until thick. Add beans for the last 20 min.', duration: 60, equipment: 'stovetop', technique: 'Low, slow simmering builds depth. Adding beans later keeps them whole and meaty.' },
      { order: 5, instruction: 'Add dark chocolate square and stir until melted. Season well.', technique: 'A small square of dark chocolate adds body and rounds out the acidic tomatoes.' },
      { order: 6, instruction: 'Serve with rice or cornbread, topped with soured cream, cheese and coriander.' },
    ],
  }),

  recipe({
    title: 'Eggs Benedict',
    coverEmoji: '🍳',
    cuisineType: 'American',
    difficulty: 'medium',
    prepTime: 20,
    cookTime: 15,
    baseServings: 2,
    sourceEquipment: 'stovetop',
    description: 'Toasted English muffins, crispy bacon, poached eggs and golden hollandaise. Weekend brunch royalty.',
    tags: ['brunch', 'eggs', 'hollandaise', 'breakfast'],
    ingredients: [
      { name: 'English muffins', quantity: 2, unit: 'whole', group: '' },
      { name: 'Back bacon or Canadian ham', quantity: 4, unit: 'slice', group: '' },
      { name: 'Eggs', quantity: 4, unit: 'whole', group: '' },
      { name: 'White vinegar', quantity: 1, unit: 'tbsp', group: '' },
      { name: 'Egg yolks', quantity: 3, unit: 'whole', group: 'Hollandaise' },
      { name: 'Butter, clarified', quantity: 150, unit: 'g', group: 'Hollandaise' },
      { name: 'Lemon juice', quantity: 1, unit: 'tbsp', group: 'Hollandaise' },
      { name: 'Cayenne pepper', quantity: 1, unit: 'pinch', group: 'Hollandaise' },
    ],
    steps: [
      { order: 1, instruction: 'Hollandaise: whisk yolks with lemon juice over a bain-marie (bowl over barely simmering water) until thick and doubled in volume.', duration: 5, equipment: 'stovetop', technique: 'The yolks should ribbon off the whisk. If the bowl gets too hot and you see scrambled bits, you\'ve gone too far.' },
      { order: 2, instruction: 'Remove from heat. Whisk in warm clarified butter drop by drop, then in a thin stream, until emulsified. Season with salt and cayenne.' },
      { order: 3, instruction: 'Grill bacon until crispy. Toast muffin halves cut-side down.', duration: 5, equipment: 'stovetop' },
      { order: 4, instruction: 'Fill a wide pan with water, add vinegar, bring to a bare simmer. Swirl and drop eggs in one at a time. Poach 3-4 min.', duration: 4, equipment: 'stovetop' },
      { order: 5, instruction: 'Assemble: muffin, bacon, drained egg. Spoon hollandaise generously over top. Serve immediately.' },
    ],
  }),

  recipe({
    title: 'Baklava',
    coverEmoji: '🍯',
    cuisineType: 'Other',
    difficulty: 'hard',
    prepTime: 45,
    cookTime: 50,
    baseServings: 20,
    sourceEquipment: 'conventional_oven',
    description: 'Layers of crisp filo, spiced nut filling and fragrant honey-rosewater syrup. Irresistibly good.',
    tags: ['turkish', 'dessert', 'pastry', 'nuts', 'sweet'],
    ingredients: [
      { name: 'Filo pastry sheets', quantity: 400, unit: 'g', group: '' },
      { name: 'Butter, clarified', quantity: 150, unit: 'g', group: '' },
      { name: 'Mixed pistachios and walnuts, chopped', quantity: 300, unit: 'g', group: 'Filling' },
      { name: 'Cinnamon', quantity: 1, unit: 'tsp', group: 'Filling' },
      { name: 'Sugar', quantity: 2, unit: 'tbsp', group: 'Filling' },
      { name: 'Honey', quantity: 200, unit: 'g', group: 'Syrup' },
      { name: 'Water', quantity: 150, unit: 'ml', group: 'Syrup' },
      { name: 'Sugar', quantity: 150, unit: 'g', group: 'Syrup' },
      { name: 'Rosewater', quantity: 1, unit: 'tbsp', group: 'Syrup' },
      { name: 'Lemon juice', quantity: 1, unit: 'tbsp', group: 'Syrup' },
    ],
    steps: [
      { order: 1, instruction: 'Preheat oven to 165°C. Brush a 30×20cm tin with butter.', temperature: 165, equipment: 'conventional_oven' },
      { order: 2, instruction: 'Layer 8 filo sheets in tin, brushing each generously with butter. Scatter half the nut mixture.' },
      { order: 3, instruction: 'Add 4 more buttered filo sheets. Add remaining nuts. Top with remaining filo sheets, buttering each.', technique: 'Work quickly with filo — it dries out fast. Keep unused sheets under a damp cloth.' },
      { order: 4, instruction: 'Cut into diamonds or squares before baking. Bake 45-50 min until deep golden.', duration: 50, temperature: 165, equipment: 'conventional_oven' },
      { order: 5, instruction: 'While baklava bakes, simmer syrup ingredients 10 min until slightly thickened.', duration: 10, equipment: 'stovetop' },
      { order: 6, instruction: 'Pour HOT syrup over HOT baklava immediately from oven. Leave to absorb at room temperature 4+ hours before serving.', technique: 'Hot on hot — if either is cold, the filo goes soggy instead of absorbing cleanly.' },
    ],
  }),

  recipe({
    title: 'Fluffy American Pancakes',
    coverEmoji: '🥞',
    cuisineType: 'American',
    difficulty: 'easy',
    prepTime: 10,
    cookTime: 20,
    baseServings: 4,
    sourceEquipment: 'stovetop',
    description: 'Thick, fluffy buttermilk pancakes — the stack weekend mornings are made for.',
    tags: ['breakfast', 'brunch', 'vegetarian', 'quick', 'sweet'],
    ingredients: [
      { name: 'Plain flour', quantity: 200, unit: 'g', group: '' },
      { name: 'Baking powder', quantity: 2, unit: 'tsp', group: '' },
      { name: 'Bicarbonate of soda', quantity: 0.5, unit: 'tsp', group: '' },
      { name: 'Sugar', quantity: 2, unit: 'tbsp', group: '' },
      { name: 'Salt', quantity: 0.5, unit: 'tsp', group: '' },
      { name: 'Buttermilk', quantity: 300, unit: 'ml', group: '' },
      { name: 'Eggs', quantity: 2, unit: 'whole', group: '' },
      { name: 'Melted butter', quantity: 30, unit: 'g', group: '' },
      { name: 'Maple syrup and berries', quantity: 4, unit: 'tbsp', group: 'To serve' },
    ],
    steps: [
      { order: 1, instruction: 'Whisk dry ingredients together in a large bowl.' },
      { order: 2, instruction: 'Whisk buttermilk, eggs and melted butter in a jug. Pour into dry ingredients and fold gently.', technique: 'Stop when just combined — a lumpy batter is correct. Overmixing activates gluten and makes flat, tough pancakes.' },
      { order: 3, instruction: 'Heat a non-stick pan over medium. Lightly grease. Pour 80ml batter per pancake.', equipment: 'stovetop' },
      { order: 4, instruction: 'Cook until bubbles form and edges look dry, about 2 min. Flip once and cook 1-2 min more.', duration: 4 },
      { order: 5, instruction: 'Keep warm in a 100°C oven while cooking remaining batches. Serve stacked with maple syrup and berries.', temperature: 100, equipment: 'conventional_oven' },
    ],
  }),

  recipe({
    title: 'Ceviche',
    coverEmoji: '🐟',
    cuisineType: 'Other',
    difficulty: 'easy',
    prepTime: 20,
    cookTime: 0,
    baseServings: 4,
    sourceEquipment: 'stovetop',
    description: 'Peruvian fresh fish "cooked" in citrus with red onion, chilli and coriander. Vibrant and light.',
    tags: ['peruvian', 'fish', 'no-cook', 'fresh', 'light'],
    ingredients: [
      { name: 'Very fresh white fish (sea bass or halibut), diced 1cm', quantity: 500, unit: 'g', group: '' },
      { name: 'Lime juice (about 8 limes)', quantity: 150, unit: 'ml', group: '' },
      { name: 'Red onion, very thinly sliced', quantity: 0.5, unit: 'whole', group: '' },
      { name: 'Fresh chilli (ají amarillo or red), minced', quantity: 1, unit: 'whole', group: '' },
      { name: 'Fresh coriander', quantity: 1, unit: 'bunch', group: '' },
      { name: 'Salt', quantity: 1, unit: 'tsp', group: '' },
      { name: 'Corn on the cob, boiled and sliced', quantity: 1, unit: 'whole', group: 'To serve' },
      { name: 'Sweet potato, boiled and sliced', quantity: 1, unit: 'whole', group: 'To serve' },
    ],
    steps: [
      { order: 1, instruction: 'Season fish cubes generously with salt. Add lime juice — fish should be submerged. Soak red onion separately in cold salted water 10 min to remove harshness.', technique: 'The lime juice denatures the fish proteins (a cold "cook"). For a firmer result, leave 15 min; for creamier, serve at 5 min.' },
      { order: 2, instruction: 'Marinate fish in lime juice 5-10 min until opaque on outside but still slightly translucent in center.', duration: 10 },
      { order: 3, instruction: 'Drain red onion. Add to fish with chilli and coriander. Toss.' },
      { order: 4, instruction: 'Serve immediately on chilled plates with boiled corn and sweet potato on the side.' },
    ],
  }),

  // ── KOREAN ─────────────────────────────────────────────────────────────────

  recipe({
    title: 'Bibimbap',
    coverEmoji: '🍲',
    cuisineType: 'Korean',
    difficulty: 'medium',
    prepTime: 30,
    cookTime: 20,
    baseServings: 2,
    sourceEquipment: 'stovetop',
    description: 'Korean rice bowl with sautéed vegetables, gochujang sauce and a fried egg. Colourful and satisfying.',
    tags: ['korean', 'rice bowl', 'vegetables', 'egg'],
    ingredients: [
      { name: 'Cooked short-grain rice', quantity: 2, unit: 'cup', group: '' },
      { name: 'Beef mince or thinly sliced sirloin', quantity: 200, unit: 'g', group: 'Beef' },
      { name: 'Soy sauce, sesame oil, garlic', quantity: 2, unit: 'tbsp', group: 'Beef' },
      { name: 'Spinach, bean sprouts, courgette, carrot', quantity: 200, unit: 'g', group: 'Vegetables' },
      { name: 'Eggs', quantity: 2, unit: 'whole', group: '' },
      { name: 'Gochujang paste', quantity: 2, unit: 'tbsp', group: 'Sauce' },
      { name: 'Sesame oil, sugar, vinegar', quantity: 1, unit: 'tsp', group: 'Sauce' },
      { name: 'Sesame seeds and nori strips', quantity: 1, unit: 'tsp', group: '' },
    ],
    steps: [
      { order: 1, instruction: 'Mix gochujang with sesame oil, sugar and a splash of vinegar. Set aside.' },
      { order: 2, instruction: 'Marinate beef in soy, sesame oil and garlic 10 min. Stir-fry until cooked through.', duration: 12, equipment: 'stovetop' },
      { order: 3, instruction: 'Blanch spinach and sprouts separately 30 sec each. Squeeze dry and season with sesame oil and salt. Sauté courgette and carrot separately in sesame oil.', duration: 10, equipment: 'stovetop' },
      { order: 4, instruction: 'Fry eggs sunny-side up.', duration: 3, equipment: 'stovetop' },
      { order: 5, instruction: 'Arrange rice in bowls. Place each vegetable and beef in separate sections around the bowl. Place egg in center.', technique: 'The presentation of separate, colourful toppings is as important as the taste in bibimbap.' },
      { order: 6, instruction: 'Drizzle gochujang sauce over everything. Add sesame seeds. Mix vigorously before eating.' },
    ],
  }),

  recipe({
    title: 'Korean Fried Chicken',
    coverEmoji: '🍗',
    cuisineType: 'Korean',
    difficulty: 'medium',
    prepTime: 20,
    cookTime: 25,
    baseServings: 4,
    sourceEquipment: 'stovetop',
    description: 'Double-fried for maximum crunch, then tossed in a sticky sweet-spicy gochujang glaze.',
    tags: ['korean', 'chicken', 'crispy', 'fried', 'sweet spicy'],
    ingredients: [
      { name: 'Chicken wings or pieces', quantity: 1, unit: 'kg', group: '' },
      { name: 'Cornstarch', quantity: 4, unit: 'tbsp', group: 'Batter' },
      { name: 'Plain flour', quantity: 2, unit: 'tbsp', group: 'Batter' },
      { name: 'Baking powder', quantity: 1, unit: 'tsp', group: 'Batter' },
      { name: 'Gochujang', quantity: 3, unit: 'tbsp', group: 'Glaze' },
      { name: 'Soy sauce', quantity: 2, unit: 'tbsp', group: 'Glaze' },
      { name: 'Honey', quantity: 2, unit: 'tbsp', group: 'Glaze' },
      { name: 'Garlic, ginger', quantity: 2, unit: 'clove', group: 'Glaze' },
      { name: 'Neutral oil for frying', quantity: 1, unit: 'L', group: '' },
      { name: 'Sesame seeds and spring onion', quantity: 1, unit: 'tsp', group: '' },
    ],
    steps: [
      { order: 1, instruction: 'Pat chicken dry. Toss with cornstarch, flour, baking powder, salt and pepper until well coated.', technique: 'The dry dredge with baking powder creates the distinctive Korean fried chicken crunch.' },
      { order: 2, instruction: 'Heat oil to 160°C. First fry: cook chicken 8-10 min until pale golden. Remove and drain.', duration: 10, equipment: 'stovetop' },
      { order: 3, instruction: 'Increase oil to 190°C. Second fry: cook chicken 4-5 min until deep golden and very crispy.', duration: 5, equipment: 'stovetop', technique: 'The double fry is the secret: first fry cooks through, second fry creates the shatter-crisp exterior.' },
      { order: 4, instruction: 'Simmer glaze ingredients together 2-3 min until thickened.', duration: 3, equipment: 'stovetop' },
      { order: 5, instruction: 'Toss hot chicken in glaze immediately. Top with sesame seeds and spring onion. Serve right away.' },
    ],
  }),

  recipe({
    title: 'Japchae (Glass Noodle Stir-Fry)',
    coverEmoji: '🍜',
    cuisineType: 'Korean',
    difficulty: 'medium',
    prepTime: 20,
    cookTime: 20,
    baseServings: 4,
    sourceEquipment: 'stovetop',
    description: 'Korean glass noodles with colourful vegetables, beef and a savoury-sweet soy dressing. Often served at celebrations.',
    tags: ['korean', 'noodles', 'glass noodles', 'stir-fry', 'vegetables'],
    ingredients: [
      { name: 'Dried glass noodles (dangmyeon)', quantity: 200, unit: 'g', group: '' },
      { name: 'Beef sirloin, thinly sliced', quantity: 150, unit: 'g', group: '' },
      { name: 'Spinach', quantity: 100, unit: 'g', group: '' },
      { name: 'Shiitake mushrooms, sliced', quantity: 100, unit: 'g', group: '' },
      { name: 'Carrot, julienned', quantity: 1, unit: 'whole', group: '' },
      { name: 'Red pepper, julienned', quantity: 1, unit: 'whole', group: '' },
      { name: 'Egg, fried into strips', quantity: 1, unit: 'whole', group: '' },
      { name: 'Soy sauce', quantity: 3, unit: 'tbsp', group: 'Dressing' },
      { name: 'Sesame oil', quantity: 2, unit: 'tbsp', group: 'Dressing' },
      { name: 'Sugar', quantity: 1, unit: 'tbsp', group: 'Dressing' },
      { name: 'Sesame seeds', quantity: 1, unit: 'tsp', group: '' },
    ],
    steps: [
      { order: 1, instruction: 'Cook glass noodles in boiling water 6-8 min until tender. Rinse under cold water, drain and cut into 15cm lengths.', duration: 8, equipment: 'stovetop' },
      { order: 2, instruction: 'Toss noodles immediately with half the dressing to prevent sticking.' },
      { order: 3, instruction: 'Sauté beef with a little soy and sesame oil until cooked. Set aside. Sauté each vegetable separately in sesame oil, seasoning each.', duration: 10, equipment: 'stovetop', technique: 'Cooking each component separately lets you control texture and prevents everything from steaming together.' },
      { order: 4, instruction: 'Combine noodles, beef and all vegetables. Add remaining dressing and toss well.' },
      { order: 5, instruction: 'Garnish with sesame seeds and strips of fried egg. Serve at room temperature.' },
    ],
  }),

];

// ─── Seed ─────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  // Upsert the system author user doc so the author profile page works for seeded recipes
  await db.collection('users').doc(SYSTEM_AUTHOR_ID).set({
    uid: SYSTEM_AUTHOR_ID,
    displayName: 'RecipeShare Kitchen',
    email: 'kitchen@recipeshare.app',
    photoURL: null,
    equipment: [],
    measurementSystem: 'metric',
    temperatureUnit: 'celsius',
    onboardingComplete: true,
    followingCount: 0,
    followersCount: 0,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date(),
  });
  console.log('✓ System author user doc upserted');

  console.log(`Seeding ${RECIPES.length} recipes…`);
  for (const r of RECIPES) {
    await db.collection('recipes').doc(r.id).set(r);
    console.log(`  ✓ ${r.title}`);
  }

  console.log('\nDone! All recipes seeded.');
}

main().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});
