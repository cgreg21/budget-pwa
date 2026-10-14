import { Component, HostListener, input, output, signal } from '@angular/core';

/** Distance, in px, beyond which releasing the handle closes the sheet; a quick flick closes it sooner. */
const DISMISS_DISTANCE = 100;
const FLICK_DISTANCE = 40;
const FLICK_SPEED = 0.5;

/**
 * A modal panel over a dimmed backdrop: a bottom sheet with a handle, or, with `full`,
 * a full-screen form. Clicking the backdrop, pressing Escape or swiping the handle down dismisses it.
 */
@Component({
  selector: 'app-sheet',
  templateUrl: './sheet.component.html',
})
export class SheetComponent {
  readonly full = input(false);
  readonly dismiss = output<void>();

  protected readonly offset = signal(0);
  protected readonly dragging = signal(false);
  private start: { pointerId: number; y: number; time: number } | null = null;

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.dismiss.emit();
  }

  protected onHandleDown(event: PointerEvent): void {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    this.start = { pointerId: event.pointerId, y: event.clientY, time: event.timeStamp };
    this.dragging.set(true);
    (event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId);
  }

  protected onHandleMove(event: PointerEvent): void {
    if (this.start?.pointerId !== event.pointerId) return;
    this.offset.set(Math.max(0, event.clientY - this.start.y));
  }

  protected onHandleUp(event: PointerEvent): void {
    const start = this.start;
    if (start?.pointerId !== event.pointerId) return;
    const distance = Math.max(0, event.clientY - start.y);
    const speed = distance / Math.max(1, event.timeStamp - start.time);
    this.reset();
    if (distance >= DISMISS_DISTANCE || (distance >= FLICK_DISTANCE && speed >= FLICK_SPEED)) this.dismiss.emit();
  }

  protected onHandleCancel(event: PointerEvent): void {
    if (this.start?.pointerId === event.pointerId) this.reset();
  }

  private reset(): void {
    this.start = null;
    this.dragging.set(false);
    this.offset.set(0);
  }
}
