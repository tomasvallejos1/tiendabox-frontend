import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';

import { LoginRequest, LoginResponse, RegisterRequest, RegisterResponse, SessionUser } from './auth';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly apiUrl = environment.apiUrl;
  readonly user = signal<SessionUser | null>(null);

  constructor(private http: HttpClient) {
    this.restore();
  }

  login(credentials: LoginRequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.apiUrl}/auth/login`, credentials).pipe(
      tap((res) => {
        localStorage.setItem('token', res.token);
        const session: SessionUser = {
          id: res.id,
          email: res.email,
          role: res.role,
          customer_id: res.customer_id,
        };
        localStorage.setItem('user', JSON.stringify(session));
        this.user.set(session);
      }),
    );
  }

  register(data: RegisterRequest): Observable<RegisterResponse> {
    return this.http.post<RegisterResponse>(`${this.apiUrl}/auth/register`, data);
  }

  logout(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    this.user.set(null);
  }

  token(): string | null {
    return localStorage.getItem('token');
  }

  isLoggedIn(): boolean {
    return this.user() !== null;
  }

  isCliente(): boolean {
    return this.user()?.role === 'cliente';
  }

  isAdmin(): boolean {
    return this.user()?.role === 'admin';
  }

  private restore(): void {
    const raw = localStorage.getItem('user');
    if (raw) {
      try {
        this.user.set(JSON.parse(raw));
      } catch {
        this.logout();
      }
    }
  }
}
