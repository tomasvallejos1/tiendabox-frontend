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

import { CategoryService } from '../shared/category-service';

@Component({
  selector: 'app-category-form',
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
  templateUrl: './category-form.html',
  styleUrl: './category-form.css',
})
export class CategoryForm implements OnInit {
  private fb = inject(FormBuilder);

  protected readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.pattern(/\S/), Validators.maxLength(100)]],
    description: [''],
  });

  protected readonly categoryId = signal<string | null>(null);
  protected readonly isEditing = computed(() => this.categoryId() !== null);
  protected readonly loading = signal(false);
  protected readonly loadFailed = signal(false);
  protected readonly saving = signal(false);
  protected readonly errorMessage = signal('');

  constructor(
    private categoryService: CategoryService,
    private route: ActivatedRoute,
    private router: Router,
    private snackBar: MatSnackBar,
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.categoryId.set(id);
      this.loading.set(true);
      this.categoryService.getCategory(id).subscribe({
        next: (category) => {
          this.form.patchValue({
            name: category.name,
            description: category.description ?? '',
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

    const id = this.categoryId();
    const value = this.form.getRawValue();
    const request$ = id
      ? this.categoryService.updateCategory(id, value)
      : this.categoryService.createCategory(value);

    request$.pipe(finalize(() => this.saving.set(false))).subscribe({
      next: () => {
        this.snackBar.open(
          id ? 'Categoría actualizada' : 'Categoría creada',
          'Cerrar',
          { duration: 3000 },
        );
        this.router.navigate(['/admin/categorias']);
      },
      error: () => {
        this.errorMessage.set('Error al guardar la categoría. Intentá de nuevo.');
      },
    });
  }
}
