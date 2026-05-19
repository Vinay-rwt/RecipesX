import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  NgZone,
  OnDestroy,
  Output,
  ViewChild,
} from '@angular/core';
import lottie, { AnimationItem } from 'lottie-web';

const FADE_OUT_MS = 250;
const REDUCED_MOTION_HOLD_MS = 600;
const SAFETY_TIMEOUT_MS = 3000;

@Component({
  selector: 'app-boot-splash',
  templateUrl: './boot-splash.component.html',
  styleUrls: ['./boot-splash.component.scss'],
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BootSplashComponent implements AfterViewInit, OnDestroy {
  @ViewChild('lottieHost', { static: false }) lottieHost?: ElementRef<HTMLElement>;
  @Output() done = new EventEmitter<void>();

  readonly reducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;

  fadingOut = false;

  private animation?: AnimationItem;
  private safetyTimer?: ReturnType<typeof setTimeout>;
  private fadeTimer?: ReturnType<typeof setTimeout>;
  private emitted = false;

  constructor(private readonly zone: NgZone) {}

  ngAfterViewInit(): void {
    // Run outside Angular: Lottie's RAF loop should not trigger change detection.
    this.zone.runOutsideAngular(() => {
      this.safetyTimer = setTimeout(() => this.beginFadeOut(), SAFETY_TIMEOUT_MS);

      if (this.reducedMotion) {
        this.fadeTimer = setTimeout(() => this.beginFadeOut(), REDUCED_MOTION_HOLD_MS);
        return;
      }

      if (!this.lottieHost) {
        this.beginFadeOut();
        return;
      }

      this.animation = lottie.loadAnimation({
        container: this.lottieHost.nativeElement,
        renderer: 'svg',
        loop: false,
        autoplay: true,
        path: 'assets/lottie/boot-splash.json',
      });

      this.animation.addEventListener('complete', () => this.beginFadeOut());
      this.animation.addEventListener('data_failed', () => this.beginFadeOut());
    });
  }

  ngOnDestroy(): void {
    this.clearTimers();
    this.animation?.destroy();
  }

  private beginFadeOut(): void {
    if (this.emitted) return;
    this.emitted = true;
    this.clearTimers();

    this.zone.run(() => {
      this.fadingOut = true;
      setTimeout(() => this.done.emit(), FADE_OUT_MS);
    });
  }

  private clearTimers(): void {
    if (this.safetyTimer) clearTimeout(this.safetyTimer);
    if (this.fadeTimer) clearTimeout(this.fadeTimer);
    this.safetyTimer = undefined;
    this.fadeTimer = undefined;
  }
}
