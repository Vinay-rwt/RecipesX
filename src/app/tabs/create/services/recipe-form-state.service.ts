import { Injectable, inject, signal } from '@angular/core';
import { FormArray, FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';

@Injectable({ providedIn: 'root' })
export class RecipeFormStateService {
  private fb = inject(FormBuilder);

  readonly DRAFT_KEY = 'recipeshare_draft';

  readonly currentStep = signal(0);
  readonly firestoreDraftId = signal<string | null>(null);
  readonly coverPhotoBlob = signal<Blob | null>(null);
  readonly coverPhotoPreview = signal<string | null>(null);
  readonly coverEmoji = signal<string | null>(null);

  readonly form: FormGroup = this.fb.group({
    // Step 1 — Basics
    title: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(100)]],
    description: ['', [Validators.maxLength(500)]],
    cuisineType: ['', Validators.required],
    difficulty: ['easy', Validators.required],
    tags: this.fb.array([] as FormControl[]),

    // Step 2 — Equipment & Servings
    sourceEquipment: ['', Validators.required],
    baseServings: [4, [Validators.required, Validators.min(1), Validators.max(100)]],
    prepTime: [0, [Validators.required, Validators.min(0)]],
    cookTime: [0, [Validators.required, Validators.min(0)]],

    // Step 3 — Ingredients
    ingredients: this.fb.array([]),

    // Step 4 — Steps
    steps: this.fb.array([]),
  });

  get tagsArray(): FormArray {
    return this.form.get('tags') as FormArray;
  }

  get ingredientsArray(): FormArray {
    return this.form.get('ingredients') as FormArray;
  }

  get stepsArray(): FormArray {
    return this.form.get('steps') as FormArray;
  }

  // --- Tag helpers ---
  addTag(value: string): void {
    const trimmed = value.trim();
    if (!trimmed) return;
    this.tagsArray.push(this.fb.control(trimmed));
  }

  removeTag(index: number): void {
    this.tagsArray.removeAt(index);
  }

  // --- Ingredient helpers ---
  addIngredient(group = ''): void {
    this.ingredientsArray.push(
      this.fb.group({
        name: ['', Validators.required],
        quantity: [null, [Validators.required, Validators.min(0)]],
        unit: [''],
        group: [group],
      }),
    );
  }

  removeIngredient(index: number): void {
    this.ingredientsArray.removeAt(index);
  }

  reorderIngredients(from: number, to: number): void {
    const ctrl = this.ingredientsArray.at(from);
    this.ingredientsArray.removeAt(from);
    this.ingredientsArray.insert(to, ctrl);
  }

  // --- Step helpers ---
  addStep(): void {
    this.stepsArray.push(
      this.fb.group({
        order: [this.stepsArray.length + 1],
        instruction: ['', Validators.required],
        temperature: [null],
        duration: [null],
        equipment: [''],
        technique: [''],
      }),
    );
  }

  removeStep(index: number): void {
    this.stepsArray.removeAt(index);
    // Recalculate order
    this.stepsArray.controls.forEach((ctrl, i) => {
      ctrl.get('order')?.setValue(i + 1);
    });
  }

  reorderSteps(from: number, to: number): void {
    const ctrl = this.stepsArray.at(from);
    this.stepsArray.removeAt(from);
    this.stepsArray.insert(to, ctrl);
    this.stepsArray.controls.forEach((c, i) => {
      c.get('order')?.setValue(i + 1);
    });
  }

  // --- Per-step validation ---
  isStepValid(stepIndex: number): boolean {
    const stepFields: Record<number, string[]> = {
      0: ['title', 'cuisineType', 'difficulty'],
      1: ['sourceEquipment', 'baseServings', 'prepTime', 'cookTime'],
      2: [],  // ingredients array — checked below
      3: [],  // steps array — checked below
    };
    const fields = stepFields[stepIndex];
    if (!fields) return false;

    const allFieldsValid = fields.every(f => this.form.get(f)?.valid);
    if (stepIndex === 2) {
      return allFieldsValid && this.ingredientsArray.length > 0 && this.ingredientsArray.valid;
    }
    if (stepIndex === 3) {
      return allFieldsValid && this.stepsArray.length > 0 && this.stepsArray.valid;
    }
    return allFieldsValid;
  }

  // --- localStorage draft persistence ---
  saveDraftToLocal(): void {
    try {
      const value = {
        form: this.form.value,
        draftId: this.firestoreDraftId(),
        preview: this.coverPhotoPreview(),
        emoji: this.coverEmoji(),
        step: this.currentStep(),
      };
      localStorage.setItem(this.DRAFT_KEY, JSON.stringify(value));
    } catch {
      // localStorage may be unavailable
    }
  }

  loadDraftFromLocal(): boolean {
    try {
      const raw = localStorage.getItem(this.DRAFT_KEY);
      if (!raw) return false;
      const value = JSON.parse(raw);

      // Rebuild FormArrays from saved data before patching
      this.clearArrays();
      (value.form.tags ?? []).forEach((t: string) => this.addTag(t));
      (value.form.ingredients ?? []).forEach(() => this.addIngredient());
      (value.form.steps ?? []).forEach(() => this.addStep());

      this.form.patchValue(value.form);
      this.firestoreDraftId.set(value.draftId ?? null);
      this.coverPhotoPreview.set(value.preview ?? null);
      this.coverEmoji.set(value.emoji ?? null);
      this.currentStep.set(value.step ?? 0);
      return true;
    } catch {
      return false;
    }
  }

  clearDraftFromLocal(): void {
    localStorage.removeItem(this.DRAFT_KEY);
  }

  // --- Reset ---
  reset(): void {
    this.clearArrays();
    this.form.reset({
      difficulty: 'easy',
      baseServings: 4,
      prepTime: 0,
      cookTime: 0,
    });
    this.currentStep.set(0);
    this.firestoreDraftId.set(null);
    this.coverPhotoBlob.set(null);
    if (this.coverPhotoPreview()) {
      URL.revokeObjectURL(this.coverPhotoPreview()!);
    }
    this.coverPhotoPreview.set(null);
    this.coverEmoji.set(null);
    this.clearDraftFromLocal();
  }

  private clearArrays(): void {
    while (this.tagsArray.length > 0) this.tagsArray.removeAt(0);
    while (this.ingredientsArray.length > 0) this.ingredientsArray.removeAt(0);
    while (this.stepsArray.length > 0) this.stepsArray.removeAt(0);
  }
}
