import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { finalize } from 'rxjs';
import { CustomerService } from '../shared/customer-service';
import { CreateCustomerPayload, TaxStatus } from '../shared/customer';
import { GeneratedPasswordDialog } from '../generated-password-dialog/generated-password-dialog';

@Component({
  selector: 'app-customer-form',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatButtonModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatSelectModule,
  ],
  templateUrl: './customer-form.html',
  styleUrl: './customer-form.css',
})
export class CustomerForm implements OnInit {
  private fb = inject(FormBuilder);
  protected readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.pattern(/\S/)]],
    government_id: ['', Validators.pattern(/^\d{11}$/)],
    tax_status: ['consumidor_final', Validators.required],
    phone: [''],
    address: [''],
    web_access: [false],
    email: [''],
    password: [''],
  });
  protected readonly customerId = signal<string | null>(null);
  protected readonly isEditing = computed(() => this.customerId() !== null);
  protected readonly isLocalCustomer = signal(false);
  protected readonly loading = signal(false);
  protected readonly loadFailed = signal(false);
  protected readonly saving = signal(false);
  protected readonly errorMessage = signal('');
  protected readonly taxStatusOptions: { value: TaxStatus; label: string }[] = [
    { value: 'consumidor_final', label: 'Consumidor final' },
    { value: 'responsable_inscripto', label: 'Responsable inscripto' },
    { value: 'monotributo', label: 'Monotributo' },
    { value: 'exento', label: 'Exento' },
  ];

  constructor(
    private customerService: CustomerService,
    private route: ActivatedRoute,
    private router: Router,
    private snackBar: MatSnackBar,
    private dialog: MatDialog,
    private destroyRef: DestroyRef,
  ) {}

  ngOnInit(): void {
    this.customerId.set(this.route.snapshot.paramMap.get('id'));
    this.form.controls.web_access.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((enabled) => {
        const email = this.form.controls.email;
        if (enabled && !this.isEditing())
          email.setValidators([Validators.required, Validators.email]);
        else email.clearValidators();
        email.updateValueAndValidity();
      });
    if (this.isEditing()) this.loadCustomer();
  }

  protected loadCustomer(): void {
    const id = this.customerId();
    if (!id) return;
    this.loading.set(true);
    this.loadFailed.set(false);
    this.errorMessage.set('');
    this.customerService
      .getCustomer(id)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (customer) => {
          this.isLocalCustomer.set(customer.user_id === null);
          this.form.patchValue({
            name: customer.name,
            government_id: customer.government_id ?? '',
            tax_status: customer.tax_status,
            phone: customer.phone ?? '',
            address: customer.address ?? '',
          });
        },
        error: (err) => {
          this.loadFailed.set(true);
          this.errorMessage.set(err.error?.message || 'No se pudo cargar el cliente.');
        },
      });
  }

  submit(): void {
    if (this.saving() || this.loading() || this.loadFailed()) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue();
    const profile = {
      name: value.name.trim(),
      government_id: value.government_id || null,
      tax_status: value.tax_status,
      phone: value.phone.trim() || null,
      address: value.address.trim() || null,
    };
    this.saving.set(true);
    this.errorMessage.set('');
    const id = this.customerId();
    if (id) {
      this.customerService
        .updateCustomer(id, profile)
        .pipe(finalize(() => this.saving.set(false)))
        .subscribe({
          next: () => this.finish('Cliente actualizado'),
          error: (err) => this.showError(err.error?.message),
        });
    } else {
      const payload: CreateCustomerPayload = { ...profile };
      if (value.web_access) {
        payload.email = value.email.trim();
        if (value.password) payload.password = value.password;
      }
      this.customerService
        .createCustomer(payload)
        .pipe(finalize(() => this.saving.set(false)))
        .subscribe({
          next: (response) => {
            if (response.generated_password) {
              this.dialog
                .open(GeneratedPasswordDialog, {
                  width: '480px',
                  disableClose: true,
                  data: { password: response.generated_password },
                })
                .afterClosed()
                .subscribe(() => this.router.navigate(['/admin/clientes']));
            } else this.finish('Cliente creado');
          },
          error: (err) => this.showError(err.error?.message),
        });
    }
  }

  private finish(message: string): void {
    this.snackBar.open(message, 'Cerrar', { duration: 3000 });
    this.router.navigate(['/admin/clientes']);
  }

  private showError(message?: string): void {
    const text = message || 'No se pudo guardar el cliente. Intentá de nuevo.';
    this.errorMessage.set(text);
    this.snackBar.open(text, 'Cerrar', { duration: 5000 });
  }
}
