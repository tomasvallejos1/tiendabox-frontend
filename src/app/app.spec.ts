import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { environment } from '../environments/environment';
import { Cart } from './shared/cart';
import { App } from './app';

describe('App', () => {
  beforeEach(async () => {
    localStorage.removeItem('tiendabox_token');
    localStorage.removeItem('tiendabox_user');
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
  });

  afterEach(() => {
    TestBed.inject(HttpTestingController).verify();
    localStorage.removeItem('tiendabox_token');
    localStorage.removeItem('tiendabox_user');
  });

  it('should render the router outlet', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('router-outlet')).toBeTruthy();
    TestBed.inject(HttpTestingController).expectNone(`${environment.apiUrl}/cart`);
  });

  it.each(['cliente', 'owner'])(
    'carga el carrito al iniciar con una sesión guardada solo si el rol %s es cliente',
    async (role) => {
      localStorage.setItem('tiendabox_token', 'stored-token');
      localStorage.setItem(
        'tiendabox_user',
        JSON.stringify({
          id: 'user-1',
          email: 'usuario@example.com',
          role,
          customer_id: role === 'cliente' ? 'customer-1' : null,
        }),
      );
      const fixture = TestBed.createComponent(App);
      await fixture.whenStable();
      expect(fixture.nativeElement.querySelector('router-outlet')).not.toBeNull();
      const http = TestBed.inject(HttpTestingController);
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
              name: 'Caja por encargo',
              type: 'encargo',
              quantity: 2,
              unit_price: null,
              subtotal: null,
              stock_available: null,
              available: true,
              exceeds_stock: false,
            },
          ],
          item_count: 2,
          total: 0,
          has_encargo_items: true,
          has_unavailable_items: false,
        };
        request.flush(cart);
        await fixture.whenStable();
        expect(fixture.nativeElement.querySelector('.mat-badge-content').textContent).toBe('2');
      } else {
        http.expectNone(`${environment.apiUrl}/cart`);
      }
    },
  );
});
