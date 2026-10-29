import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { MatBadge } from '@angular/material/badge';
import { By } from '@angular/platform-browser';
import { provideRouter, Router } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { environment } from '../../environments/environment';
import { AuthService } from '../shared/auth-service';
import { Navbar } from '../navbar/navbar';
import { Cart } from '../shared/cart';
import { Login } from './login';

describe('Login', () => {
  let fixture: ComponentFixture<Login>;
  let http: HttpTestingController;
  let router: Router;

  beforeEach(async () => {
    localStorage.removeItem('tiendabox_token');
    localStorage.removeItem('tiendabox_user');
    await TestBed.configureTestingModule({
      imports: [Login, Navbar],
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
    const navbar = TestBed.createComponent(Navbar);
    await navbar.whenStable();
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

    if (role === 'cliente') {
      const request = http.expectOne(`${environment.apiUrl}/cart`);
      expect(request.request.method).toBe('GET');
      const cart: Cart = {
        id: 'cart-1',
        customer_id: 'customer-1',
        updated_at: '2026-10-28T12:00:00Z',
        items: [
          {
            id: 'item-1',
            product_id: 'product-1',
            name: 'Caja',
            type: 'stock',
            quantity: 3,
            unit_price: 1200,
            subtotal: 3600,
            stock_available: 5,
            available: true,
            exceeds_stock: false,
          },
        ],
        item_count: 3,
        total: 3600,
        has_encargo_items: false,
        has_unavailable_items: false,
      };
      request.flush(cart);
      await navbar.whenStable();
      const badge = navbar.debugElement.query(By.directive(MatBadge)).injector.get(MatBadge);
      expect(badge.content).toBe(String(cart.item_count));
      expect(badge.hidden).toBe(false);
      expect(navbar.nativeElement.querySelector('.mat-badge-content').textContent).toBe('3');
    } else {
      http.expectNone(`${environment.apiUrl}/cart`);
      expect(navbar.nativeElement.querySelector('.navbar-cart')).toBeNull();
    }
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
