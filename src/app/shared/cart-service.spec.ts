import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { environment } from '../../environments/environment';
import { Cart } from './cart';
import { CartService } from './cart-service';

describe('CartService', () => {
  let service: CartService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(CartService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

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
