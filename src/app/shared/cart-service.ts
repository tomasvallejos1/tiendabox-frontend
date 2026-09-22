import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';

import { Cart } from './cart';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class CartService {
  private readonly apiUrl = environment.apiUrl;
  readonly cart = signal<Cart | null>(null);

  constructor(private http: HttpClient) {}

  getCart(): Observable<Cart> {
    return this.http.get<Cart>(`${this.apiUrl}/cart`).pipe(tap((cart) => this.cart.set(cart)));
  }

  addItem(productId: string, quantity: number): Observable<Cart> {
    return this.http.post<Cart>(`${this.apiUrl}/cart/items`, {
      product_id: productId,
      quantity,
    });
  }

  updateItem(itemId: string, quantity: number): Observable<Cart> {
    return this.http
      .put<Cart>(`${this.apiUrl}/cart/item/${itemId}`, { quantity })
      .pipe(tap((cart) => this.cart.set(cart)));
  }

  removeItem(itemId: string): Observable<Cart> {
    return this.http
      .delete<Cart>(`${this.apiUrl}/cart/item/${itemId}`)
      .pipe(tap((cart) => this.cart.set(cart)));
  }

  setCart(cart: Cart): void {
    this.cart.set(cart);
  }

  itemCount(): number {
    return this.cart()?.items.reduce((sum, item) => sum + item.quantity, 0) ?? 0;
  }
}
