// src/app/app.component.ts
import { Component, OnInit, OnDestroy, AfterViewInit, HostListener, inject, Renderer2, ElementRef, ViewChild, NgZone, PLATFORM_ID } from '@angular/core';
import { FocusTrapDirective } from './shared/directives/focus-trap.directive';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive, Router, NavigationEnd } from '@angular/router';
import { filter, Subscription } from 'rxjs';
import { gsap } from 'gsap';
import type Lenis from 'lenis';
import { FooterComponent } from './shared/components/footer/footer.component';
import { ChatbotComponent } from './shared/components/chatbot/chatbot.component';
import { AuthUser, SupabaseAuthService } from './core/services/supabase-auth.service';
import { SeoService } from './core/services/seo.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive, FocusTrapDirective, FooterComponent, ChatbotComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit, AfterViewInit, OnDestroy {
  title = 'cinetex';
  isScrolled = false;
  mobileMenuOpen = false;
  isAuthRoute = false;
  isPlayerRoute = false;
  isDiscoveryRoute = true;
  headerQuery = '';
  @ViewChild('headerSearch') headerSearch?: ElementRef<HTMLInputElement>;
  authUser: AuthUser | null = null;
  @ViewChild('mainContent') mainContent?: ElementRef<HTMLElement>;
  private router = inject(Router);
  private renderer = inject(Renderer2);
  private zone = inject(NgZone);
  private platformId = inject(PLATFORM_ID);
  private auth = inject(SupabaseAuthService);
  private seo = inject(SeoService);
  private observer?: MutationObserver;
  private lenis?: Lenis;
  private destroyed = false;
  private motionQuery?: MediaQueryList;
  private motionChanged = () => {
    if (this.motionQuery?.matches) { this.lenis?.destroy(); this.lenis = undefined; }
    else void this.enableSmoothScroll();
  };
  private revealObserver?: IntersectionObserver;
  private animationTimeout?: ReturnType<typeof setTimeout>;
  private routeSubscription?: Subscription;
  private authSubscription?: Subscription;
  private authRouteSubscription?: Subscription;

  ngOnInit() {
    this.seo.start();
    this.isDiscoveryRoute = ['/', '/search'].includes(this.router.url.split('?')[0]);
    this.isAuthRoute = this.router.url.startsWith('/auth');
    this.isPlayerRoute = this.router.url.startsWith('/watch');
    this.headerQuery = this.router.parseUrl(this.router.url).queryParams['query'] || '';
    this.authRouteSubscription = this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe((event) => {
        this.isDiscoveryRoute = ['/', '/search'].includes(event.urlAfterRedirects.split('?')[0]);
        this.isAuthRoute = event.urlAfterRedirects.startsWith('/auth');
        this.isPlayerRoute = event.urlAfterRedirects.startsWith('/watch');
        this.headerQuery = this.router.parseUrl(event.urlAfterRedirects).queryParams['query'] || '';
        if (this.mobileMenuOpen) this.closeMobileMenu();
      });
    this.authSubscription = this.auth.user$.subscribe((user) => this.authUser = user);

  }

  ngAfterViewInit() {
    if (!isPlatformBrowser(this.platformId)) return;
    this.motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    this.motionQuery.addEventListener('change', this.motionChanged);
    if (this.prefersReducedMotion()) return;

    this.zone.runOutsideAngular(() => {
      void this.enableSmoothScroll();
      this.revealObserver = new IntersectionObserver((entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const element = entry.target as HTMLElement;
          this.revealObserver?.unobserve(element);
          this.playReveal(element);
        }
      }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });

      this.routeSubscription = this.router.events
        .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
        .subscribe(() => {
          this.revealObserver?.disconnect();
          this.mainContent?.nativeElement.querySelectorAll<HTMLElement>('[data-reveal], [data-reveal-row]')
            .forEach((element) => delete element.dataset['motionBound']);
          this.scheduleMotion();
        });

      this.attachMotionSurface();
    });
  }

  private async enableSmoothScroll(): Promise<void> {
    if (this.lenis || this.destroyed || this.prefersReducedMotion()) return;
    const { default: Lenis } = await import('lenis');
    if (this.destroyed || this.lenis || this.prefersReducedMotion()) return;
    this.zone.runOutsideAngular(() => {
      this.lenis = new Lenis({ autoRaf: true, lerp: .075, smoothWheel: true, syncTouch: false, anchors: { offset: -100 }, prevent: node => !!node.closest('.modal-content, .chat-messages, .nav-links.mobile-open, .season-dropdown') });
      if (this.mobileMenuOpen) this.lenis.stop();
    });
  }

  ngOnDestroy() {
    this.destroyed = true;
    this.lenis?.destroy();
    this.motionQuery?.removeEventListener('change', this.motionChanged);
    if (isPlatformBrowser(this.platformId)) this.renderer.removeStyle(document.body, 'overflow');
    this.routeSubscription?.unsubscribe();
    this.authRouteSubscription?.unsubscribe();
    this.authSubscription?.unsubscribe();
    this.observer?.disconnect();
    this.revealObserver?.disconnect();
    if (this.animationTimeout) clearTimeout(this.animationTimeout);
  }

  private scheduleMotion() {
    if (this.animationTimeout) clearTimeout(this.animationTimeout);
    this.animationTimeout = setTimeout(() => this.bindScrollMotion(), 80);
  }

  private attachMotionSurface() {
    if (!this.revealObserver || !this.mainContent?.nativeElement) return;
    const root = this.mainContent.nativeElement;
    this.renderer.addClass(root, 'motion-ready');
    if (!this.observer) {
      this.observer = new MutationObserver((records) => {
        if (records.some((record) => record.addedNodes.length > 0)) this.scheduleMotion();
      });
      this.observer.observe(root, { childList: true, subtree: true });
    }
    this.scheduleMotion();
  }

  private bindScrollMotion() {
    if (this.prefersReducedMotion()) return;
    const root = this.mainContent?.nativeElement;
    if (!root || !this.revealObserver) return;

    root.querySelectorAll<HTMLElement>('[data-reveal], [data-reveal-row]').forEach((element) => {
      if (element.dataset['motionBound']) return;
      element.dataset['motionBound'] = 'true';
      this.revealObserver?.observe(element);
    });

    root.querySelectorAll<HTMLElement>('[data-hero-reveal]').forEach((element, index) => {
      if (element.dataset['motionBound']) return;
      element.dataset['motionBound'] = 'true';
      gsap.fromTo(element, { autoAlpha: 0, y: 28, filter: 'blur(5px)' }, {
        autoAlpha: 1,
        y: 0, rotate: 0, filter: 'blur(0px)',
        duration: 1.25,
        delay: .12 + index * .16,
        ease: 'expo.out',
        clearProps: 'transform,filter'
      });
    });
  }

  private playReveal(element: HTMLElement) {
    if (this.prefersReducedMotion()) return;
    if (element.hasAttribute('data-reveal-row')) {
      gsap.set(element, { opacity: 1 });
      const heading = element.querySelector('.row-heading');
      const cards = Array.from(element.querySelectorAll<HTMLElement>('.movie-card')).slice(0, 6);
      const timeline = gsap.timeline();
      if (heading) timeline.from(heading, { autoAlpha: 0, x: -18, duration: .45, ease: 'power2.out' });
      if (cards.length) timeline.from(cards, { autoAlpha: 0, y: 65, rotate: 2, stagger: .075, duration: .9, ease: 'power3.out', clearProps: 'transform,opacity,visibility' }, heading ? '-=.15' : 0);
      return;
    }
    gsap.fromTo(element, { autoAlpha: 0, y: 55 }, { autoAlpha: 1, y: 0, duration: 1, ease: 'power3.out', clearProps: 'transform' });
  }

  private prefersReducedMotion(): boolean {
    return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  @HostListener('window:scroll')
  onWindowScroll() {
    this.isScrolled = window.pageYOffset > 50;
  }

  @HostListener('window:resize')
  onWindowResize() {
    if (this.mobileMenuOpen && window.innerWidth > 1050) this.closeMobileMenu();
  }

  @HostListener('document:keydown.escape')
  onEscape() {
    if (this.mobileMenuOpen) this.closeMobileMenu();
  }

  @HostListener('document:keydown', ['$event'])
  onSearchShortcut(event: KeyboardEvent) {
    const command = (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k';
    if ((!command && (event.key !== '/' || event.ctrlKey || event.metaKey || event.altKey)) || this.isAuthRoute) return;
    const target = event.target;
    if (!command && target instanceof HTMLElement && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName) || target.getAttribute('role') === 'combobox')) return;
    event.preventDefault();
    if (this.mobileMenuOpen) this.closeMobileMenu();
    requestAnimationFrame(() => this.headerSearch?.nativeElement.focus());
  }

  toggleMobileMenu() {
    this.mobileMenuOpen = !this.mobileMenuOpen;
    this.updateBodyOverflow();
  }

  closeMobileMenu() {
    this.mobileMenuOpen = false;
    this.updateBodyOverflow();
  }

  private updateBodyOverflow() {
    const body = document.body;
    if (this.mobileMenuOpen) {
      this.lenis?.stop();
      this.renderer.setStyle(body, 'overflow', 'hidden');
    } else {
      this.renderer.removeStyle(body, 'overflow');
      this.lenis?.start();
    }
  }

  onSearch(query: string) {
    if (query.trim()) {
      this.router.navigate(['/search'], { queryParams: { query: query.trim() } });
      this.closeMobileMenu();
    }
  }

  get profileName(): string {
    const displayName = this.authUser?.user_metadata?.['display_name'];
    if (typeof displayName === 'string' && displayName.trim()) return displayName.trim();
    return this.authUser?.email?.split('@')[0] || 'profile';
  }

  get profileInitial(): string {
    return this.profileName.charAt(0).toUpperCase();
  }
}
