import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import {
  Auth,
  authState,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  updateProfile,
  User,
} from '@angular/fire/auth';
import {
  Firestore,
  doc,
  setDoc,
  getDoc,
  updateDoc,
} from '@angular/fire/firestore';
import { Observable, of } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { UserProfile } from '../models/user.model';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private auth = inject(Auth);
  private firestore = inject(Firestore);
  private router = inject(Router);

  /** Raw Firebase Auth state — emits null when not authenticated */
  readonly authState$ = authState(this.auth);

  /**
   * Maps auth state to the Firestore user profile document.
   * Emits null when unauthenticated or if user doc doesn't exist yet.
   */
  readonly currentUser$: Observable<UserProfile | null> = this.authState$.pipe(
    switchMap(user => {
      if (!user) return of(null);
      return this.getUserProfileObservable(user.uid);
    })
  );

  async login(email: string, password: string): Promise<void> {
    await signInWithEmailAndPassword(this.auth, email, password);
  }

  async register(email: string, password: string, displayName: string): Promise<void> {
    const credential = await createUserWithEmailAndPassword(this.auth, email, password);
    await updateProfile(credential.user, { displayName });
    await this.createUserDoc(credential.user, displayName);
  }

  async loginWithGoogle(): Promise<void> {
    const provider = new GoogleAuthProvider();
    provider.addScope('profile');
    provider.addScope('email');
    const result = await signInWithPopup(this.auth, provider);
    // Create user doc on first sign-in (idempotent: setDoc with merge)
    const userRef = doc(this.firestore, `users/${result.user.uid}`);
    const snapshot = await getDoc(userRef);
    if (!snapshot.exists()) {
      await this.createUserDoc(result.user, result.user.displayName ?? 'User');
    }
  }

  async logout(): Promise<void> {
    await signOut(this.auth);
    this.router.navigate(['/auth/login']);
  }

  async completeOnboarding(uid: string): Promise<void> {
    const userRef = doc(this.firestore, `users/${uid}`);
    await updateDoc(userRef, {
      onboardingComplete: true,
      updatedAt: new Date(),
    });
  }

  async getUserProfile(uid: string): Promise<UserProfile | null> {
    const userRef = doc(this.firestore, `users/${uid}`);
    const snapshot = await getDoc(userRef);
    if (!snapshot.exists()) return null;
    return snapshot.data() as UserProfile;
  }

  private async createUserDoc(user: User, displayName: string): Promise<void> {
    const userRef = doc(this.firestore, `users/${user.uid}`);
    const profile: UserProfile = {
      uid: user.uid,
      displayName,
      email: user.email!,
      photoURL: user.photoURL,
      equipment: [],
      measurementSystem: 'metric',
      temperatureUnit: 'celsius',
      onboardingComplete: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    await setDoc(userRef, profile);
  }

  /**
   * Converts a one-time Firestore read into an observable.
   * Uses the auth state as the trigger — whenever auth emits, we re-fetch.
   */
  private getUserProfileObservable(uid: string): Observable<UserProfile | null> {
    return new Observable(subscriber => {
      this.getUserProfile(uid)
        .then(profile => {
          subscriber.next(profile);
          subscriber.complete();
        })
        .catch(err => subscriber.error(err));
    });
  }
}
