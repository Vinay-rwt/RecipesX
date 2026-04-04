import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { CreatePageRoutingModule } from './create-routing.module';
import { SharedModule } from '../../shared/shared.module';
import { CreatePage } from './create.page';
import { StepBasicsComponent } from './steps/step-basics/step-basics.component';
import { StepEquipmentComponent } from './steps/step-equipment/step-equipment.component';
import { StepIngredientsComponent } from './steps/step-ingredients/step-ingredients.component';
import { StepDirectionsComponent } from './steps/step-directions/step-directions.component';

@NgModule({
  imports: [CommonModule, FormsModule, ReactiveFormsModule, IonicModule, CreatePageRoutingModule, SharedModule],
  declarations: [
    CreatePage,
    StepBasicsComponent,
    StepEquipmentComponent,
    StepIngredientsComponent,
    StepDirectionsComponent,
  ],
})
export class CreatePageModule {}
