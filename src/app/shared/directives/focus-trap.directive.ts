import { AfterViewInit, Directive, ElementRef, HostListener, inject, Input, OnChanges, OnDestroy, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

/** Keeps keyboard focus inside an open overlay and returns it to its trigger. */
@Directive({ selector: '[appFocusTrap]', standalone: true })
export class FocusTrapDirective implements AfterViewInit, OnChanges, OnDestroy {
  @Input() appFocusTrap = true;
  private host: ElementRef<HTMLElement> = inject(ElementRef);
  private browser = isPlatformBrowser(inject(PLATFORM_ID));
  private ready = false;
  private previous: HTMLElement | null = null;
  private frame = 0;

  ngAfterViewInit(): void { this.ready = true; this.sync(); }
  ngOnChanges(): void { if (this.ready) this.sync(); }

  private candidates(): HTMLElement[] {
    return Array.from(this.host.nativeElement.querySelectorAll<HTMLElement>('a[href],button:not([disabled]),input:not([disabled]),select,textarea,[tabindex="0"]'))
      .filter(element => element.getClientRects().length > 0 && !element.closest('[inert]'));
  }

  private sync(): void {
    if (!this.browser) return;
    cancelAnimationFrame(this.frame);
    if (this.appFocusTrap) {
      this.previous = document.activeElement as HTMLElement;
      this.frame = requestAnimationFrame(() => this.candidates()[0]?.focus());
    } else this.restore();
  }

  @HostListener('keydown', ['$event'])
  onKeydown(event: KeyboardEvent): void {
    if (!this.appFocusTrap || event.key !== 'Tab') return;
    const items = this.candidates();
    const first = items[0];
    const last = items[items.length - 1];
    if (!first) { event.preventDefault(); return; }
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  }

  private restore(): void {
    if (this.previous?.isConnected) this.previous.focus();
    this.previous = null;
  }
  ngOnDestroy(): void { if (this.browser) { cancelAnimationFrame(this.frame); this.restore(); } }
}
