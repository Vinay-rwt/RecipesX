export interface EquipmentType {
  id: string;
  label: string;
  icon: string;
}

export const EQUIPMENT_TYPES: EquipmentType[] = [
  { id: 'conventional_oven', label: 'Conventional Oven', icon: 'flame-outline' },
  { id: 'air_fryer', label: 'Air Fryer', icon: 'thunderstorm-outline' },
  { id: 'microwave', label: 'Microwave', icon: 'radio-outline' },
  { id: 'stovetop', label: 'Stovetop', icon: 'bonfire-outline' },
  { id: 'pressure_cooker', label: 'Pressure Cooker', icon: 'timer-outline' },
  { id: 'slow_cooker', label: 'Slow Cooker', icon: 'time-outline' },
  { id: 'grill', label: 'Grill', icon: 'grid-outline' },
  { id: 'toaster_oven', label: 'Toaster Oven', icon: 'cube-outline' },
];

export function getEquipmentById(id: string): EquipmentType | undefined {
  return EQUIPMENT_TYPES.find(e => e.id === id);
}
