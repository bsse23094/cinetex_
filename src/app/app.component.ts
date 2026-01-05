// src/app/app.component.ts
import { Component, OnInit, HostListener, inject, Renderer2 } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { LoadingScreenComponent } from './shared/components/loading-screen/loading-screen.component';
import { FooterComponent } from './shared/components/footer/footer.component';
import { ChatbotComponent } from './shared/components/chatbot/chatbot.component';
import { DarkVeilComponent } from './shared/components/dark-veil/dark-veil.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive, LoadingScreenComponent, FooterComponent, ChatbotComponent, DarkVeilComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit {
  title = 'cinetex';
  isLoading = true;
  isScrolled = false;
  mobileMenuOpen = false;
  private router = inject(Router);
  private renderer = inject(Renderer2);

  ngOnInit() {
    // Simulate loading time - adjust as needed
    setTimeout(() => {
      this.isLoading = false;
    }, 2000); // 2 seconds loading screen
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
}