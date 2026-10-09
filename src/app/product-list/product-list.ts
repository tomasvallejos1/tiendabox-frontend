import { ProductImage } from '../product-image/product-image';
import { Component, computed, OnInit, signal } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatInputModule } from '@angular/material/input';
import { ProductTypeBadge } from '../product-type-badge/product-type-badge';
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
    ProductImage,
    CurrencyPipe,
    RouterLink,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatIconModule,
    MatChipsModule,
    MatInputModule,
    ProductTypeBadge,
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
  protected readonly search = signal('');
  protected readonly sort = signal('recent');
  protected readonly filtersOpen = signal(false);
  protected readonly skeletons = [1, 2, 3, 4, 5, 6];
  protected readonly hasFilters = computed(
    () => !!(this.search().trim() || this.selectedCategoryId() || this.selectedBrandId()),
  );
  protected readonly visibleProducts = computed(() => {
    const query = this.search().trim().toLocaleLowerCase();
    const products = this.products().filter((product) =>
      product.name.toLocaleLowerCase().includes(query),
    );
    if (this.sort() === 'name') return products.sort((a, b) => a.name.localeCompare(b.name, 'es'));
    if (this.sort() === 'price-asc' || this.sort() === 'price-desc') {
      const direction = this.sort() === 'price-asc' ? 1 : -1;
      return products.sort((a, b) => {
        const aUnpriced = a.type === 'encargo' || a.price === null;
        const bUnpriced = b.type === 'encargo' || b.price === null;
        if (aUnpriced || bUnpriced) return Number(aUnpriced) - Number(bUnpriced);
        return direction * (a.price! - b.price!);
      });
    }
    // Product no expone fecha de creación: conservar el orden recibido de la API.
    return products;
  });

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
    this.errorMessage.set('');
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
    const hadApiFilters = !!(this.selectedCategoryId() || this.selectedBrandId());
    this.search.set('');
    this.selectedCategoryId.set(null);
    this.selectedBrandId.set(null);
    if (hadApiFilters) this.loadProducts();
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
