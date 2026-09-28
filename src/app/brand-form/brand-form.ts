import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { finalize } from 'rxjs';

import { BrandService } from '../shared/brand-service';

@Component({
  selector: 'app-brand-form',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
  ],
  templateUrl: './brand-form.html',
  styleUrl: './brand-form.css',
})
export class BrandForm implements OnInit {
  private fb = inject(FormBuilder);

  protected readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.pattern(/\S/), Validators.maxLength(100)]],
    logo_url: [''],
  });

  protected readonly brandId = signal<string | null>(null);
  protected readonly isEditing = computed(() => this.brandId() !== null);
  protected readonly loading = signal(false);
  protected readonly loadFailed = signal(false);
  protected readonly saving = signal(false);
  protected readonly errorMessage = signal('');

  constructor(
    private brandService: BrandService,
    private route: ActivatedRoute,
    private router: Router,
    private snackBar: MatSnackBar,
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.brandId.set(id);
      this.loading.set(true);
      this.brandService.getBrand(id).subscribe({
        next: (brand) => {
          this.form.patchValue({
            name: brand.name,
            logo_url: brand.logo_url ?? '',
          });
          this.loading.set(false);
        },
        error: () => {
          this.loadFailed.set(true);
          this.loading.set(false);
        },
      });
    }
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving.set(true);
    this.errorMessage.set('');

    const id = this.brandId();
    const value = this.form.getRawValue();
    const request$ = id
      ? this.brandService.updateBrand(id, value)
      : this.brandService.createBrand(value);

    request$.pipe(finalize(() => this.saving.set(false))).subscribe({
      next: () => {
        this.snackBar.open(
          id ? 'Marca actualizada' : 'Marca creada',
          'Cerrar',
          { duration: 3000 },
        );
        this.router.navigate(['/admin/marcas']);
      },
      error: () => {
        this.errorMessage.set('Error al guardar la marca. Intentá de nuevo.');
      },
    });
  }
}
