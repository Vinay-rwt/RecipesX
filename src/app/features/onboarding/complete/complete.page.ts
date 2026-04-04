import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Auth } from '@angular/fire/auth';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-complete',
  templateUrl: './complete.page.html',
  styleUrls: ['./complete.page.scss'],
  standalone: false,
})
export class CompletePage {
  private auth = inject(Auth);
  private authService = inject(AuthService);
  private router = inject(Router);

  isLoading = false;

  async onGetStarted(): Promise<void> {
    const user = this.auth.currentUser;
    if (!user) return;

    this.isLoading = true;
    try {
      await this.authService.completeOnboarding(user.uid);
      this.router.navigate(['/tabs/feed']);
    } finally {
      this.isLoading = false;
    }
  }
}
