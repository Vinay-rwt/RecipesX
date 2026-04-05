import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { RecipeRoutingModule } from './recipe-routing.module';
import { SharedModule } from '../../shared/shared.module';
import { RecipeDetailPage } from './detail/recipe-detail.page';

@NgModule({
  imports: [CommonModule, IonicModule, RecipeRoutingModule, SharedModule],
  declarations: [RecipeDetailPage],
})
export class RecipeModule {}
