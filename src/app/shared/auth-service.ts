import { HttpClient } from '@angular/common/http';
import { computed, Injectable, signal } from '@angular/core';
import { finalize, Observable, tap } from 'rxjs';

import { environment } from '../../environments/environment';
import {
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  RegisterResponse,
  SessionUser,
} from './auth';

// El token de sesión es opaco (no es un JWT): no se le puede leer una fecha de expiración.
// Dura 24 horas y el vencimiento se detecta cuando la API responde 401 (ver auth-interceptor.ts).
const TOKEN_KEY = 'tiendabox_token';
const USER_KEY = 'tiendabox_user';

function readStoredUser(): SessionUser | null {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw) as SessionUser;
  } catch {
    localStorage.removeItem(USER_KEY);
    return null;
  }
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly apiUrl = `${environment.apiUrl}/auth`;

  // La sesión arranca desde localStorage para sobrevivir a un refresh de la página.
  private readonly currentUser = signal<SessionUser | null>(readStoredUser());
  private readonly accessToken = signal<string | null>(localStorage.getItem(TOKEN_KEY));

  readonly user = this.currentUser.asReadonly();
  readonly isLoggedIn = computed(() => this.accessToken() !== null);
  readonly isOwner = computed(() => this.currentUser()?.role === 'owner');
  readonly isCliente = computed(() => this.currentUser()?.role === 'cliente');
  readonly isAdmin = computed(
    () => this.currentUser()?.role === 'admin' || this.currentUser()?.role === 'owner',
  );

  constructor(private http: HttpClient) {}

  getToken(): string | null {
    return this.accessToken();
  }

  token(): string | null {
    return this.accessToken();
  }

  getCustomerId(): string | null {
    return this.currentUser()?.customer_id ?? null;
  }

  login(data: LoginRequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.apiUrl}/login`, data).pipe(
      tap((response) => {
        const user: SessionUser = {
          id: response.id,
          email: response.email,
          role: response.role,
          customer_id: response.customer_id,
        };
        localStorage.setItem(TOKEN_KEY, response.token);
        localStorage.setItem(USER_KEY, JSON.stringify(user));
        this.accessToken.set(response.token);
        this.currentUser.set(user);
      }),
    );
  }

  // El registro no devuelve token: después de registrarse hay que iniciar sesión.
  register(data: RegisterRequest): Observable<RegisterResponse> {
    return this.http.post<RegisterResponse>(`${this.apiUrl}/register`, data);
  }

  // finalize() limpia la sesión local incluso si la API falla o no responde.
  logout(): Observable<void> {
    return this.http
      .post<void>(`${this.apiUrl}/logout`, {})
      .pipe(finalize(() => this.clearSession()));
  }

  clearSession(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    this.accessToken.set(null);
    this.currentUser.set(null);
  }
}
