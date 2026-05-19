import { Component, signal } from '@angular/core';

type TabName = 'feed' | 'create' | 'profile';

const BOUNCE_DURATION_MS = 250;

@Component({
  selector: 'app-tabs',
  templateUrl: 'tabs.page.html',
  styleUrls: ['tabs.page.scss'],
  standalone: false,
})
export class TabsPage {
  // The tab being tapped *right now* — used to gate the bounce keyframe.
  // Cleared after the animation duration so a second tap on the same tab
  // re-triggers (CSS re-attaches the animation when the class re-applies).
  readonly activatingTab = signal<TabName | null>(null);

  private clearTimer?: ReturnType<typeof setTimeout>;

  onTabTap(tab: TabName): void {
    if (this.clearTimer) clearTimeout(this.clearTimer);
    this.activatingTab.set(tab);
    this.clearTimer = setTimeout(() => this.activatingTab.set(null), BOUNCE_DURATION_MS);
  }
}
