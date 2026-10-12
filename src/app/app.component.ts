// src/app/app.component.ts
import { Component, OnInit, OnDestroy, AfterViewInit, HostListener, inject, Renderer2, ElementRef, ViewChild, NgZone, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive, Router, NavigationEnd } from '@angular/router';
import { filter, Subscription } from 'rxjs';
import Lenis from 'lenis';
import { gsap } from 'gsap';
import { LoadingScreenComponent } from './shared/components/loading-screen/loading-screen.component';
import { FooterComponent } from './shared/components/footer/footer.component';
import { ChatbotComponent } from './shared/components/chatbot/chatbot.component';
import { AuthUser, SupabaseAuthService } from './core/services/supabase-auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive, LoadingScreenComponent, FooterComponent, ChatbotComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit, AfterViewInit, OnDestroy {
  title = 'cinetex';
  isLoading = true;
  isScrolled = false;
  mobileMenuOpen = false;
  isAuthRoute = false;
  authUser: AuthUser | null = null;
  @ViewChild('mainContent') mainContent?: ElementRef<HTMLElement>;
  @ViewChild('searchInput') searchInput?: ElementRef<HTMLInputElement>;
  private router = inject(Router);
  private renderer = inject(Renderer2);
  private zone = inject(NgZone);
  private platformId = inject(PLATFORM_ID);
  private auth = inject(SupabaseAuthService);
  private lenis?: Lenis;
  private observer?: MutationObserver;
  private revealObserver?: IntersectionObserver;
  private animationTimeout?: ReturnType<typeof setTimeout>;
  private routeSubscription?: Subscription;
  private authSubscription?: Subscription;
  private authRouteSubscription?: Subscription;

  ngOnInit() {
    this.isAuthRoute = this.router.url.startsWith('/auth');
    this.authRouteSubscription = this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe((event) => {
        this.isAuthRoute = event.urlAfterRedirects.startsWith('/auth');
        if (this.mobileMenuOpen) this.closeMobileMenu();
      });
    this.authSubscription = this.auth.user$.subscribe((user) => this.authUser = user);
    // Keep the opening transition brief so the page is ready without a forced pause.
    setTimeout(() => {
      this.isLoading = false;
      // The route outlet is created with the app shell after the loading screen.
      // Attach the observer on the following frame, once #mainContent exists.
      if (isPlatformBrowser(this.platformId)) requestAnimationFrame(() => this.attachMotionSurface());
    }, 420);
  }

  ngAfterViewInit() {
    if (!isPlatformBrowser(this.platformId) || this.prefersReducedMotion()) return;

    this.zone.runOutsideAngular(() => {
      this.lenis = new Lenis({
        autoRaf: true,
        duration: 1.05,
        smoothWheel: true,
        syncTouch: false,
        anchors: { offset: -92 }
      });
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

  ngOnDestroy() {
    if (isPlatformBrowser(this.platformId)) this.renderer.removeStyle(document.body, 'overflow');
    this.routeSubscription?.unsubscribe();
    this.authRouteSubscription?.unsubscribe();
    this.authSubscription?.unsubscribe();
    this.observer?.disconnect();
    this.revealObserver?.disconnect();
    if (this.animationTimeout) clearTimeout(this.animationTimeout);
    this.lenis?.destroy();
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
      gsap.fromTo(element, { autoAlpha: 0, y: index === 1 ? 42 : 16 }, {
        autoAlpha: 1,
        y: 0,
        duration: index === 1 ? 0.75 : 0.45,
        delay: index * 0.06,
        ease: 'power3.out'
      });
    });
  }

  private playReveal(element: HTMLElement) {
    if (element.hasAttribute('data-reveal-row')) {
      gsap.set(element, { opacity: 1 });
      const heading = element.querySelector('.row-heading');
      const cards = Array.from(element.querySelectorAll<HTMLElement>('.movie-card')).slice(0, 4);
      const timeline = gsap.timeline();
      if (heading) timeline.from(heading, { autoAlpha: 0, x: -18, duration: .45, ease: 'power2.out' });
      if (cards.length) timeline.from(cards, { autoAlpha: 0, y: 18, stagger: .05, duration: .4, ease: 'power2.out' }, heading ? '-=.15' : 0);
      return;
    }
    gsap.fromTo(element, { autoAlpha: 0, y: 20 }, { autoAlpha: 1, y: 0, duration: .52, ease: 'power2.out' });
  }

  private prefersReducedMotion(): boolean {
    return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  @HostListener('window:scroll')
  onWindowScroll() {
    this.isScrolled = window.pageYOffset > 50;
  }

  @HostListener('document:keydown.escape')
  onEscape() {
    if (this.mobileMenuOpen) this.closeMobileMenu();
  }

  @HostListener('document:keydown', ['$event'])
  onSearchShortcut(event: KeyboardEvent) {
    if (event.key !== '/' || event.ctrlKey || event.metaKey || event.altKey || this.isAuthRoute) return;
    const target = event.target;
    if (target instanceof HTMLElement && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))) return;
    if (!this.searchInput?.nativeElement || window.matchMedia('(max-width: 850px)').matches) return;
    event.preventDefault();
    this.searchInput.nativeElement.focus();
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
      this.renderer.setStyle(body, 'overflow', 'hidden');
    } else {
      this.renderer.removeStyle(body, 'overflow');
    }
  }

  onSearch(query: string) {
    if (query.trim()) {
      this.router.navigate(['/search'], { queryParams: { query: query } });
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
