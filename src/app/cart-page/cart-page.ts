import { Component, OnInit, signal } from '@angular/core';
import { inject } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatRadioModule } from '@angular/material/radio';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

import { AuthService } from '../shared/auth-service';
import { Cart, CartItem } from '../shared/cart';
import { CartService } from '../shared/cart-service';
import { Customer, TaxStatus } from '../shared/customer';
import { CustomerService } from '../shared/customer-service';
import { OrderService } from '../shared/order-service';
import { ProductTypeBadge } from '../product-type-badge/product-type-badge';
import {
  OrderConfirmationData,
  OrderConfirmationDialog,
} from '../order-confirmation-dialog/order-confirmation-dialog';

@Component({
  selector: 'app-cart-page',
  imports: [
    CurrencyPipe,
    ReactiveFormsModule,
    RouterLink,
    MatButtonModule,
    MatCardModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatRadioModule,
    MatSelectModule,
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

  // Formulario de datos faltantes del perfil.
  protected readonly profileForm = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.pattern(/\S/)]],
    government_id: ['', [Validators.required, Validators.pattern(/^\d{11}$/)]],
    tax_status: ['consumidor_final' as string, Validators.required],
    phone: ['', Validators.required],
    address: [''],
  });

  protected readonly taxStatusOptions: { value: TaxStatus; label: string }[] = [
    { value: 'consumidor_final', label: 'Consumidor final' },
    { value: 'responsable_inscripto', label: 'Responsable inscripto' },
    { value: 'monotributo', label: 'Monotributo' },
    { value: 'exento', label: 'Exento' },
  ];

  protected readonly loading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly cart = signal<Cart | null>(null);
  protected readonly removingIds = signal<ReadonlySet<string>>(new Set());
  protected readonly clearing = signal(false);
  protected readonly confirming = signal(false);

  // Estado del perfil del cliente.
  protected readonly customer = signal<Customer | null>(null);
  protected readonly profileComplete = signal(false);
  protected readonly profileSaving = signal(false);
  protected readonly profileSaved = signal(false);
  protected readonly profileError = signal<string | null>(null);

  // Campos faltantes del perfil (para mostrar solo los que falten).
  protected readonly missingFields = signal<string[]>([]);

  private customerId: string | null = null;

  constructor(
    private cartService: CartService,
    private orderService: OrderService,
    private authService: AuthService,
    private customerService: CustomerService,
    private router: Router,
    private snackBar: MatSnackBar,
    private dialog: MatDialog,
  ) {}

  ngOnInit(): void {
    this.customerId = this.authService.getCustomerId();

    // Suscripción a cambios del delivery_type para validación condicional de la dirección.
    this.form.controls.delivery_type.valueChanges.subscribe((type) => {
      const addressControl = this.form.controls.delivery_address;
      if (type === 'envio') {
        addressControl.setValidators(Validators.required);
      } else {
        addressControl.clearValidators();
      }
      addressControl.updateValueAndValidity();

      // Reevaluar si address es campo faltante del perfil según tipo de entrega.
      this.evaluateProfileCompleteness();
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
    if (!this.customerId) return;

    this.customerService.getCustomer(this.customerId).subscribe({
      next: (customer) => {
        this.customer.set(customer);
        if (customer.address) {
          this.form.controls.delivery_address.setValue(customer.address);
        }
        this.evaluateProfileCompleteness();
      },
    });
  }

  /** Evalúa si el perfil del cliente tiene todos los campos requeridos. */
  private evaluateProfileCompleteness(): void {
    const c = this.customer();
    if (!c) {
      this.profileComplete.set(false);
      return;
    }

    const missing: string[] = [];
    if (!c.name) missing.push('name');
    if (!c.phone) missing.push('phone');
    if (!c.government_id) missing.push('government_id');
    if (!c.tax_status) missing.push('tax_status');

    // address se exige SOLO si el pedido es con envío a domicilio.
    const isEnvio = this.form.controls.delivery_type.value === 'envio';
    if (isEnvio && !c.address) missing.push('address');

    this.missingFields.set(missing);
    this.profileComplete.set(missing.length === 0);

    // Precargar el profileForm con los valores actuales del cliente para los campos faltantes.
    if (missing.length > 0) {
      this.profileSaved.set(false);
      // Poner valores del cliente en los campos que ya tiene.
      this.profileForm.patchValue({
        name: c.name || '',
        government_id: c.government_id ?? '',
        tax_status: c.tax_status || 'consumidor_final',
        phone: c.phone ?? '',
        address: c.address ?? '',
      });

      // Configurar validators de address según si es envío.
      const addressControl = this.profileForm.controls.address;
      if (isEnvio) {
        addressControl.setValidators(Validators.required);
      } else {
        addressControl.clearValidators();
      }
      addressControl.updateValueAndValidity();
    }
  }

  /** Comprueba si un campo específico falta en el perfil. */
  protected isMissing(field: string): boolean {
    return this.missingFields().includes(field);
  }

  /** Indica si la confirmación debe bloquearse por problemas en los ítems. */
  protected get confirmBlocked(): boolean {
    const c = this.cart();
    if (!c) return true;
    if (c.has_unavailable_items) return true;
    if (c.items.some((item) => item.exceeds_stock)) return true;
    if (!this.profileComplete()) return true;
    return false;
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
    if (!this.profileComplete()) {
      return 'Completá tus datos de perfil para poder confirmar';
    }
    return null;
  }

  /** Guarda los datos faltantes del perfil. */
  protected saveProfile(): void {
    if (this.profileForm.invalid || !this.customerId) {
      this.profileForm.markAllAsTouched();
      return;
    }

    this.profileSaving.set(true);
    this.profileError.set(null);

    const value = this.profileForm.getRawValue();
    this.customerService
      .updateCustomer(this.customerId, {
        name: value.name,
        government_id: value.government_id || null,
        tax_status: value.tax_status,
        phone: value.phone || null,
        address: value.address || null,
      })
      .subscribe({
        next: (updated) => {
          this.profileSaving.set(false);
          this.customer.set(updated);
          this.profileSaved.set(true);
          this.evaluateProfileCompleteness();
          // Actualizar dirección de envío si cambió.
          if (updated.address) {
            this.form.controls.delivery_address.setValue(updated.address);
          }
        },
        error: () => {
          this.profileSaving.set(false);
          this.profileError.set('No se pudieron guardar tus datos. Intentá de nuevo.');
        },
      });
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

    const cart = this.cart();

    this.orderService.createOrder(payload).subscribe({
      next: (order) => {
        this.confirming.set(false);
        this.cartService.setCart(null);

        const data: OrderConfirmationData = {
          orderId: order.id,
          total: order.total,
          hasEncargoItems: cart?.has_encargo_items ?? false,
        };

        this.dialog.open(OrderConfirmationDialog, {
          data,
          disableClose: true,
          width: '400px',
          maxWidth: '95vw',
        });
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
