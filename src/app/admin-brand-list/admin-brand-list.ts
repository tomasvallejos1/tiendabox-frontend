import { Component, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { finalize } from 'rxjs';

import { Brand } from '../shared/brand';
import { BrandService } from '../shared/brand-service';

@Component({
  selector: 'app-admin-brand-list',
  imports: [
    RouterLink,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatTableModule,
  ],
  templateUrl: './admin-brand-list.html',
  styleUrl: './admin-brand-list.css',
})
export class AdminBrandList implements OnInit {
  protected readonly dataSource = signal<Brand[]>([]);
  protected readonly loading = signal(false);
  protected readonly errorMessage = signal('');
  protected readonly deletingIds = signal<ReadonlySet<string>>(new Set());

  protected readonly displayedColumns = ['name', 'logo_url', 'actions'];

  constructor(
    private brandService: BrandService,
    private snackBar: MatSnackBar,
  ) {}

  ngOnInit(): void {
    this.loading.set(true);
    this.errorMessage.set('');
    this.brandService
      .getBrands()
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (brands) => this.dataSource.set(brands),
        error: () => this.errorMessage.set('Error al cargar las marcas.'),
      });
  }

  confirmDelete(id: string, name: string): void {
    if (!window.confirm(`¿Eliminar la marca "${name}"?`)) {
      return;
    }

    this.deletingIds.update((ids) => {
      const next = new Set(ids);
      next.add(id);
      return next;
    });

    this.brandService
      .deleteBrand(id)
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
        error: (err) => {
          const message =
            err.error?.message ?? 'No se pudo eliminar la marca.';
          this.snackBar.open(message, 'Cerrar', { duration: 5000 });
        },
      });
  }
}
