import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { BehaviorSubject } from 'rxjs';
import { environment } from '../../../environments/environment';

export type TasteSignal = 'view' | 'favorite' | 'rate' | 'dismiss' | 'list';

export interface TasteSignalInput {
  tmdbId: number;
  mediaType: 'movie' | 'tv';
  genreIds?: number[];
  signal: TasteSignal;
  rating?: number;
  metadata?: Record<string, unknown>;
}

export interface TasteProfile {
  genre_id: number;
  affinity: number;
}

export interface AuthUser {
  id: string;
  email?: string;
  user_metadata?: Record<string, unknown>;
}

interface AuthSession {
  access_token: string;
  refresh_token?: string;
  expires_at?: number;
  user: AuthUser;
}

interface AuthResponse {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  user?: AuthUser;
  msg?: string;
  message?: string;
  error_description?: string;
}

@Injectable({ providedIn: 'root' })
export class SupabaseAuthService {
  private readonly isBrowser: boolean;
  private session: AuthSession | null = null;
  private readonly sessionStorageKey = 'cinetex.supabase.session';

  readonly user$ = new BehaviorSubject<AuthUser | null>(null);
  readonly ready$ = new BehaviorSubject(false);

  constructor(@Inject(PLATFORM_ID) platformId: object) {
    this.isBrowser = isPlatformBrowser(platformId);
    if (!this.isBrowser) {
      this.ready$.next(true);
      return;
    }
    void this.restoreSession();
  }

  private get baseHeaders(): HeadersInit {
    return {
      apikey: environment.supabasePublishableKey,
      'Content-Type': 'application/json'
    };
  }

  private async restoreSession(): Promise<void> {
    try {
      const saved = localStorage.getItem(this.sessionStorageKey);
      if (!saved) return;
      const session = JSON.parse(saved) as AuthSession;
      if (!session.access_token || !session.user?.id) return;
      this.session = session;
      this.user$.next(session.user);
    } finally {
      this.ready$.next(true);
    }
  }

  private saveSession(response: AuthResponse): void {
    if (!response.access_token || !response.user) return;
    this.session = {
      access_token: response.access_token,
      refresh_token: response.refresh_token,
      expires_at: response.expires_in ? Math.floor(Date.now() / 1000) + response.expires_in : undefined,
      user: response.user
    };
    localStorage.setItem(this.sessionStorageKey, JSON.stringify(this.session));
    this.user$.next(response.user);
  }

  private async parseResponse(response: Response): Promise<AuthResponse> {
    const data = await response.json().catch(() => ({})) as AuthResponse;
    if (!response.ok) throw new Error(data.message || data.msg || data.error_description || 'Supabase request failed.');
    return data;
  }

  async signIn(email: string, password: string): Promise<string | null> {
    try {
      const response = await fetch(`${environment.supabaseUrl}/auth/v1/token?grant_type=password`, {
        method: 'POST',
        headers: this.baseHeaders,
        body: JSON.stringify({ email, password })
      });
      this.saveSession(await this.parseResponse(response));
      return null;
    } catch (error) {
      return error instanceof Error ? error.message : 'Unable to sign in.';
    }
  }

  async signUp(email: string, password: string, displayName: string): Promise<{ error: string | null; needsEmailConfirmation: boolean }> {
    try {
      const response = await fetch(`${environment.supabaseUrl}/auth/v1/signup`, {
        method: 'POST',
        headers: this.baseHeaders,
        body: JSON.stringify({ email, password, data: { display_name: displayName.trim() } })
      });
      const data = await this.parseResponse(response);
      this.saveSession(data);
      return { error: null, needsEmailConfirmation: !data.access_token };
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Unable to create your account.', needsEmailConfirmation: false };
    }
  }

  async signOut(): Promise<void> {
    const token = this.session?.access_token;
    if (token) {
      await fetch(`${environment.supabaseUrl}/auth/v1/logout`, {
        method: 'POST',
        headers: { ...this.baseHeaders, Authorization: `Bearer ${token}` }
      }).catch(() => undefined);
    }
    this.session = null;
    if (this.isBrowser) localStorage.removeItem(this.sessionStorageKey);
    this.user$.next(null);
  }

  async recordTasteSignal(input: TasteSignalInput): Promise<void> {
    const user = this.user$.value;
    const token = this.session?.access_token;
    if (!user || !token) return;

    const response = await fetch(`${environment.supabaseUrl}/rest/v1/user_movie_signals?on_conflict=user_id,tmdb_id,signal`, {
      method: 'POST',
      headers: {
        ...this.baseHeaders,
        Authorization: `Bearer ${token}`,
        Prefer: 'resolution=merge-duplicates,return=minimal'
      },
      body: JSON.stringify({
        user_id: user.id,
        tmdb_id: input.tmdbId,
        media_type: input.mediaType,
        signal: input.signal,
        rating: input.rating ?? null,
        genre_ids: input.genreIds ?? [],
        metadata: input.metadata ?? {}
      })
    });
    if (!response.ok) throw new Error('Unable to save your taste signal.');
  }

  async getTasteProfile(): Promise<TasteProfile[]> {
    const token = this.session?.access_token;
    if (!token) return [];
    const response = await fetch(`${environment.supabaseUrl}/rest/v1/rpc/get_user_taste_profile`, {
      method: 'POST',
      headers: { ...this.baseHeaders, Authorization: `Bearer ${token}` },
      body: '{}'
    });
    if (!response.ok) throw new Error('Unable to load your taste profile.');
    return (await response.json()) as TasteProfile[];
  }
}
