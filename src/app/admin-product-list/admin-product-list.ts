import { Component, OnInit, signal } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';
import { finalize, forkJoin } from 'rxjs';

import { Product } from '../shared/product';
import { ProductService } from '../shared/product-service';
import { CategoryService } from '../shared/category-service';
import { BrandService } from '../shared/brand-service';

@Component({
  selector: 'app-admin-product-list',
  imports: [
    CurrencyPipe,
    RouterLink,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTableModule,
  ],
  templateUrl: './admin-product-list.html',
  styleUrl: './admin-product-list.css',
})
export class AdminProductList implements OnInit {
  protected readonly dataSource = signal<Product[]>([]);
  protected readonly loading = signal(false);
  protected readonly errorMessage = signal('');
  protected readonly deletingIds = signal<ReadonlySet<string>>(new Set());

  protected readonly displayedColumns = [
    'name',
    'type',
    'price',
    'stock',
    'category',
    'brand',
    'actions',
  ];

  constructor(
    private productService: ProductService,
    private categoryService: CategoryService,
    private brandService: BrandService,
  ) {}

  ngOnInit(): void {
    this.loading.set(true);
    forkJoin([
      this.productService.getProducts(),
      this.categoryService.getCategories(),
      this.brandService.getBrands(),
    ]).subscribe({
      next: ([products]) => {
        this.dataSource.set(products);
        this.loading.set(false);
      },
      error: () => {
        this.errorMessage.set('Error al cargar los productos.');
        this.loading.set(false);
      },
    });
  }

  getCategoryName(id: string): string {
    return this.categoryService.getName(id);
  }

  getBrandName(id: string): string {
    return this.brandService.getName(id);
  }

  formatPrice(product: Product): string {
    return product.price === null ? 'Por encargo' : '';
  }

  confirmDelete(id: string, name: string): void {
    if (!window.confirm(`¿Eliminar el producto "${name}"?`)) {
      return;
    }

    this.deletingIds.update((ids) => {
      const next = new Set(ids);
      next.add(id);
      return next;
    });

    this.productService
      .deleteProduct(id)
      .pipe(
        finalize(() => {
          this.deletingIds.update((ids) => {
            const next = new Set(ids);
            next.delete(id);
            return next;
          });
        }),
      )
      .subscribe({
        next: () => {
          this.dataSource.update((items) => items.filter((i) => i.id !== id));
        },
        error: () => {
          window.alert('No se pudo eliminar el producto. Intentá de nuevo.');
        },
      });
  }
}
