import { CurrencyPipe } from '@angular/common';
import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatRadioModule } from '@angular/material/radio';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Router, RouterLink } from '@angular/router';
import { finalize, forkJoin } from 'rxjs';

import { ProductTypeBadge } from '../product-type-badge/product-type-badge';
import { CustomerWithEmail } from '../shared/customer';
import { CustomerService } from '../shared/customer-service';
import { CreateOrderPayload, OrderService } from '../shared/order-service';
import { Product } from '../shared/product';
import { ProductService } from '../shared/product-service';

interface DraftOrderItem {
  product: Product;
  quantity: FormControl<number | null>;
}

@Component({
  selector: 'app-admin-order-form',
  imports: [
    CurrencyPipe,
    ReactiveFormsModule,
    RouterLink,
    MatAutocompleteModule,
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
  templateUrl: './admin-order-form.html',
  styleUrl: './admin-order-form.css',
})
export class AdminOrderForm implements OnInit {
  private fb = inject(FormBuilder);

  protected readonly form = this.fb.group({
    customer: this.fb.control<CustomerWithEmail | string | null>(null, [
      Validators.required,
      (control) =>
        control.value && typeof control.value !== 'string' ? null : { customerSelection: true },
    ]),
    delivery_type: this.fb.nonNullable.control('', Validators.required),
    delivery_address: this.fb.nonNullable.control(''),
  });
  protected readonly productSearch = this.fb.control<Product | string | null>('');
  protected readonly customers = signal<CustomerWithEmail[]>([]);
  protected readonly products = signal<Product[]>([]);
  protected readonly customerValue = signal<CustomerWithEmail | string | null>(null);
  protected readonly productQuery = signal('');
  protected readonly items = signal<DraftOrderItem[]>([]);
  protected readonly loading = signal(true);
  protected readonly loadFailed = signal(false);
  protected readonly saving = signal(false);
  protected readonly submitted = signal(false);
  protected readonly errorMessage = signal('');

  protected readonly filteredCustomers = computed(() => {
    const value = this.customerValue();
    const query = typeof value === 'string' ? value.trim().toLowerCase() : '';
    return this.customers().filter(
      (customer) =>
        customer.name.toLowerCase().includes(query) ||
        customer.email?.toLowerCase().includes(query),
    );
  });
  protected readonly filteredProducts = computed(() => {
    const query = this.productQuery().trim().toLowerCase();
    return this.products().filter((product) => product.name.toLowerCase().includes(query));
  });
  protected readonly total = computed(() =>
    this.items().reduce(
      (total, item) =>
        total +
        (item.product.type === 'stock' &&
        Number.isInteger(item.quantity.value) &&
        item.quantity.value! > 0
          ? (item.product.price ?? 0) * (item.quantity.value ?? 0)
          : 0),
      0,
    ),
  );
  protected readonly hasEncargoItems = computed(() =>
    this.items().some((item) => item.product.type === 'encargo'),
  );
  protected readonly blockReason = computed(() => {
    if (this.items().some((item) => item.quantity.hasError('max'))) {
      return 'Ajustá las cantidades que superan el stock';
    }
    if (this.items().some((item) => item.quantity.invalid)) {
      return 'Ingresá una cantidad entera mayor a cero para cada producto';
    }
    return null;
  });

  protected readonly displayCustomer = (value: CustomerWithEmail | string | null): string =>
    typeof value === 'string' ? value : (value?.name ?? '');
  protected readonly displayProduct = (value: Product | string | null): string =>
    typeof value === 'string' ? value : (value?.name ?? '');

  constructor(
    private customerService: CustomerService,
    private productService: ProductService,
    private orderService: OrderService,
    private router: Router,
    private snackBar: MatSnackBar,
    private destroyRef: DestroyRef,
  ) {}

  ngOnInit(): void {
    this.form.controls.customer.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => {
        this.customerValue.set(value);
        if (value && typeof value !== 'string') {
          this.form.controls.delivery_address.setValue(value.address ?? '');
        }
      });
    this.productSearch.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => this.productQuery.set(typeof value === 'string' ? value : ''));
    this.form.controls.delivery_type.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((type) => {
        const address = this.form.controls.delivery_address;
        if (type === 'envio') {
          address.setValidators([Validators.required, Validators.pattern(/\S/)]);
        } else {
          address.clearValidators();
        }
        address.updateValueAndValidity();
      });
    this.loadOptions();
  }

  protected loadOptions(): void {
    this.loading.set(true);
    this.loadFailed.set(false);
    this.errorMessage.set('');
    forkJoin({
      customers: this.customerService.getCustomers(),
      products: this.productService.getProducts(),
    })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loading.set(false)),
      )
      .subscribe({
        next: ({ customers, products }) => {
          this.customers.set(customers);
          this.products.set(products.filter((product) => product.is_active));
        },
        error: (err) => {
          this.loadFailed.set(true);
          this.errorMessage.set(
            err.error?.message ||
              err.error?.error ||
              'No se pudieron cargar los clientes y productos.',
          );
        },
      });
  }

  protected addProduct(product: Product): void {
    if (this.saving()) return;
    const existing = this.items().find((item) => item.product.id === product.id);
    if (existing) {
      existing.quantity.setValue((existing.quantity.value ?? 0) + 1);
      existing.quantity.markAsTouched();
    } else {
      const quantity = this.fb.control<number | null>(1, [
        Validators.required,
        Validators.min(1),
        (control) => (Number.isInteger(control.value) ? null : { integer: true }),
        ...(product.type === 'stock' ? [Validators.max(product.stock)] : []),
      ]);
      quantity.valueChanges
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe(() => this.items.update((items) => [...items]));
      this.items.update((items) => [...items, { product, quantity }]);
    }
    this.productSearch.setValue('');
  }

  protected removeItem(productId: string): void {
    if (this.saving()) return;
    this.items.update((items) => items.filter((item) => item.product.id !== productId));
  }

  submit(): void {
    if (this.saving() || this.loading() || this.loadFailed()) return;
    this.submitted.set(true);
    this.errorMessage.set('');
    this.form.markAllAsTouched();
    const value = this.form.getRawValue();
    const customer = value.customer;
    if (!customer || typeof customer === 'string') {
      this.errorMessage.set('Seleccioná un cliente de la lista para crear el pedido.');
      return;
    }
    if (this.items().length === 0) {
      this.errorMessage.set('Agregá al menos un producto al pedido.');
      return;
    }
    if (this.blockReason()) {
      this.errorMessage.set(this.blockReason()!);
      return;
    }
    if (this.form.invalid) return;

    const payload: CreateOrderPayload = {
      customer_id: customer.id,
      delivery_type: value.delivery_type,
      items: this.items().map((item) => ({
        product_id: item.product.id,
        quantity: item.quantity.value!,
      })),
    };
    if (value.delivery_type === 'envio') {
      payload.delivery_address = value.delivery_address.trim();
    }
    this.saving.set(true);
    this.form.disable({ emitEvent: false });
    this.productSearch.disable({ emitEvent: false });
    this.items().forEach((item) => item.quantity.disable({ emitEvent: false }));
    this.orderService
      .createOrder(payload)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          this.saving.set(false);
          this.form.enable({ emitEvent: false });
          this.productSearch.enable({ emitEvent: false });
          this.items().forEach((item) => item.quantity.enable({ emitEvent: false }));
        }),
      )
      .subscribe({
        next: () => {
          this.snackBar.open('Pedido creado', 'Cerrar', { duration: 3000 });
          this.router.navigate(['/admin/pedidos']);
        },
        error: (err) => {
          this.errorMessage.set(
            err.error?.message ||
              err.error?.error ||
              'No se pudo crear el pedido. Intentá de nuevo.',
          );
        },
      });
  }
}
