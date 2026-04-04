import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormArray, FormControl, FormGroup } from '@angular/forms';
import { CUISINE_TYPES } from '../../../../core/models/recipe.model';

@Component({
  selector: 'app-step-basics',
  templateUrl: './step-basics.component.html',
  standalone: false,
})
export class StepBasicsComponent {
  @Input() form!: FormGroup;
  @Input() photoPreview: string | null = null;
  @Output() capturePhoto = new EventEmitter<void>();

  readonly cuisineTypes = CUISINE_TYPES;
  tagInput = '';

  get tagsArray(): FormArray {
    return this.form.get('tags') as FormArray;
  }

  onAddTag(): void {
    const trimmed = this.tagInput.trim();
    if (!trimmed) return;
    const existing = this.tagsArray.controls.map(c => c.value as string);
    if (!existing.includes(trimmed)) {
      this.tagsArray.push(new FormControl(trimmed));
    }
    this.tagInput = '';
  }

  removeTag(index: number): void {
    this.tagsArray.removeAt(index);
  }
}
