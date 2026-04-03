import { Component, EventEmitter, Input, Output } from '@angular/core';
import { EQUIPMENT_TYPES, EquipmentType } from '../../../core/models/equipment.model';

@Component({
  selector: 'app-equipment-selector',
  templateUrl: './equipment-selector.component.html',
  styleUrls: ['./equipment-selector.component.scss'],
  standalone: false,
})
export class EquipmentSelectorComponent {
  @Input() selectedEquipment: string[] = [];
  @Output() equipmentChange = new EventEmitter<string[]>();

  readonly equipmentTypes: EquipmentType[] = EQUIPMENT_TYPES;

  isSelected(id: string): boolean {
    return this.selectedEquipment.includes(id);
  }

  toggleEquipment(id: string): void {
    const updated = this.isSelected(id)
      ? this.selectedEquipment.filter(e => e !== id)
      : [...this.selectedEquipment, id];
    this.equipmentChange.emit(updated);
  }
}
