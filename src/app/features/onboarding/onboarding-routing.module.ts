import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { EquipmentSelectPage } from './equipment-select/equipment-select.page';
import { MeasurementPrefPage } from './measurement-pref/measurement-pref.page';
import { CompletePage } from './complete/complete.page';

const routes: Routes = [
  { path: 'equipment', component: EquipmentSelectPage },
  { path: 'measurements', component: MeasurementPrefPage },
  { path: 'complete', component: CompletePage },
  { path: '', redirectTo: 'equipment', pathMatch: 'full' },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class OnboardingRoutingModule {}
