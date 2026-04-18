export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  photoURL: string | null;
  equipment: string[];
  measurementSystem: 'metric' | 'imperial';
  temperatureUnit: 'celsius' | 'fahrenheit';
  onboardingComplete: boolean;
  followingCount: number;
  followersCount: number;
  createdAt: Date;
  updatedAt: Date;
}
