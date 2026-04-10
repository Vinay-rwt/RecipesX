import { Component, Input, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Recipe } from '../../../core/models/recipe.model';

@Component({
  selector: 'app-my-recipes',
  templateUrl: './my-recipes.component.html',
  styleUrls: ['./my-recipes.component.scss'],
  standalone: false,
})
export class MyRecipesComponent {
  @Input() recipes: Recipe[] = [];
  @Input() loading = false;

  private router = inject(Router);

  navigateToEdit(id: string, event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.router.navigate(['/tabs/create/edit', id]);
  }
}
