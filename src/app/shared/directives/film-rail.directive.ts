import { AfterViewInit, ChangeDetectorRef, Directive, ElementRef, inject, NgZone, OnDestroy, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

export function railPosition(left: number, width: number, total: number) {
  const maximum = Math.max(0, total - width);
  return { atStart: left <= 2, atEnd: left >= maximum - 2, progress: maximum ? Math.max(0, Math.min(1, left / maximum)) : 1 };
}

/** One set of scroll, resize, and keyboard behaviors for film and episode shelves. */
@Directive({ selector: '[appFilmRail]', standalone: true, exportAs: 'filmRail' })
export class FilmRailDirective implements AfterViewInit, OnDestroy {
  private host = inject<ElementRef<HTMLElement>>(ElementRef);
  private zone = inject(NgZone);
  private cd = inject(ChangeDetectorRef);
  private browser = isPlatformBrowser(inject(PLATFORM_ID));
  private viewport?: HTMLElement;
  private resize?: ResizeObserver;
  private mutation?: MutationObserver;
  private frame = 0;
  atStart = true;
  atEnd = false;
  progress = 0;
  range = '';

  ngAfterViewInit(): void {
    if (!this.browser) return;
    this.viewport = this.host.nativeElement.querySelector<HTMLElement>('[data-slider-track]') || undefined;
    if (!this.viewport) return;
    this.zone.runOutsideAngular(() => {
      this.viewport!.addEventListener('scroll', this.schedule, { passive: true });
      this.viewport!.addEventListener('keydown', this.keydown);
      this.resize = new ResizeObserver(this.schedule);
      this.resize.observe(this.viewport!);
      this.mutation = new MutationObserver(this.schedule);
      this.mutation.observe(this.viewport!, { childList: true, subtree: true });
      this.schedule();
    });
  }
  private schedule = () => {
    cancelAnimationFrame(this.frame);
    this.frame = requestAnimationFrame(() => this.measure());
  };
  private measure(): void {
    const element = this.viewport;
    if (!element) return;
    const state = railPosition(element.scrollLeft, element.clientWidth, element.scrollWidth);
    const cards = Array.from(element.querySelectorAll<HTMLElement>('[data-slider-item]'));
    const bounds = element.getBoundingClientRect();
    const visible = cards.map((card, index) => ({ box: card.getBoundingClientRect(), index }))
      .filter(card => card.box.right > bounds.left + 20 && card.box.left < bounds.right - 20);
    const range = visible.length ? `${visible[0].index + 1}\u2013${visible[visible.length - 1].index + 1} / ${cards.length}` : '';
    this.zone.run(() => { Object.assign(this, state); this.range = range; this.cd.markForCheck(); });
  }
  previous(): void { this.move(-1); }
  next(): void { this.move(1); }
  private move(direction: number): void {
    const element = this.viewport;
    if (!element) return;
    const cards = element.querySelectorAll<HTMLElement>('[data-slider-item]');
    const stride = cards.length > 1 ? cards[1].offsetLeft - cards[0].offsetLeft : element.clientWidth;
    const step = stride > 0 ? stride * Math.max(1, Math.floor(element.clientWidth / stride)) : element.clientWidth;
    element.scrollBy({ left: direction * step, behavior: this.behavior });
  }
  private get behavior(): ScrollBehavior { return window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth'; }
  private keydown = (event: KeyboardEvent) => {
    if (event.target !== this.viewport) return;
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') this.move(event.key === 'ArrowLeft' ? -1 : 1);
    else this.viewport?.scrollTo({ left: event.key === 'Home' ? 0 : this.viewport.scrollWidth, behavior: this.behavior });
  };
  ngOnDestroy(): void {
    if (!this.browser) return;
    cancelAnimationFrame(this.frame);
    this.resize?.disconnect();
    this.mutation?.disconnect();
    this.viewport?.removeEventListener('scroll', this.schedule);
    this.viewport?.removeEventListener('keydown', this.keydown);
  }
}
