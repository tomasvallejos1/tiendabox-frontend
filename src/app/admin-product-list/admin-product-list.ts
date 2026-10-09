import { ProductImage } from '../product-image/product-image';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ConfirmDialog } from '../confirm-dialog/confirm-dialog';
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
    ProductImage,
    CurrencyPipe,
    RouterLink,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTableModule,
    MatTooltipModule,
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
    'image',
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
    private snackBar: MatSnackBar,
    private dialog: MatDialog,
  ) {}

  ngOnInit(): void {
    this.loading.set(true);
    this.errorMessage.set('');
    forkJoin([
      this.productService.getProducts(),
      this.categoryService.getCategories(),
      this.brandService.getBrands(),
    ]).subscribe({
      next: ([products]) => {
        this.dataSource.set(products);
        this.loading.set(false);
      },
      error: (err) => {
        this.errorMessage.set(err.error?.message || 'Error al cargar los productos.');
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
    this.dialog
      .open(ConfirmDialog, {
        width: '400px',
        data: {
          title: 'Eliminar producto',
          message: `¿Eliminar el producto "${name}"?`,
          confirmText: 'Eliminar',
          isDestructive: true,
        },
      })
      .afterClosed()
      .subscribe((confirmed) => {
        if (confirmed) this.deleteConfirmed(id);
      });
  }

  private deleteConfirmed(id: string): void {
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
          this.snackBar.open('Producto eliminado', 'Cerrar', { duration: 3000 });
        },
        error: (err) => {
          this.snackBar.open(
            err.error?.message || 'No se pudo eliminar el producto. Intentá de nuevo.',
            'Cerrar',
            { duration: 5000 },
          );
        },
      });
  }
}
