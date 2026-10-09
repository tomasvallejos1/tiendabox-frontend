import { MatDialog } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ConfirmDialog } from '../confirm-dialog/confirm-dialog';
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
    MatTooltipModule,
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
    private dialog: MatDialog,
  ) {}

  ngOnInit(): void {
    this.loading.set(true);
    this.errorMessage.set('');
    this.brandService
      .getBrands()
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (brands) => this.dataSource.set(brands),
        error: (err) => this.errorMessage.set(err.error?.message || 'Error al cargar las marcas.'),
      });
  }

  confirmDelete(id: string, name: string): void {
    this.dialog
      .open(ConfirmDialog, {
        width: '400px',
        data: {
          title: 'Eliminar marca',
          message: `¿Eliminar la marca "${name}"?`,
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
          this.snackBar.open('Marca eliminada', 'Cerrar', { duration: 3000 });
        },
        error: (err) => {
          const message = err.error?.message ?? 'No se pudo eliminar la marca.';
          this.snackBar.open(message, 'Cerrar', { duration: 5000 });
        },
      });
  }
}
