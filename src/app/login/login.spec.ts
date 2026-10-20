import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { environment } from '../../environments/environment';
import { AuthService } from '../shared/auth-service';
import { Login } from './login';

describe('Login', () => {
  let fixture: ComponentFixture<Login>;
  let http: HttpTestingController;
  let router: Router;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Login],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(Login);
    http = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
    TestBed.inject(AuthService).clearSession();
    await fixture.whenStable();
  });

  afterEach(() => {
    http.verify();
    TestBed.inject(AuthService).clearSession();
    vi.restoreAllMocks();
  });

  async function submit(email = 'cliente@example.com', password = 'secreto'): Promise<void> {
    for (const [field, value] of Object.entries({ email, password })) {
      const input: HTMLInputElement = fixture.nativeElement.querySelector(
        `[formControlName="${field}"]`,
      );
      input.value = value;
      input.dispatchEvent(new Event('input'));
    }
    fixture.nativeElement
      .querySelector('form')
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await fixture.whenStable();
  }

  it('muestra el error de credenciales de la API y permite reintentar sin redirigir', async () => {
    await submit();
    const request = http.expectOne(`${environment.apiUrl}/auth/login`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ email: 'cliente@example.com', password: 'secreto' });
    expect(fixture.nativeElement.querySelector('button[type="submit"]').disabled).toBe(true);
    request.flush(
      { error: 'Email o contraseña incorrectos' },
      { status: 401, statusText: 'Unauthorized' },
    );
    await fixture.whenStable();

    expect(fixture.nativeElement.querySelector('[role="alert"]').textContent).toContain(
      'Email o contraseña incorrectos',
    );
    expect(fixture.nativeElement.querySelector('button[type="submit"]').disabled).toBe(false);
    expect(router.navigate).not.toHaveBeenCalled();
    expect(TestBed.inject(AuthService).isLoggedIn()).toBe(false);
  });

  it.each([
    { role: 'owner', destination: '/admin/productos' },
    { role: 'cliente', destination: '/productos' },
  ])('redirige a $destination al ingresar como $role', async ({ role, destination }) => {
    await submit();
    http.expectOne(`${environment.apiUrl}/auth/login`).flush({
      id: 'user-1',
      email: 'cliente@example.com',
      role,
      customer_id: role === 'cliente' ? 'customer-1' : null,
      token: 'test-token',
    });
    await fixture.whenStable();
    expect(router.navigate).toHaveBeenCalledExactlyOnceWith([destination]);
    expect(fixture.nativeElement.querySelector('button[type="submit"]').disabled).toBe(false);
  });

  it('bloquea el envío de un email inválido o una contraseña vacía', async () => {
    await submit('correo-inválido');
    expect(fixture.nativeElement.textContent).toContain('Ingresá un email válido.');
    await submit('cliente@example.com', '');
    expect(fixture.nativeElement.textContent).toContain('La contraseña es obligatoria.');
    http.expectNone(() => true);
    expect(router.navigate).not.toHaveBeenCalled();
  });
});
