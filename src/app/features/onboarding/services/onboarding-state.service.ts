import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class OnboardingStateService {
  readonly selectedEquipment = signal<string[]>([]);
  readonly measurementSystem = signal<'metric' | 'imperial'>('metric');
  readonly temperatureUnit = signal<'celsius' | 'fahrenheit'>('celsius');

  reset(): void {
    this.selectedEquipment.set([]);
    this.measurementSystem.set('metric');
    this.temperatureUnit.set('celsius');
  }
}
