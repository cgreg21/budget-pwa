import { Injectable, signal } from '@angular/core';

/** Matches Tailwind's `md` breakpoint: from here the drawer becomes a permanent sidebar. */
export const WIDE_QUERY = '(min-width: 768px)';

/** Exposes whether the tablet / desktop layout is active, for the parts CSS alone cannot switch. */
@Injectable({ providedIn: 'root' })
export class LayoutService {
  readonly wide = signal(false);

  constructor() {
    const media = window.matchMedia(WIDE_QUERY);
    this.wide.set(media.matches);
    media.addEventListener('change', (event) => this.wide.set(event.matches));
  }
}
