import { Component, DestroyRef, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
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
import { governmentIdRule, TaxStatus } from '../shared/customer';

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
  private destroyRef = inject(DestroyRef);

  protected readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.pattern(/\S/)]],
    // Sus validadores dependen de tax_status: los aplica applyGovernmentIdRule.
    government_id: [''],
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
  // Regla del documento para la condicion fiscal elegida (hint y mensaje de error del campo).
  protected readonly documentRule = signal(governmentIdRule('consumidor_final'));

  private customerId: string | null = null;

  constructor(
    private authService: AuthService,
    private customerService: CustomerService,
    private snackBar: MatSnackBar,
  ) {}

  ngOnInit(): void {
    // Validacion condicional del documento: cambia con la condicion fiscal elegida. El
    // patchValue de la carga del perfil tambien dispara valueChanges.
    this.applyGovernmentIdRule(this.form.controls.tax_status.value);
    this.form.controls.tax_status.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((taxStatus) => this.applyGovernmentIdRule(taxStatus));

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

  private applyGovernmentIdRule(taxStatus: string): void {
    const rule = governmentIdRule(taxStatus);
    this.documentRule.set(rule);
    const control = this.form.controls.government_id;
    control.setValidators(Validators.pattern(rule.pattern));
    control.updateValueAndValidity();
  }
}
