import { DOCUMENT } from '@angular/common';
import { inject, Injectable } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';

const origin = 'https://cinetex.app';
const homeTitle = 'Cinetex — Discover Movies, TV Shows & Anime';
const homeDescription = 'Find your next movie, TV series or anime on Cinetex. Explore popular and top-rated titles, discover recommendations, and save your favorites in personal collections.';
const pages: Record<string, [string, string, boolean?]> = {
  '/': [homeTitle, homeDescription],
  '/search': [homeTitle, homeDescription],
  '/shows': ['TV Shows & Series to Discover | Cinetex', 'Explore popular TV shows and series on Cinetex. Discover your next story, browse seasons and episodes, and save series to your personal collection.'],
  '/about': ['About Cinetex | Movies, Series & Personal Collections', 'Meet Cinetex, a cinema discovery companion for movies, TV shows and anime. Explore recommendations, organize collections, and find your next favorite story.'],
  '/privacy': ['Privacy Policy | Cinetex', 'Read how Cinetex handles browser storage, account information and third-party services, and learn about your privacy choices.'],
  '/terms': ['Terms of Service | Cinetex', 'Read the terms for using Cinetex, including accounts, third-party services, content information and acceptable use.'],
  '/auth': ['Sign In | Cinetex', 'Sign in to Cinetex to personalize your cinema discovery experience.', true],
  '/profile': ['Your Profile | Cinetex', 'Manage your Cinetex profile and preferences.', true],
  '/lists': ['Your Collections | Cinetex', 'Organize your personal movie and series collections on Cinetex.', true],
  '/favorites': ['Your Favorites | Cinetex', 'Find the movies and series you have saved to your Cinetex favorites.', true],
  '/rated': ['Your Ratings | Cinetex', 'Revisit the movies and series you have rated on Cinetex.', true]
};

@Injectable({ providedIn: 'root' })
export class SeoService {
  private document = inject(DOCUMENT);
  private title = inject(Title);
  private meta = inject(Meta);
  private router = inject(Router);
  private started = false;

  start(): void {
    if (this.started) return;
    this.started = true;
    this.updateRoute(this.router.url);
    this.router.events.pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe(event => this.updateRoute(event.urlAfterRedirects));
  }

  private updateRoute(url: string): void {
    const parsed = this.router.parseUrl(url);
    const path = '/' + (parsed.root.children['primary']?.segments.map(segment => segment.path).join('/') || '');
    const query = String(parsed.queryParams['query'] || '').trim();
    let [title, description, noindex] = pages[path] || ['Explore a Story | Cinetex', 'Discover movie and series information on Cinetex.', true];
    if (query) {
      title = `Search results for “${query.slice(0, 80)}” | Cinetex`;
      description = `Search Cinetex for ${query.slice(0, 120)}. Explore matching movies, TV shows and anime.`;
      noindex = true;
    }
    this.setMetadata(title, description, path === '/search' ? '/' : path, !!noindex);
  }

  setMetadata(title: string, description: string, path: string, noindex = false, image = origin + '/assets/social-preview.png'): void {
    if (path !== '/' && (pages[path] || path.startsWith('/movie/'))) path = path.replace(/\/$/, '') + '/';
    this.title.setTitle(title);
    this.meta.updateTag({ name: 'description', content: description });
    this.meta.updateTag({ name: 'robots', content: noindex ? 'noindex, follow' : 'index, follow, max-image-preview:large' });
    let canonical = this.document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canonical) { canonical = this.document.createElement('link'); canonical.rel = 'canonical'; this.document.head.appendChild(canonical); }
    canonical.href = origin + path;
    for (const [property, content] of Object.entries({ 'og:type': 'website', 'og:site_name': 'Cinetex', 'og:locale': 'en_US', 'og:title': title, 'og:description': description, 'og:url': origin + path, 'og:image': image, 'og:image:alt': title })) this.meta.updateTag({ property, content });
    for (const [name, content] of Object.entries({ 'twitter:card': 'summary_large_image', 'twitter:title': title, 'twitter:description': description, 'twitter:image': image, 'twitter:image:alt': title })) this.meta.updateTag({ name, content });
    let schema = this.document.getElementById('cinetex-structured-data');
    if (!schema) { schema = this.document.createElement('script'); schema.id = 'cinetex-structured-data'; schema.setAttribute('type', 'application/ld+json'); this.document.head.appendChild(schema); }
    schema.textContent = JSON.stringify({ '@context': 'https://schema.org', '@graph': [
      { '@type': 'WebSite', '@id': origin + '/#website', url: origin + '/', name: 'Cinetex', description: homeDescription, inLanguage: 'en' },
      { '@type': path === '/about' ? 'AboutPage' : 'WebPage', '@id': origin + path + '#page', url: origin + path, name: title, description, isPartOf: { '@id': origin + '/#website' }, inLanguage: 'en' }
    ] }).replace(/</g, '\\u003c');
  }
}
