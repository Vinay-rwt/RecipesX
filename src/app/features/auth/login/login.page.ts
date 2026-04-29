import { Component, inject } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: false,
})
export class LoginPage {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);

  loginForm = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  errorMessage: string | null = null;
  infoMessage: string | null = null;
  isLoading = false;
  isSocialLoading = false;
  isSendingReset = false;

  async onLogin(): Promise<void> {
    if (this.loginForm.invalid) return;

    this.isLoading = true;
    this.errorMessage = null;
    this.infoMessage = null;

    const { email, password } = this.loginForm.getRawValue();

    try {
      await this.authService.login(email, password);
      this.router.navigate(['/tabs/feed']);
    } catch (err: unknown) {
      console.error('[login] error:', err);
      this.errorMessage = this.mapFirebaseError(err);
    } finally {
      this.isLoading = false;
    }
  }

  async onGoogleLogin(): Promise<void> {
    this.isSocialLoading = true;
    this.errorMessage = null;
    this.infoMessage = null;
    try {
      await this.authService.loginWithGoogle();
      this.router.navigate(['/tabs/feed']);
    } catch (err: unknown) {
      this.errorMessage = this.mapFirebaseError(err);
    } finally {
      this.isSocialLoading = false;
    }
  }

  async onForgotPassword(): Promise<void> {
    const email = this.loginForm.value.email?.trim();
    if (!email || this.loginForm.controls.email.invalid) {
      this.errorMessage = 'Enter your email above first.';
      this.infoMessage = null;
      return;
    }
    this.isSendingReset = true;
    this.errorMessage = null;
    try {
      await this.authService.sendPasswordReset(email);
    } catch {
      // Intentionally swallow — generic message avoids email-enumeration via reset failures.
    } finally {
      this.isSendingReset = false;
      // Always show the same confirmation regardless of whether the email exists.
      this.infoMessage = 'If an account exists for that email, a reset link is on its way.';
    }
  }

  private mapFirebaseError(err: unknown): string {
    const code = (err as { code?: string }).code;
    switch (code) {
      // Modern Firebase Auth (v9.14+) returns auth/invalid-credential for any
      // bad-email or bad-password combination. The legacy user-not-found /
      // wrong-password codes are mapped to the same message so we never leak
      // account existence even if an older SDK surfaces them.
      case 'auth/invalid-credential':
      case 'auth/user-not-found':
      case 'auth/wrong-password':
        return 'Invalid email or password.';
      case 'auth/invalid-email':
        return 'Invalid email format.';
      case 'auth/too-many-requests':
        return 'Too many attempts. Please try again later.';
      default:
        return 'Login failed. Please try again.';
    }
  }
}
