


import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { AuthUser, SupabaseAuthService } from '../../../core/services/supabase-auth.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.css',
  imports: [CommonModule, RouterLink]
})
export class ProfileComponent implements OnInit, OnDestroy {
  user: AuthUser | null = null;
  private userSubscription?: Subscription;

  constructor(private readonly auth: SupabaseAuthService, private readonly router: Router) {}

  ngOnInit(): void {
    this.userSubscription = this.auth.user$.subscribe((user) => this.user = user);
  }

  ngOnDestroy(): void {
    this.userSubscription?.unsubscribe();
  }

  get displayName(): string {
    const name = this.user?.user_metadata?.['display_name'];
    if (typeof name === 'string' && name.trim()) return name.trim();
    return this.user?.email?.split('@')[0] || 'Cinetex member';
  }

  get initial(): string {
    return this.displayName.charAt(0).toUpperCase();
  }

  async signOut(): Promise<void> {
    await this.auth.signOut();
    await this.router.navigate(['/search']);
  }
}
