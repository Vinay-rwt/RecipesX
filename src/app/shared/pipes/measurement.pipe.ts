import { Pipe, PipeTransform } from '@angular/core';

// Metric → imperial conversion factors
const CONVERSIONS: Record<string, { factor: number; imperialUnit: string }> = {
  g:   { factor: 0.035274, imperialUnit: 'oz' },
  kg:  { factor: 2.20462,  imperialUnit: 'lb' },
  ml:  { factor: 0.033814, imperialUnit: 'fl oz' },
  L:   { factor: 4.22675,  imperialUnit: 'cups' },
};

@Pipe({ name: 'measurement', standalone: false })
export class MeasurementPipe implements PipeTransform {
  transform(
    value: number | null | undefined,
    unit: string,
    system: 'metric' | 'imperial' = 'metric',
  ): string {
    if (value == null) return '';
    const displayUnit = unit || '';

    if (system === 'imperial' && CONVERSIONS[displayUnit]) {
      const { factor, imperialUnit } = CONVERSIONS[displayUnit];
      const converted = value * factor;
      // Round to 1 decimal for small values, integer for large
      const rounded = converted >= 10 ? Math.round(converted) : Math.round(converted * 10) / 10;
      return `${rounded} ${imperialUnit}`;
    }

    return displayUnit ? `${value} ${displayUnit}` : `${value}`;
  }
}
