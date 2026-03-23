import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Token, UserCreate } from '../models';

const ACCESS_KEY = 'mf_access_token';
const REFRESH_KEY = 'mf_refresh_token';

/**
 * Token storage note
 * ------------------
 * Tokens are stored in localStorage for simplicity.
 * Trade-off: susceptible to XSS. A production hardening would move the
 * refresh token to an httpOnly cookie (server-set, JS-invisible) and keep
 * the access token only in memory — reducing the XSS attack surface to the
 * session lifetime.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly base = environment.apiUrl;

  /** Reactive signal so components can respond to auth state changes */
  readonly isAuthenticated = signal(!!this.getAccessToken());

  constructor(
    private http: HttpClient,
    private router: Router,
  ) {}

  getAccessToken(): string | null {
    return localStorage.getItem(ACCESS_KEY);
  }

  private getRefreshToken(): string | null {
    return localStorage.getItem(REFRESH_KEY);
  }

  private storeTokens(t: Token): void {
    localStorage.setItem(ACCESS_KEY, t.access_token);
    localStorage.setItem(REFRESH_KEY, t.refresh_token);
    this.isAuthenticated.set(true);
  }

  async register(email: string, password: string): Promise<void> {
    const body: UserCreate = { email, password };
    const token = await firstValueFrom(
      this.http.post<Token>(`${this.base}/auth/register`, body, { observe: 'body' }),
    );
    this.storeTokens(token);
  }

  async login(email: string, password: string): Promise<void> {
    const token = await firstValueFrom(
      this.http.post<Token>(`${this.base}/auth/login`, { email, password }),
    );
    this.storeTokens(token);
  }

  async refresh(): Promise<boolean> {
    const refresh_token = this.getRefreshToken();
    if (!refresh_token) return false;
    try {
      const token = await firstValueFrom(
        this.http.post<Token>(`${this.base}/auth/refresh`, { refresh_token }),
      );
      this.storeTokens(token);
      return true;
    } catch {
      this.logout();
      return false;
    }
  }

  logout(): void {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
    this.isAuthenticated.set(false);
    this.router.navigate(['/login']).then(() => {
      // Reload to flush all in-memory state (sessions, etc.)
      window.location.reload();
    });
  }
}
