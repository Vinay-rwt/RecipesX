import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Auth, authState } from '@angular/fire/auth';
import { map, take } from 'rxjs/operators';

/**
 * Redirects to /auth/login if the user is not authenticated.
 * Uses take(1) so the guard resolves once and doesn't hold a subscription.
 */
export const authGuard: CanActivateFn = () => {
  const auth = inject(Auth);
  const router = inject(Router);

  return authState(auth).pipe(
    take(1),
    map(user => user ? true : router.createUrlTree(['/auth/login']))
  );
};
