import { Component, Input } from '@angular/core';
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
}
