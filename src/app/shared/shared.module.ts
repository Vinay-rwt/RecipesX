import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { EquipmentSelectorComponent } from './components/equipment-selector/equipment-selector.component';
import { EquipmentBadgeComponent } from './components/equipment-badge/equipment-badge.component';
import { RecipeCardComponent } from './components/recipe-card/recipe-card.component';
import { MyRecipesComponent } from './components/my-recipes/my-recipes.component';
import { TemperaturePipe } from './pipes/temperature.pipe';
import { MeasurementPipe } from './pipes/measurement.pipe';

@NgModule({
  imports: [CommonModule, RouterModule, IonicModule],
  declarations: [
    EquipmentSelectorComponent,
    EquipmentBadgeComponent,
    RecipeCardComponent,
    MyRecipesComponent,
    TemperaturePipe,
    MeasurementPipe,
  ],
  exports: [
    EquipmentSelectorComponent,
    EquipmentBadgeComponent,
    RecipeCardComponent,
    MyRecipesComponent,
    TemperaturePipe,
    MeasurementPipe,
  ],
})
export class SharedModule {}
