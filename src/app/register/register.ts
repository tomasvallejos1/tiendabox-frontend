import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { AuthService } from '../shared/auth-service';

@Component({
  selector: 'app-register',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSnackBarModule,
  ],
  templateUrl: './register.html',
  styleUrl: './register.css',
})
export class Register {
  private readonly formBuilder = inject(FormBuilder);

  // Los datos fiscales no se piden acá: se completan después en el perfil.
  protected readonly form = this.formBuilder.nonNullable.group({
    name: ['', [Validators.required, Validators.pattern(/\S/)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  protected readonly saving = signal(false);
  protected readonly errorMessage = signal('');

  constructor(
    private authService: AuthService,
    private router: Router,
    private snackBar: MatSnackBar,
  ) {}

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving.set(true);
    this.errorMessage.set('');

    this.authService
      .register(this.form.getRawValue())
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        // El registro no devuelve token: hay que iniciar sesión después.
        next: () => {
          this.snackBar.open('Cuenta creada. Ya podés iniciar sesión.', 'Cerrar', {
            duration: 4000,
          });
          this.router.navigate(['/login']);
        },
        error: (err: HttpErrorResponse) => {
          this.errorMessage.set(
            err.error?.error ?? 'No se pudo crear la cuenta. Intentá de nuevo.',
          );
        },
      });
  }
}
