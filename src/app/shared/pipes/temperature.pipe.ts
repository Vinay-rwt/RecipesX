import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'temperature', standalone: false })
export class TemperaturePipe implements PipeTransform {
  transform(celsius: number | null | undefined, unit: 'celsius' | 'fahrenheit' = 'celsius'): string {
    if (celsius == null) return '';
    if (unit === 'fahrenheit') {
      return `${Math.round(celsius * 9 / 5 + 32)}°F`;
    }
    return `${celsius}°C`;
  }
}
