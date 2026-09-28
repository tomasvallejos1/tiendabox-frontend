import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { finalize } from 'rxjs';

import { Category } from '../shared/category';
import { Brand } from '../shared/brand';
import { ProductType } from '../shared/product';
import { ProductService } from '../shared/product-service';
import { CategoryService } from '../shared/category-service';
import { BrandService } from '../shared/brand-service';

@Component({
  selector: 'app-product-form',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    MatSnackBarModule,
  ],
  templateUrl: './product-form.html',
  styleUrl: './product-form.css',
})
export class ProductForm implements OnInit {
  private fb = inject(FormBuilder);

  protected readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.pattern(/\S/), Validators.maxLength(100)]],
    description: [''],
    type: ['stock' as ProductType, Validators.required],
    price: [0, [Validators.required, Validators.min(0.01)]],
    stock: [0, [Validators.required, Validators.min(0)]],
    category_id: ['', Validators.required],
    brand_id: ['', Validators.required],
  });

  protected readonly productId = signal<string | null>(null);
  protected readonly isEditing = computed(() => this.productId() !== null);
  protected readonly loading = signal(false);
  protected readonly loadFailed = signal(false);
  protected readonly saving = signal(false);
  protected readonly errorMessage = signal('');
  protected readonly categories = signal<Category[]>([]);
  protected readonly brands = signal<Brand[]>([]);

  constructor(
    private productService: ProductService,
    private categoryService: CategoryService,
    private brandService: BrandService,
    private route: ActivatedRoute,
    private router: Router,
    private snackBar: MatSnackBar,
  ) {}

  ngOnInit(): void {
    this.categoryService.getCategories().subscribe({
      next: (cats) => this.categories.set(cats),
    });
    this.brandService.getBrands().subscribe({
      next: (brands) => this.brands.set(brands),
    });

    this.form.controls.type.valueChanges.subscribe((type) => {
      this.applyTypeValidators(type);
    });

    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.productId.set(id);
      this.loading.set(true);
      this.productService.getProduct(id).subscribe({
        next: (product) => {
          this.form.patchValue({
            name: product.name,
            description: product.description ?? '',
            type: product.type,
            price: product.price ?? 0,
            stock: product.stock,
            category_id: product.category_id,
            brand_id: product.brand_id,
          });
          this.applyTypeValidators(product.type);
          this.loading.set(false);
        },
        error: () => {
          this.loadFailed.set(true);
          this.loading.set(false);
        },
      });
    }
  }

  private applyTypeValidators(type: ProductType): void {
    const { price, stock } = this.form.controls;
    if (type === 'stock') {
      price.setValidators([Validators.required, Validators.min(0.01)]);
      stock.setValidators([Validators.required, Validators.min(0)]);
    } else {
      price.clearValidators();
      stock.clearValidators();
    }
    price.updateValueAndValidity();
    stock.updateValueAndValidity();
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving.set(true);
    this.errorMessage.set('');

    const id = this.productId();
    const value = this.form.getRawValue();
    const request$ = id
      ? this.productService.updateProduct(id, value)
      : this.productService.createProduct(value);

    request$.pipe(finalize(() => this.saving.set(false))).subscribe({
      next: () => {
        this.snackBar.open(
          id ? 'Producto actualizado' : 'Producto creado',
          'Cerrar',
          { duration: 3000 },
        );
        this.router.navigate(['/admin/productos']);
      },
      error: () => {
        this.errorMessage.set('Error al guardar el producto. Intentá de nuevo.');
      },
    });
  }
}
