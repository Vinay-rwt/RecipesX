import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { EquipmentSelectorComponent } from './components/equipment-selector/equipment-selector.component';
import { EquipmentBadgeComponent } from './components/equipment-badge/equipment-badge.component';

@NgModule({
  imports: [CommonModule, IonicModule],
  declarations: [EquipmentSelectorComponent, EquipmentBadgeComponent],
  exports: [EquipmentSelectorComponent, EquipmentBadgeComponent],
})
export class SharedModule {}
