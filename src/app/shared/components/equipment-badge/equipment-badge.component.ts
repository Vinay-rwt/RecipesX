import { Component, Input } from '@angular/core';
import { getEquipmentById } from '../../../core/models/equipment.model';

@Component({
  selector: 'app-equipment-badge',
  templateUrl: './equipment-badge.component.html',
  styleUrls: ['./equipment-badge.component.scss'],
  standalone: false,
})
export class EquipmentBadgeComponent {
  @Input() equipmentId!: string;

  get label(): string {
    return getEquipmentById(this.equipmentId)?.label ?? this.equipmentId;
  }

  get icon(): string {
    return getEquipmentById(this.equipmentId)?.icon ?? 'help-outline';
  }
}
