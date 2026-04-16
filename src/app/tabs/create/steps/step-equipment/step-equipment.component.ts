import { Component, Input } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { EQUIPMENT_TYPES, EquipmentType } from '../../../../core/models/equipment.model';

@Component({
  selector: 'app-step-equipment',
  templateUrl: './step-equipment.component.html',
  styleUrls: ['./step-equipment.component.scss'],
  standalone: false,
})
export class StepEquipmentComponent {
  @Input() form!: FormGroup;

  readonly equipmentTypes: EquipmentType[] = EQUIPMENT_TYPES;

  selectEquipment(id: string): void {
    this.form.get('sourceEquipment')?.setValue(id);
  }

  isSelected(id: string): boolean {
    return this.form.get('sourceEquipment')?.value === id;
  }
}
