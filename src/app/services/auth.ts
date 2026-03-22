import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { BehaviorSubject, tap, catchError, switchMap } from 'rxjs';
import { environment } from '../../environments/environment';

export interface AuthResponse {
  access_token: string;
  token_type: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  
  public isAuthenticated$ = new BehaviorSubject<boolean>(!!localStorage.getItem('access_token'));

  login(email: string, password: string) {
    const formData = new URLSearchParams();
    formData.set('username', email);
    formData.set('password', password);

    return this.http.post<AuthResponse>(`${environment.apiUrl}/auth/token`, formData.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    }).pipe(
      tap(res => {
        localStorage.setItem('access_token', res.access_token);
        this.isAuthenticated$.next(true);
        this.router.navigate(['/chat']);
      })
    );
  }

  register(email: string, password: string) {
    return this.http.post(`${environment.apiUrl}/auth/register`, { email, password }).pipe(
      switchMap(() => this.login(email, password))
    );
  }

  logout() {
    localStorage.removeItem('access_token');
    this.isAuthenticated$.next(false);
    this.router.navigate(['/login']);
  }
}
