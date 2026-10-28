import { Component, computed, DestroyRef, OnInit, signal } from '@angular/core';
import { inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
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

import { apiErrorMessage } from '../shared/api-error';
import { AuthService } from '../shared/auth-service';
import { Cart, CartItem } from '../shared/cart';
import { CartService } from '../shared/cart-service';
import { Customer, governmentIdRule, TaxStatus } from '../shared/customer';
import { CustomerService } from '../shared/customer-service';
import { OrderService } from '../shared/order-service';
import { hasPrice, summarizeOrderItems } from '../shared/order-summary';
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
    name: ['', Validators.pattern(/\S/)],
    government_id: [''],
    tax_status: ['consumidor_final' as string],
    phone: [''],
    address: [''],
  });
  protected readonly documentRule = signal(governmentIdRule('consumidor_final'));

  protected readonly taxStatusOptions: { value: TaxStatus; label: string }[] = [
    { value: 'consumidor_final', label: 'Consumidor final' },
    { value: 'responsable_inscripto', label: 'Responsable inscripto' },
    { value: 'monotributo', label: 'Monotributo' },
    { value: 'exento', label: 'Exento' },
  ];

  protected readonly loading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly cart = signal<Cart | null>(null);
  protected readonly summary = computed(() => summarizeOrderItems(this.cart()?.items ?? []));
  protected readonly hasEncargoItems = computed(
    () => this.cart()?.has_encargo_items || this.summary().hasEncargoItems,
  );
  protected readonly hasPrice = hasPrice;
  protected readonly removingIds = signal<ReadonlySet<string>>(new Set());
  protected readonly clearing = signal(false);
  protected readonly confirming = signal(false);

  // Estado del perfil del cliente.
  protected readonly customer = signal<Customer | null>(null);
  protected readonly profileSaving = signal(false);
  protected readonly profileSaved = signal(false);
  protected readonly profileError = signal<string | null>(null);

  // Campos faltantes del perfil (para mostrar solo los que falten).
  protected readonly missingRequired = signal<string[]>([]);
  protected readonly missingOptional = signal<string[]>([]);

  private customerId: string | null = null;

  constructor(
    private cartService: CartService,
    private orderService: OrderService,
    private authService: AuthService,
    private customerService: CustomerService,
    private router: Router,
    private snackBar: MatSnackBar,
    private dialog: MatDialog,
    private destroyRef: DestroyRef,
  ) {}

  ngOnInit(): void {
    this.customerId = this.authService.getCustomerId();

    this.applyGovernmentIdRule(this.profileForm.controls.tax_status.value);
    this.profileForm.controls.tax_status.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((taxStatus) => this.applyGovernmentIdRule(taxStatus));

    // Suscripción a cambios del delivery_type para validación condicional de la dirección.
    this.form.controls.delivery_type.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((type) => {
        const addressControl = this.form.controls.delivery_address;
        if (type === 'envio') {
          addressControl.setValidators([Validators.required, Validators.pattern(/\S/)]);
        } else {
          addressControl.clearValidators();
        }
        addressControl.updateValueAndValidity({ emitEvent: false });

        // Reevaluar si address es campo faltante del perfil según tipo de entrega.
        this.evaluateProfileCompleteness();
      });

    this.form.controls.delivery_address.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.evaluateProfileCompleteness());

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
        this.profileForm.patchValue({
          name: customer.name || '',
          government_id: customer.government_id ?? '',
          tax_status: customer.tax_status || 'consumidor_final',
          phone: customer.phone ?? '',
          address: customer.address ?? '',
        });
        if (customer.address) {
          this.form.controls.delivery_address.setValue(customer.address);
        }
        this.evaluateProfileCompleteness();
      },
    });
  }

  /** Separa los datos necesarios para el pedido de los datos opcionales del perfil. */
  private evaluateProfileCompleteness(): void {
    const c = this.customer();
    if (!c) return;

    const required: string[] = [];
    const optional: string[] = [];
    if (!c.phone?.trim()) required.push('phone');
    if (!c.name?.trim()) optional.push('name');
    if (!c.government_id?.trim()) optional.push('government_id');
    if (!c.tax_status?.trim()) optional.push('tax_status');

    // La dirección puede completarse en el formulario de entrega sin editar el perfil.
    const isEnvio = this.form.controls.delivery_type.value === 'envio';
    if (isEnvio && !this.form.controls.delivery_address.value.trim()) required.push('address');

    this.missingRequired.set(required);
    this.missingOptional.set(optional);

    if (required.length > 0) this.profileSaved.set(false);

    for (const field of ['phone', 'address'] as const) {
      const control = this.profileForm.controls[field];
      control.setValidators(
        required.includes(field) ? [Validators.required, Validators.pattern(/\S/)] : [],
      );
      control.updateValueAndValidity();
    }
  }

  private applyGovernmentIdRule(taxStatus: string): void {
    const rule = governmentIdRule(taxStatus);
    this.documentRule.set(rule);
    const control = this.profileForm.controls.government_id;
    control.setValidators(Validators.pattern(rule.pattern));
    control.updateValueAndValidity();
  }

  /** Comprueba si un campo específico falta en el perfil. */
  protected isMissing(field: string): boolean {
    return this.missingRequired().includes(field) || this.missingOptional().includes(field);
  }

  /** Bloquea por datos requeridos o problemas de disponibilidad en productos de stock. */
  protected get confirmBlocked(): boolean {
    const c = this.cart();
    if (!c || c.items.length === 0) return true;
    if (!this.customer() || this.missingRequired().length > 0) return true;
    return c.items.some(
      (item) =>
        item.type === 'stock' &&
        (!item.available ||
          item.exceeds_stock ||
          (item.stock_available !== null && item.quantity > item.stock_available)),
    );
  }

  /** Mensaje explicativo de por qué está bloqueado el botón de confirmar. */
  protected get blockReason(): string | null {
    if (this.missingRequired().includes('phone')) {
      return 'Cargá tu teléfono para que podamos contactarte por tu pedido';
    }
    const c = this.cart();
    if (!c) return null;
    if (c.items.some((item) => item.type === 'stock' && !item.available)) {
      return 'Quitá los productos que ya no están disponibles';
    }
    if (c.items.some((item) => this.exceedsStock(item))) {
      return 'Ajustá las cantidades que superan el stock';
    }
    if (this.missingRequired().includes('address')) {
      return 'La dirección es obligatoria para envío a domicilio';
    }
    return null;
  }

  protected exceedsStock(item: CartItem): boolean {
    return (
      item.type === 'stock' &&
      (item.exceeds_stock ||
        (item.stock_available !== null && item.quantity > item.stock_available))
    );
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
        ...(value.name.trim() ? { name: value.name.trim() } : {}),
        government_id: value.government_id || null,
        ...(value.tax_status ? { tax_status: value.tax_status } : {}),
        phone: value.phone.trim() || null,
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
        error: (err) => {
          this.profileSaving.set(false);
          this.profileError.set(
            apiErrorMessage(err, 'No se pudieron guardar tus datos. Intentá de nuevo.'),
          );
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
    if (this.confirming() || this.clearing() || this.confirmBlocked) return;
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
      next: (order) => {
        this.confirming.set(false);
        this.cartService.setCart(null);

        const summary = summarizeOrderItems(order.items);
        const data: OrderConfirmationData = {
          orderId: order.id,
          total: summary.total,
          hasEncargoItems: summary.hasEncargoItems,
          quoteQuantity: summary.quoteQuantity,
          hasPricedItems: summary.hasPricedItems,
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
        const msg = apiErrorMessage(err, 'No se pudo crear el pedido. Intentá de nuevo más tarde.');
        this.errorMessage.set(msg);
      },
    });
  }
}
