import { AfterViewInit, Directive, ElementRef, inject } from '@angular/core';

/** Focuses the element as soon as it is shown (e.g. the field of a dialog). */
@Directive({ selector: '[appAutofocus]', standalone: true })
export class AutofocusDirective implements AfterViewInit {
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef);

  ngAfterViewInit(): void {
    setTimeout(() => this.element.nativeElement.focus(), 50);
  }
}
