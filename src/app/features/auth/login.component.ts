import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="auth-container">
      <div class="auth-card">
        <h1 class="auth-title">Movie Finder</h1>
        <h2 class="auth-subtitle">Sign in</h2>

        <form (ngSubmit)="submit()" #f="ngForm" novalidate>
          <div class="form-group">
            <label for="email">Email</label>
            <input
              id="email"
              type="email"
              name="email"
              [(ngModel)]="email"
              required
              placeholder="you@example.com"
              autocomplete="username"
            />
          </div>

          <div class="form-group">
            <label for="password">Password</label>
            <input
              id="password"
              type="password"
              name="password"
              [(ngModel)]="password"
              required
              placeholder="••••••••"
              autocomplete="current-password"
            />
          </div>

          @if (error()) {
            <p class="error-msg">{{ error() }}</p>
          }

          <button type="submit" class="btn-primary" [disabled]="loading()">
            {{ loading() ? 'Signing in…' : 'Sign in' }}
          </button>
        </form>

        <p class="auth-link">
          No account? <a routerLink="/register">Create one</a>
        </p>
      </div>
    </div>
  `,
  styleUrls: ['./auth.scss'],
})
export class LoginComponent {
  email = '';
  password = '';
  loading = signal(false);
  error = signal('');

  constructor(
    private auth: AuthService,
    private router: Router,
  ) {}

  async submit(): Promise<void> {
    this.error.set('');
    this.loading.set(true);
    try {
      await this.auth.login(this.email, this.password);
      this.router.navigate(['/chat']);
    } catch (err: unknown) {
      this.error.set(this.extractError(err));
    } finally {
      this.loading.set(false);
    }
  }

  private extractError(err: unknown): string {
    if (err instanceof HttpErrorResponse) {
      if (err.status === 401) return 'Invalid email or password.';
      if (err.error?.detail) return err.error.detail;
    }
    return 'Something went wrong. Please try again.';
  }
}
