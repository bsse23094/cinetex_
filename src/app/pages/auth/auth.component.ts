import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { SupabaseAuthService } from '../../core/services/supabase-auth.service';

@Component({
  selector: 'app-auth',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './auth.component.html',
  styleUrl: './auth.component.css'
})
export class AuthComponent {
  mode: 'signin' | 'signup' = 'signin';
  displayName = '';
  email = '';
  password = '';
  confirmPassword = '';
  isSubmitting = false;
  errorMessage = '';
  noticeMessage = '';

  readonly posters = [
    'https://image.tmdb.org/t/p/w780/8cdWjvZK8f4qfJ2nT2pYB0Y4x5y.jpg',
    'https://image.tmdb.org/t/p/w780/q719jXXEzOoYaps6babgKnONONX.jpg',
    'https://image.tmdb.org/t/p/w780/9Gtg2DzBhmYamXBS1hKAhiwbBKS.jpg',
    'https://image.tmdb.org/t/p/w780/6POBWybSBDBKjSs1VAQcnQC1qyt.jpg',
    'https://image.tmdb.org/t/p/w780/2uNW4WbgBXL25BAbXGLnLqX71Sw.jpg',
    'https://image.tmdb.org/t/p/w780/fSRb7vyIP8rQpL0I47P3qUsEKX3.jpg'
  ];

  constructor(private readonly auth: SupabaseAuthService, private readonly router: Router) {}

  setMode(mode: 'signin' | 'signup'): void {
    this.mode = mode;
    this.errorMessage = '';
    this.noticeMessage = '';
  }

  async submit(): Promise<void> {
    this.errorMessage = '';
    this.noticeMessage = '';

    if (this.mode === 'signup' && this.password !== this.confirmPassword) {
      this.errorMessage = 'Passwords do not match.';
      return;
    }

    this.isSubmitting = true;
    try {
      if (this.mode === 'signin') {
        const error = await this.auth.signIn(this.email.trim(), this.password);
        if (error) this.errorMessage = error;
        else await this.router.navigate(['/search']);
      } else {
        const result = await this.auth.signUp(this.email.trim(), this.password, this.displayName);
        if (result.error) this.errorMessage = result.error;
        else if (result.needsEmailConfirmation) {
          this.noticeMessage = 'Check your inbox to confirm your email, then sign in.';
          this.mode = 'signin';
        } else {
          await this.router.navigate(['/search']);
        }
      }
    } finally {
      this.isSubmitting = false;
    }
  }
}
