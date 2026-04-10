import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormArray, FormControl, FormGroup } from '@angular/forms';
import { CUISINE_TYPES } from '../../../../core/models/recipe.model';

export const FOOD_EMOJIS: { label: string; emojis: string[] }[] = [
  {
    label: 'Mains',
    emojis: ['🍝', '🍜', '🍛', '🥘', '🫕', '🍲', '🥗', '🌮', '🌯', '🥙', '🫔', '🍱'],
  },
  {
    label: 'Proteins',
    emojis: ['🍗', '🍖', '🥩', '🍤', '🦐', '🦑', '🐟', '🥚', '🧆', '🫘'],
  },
  {
    label: 'Baked & Grains',
    emojis: ['🍕', '🥪', '🥐', '🥖', '🫓', '🧀', '🥞', '🧇', '🍚', '🍞'],
  },
  {
    label: 'Snacks & Sides',
    emojis: ['🍟', '🧁', '🥨', '🫙', '🥫', '🥙', '🫕', '🥣', '🥧', '🍿'],
  },
  {
    label: 'Sweet',
    emojis: ['🍰', '🎂', '🧁', '🍩', '🍪', '🍫', '🍮', '🍯', '🍭', '🍬'],
  },
  {
    label: 'Drinks & Soup',
    emojis: ['☕', '🍵', '🧋', '🥤', '🍹', '🧃', '🥛', '🫖', '🍜', '🥣'],
  },
];

@Component({
  selector: 'app-step-basics',
  templateUrl: './step-basics.component.html',
  styleUrls: ['./step-basics.component.scss'],
  standalone: false,
})
export class StepBasicsComponent {
  @Input() form!: FormGroup;
  @Input() photoPreview: string | null = null;
  @Input() selectedEmoji: string | null = null;
  @Output() capturePhoto = new EventEmitter<void>();
  @Output() emojiSelected = new EventEmitter<string>();

  readonly cuisineTypes = CUISINE_TYPES;
  readonly foodEmojis = FOOD_EMOJIS;
  tagInput = '';
  showEmojiPicker = false;

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

  onPickEmoji(emoji: string): void {
    this.emojiSelected.emit(emoji);
    this.showEmojiPicker = false;
  }
}
