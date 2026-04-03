import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map, take } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';

/**
 * Redirects to /onboarding/equipment if the user hasn't completed onboarding.
 * Must run AFTER authGuard — assumes the user is already authenticated.
 */
export const onboardingGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return authService.currentUser$.pipe(
    take(1),
    map(profile => {
      if (profile?.onboardingComplete) return true;
      return router.createUrlTree(['/onboarding/equipment']);
    })
  );
};
