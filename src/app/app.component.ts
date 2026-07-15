// src/app/app.component.ts
import { Component, OnInit, OnDestroy, AfterViewInit, HostListener, inject, Renderer2, ElementRef, ViewChild, NgZone, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive, Router, NavigationEnd } from '@angular/router';
import { filter, Subscription } from 'rxjs';
import Lenis from 'lenis';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { LoadingScreenComponent } from './shared/components/loading-screen/loading-screen.component';
import { FooterComponent } from './shared/components/footer/footer.component';
import { ChatbotComponent } from './shared/components/chatbot/chatbot.component';
import { DarkVeilComponent } from './shared/components/dark-veil/dark-veil.component';
import { AuthUser, SupabaseAuthService } from './core/services/supabase-auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive, LoadingScreenComponent, FooterComponent, ChatbotComponent, DarkVeilComponent],
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
  private router = inject(Router);
  private renderer = inject(Renderer2);
  private zone = inject(NgZone);
  private platformId = inject(PLATFORM_ID);
  private auth = inject(SupabaseAuthService);
  private lenis?: Lenis;
  private observer?: MutationObserver;
  private animationTimeout?: ReturnType<typeof setTimeout>;
  private routeSubscription?: Subscription;
  private authSubscription?: Subscription;
  private authRouteSubscription?: Subscription;

  ngOnInit() {
    this.isAuthRoute = this.router.url.startsWith('/auth');
    this.authRouteSubscription = this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe((event) => this.isAuthRoute = event.urlAfterRedirects.startsWith('/auth'));
    this.authSubscription = this.auth.user$.subscribe((user) => this.authUser = user);
    // Simulate loading time - adjust as needed
    setTimeout(() => {
      this.isLoading = false;
      // The route outlet is created with the app shell after the loading screen.
      // Attach the observer on the following frame, once #mainContent exists.
      if (isPlatformBrowser(this.platformId)) requestAnimationFrame(() => this.attachMotionSurface());
    }, 2000); // 2 seconds loading screen
  }

  ngAfterViewInit() {
    if (!isPlatformBrowser(this.platformId) || this.prefersReducedMotion()) return;

    this.zone.runOutsideAngular(() => {
      gsap.registerPlugin(ScrollTrigger);
      this.lenis = new Lenis({
        duration: 1.05,
        smoothWheel: true,
        syncTouch: false,
        anchors: { offset: -92 }
      });

      this.lenis.on('scroll', () => ScrollTrigger.update());
      gsap.ticker.add((time) => this.lenis?.raf(time * 1000));
      gsap.ticker.lagSmoothing(0);

      this.routeSubscription = this.router.events
        .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
        .subscribe(() => this.scheduleMotion());

      this.attachMotionSurface();
    });
  }

  ngOnDestroy() {
    this.routeSubscription?.unsubscribe();
    this.authRouteSubscription?.unsubscribe();
    this.authSubscription?.unsubscribe();
    this.observer?.disconnect();
    if (this.animationTimeout) clearTimeout(this.animationTimeout);
    this.lenis?.destroy();
    ScrollTrigger.getAll().forEach((trigger) => trigger.kill());
  }

  private scheduleMotion() {
    if (this.animationTimeout) clearTimeout(this.animationTimeout);
    this.animationTimeout = setTimeout(() => this.bindScrollMotion(), 80);
  }

  private attachMotionSurface() {
    if (!this.lenis || !this.mainContent?.nativeElement) return;
    if (!this.observer) {
      this.observer = new MutationObserver(() => this.scheduleMotion());
      this.observer.observe(this.mainContent.nativeElement, { childList: true, subtree: true });
    }
    this.scheduleMotion();
  }

  private bindScrollMotion() {
    const root = this.mainContent?.nativeElement;
    if (!root) return;

    root.querySelectorAll<HTMLElement>('[data-reveal]').forEach((element) => {
      if (element.dataset['motionBound']) return;
      element.dataset['motionBound'] = 'true';
      gsap.fromTo(element, { autoAlpha: 0, y: 34 }, {
        autoAlpha: 1,
        y: 0,
        duration: 0.78,
        ease: 'power3.out',
        scrollTrigger: { trigger: element, start: 'top 88%', once: true }
      });
    });

    root.querySelectorAll<HTMLElement>('[data-reveal-row]').forEach((row) => {
      if (row.dataset['motionBound']) return;
      row.dataset['motionBound'] = 'true';
      const heading = row.querySelector('.row-heading');
      const cards = Array.from(row.querySelectorAll<HTMLElement>('.movie-card')).slice(0, 7);
      const timeline = gsap.timeline({
        scrollTrigger: { trigger: row, start: 'top 84%', once: true }
      });
      if (heading) timeline.from(heading, { autoAlpha: 0, x: -28, duration: 0.58, ease: 'power3.out' });
      if (cards.length) timeline.from(cards, {
        autoAlpha: 0,
        y: 34,
        stagger: 0.075,
        duration: 0.6,
        ease: 'power3.out'
      }, heading ? '-=0.2' : 0);
    });

    root.querySelectorAll<HTMLElement>('[data-hero-reveal]').forEach((element, index) => {
      if (element.dataset['motionBound']) return;
      element.dataset['motionBound'] = 'true';
      gsap.fromTo(element, { autoAlpha: 0, y: index === 1 ? 70 : 20 }, {
        autoAlpha: 1,
        y: 0,
        duration: index === 1 ? 0.95 : 0.55,
        delay: index * 0.08,
        ease: 'power3.out'
      });
    });

    ScrollTrigger.refresh();
  }

  private prefersReducedMotion(): boolean {
    return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  @HostListener('window:scroll')
  onWindowScroll() {
    this.isScrolled = window.pageYOffset > 50;
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
