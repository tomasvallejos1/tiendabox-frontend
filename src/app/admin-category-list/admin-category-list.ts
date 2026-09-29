import { Component, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { finalize } from 'rxjs';

import { Category } from '../shared/category';
import { CategoryService } from '../shared/category-service';

@Component({
  selector: 'app-admin-category-list',
  imports: [
    RouterLink,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatTableModule,
  ],
  templateUrl: './admin-category-list.html',
  styleUrl: './admin-category-list.css',
})
export class AdminCategoryList implements OnInit {
  protected readonly dataSource = signal<Category[]>([]);
  protected readonly loading = signal(false);
  protected readonly errorMessage = signal('');
  protected readonly deletingIds = signal<ReadonlySet<string>>(new Set());

  protected readonly displayedColumns = ['name', 'description', 'actions'];

  constructor(
    private categoryService: CategoryService,
    private snackBar: MatSnackBar,
  ) {}

  ngOnInit(): void {
    this.loading.set(true);
    this.errorMessage.set('');
    this.categoryService
      .getCategories()
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (cats) => this.dataSource.set(cats),
        error: () => this.errorMessage.set('Error al cargar las categorías.'),
      });
  }

  confirmDelete(id: string, name: string): void {
    if (!window.confirm(`¿Eliminar la categoría "${name}"?`)) {
      return;
    }

    this.deletingIds.update((ids) => {
      const next = new Set(ids);
      next.add(id);
      return next;
    });

    this.categoryService
      .deleteCategory(id)
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
            err.error?.message ?? 'No se pudo eliminar la categoría.';
          this.snackBar.open(message, 'Cerrar', { duration: 5000 });
        },
      });
  }
}
