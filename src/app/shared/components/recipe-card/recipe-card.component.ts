import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Recipe } from '../../../core/models/recipe.model';

@Component({
  selector: 'app-recipe-card',
  templateUrl: './recipe-card.component.html',
  styleUrls: ['./recipe-card.component.scss'],
  standalone: false,
})
export class RecipeCardComponent {
  private router = inject(Router);

  @Input() recipe!: Recipe;
  @Input() showSocialActions = false;
  @Input() showAuthor = false;
  @Input() featured = false;
  @Input() isLiked = false;
  @Input() isSaved = false;
  @Input() commentCount = 0;
  @Output() likeToggled = new EventEmitter<void>();
  @Output() saveToggled = new EventEmitter<void>();
  @Output() shareClicked = new EventEmitter<void>();

  goToAuthor(event: Event): void {
    event.stopPropagation();
    this.router.navigate(['/tabs/feed/user', this.recipe.authorId]);
  }

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

  get difficultyColor(): string {
    return ({ easy: 'success', medium: 'warning', hard: 'danger' } as Record<string, string>)[this.recipe?.difficulty] ?? 'medium';
  }
}
