import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { OnboardingRoutingModule } from './onboarding-routing.module';
import { EquipmentSelectPage } from './equipment-select/equipment-select.page';
import { MeasurementPrefPage } from './measurement-pref/measurement-pref.page';
import { CompletePage } from './complete/complete.page';

@NgModule({
  imports: [CommonModule, FormsModule, IonicModule, OnboardingRoutingModule],
  declarations: [EquipmentSelectPage, MeasurementPrefPage, CompletePage],
})
export class OnboardingModule {}
