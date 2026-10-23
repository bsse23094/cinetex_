import { Directive, ElementRef, HostListener, inject, OnDestroy } from '@angular/core';
import { gsap } from 'gsap';

@Directive({ selector: '[appCinemaHover]', standalone: true })
export class CinemaHoverDirective implements OnDestroy {
  private element: ElementRef<HTMLElement> = inject(ElementRef);
  private target?: HTMLElement;
  @HostListener('pointermove', ['$event'])
  onMove(event: PointerEvent): void {
    if (event.pointerType !== 'mouse' || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const target = this.target ||= this.element.nativeElement.querySelector<HTMLElement>('.poster-container') || undefined;
    if (!target) return;
    const rect = this.element.nativeElement.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width - .5;
    const y = (event.clientY - rect.top) / rect.height - .5;
    gsap.to(target, { rotationY: x * 12, rotationX: -y * 8, y: -7, duration: .65, ease: 'power3.out', overwrite: true, transformPerspective: 900 });
  }
  @HostListener('pointerleave')
  reset(): void { if (this.target) gsap.to(this.target, { rotationX: 0, rotationY: 0, y: 0, duration: .8, ease: 'power3.out', overwrite: true }); }
  ngOnDestroy(): void { if (this.target) gsap.killTweensOf(this.target); }
}

@Directive({ selector: '[appMagnetic]', standalone: true })
export class MagneticDirective implements OnDestroy {
  private element: ElementRef<HTMLElement> = inject(ElementRef);
  @HostListener('pointermove', ['$event'])
  onMove(event: PointerEvent): void {
    if (event.pointerType !== 'mouse' || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const target = this.element.nativeElement;
    const rect = target.getBoundingClientRect();
    gsap.to(target, { x: (event.clientX - rect.left - rect.width / 2) * .12, y: (event.clientY - rect.top - rect.height / 2) * .18, duration: .5, ease: 'power3.out', overwrite: true });
  }
  @HostListener('pointerleave')
  reset(): void { gsap.to(this.element.nativeElement, { x: 0, y: 0, duration: .8, ease: 'elastic.out(1,.5)', overwrite: true }); }
  ngOnDestroy(): void { gsap.killTweensOf(this.element.nativeElement); }
}
