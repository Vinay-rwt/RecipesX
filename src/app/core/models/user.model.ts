export type CookingLevel = 'beginner' | 'home_cook' | 'advanced' | 'professional';

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  photoURL: string | null;
  bio: string | null;
  location: string | null;
  cookingLevel: CookingLevel | null;
  websiteUrl: string | null;
  equipment: string[];
  measurementSystem: 'metric' | 'imperial';
  temperatureUnit: 'celsius' | 'fahrenheit';
  onboardingComplete: boolean;
  followersCount: number;
  followingCount: number;
  createdAt: Date;
  updatedAt: Date;
}
