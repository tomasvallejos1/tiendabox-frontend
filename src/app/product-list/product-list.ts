import { Component, OnInit, signal } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { finalize, forkJoin, timeout } from 'rxjs';

import { Product } from '../shared/product';
import { Category } from '../shared/category';
import { Brand } from '../shared/brand';
import { ProductService } from '../shared/product-service';
import { CategoryService } from '../shared/category-service';
import { BrandService } from '../shared/brand-service';
import { AuthService } from '../shared/auth-service';
import { CartService } from '../shared/cart-service';

@Component({
  selector: 'app-product-list',
  imports: [
    CurrencyPipe,
    RouterLink,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    MatSnackBarModule,
  ],
  templateUrl: './product-list.html',
  styleUrl: './product-list.css',
})
export class ProductList implements OnInit {
  protected readonly products = signal<Product[]>([]);
  protected readonly categories = signal<Category[]>([]);
  protected readonly brands = signal<Brand[]>([]);
  protected readonly loading = signal(false);
  protected readonly errorMessage = signal('');

  protected selectedCategoryId = signal<string | null>(null);
  protected selectedBrandId = signal<string | null>(null);

  constructor(
    private productService: ProductService,
    private categoryService: CategoryService,
    private brandService: BrandService,
    private snackBar: MatSnackBar,
    protected authService: AuthService,
    protected cartService: CartService,
  ) {}

  ngOnInit(): void {
    this.loading.set(true);
    forkJoin([this.categoryService.getCategories(), this.brandService.getBrands()]).subscribe({
      next: ([cats, brands]) => {
        this.categories.set(cats);
        this.brands.set(brands);
        this.loadProducts();
      },
      error: () => {
        this.errorMessage.set('No se pudieron cargar las categorías y marcas.');
        this.loading.set(false);
      },
    });
  }

  loadProducts(): void {
    this.loading.set(true);
    this.errorMessage.set('');

    const filters: { category_id?: string; brand_id?: string } = {};
    if (this.selectedCategoryId()) {
      filters.category_id = this.selectedCategoryId()!;
    }
    if (this.selectedBrandId()) {
      filters.brand_id = this.selectedBrandId()!;
    }

    this.productService
      .getProducts(filters)
      .pipe(
        timeout({ first: 15000 }),
        finalize(() => this.loading.set(false)),
      )
      .subscribe({
        next: (products) => this.products.set(products),
        error: () => this.errorMessage.set('Error al cargar los productos. Intentá de nuevo.'),
      });
  }

  onCategoryChange(value: string | null): void {
    this.selectedCategoryId.set(value);
    this.loadProducts();
  }

  onBrandChange(value: string | null): void {
    this.selectedBrandId.set(value);
    this.loadProducts();
  }

  clearFilters(): void {
    this.selectedCategoryId.set(null);
    this.selectedBrandId.set(null);
    this.loadProducts();
  }

  getCategoryName(id: string): string {
    return this.categoryService.getName(id);
  }

  getBrandName(id: string): string {
    return this.brandService.getName(id);
  }

  addToCart(productId: string): void {
    this.cartService.addItem(productId, 1).subscribe({
      next: (cart) => {
        this.cartService.setCart(cart);
        this.snackBar.open('Producto agregado al carrito', 'Cerrar', { duration: 3000 });
      },
      error: () => {
        this.snackBar.open('No se pudo agregar al carrito', 'Cerrar', { duration: 3000 });
      },
    });
  }
}
