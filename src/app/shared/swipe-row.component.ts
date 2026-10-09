import { ChangeDetectionStrategy, Component, effect, input, output, signal, untracked } from '@angular/core';

/** Width of the delete button revealed by swiping a row, and the move needed to pick a direction. */
const SWIPE_WIDTH = 88;
const SWIPE_SLOP = 10;

/**
 * A list row that reveals a delete button when swiped to the left. `open` is controlled by the
 * parent so that only one row stays open at a time.
 */
@Component({
  selector: 'app-swipe-row',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="relative py-[3px]">
      <button type="button"
              class="absolute bottom-[3px] right-3 top-[3px] w-[88px] rounded-lg bg-danger text-sm font-bold text-on-brand"
              [attr.tabindex]="open() ? 0 : -1"
              (click)="remove.emit()">{{ removeLabel() }}</button>
      <div class="row relative m-0 mx-3 flex cursor-pointer touch-pan-y select-none items-center"
           [class.transition-transform]="!dragging()"
           [style.transform]="'translateX(' + x() + 'px)'"
           (pointerdown)="onDown($event)" (pointermove)="onMove($event)"
           (pointerup)="onUp($event)" (pointercancel)="onUp($event)"
           (click)="onClick()">
        <ng-content />
      </div>
    </div>
  `,
})
export class SwipeRowComponent {
  readonly open = input(false);
  readonly removeLabel = input.required<string>();
  readonly openChange = output<boolean>();
  readonly edit = output<void>();
  readonly remove = output<void>();

  protected readonly x = signal(0);
  protected readonly dragging = signal(false);

  private start: { x: number; y: number; origin: number; id: number; direction: 'horizontal' | 'vertical' | null } | null = null;
  private moved = false;

  constructor() {
    effect(() => {
      const open = this.open();
      untracked(() => this.x.set(open ? -SWIPE_WIDTH : 0));
    });
  }

  protected onDown(event: PointerEvent): void {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    this.start = { x: event.clientX, y: event.clientY, origin: this.x(), id: event.pointerId, direction: null };
    this.moved = false;
  }

  protected onMove(event: PointerEvent): void {
    const start = this.start;
    if (!start) return;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    if (start.direction === null && Math.max(Math.abs(dx), Math.abs(dy)) >= SWIPE_SLOP) {
      start.direction = Math.abs(dx) > Math.abs(dy) ? 'horizontal' : 'vertical';
      if (start.direction === 'horizontal') {
        (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
        this.dragging.set(true);
      }
    }
    if (start.direction === 'horizontal') {
      this.moved = true;
      this.x.set(Math.min(0, Math.max(-SWIPE_WIDTH, start.origin + dx)));
    }
  }

  protected onUp(event: PointerEvent): void {
    const start = this.start;
    this.start = null;
    if (!start || start.direction !== 'horizontal') return;
    this.dragging.set(false);
    const open = this.x() < -SWIPE_WIDTH / 2;
    this.x.set(open ? -SWIPE_WIDTH : 0);
    (event.currentTarget as HTMLElement).releasePointerCapture?.(event.pointerId);
    if (open !== this.open()) this.openChange.emit(open);
  }

  protected onClick(): void {
    if (this.moved) {
      this.moved = false;
      return;
    }
    this.edit.emit();
  }
}
