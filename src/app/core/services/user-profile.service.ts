import { Injectable, inject, signal, computed } from '@angular/core';
import {
  Firestore,
  doc,
  getDoc,
  updateDoc,
} from '@angular/fire/firestore';
import { UserProfile } from '../models/user.model';

@Injectable({ providedIn: 'root' })
export class UserProfileService {
  private firestore = inject(Firestore);

  private _userProfile = signal<UserProfile | null>(null);
  private _loading = signal(false);
  private _error = signal<string | null>(null);

  readonly userProfile = this._userProfile.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();
  readonly equipment = computed(() => this._userProfile()?.equipment ?? []);
  readonly measurementSystem = computed(() => this._userProfile()?.measurementSystem ?? 'metric');
  readonly temperatureUnit = computed(() => this._userProfile()?.temperatureUnit ?? 'celsius');

  async loadProfile(uid: string): Promise<void> {
    this._loading.set(true);
    this._error.set(null);
    try {
      const userRef = doc(this.firestore, `users/${uid}`);
      const snapshot = await getDoc(userRef);
      if (snapshot.exists()) {
        this._userProfile.set(snapshot.data() as UserProfile);
      }
    } catch {
      this._error.set('Failed to load profile. Pull down to retry.');
    } finally {
      this._loading.set(false);
    }
  }

  async updateEquipment(uid: string, equipment: string[]): Promise<void> {
    const userRef = doc(this.firestore, `users/${uid}`);
    const updatedAt = new Date();
    await updateDoc(userRef, { equipment, updatedAt });
    this._userProfile.update(p => p ? { ...p, equipment, updatedAt } : null);
  }

  async updatePreferences(
    uid: string,
    measurementSystem: 'metric' | 'imperial',
    temperatureUnit: 'celsius' | 'fahrenheit',
  ): Promise<void> {
    const userRef = doc(this.firestore, `users/${uid}`);
    const updatedAt = new Date();
    await updateDoc(userRef, { measurementSystem, temperatureUnit, updatedAt });
    this._userProfile.update(p => p ? { ...p, measurementSystem, temperatureUnit, updatedAt } : null);
  }

  async saveOnboardingData(
    uid: string,
    equipment: string[],
    measurementSystem: 'metric' | 'imperial',
    temperatureUnit: 'celsius' | 'fahrenheit',
  ): Promise<void> {
    const userRef = doc(this.firestore, `users/${uid}`);
    const updatedAt = new Date();
    const updates = {
      equipment,
      measurementSystem,
      temperatureUnit,
      onboardingComplete: true,
      updatedAt,
    };
    await updateDoc(userRef, updates);
    this._userProfile.update(p => p ? { ...p, ...updates } : null);
  }

  clear(): void {
    this._userProfile.set(null);
    this._error.set(null);
  }
}
