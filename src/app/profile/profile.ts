import { Component, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

import { AuthService } from '../shared/auth-service';
import { CustomerService } from '../shared/customer-service';
import { TaxStatus } from '../shared/customer';

@Component({
  selector: 'app-profile',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    MatSnackBarModule,
  ],
  templateUrl: './profile.html',
  styleUrl: './profile.css',
})
export class Profile implements OnInit {
  private fb = inject(FormBuilder);

  protected readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.pattern(/\S/)]],
    government_id: ['', [Validators.pattern(/^\d{11}$/)]],
    tax_status: ['consumidor_final' as string],
    phone: [''],
    address: [''],
  });

  protected readonly taxStatusOptions: { value: TaxStatus; label: string }[] = [
    { value: 'consumidor_final', label: 'Consumidor final' },
    { value: 'responsable_inscripto', label: 'Responsable inscripto' },
    { value: 'monotributo', label: 'Monotributo' },
    { value: 'exento', label: 'Exento' },
  ];

  protected readonly loading = signal(false);
  protected readonly loadFailed = signal(false);
  protected readonly saving = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  private customerId: string | null = null;

  constructor(
    private authService: AuthService,
    private customerService: CustomerService,
    private snackBar: MatSnackBar,
  ) {}

  ngOnInit(): void {
    this.customerId = this.authService.getCustomerId();
    if (!this.customerId) {
      this.loadFailed.set(true);
      return;
    }

    this.loading.set(true);
    this.customerService.getCustomer(this.customerId).subscribe({
      next: (customer) => {
        this.form.patchValue({
          name: customer.name,
          government_id: customer.government_id ?? '',
          tax_status: customer.tax_status,
          phone: customer.phone ?? '',
          address: customer.address ?? '',
        });
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.loadFailed.set(true);
      },
    });
  }

  protected save(): void {
    if (this.form.invalid || !this.customerId) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving.set(true);
    this.errorMessage.set(null);

    const value = this.form.getRawValue();
    this.customerService.updateCustomer(this.customerId, {
      name: value.name,
      government_id: value.government_id || null,
      tax_status: value.tax_status,
      phone: value.phone || null,
      address: value.address || null,
    }).subscribe({
      next: () => {
        this.saving.set(false);
        this.snackBar.open('Perfil actualizado', 'Cerrar', { duration: 3000 });
      },
      error: () => {
        this.saving.set(false);
        this.errorMessage.set('No se pudo guardar el perfil. Intentá de nuevo.');
      },
    });
  }
}
