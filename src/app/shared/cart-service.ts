import { HttpClient } from '@angular/common/http';
import { computed, effect, Injectable, signal } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';
import { AuthService } from './auth-service';
import { Cart } from './cart';

@Injectable({ providedIn: 'root' })
export class CartService {
  private readonly apiUrl = `${environment.apiUrl}/cart`;

  private readonly cart = signal<Cart | null>(null);
  readonly itemCount = computed(() => this.cart()?.item_count ?? 0);

  constructor(
    private http: HttpClient,
    private authService: AuthService,
  ) {
    effect(() => {
      if (!this.authService.isLoggedIn()) this.setCart(null);
    });
  }

  /** Actualiza el carrito almacenado en la signal. */
  setCart(cart: Cart | null): void {
    this.cart.set(cart);
  }

  getCart(): Observable<Cart> {
    return this.http.get<Cart>(this.apiUrl);
  }

  refresh(): void {
    // Una respuesta de una sesión anterior no debe restaurar su carrito.
    const token = this.authService.getToken();
    this.getCart().subscribe({
      next: (cart) => {
        if (this.authService.getToken() === token) this.setCart(cart);
      },
      error: () => {
        if (this.authService.getToken() === token) this.setCart(null);
      },
    });
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

  updateItem(productId: string, quantity: number): Observable<Cart> {
    return this.http.put<Cart>(`${this.apiUrl}/items/${productId}`, { quantity });
  }

  clear(): Observable<void> {
    return this.http.delete<void>(this.apiUrl);
  }
}
