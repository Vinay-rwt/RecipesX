import { Component, inject } from '@angular/core';
import { AbstractControl, FormBuilder, ValidationErrors, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-register',
  templateUrl: './register.page.html',
  styleUrls: ['./register.page.scss'],
  standalone: false,
})
export class RegisterPage {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);

  registerForm = this.fb.nonNullable.group({
    // Validators.pattern(/\S/) rejects whitespace-only input that Validators.required permits.
    displayName: ['', [Validators.required, Validators.minLength(2), Validators.pattern(/\S/)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
    confirmPassword: ['', [Validators.required]],
  }, { validators: [RegisterPage.passwordsMatch] });

  errorMessage: string | null = null;
  isLoading = false;

  static passwordsMatch(group: AbstractControl): ValidationErrors | null {
    const password = group.get('password')?.value;
    const confirm = group.get('confirmPassword')?.value;
    return password === confirm ? null : { passwordsMismatch: true };
  }

  async onRegister(): Promise<void> {
    if (this.registerForm.invalid) return;

    this.isLoading = true;
    this.errorMessage = null;

    const { displayName, email, password } = this.registerForm.getRawValue();

    try {
      await this.authService.register(email, password.trim() ? password : '', displayName.trim());
      this.router.navigate(['/onboarding/equipment']);
    } catch (err: unknown) {
      console.error('[register] error:', err);
      this.errorMessage = this.mapFirebaseError(err);
    } finally {
      this.isLoading = false;
    }
  }

  private mapFirebaseError(err: unknown): string {
    const code = (err as { code?: string }).code;
    switch (code) {
      case 'auth/email-already-in-use':
        return 'An account with this email already exists.';
      case 'auth/weak-password':
        return 'Password should be at least 8 characters.';
      case 'auth/invalid-email':
        return 'Invalid email format.';
      default:
        return 'Registration failed. Please try again.';
    }
  }
}
