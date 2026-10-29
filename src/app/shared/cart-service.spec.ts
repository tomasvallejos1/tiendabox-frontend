import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { environment } from '../../environments/environment';
import { authInterceptor } from './auth-interceptor';
import { AuthService } from './auth-service';
import { Cart } from './cart';
import { CartService } from './cart-service';

describe('CartService', () => {
  let service: CartService;
  let auth: AuthService;
  let http: HttpTestingController;
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

  beforeEach(() => {
    localStorage.setItem('tiendabox_token', 'test-token');
    localStorage.setItem(
      'tiendabox_user',
      JSON.stringify({
        id: 'user-1',
        email: 'cliente@example.com',
        role: 'cliente',
        customer_id: cart.customer_id,
      }),
    );
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    service = TestBed.inject(CartService);
    auth = TestBed.inject(AuthService);
    http = TestBed.inject(HttpTestingController);
    vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    TestBed.tick();
  });

  afterEach(() => {
    http.verify();
    auth.clearSession();
    vi.restoreAllMocks();
  });

  it('actualiza el contador con el carrito devuelto por GET al refrescar', () => {
    service.refresh();
    const request = http.expectOne(`${environment.apiUrl}/cart`);
    expect(request.request.method).toBe('GET');
    expect(request.request.headers.get('Authorization')).toBe('Bearer test-token');
    request.flush(cart);
    expect(service.itemCount()).toBe(cart.item_count);
  });

  it('deja el carrito en null sin propagar errores si falla el refresh', () => {
    service.setCart(cart);
    const setCart = vi.spyOn(service, 'setCart');
    service.refresh();
    http
      .expectOne(`${environment.apiUrl}/cart`)
      .flush({ error: 'Error del servidor' }, { status: 500, statusText: 'Server Error' });
    expect(setCart).toHaveBeenCalledExactlyOnceWith(null);
    expect(service.itemCount()).toBe(0);
    expect(auth.isLoggedIn()).toBe(true);
    expect(TestBed.inject(Router).navigate).not.toHaveBeenCalled();
  });

  it.each([200, 500])('limpia el carrito al salir aunque el logout responda %s', (status) => {
    service.setCart(cart);
    expect(service.itemCount()).toBe(3);
    auth.logout().subscribe({ error: () => {} });
    const request = http.expectOne(`${environment.apiUrl}/auth/logout`);
    expect(request.request.method).toBe('POST');
    request.flush(null, { status, statusText: status === 200 ? 'OK' : 'Server Error' });
    TestBed.tick();
    expect(auth.isLoggedIn()).toBe(false);
    expect(service.itemCount()).toBe(0);
  });

  it('limpia el carrito cuando el interceptor cierra la sesión por un 401 en otra request', () => {
    service.setCart(cart);
    const setCart = vi.spyOn(service, 'setCart');
    TestBed.inject(HttpClient)
      .get(`${environment.apiUrl}/order`)
      .subscribe({ error: () => {} });
    http
      .expectOne(`${environment.apiUrl}/order`)
      .flush({ error: 'Sesión vencida' }, { status: 401, statusText: 'Unauthorized' });
    TestBed.tick();
    expect(auth.isLoggedIn()).toBe(false);
    expect(setCart).toHaveBeenCalledWith(null);
    expect(service.itemCount()).toBe(0);
    expect(TestBed.inject(Router).navigate).toHaveBeenCalledExactlyOnceWith(['/login']);
  });

  it('ignora una respuesta del carrito que llega después de cerrar sesión', () => {
    service.refresh();
    const request = http.expectOne(`${environment.apiUrl}/cart`);
    auth.clearSession();
    TestBed.tick();
    request.flush(cart);
    expect(service.itemCount()).toBe(0);
  });

  it.each([200, 500])(
    'una respuesta tardía %s de la sesión anterior conserva el carrito del nuevo cliente',
    (status) => {
      service.refresh();
      const previousRequest = http.expectOne(`${environment.apiUrl}/cart`);
      auth.clearSession();
      TestBed.tick();
      auth.login({ email: 'otro@example.com', password: 'secreto' }).subscribe();
      http.expectOne(`${environment.apiUrl}/auth/login`).flush({
        id: 'user-2',
        email: 'otro@example.com',
        role: 'cliente',
        customer_id: 'customer-2',
        token: 'new-token',
      });
      TestBed.tick();
      service.refresh();
      http.expectOne(`${environment.apiUrl}/cart`).flush({
        ...cart,
        id: 'cart-2',
        customer_id: 'customer-2',
        items: [{ ...cart.items[0], quantity: 1, subtotal: 1200 }],
        item_count: 1,
        total: 1200,
      });
      previousRequest.flush(status === 200 ? cart : null, {
        status,
        statusText: status === 200 ? 'OK' : 'Server Error',
      });
      expect(service.itemCount()).toBe(1);
      expect(auth.getCustomerId()).toBe('customer-2');
    },
  );

  it('fija la cantidad con PUT a /cart/items/:productId y devuelve el carrito completo', () => {
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
          quantity: 2,
          unit_price: 1200,
          subtotal: 2400,
          stock_available: 3,
          available: true,
          exceeds_stock: false,
        },
      ],
      item_count: 2,
      total: 2400,
      has_encargo_items: false,
      has_unavailable_items: false,
    };
    const next = vi.fn();
    service.updateItem('product-1', 2).subscribe(next);
    const request = http.expectOne(`${environment.apiUrl}/cart/items/product-1`);
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual({ quantity: 2 });
    request.flush(cart);
    expect(next).toHaveBeenCalledExactlyOnceWith(cart);
  });
});
