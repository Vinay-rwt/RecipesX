import { Component, signal } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { SplashScreen } from '@capacitor/splash-screen';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: false,
})
export class AppComponent {
  readonly showBootSplash = signal(true);

  constructor() {
    // Hide native splash immediately — boot-splash component covers the gap.
    if (Capacitor.isNativePlatform()) {
      void SplashScreen.hide({ fadeOutDuration: 0 });
    }
  }

  onBootSplashDone(): void {
    this.showBootSplash.set(false);
  }
}
