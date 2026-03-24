import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import type { Router } from '@angular/router';
import { RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import type { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="auth-container">
      <div class="auth-card">
        <h1 class="auth-title">Movie Finder</h1>
        <h2 class="auth-subtitle">Create account</h2>

        <form (ngSubmit)="submit()" novalidate>
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
              minlength="8"
              placeholder="At least 8 characters"
              autocomplete="new-password"
            />
          </div>

          @if (fieldErrors().length) {
            <ul class="error-list">
              @for (e of fieldErrors(); track e) {
                <li>{{ e }}</li>
              }
            </ul>
          }

          @if (error()) {
            <p class="error-msg">{{ error() }}</p>
          }

          <button type="submit" class="btn-primary" [disabled]="loading()">
            {{ loading() ? 'Creating account…' : 'Create account' }}
          </button>
        </form>

        <p class="auth-link">Already have an account? <a routerLink="/login">Sign in</a></p>
      </div>
    </div>
  `,
  styleUrls: ['./auth.scss'],
})
export class RegisterComponent {
  email = '';
  password = '';
  loading = signal(false);
  error = signal('');
  fieldErrors = signal<string[]>([]);

  constructor(
    private auth: AuthService,
    private router: Router,
  ) {}

  async submit(): Promise<void> {
    this.error.set('');
    this.fieldErrors.set([]);
    this.loading.set(true);
    try {
      await this.auth.register(this.email, this.password);
      this.router.navigate(['/chat']);
    } catch (err: unknown) {
      this.handleError(err);
    } finally {
      this.loading.set(false);
    }
  }

  private handleError(err: unknown): void {
    if (err instanceof HttpErrorResponse) {
      if (err.status === 409) {
        this.error.set('Email already in use. Please sign in instead.');
        return;
      }
      if (err.status === 422 && Array.isArray(err.error?.detail)) {
        // Surface FastAPI field-level validation errors
        const msgs: string[] = err.error.detail.map(
          (d: { loc: string[]; msg: string }) => `${d.loc.slice(1).join('.')}: ${d.msg}`,
        );
        this.fieldErrors.set(msgs);
        return;
      }
    }
    this.error.set('Something went wrong. Please try again.');
  }
}
