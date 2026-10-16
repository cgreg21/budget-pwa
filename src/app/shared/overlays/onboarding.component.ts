import { Component, HostListener, computed, inject, signal } from '@angular/core';

import { UI_ICONS } from '../../ui/icons';
import { OnboardingService } from '../../ui/onboarding.service';
import { SettingsService } from '../../preferences/settings.service';

/** Horizontal distance, in px, beyond which a swipe changes the slide. */
const SWIPE_DISTANCE = 50;
const SLIDE_ICONS = [UI_ICONS.logo, UI_ICONS.add, UI_ICONS.repeat, UI_ICONS.stats, UI_ICONS.cloudOk];

/** The first-launch presentation: a swipeable carousel that can be skipped at any time. */
@Component({
  selector: 'app-onboarding',
  standalone: true,
  templateUrl: './onboarding.component.html',
})
export class OnboardingComponent {
  readonly s = inject(SettingsService);
  private readonly onboarding = inject(OnboardingService);

  readonly index = signal(0);
  readonly slides = computed(() => this.s.t().onboarding.slides.map((slide, i) => ({ ...slide, icon: SLIDE_ICONS[i] ?? UI_ICONS.logo })));
  readonly last = computed(() => this.index() >= this.slides().length - 1);
  protected startX: number | null = null;

  next(): void {
    if (this.last()) this.close();
    else this.index.update((i) => i + 1);
  }

  previous(): void {
    this.index.update((i) => Math.max(0, i - 1));
  }

  go(i: number): void {
    this.index.set(i);
  }

  close(): void {
    this.onboarding.close();
    this.index.set(0);
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.close();
  }

  @HostListener('document:keydown.arrowright')
  onRight(): void {
    if (!this.last()) this.next();
  }

  @HostListener('document:keydown.arrowleft')
  onLeft(): void {
    this.previous();
  }

  onDown(event: PointerEvent): void {
    event.stopPropagation();
    this.startX = event.clientX;
  }

  onUp(event: PointerEvent): void {
    if (this.startX === null) return;
    const delta = event.clientX - this.startX;
    this.startX = null;
    if (delta <= -SWIPE_DISTANCE && !this.last()) this.next();
    else if (delta >= SWIPE_DISTANCE) this.previous();
  }
}
