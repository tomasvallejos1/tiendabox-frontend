import { Component, OnInit, signal } from '@angular/core';
import { inject } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatRadioModule } from '@angular/material/radio';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

import { AuthService } from '../shared/auth-service';
import { Cart, CartItem } from '../shared/cart';
import { CartService } from '../shared/cart-service';
import { CustomerService } from '../shared/customer-service';
import { OrderService } from '../shared/order-service';
import { ProductTypeBadge } from '../product-type-badge/product-type-badge';

@Component({
  selector: 'app-cart-page',
  imports: [
    CurrencyPipe,
    ReactiveFormsModule,
    RouterLink,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatRadioModule,
    MatSnackBarModule,
    ProductTypeBadge,
  ],
  templateUrl: './cart-page.html',
  styleUrl: './cart-page.css',
})
export class CartPage implements OnInit {
  private fb = inject(FormBuilder);

  protected readonly form = this.fb.nonNullable.group({
    delivery_type: ['', Validators.required],
    delivery_address: [''],
  });

  protected readonly loading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly cart = signal<Cart | null>(null);
  protected readonly removingIds = signal<ReadonlySet<string>>(new Set());
  protected readonly clearing = signal(false);
  protected readonly confirming = signal(false);

  constructor(
    private cartService: CartService,
    private orderService: OrderService,
    private authService: AuthService,
    private customerService: CustomerService,
    private router: Router,
    private snackBar: MatSnackBar,
  ) {}

  ngOnInit(): void {
    // Suscripción a cambios del delivery_type para validación condicional de la dirección.
    this.form.controls.delivery_type.valueChanges.subscribe((type) => {
      const addressControl = this.form.controls.delivery_address;
      if (type === 'envio') {
        addressControl.setValidators(Validators.required);
      } else {
        addressControl.clearValidators();
      }
      addressControl.updateValueAndValidity();
    });

    this.loadCart();
  }

  protected loadCart(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    this.cartService.getCart().subscribe({
      next: (cart) => {
        this.cartService.setCart(cart);
        this.cart.set(cart);
        this.loading.set(false);
        this.prefillAddress();
      },
      error: () => {
        this.loading.set(false);
        this.errorMessage.set('No se pudo cargar el carrito. Intentá de nuevo más tarde.');
      },
    });
  }

  private prefillAddress(): void {
    const customerId = this.authService.getCustomerId();
    if (!customerId) return;

    this.customerService.getCustomer(customerId).subscribe({
      next: (customer) => {
        if (customer.address) {
          this.form.controls.delivery_address.setValue(customer.address);
        }
      },
    });
  }

  /** Indica si la confirmación debe bloquearse por problemas en los ítems. */
  protected get confirmBlocked(): boolean {
    const c = this.cart();
    if (!c) return true;
    if (c.has_unavailable_items) return true;
    return c.items.some((item) => item.exceeds_stock);
  }

  /** Mensaje explicativo de por qué está bloqueado el botón de confirmar. */
  protected get blockReason(): string | null {
    const c = this.cart();
    if (!c) return null;
    if (c.has_unavailable_items) {
      return 'Quitá los productos que ya no están disponibles';
    }
    if (c.items.some((item) => item.exceeds_stock)) {
      return 'Ajustá las cantidades que superan el stock';
    }
    return null;
  }

  protected removeItem(item: CartItem): void {
    // Agregar al Set de IDs en proceso de eliminación.
    this.removingIds.update((set) => {
      const next = new Set(set);
      next.add(item.product_id);
      return next;
    });

    this.cartService.removeItem(item.product_id).subscribe({
      next: (updatedCart) => {
        this.cartService.setCart(updatedCart);
        this.cart.set(updatedCart);
        this.removeFromSet(item.product_id);
      },
      error: () => {
        this.removeFromSet(item.product_id);
        this.snackBar.open('No se pudo eliminar el producto', 'Cerrar', { duration: 3000 });
      },
    });
  }

  private removeFromSet(productId: string): void {
    this.removingIds.update((set) => {
      const next = new Set(set);
      next.delete(productId);
      return next;
    });
  }

  protected clearCart(): void {
    if (!window.confirm('¿Estás seguro de que querés vaciar el carrito?')) return;

    this.clearing.set(true);
    this.cartService.clear().subscribe({
      next: () => {
        this.cartService.setCart(null);
        this.cart.set(null);
        this.clearing.set(false);
        this.loadCart();
      },
      error: () => {
        this.clearing.set(false);
        this.snackBar.open('No se pudo vaciar el carrito', 'Cerrar', { duration: 3000 });
      },
    });
  }

  protected confirmOrder(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.confirming.set(true);
    this.errorMessage.set(null);

    const value = this.form.getRawValue();
    const payload: { delivery_type: string; delivery_address?: string } = {
      delivery_type: value.delivery_type,
    };
    if (value.delivery_type === 'envio' && value.delivery_address) {
      payload.delivery_address = value.delivery_address;
    }

    this.orderService.createOrder(payload).subscribe({
      next: () => {
        this.confirming.set(false);
        this.cartService.setCart(null);
        this.snackBar.open('¡Pedido creado con éxito!', 'Cerrar', { duration: 4000 });
        this.router.navigate(['/mis-pedidos']);
      },
      error: (err) => {
        this.confirming.set(false);
        const msg =
          err?.error?.message || 'No se pudo crear el pedido. Intentá de nuevo más tarde.';
        this.errorMessage.set(msg);
      },
    });
  }
}
