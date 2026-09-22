import { HttpClient } from '@angular/common/http';
import { computed, Injectable, signal } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';
import { Cart } from './cart';

@Injectable({ providedIn: 'root' })
export class CartService {
  private readonly apiUrl = `${environment.apiUrl}/cart`;

  private readonly cart = signal<Cart | null>(null);
  readonly itemCount = computed(() => this.cart()?.item_count ?? 0);

  constructor(private http: HttpClient) {}

  /** Devuelve el carrito actual como signal (para la navbar, etc.). */
  getCartSignal() {
    return this.cart;
  }

  /** Actualiza el carrito almacenado en la signal. */
  setCart(cart: Cart | null): void {
    this.cart.set(cart);
  }

  getCart(): Observable<Cart> {
    return this.http.get<Cart>(this.apiUrl);
  }

  addItem(productId: string, quantity: number): Observable<Cart> {
    return this.http.post<Cart>(`${this.apiUrl}/items`, {
      product_id: productId,
      quantity,
    });
  }

  removeItem(productId: string): Observable<Cart> {
    return this.http.delete<Cart>(`${this.apiUrl}/items/${productId}`);
  }

  clear(): Observable<void> {
    return this.http.delete<void>(this.apiUrl);
  }
}
