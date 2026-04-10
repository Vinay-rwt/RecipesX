import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Recipe } from '../../../core/models/recipe.model';

@Component({
  selector: 'app-recipe-card',
  templateUrl: './recipe-card.component.html',
  styleUrls: ['./recipe-card.component.scss'],
  standalone: false,
})
export class RecipeCardComponent {
  @Input() recipe!: Recipe;
  @Input() showSocialActions = false;
  @Input() featured = false;
  @Input() isLiked = false;
  @Input() isSaved = false;
  @Output() likeToggled = new EventEmitter<void>();
  @Output() saveToggled = new EventEmitter<void>();
  @Output() shareClicked = new EventEmitter<void>();

  onLike(event: Event): void {
    event.stopPropagation();
    this.likeToggled.emit();
  }

  onSave(event: Event): void {
    event.stopPropagation();
    this.saveToggled.emit();
  }

  onShare(event: Event): void {
    event.stopPropagation();
    this.shareClicked.emit();
  }
}
