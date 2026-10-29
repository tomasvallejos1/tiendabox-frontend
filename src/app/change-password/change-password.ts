import { Component, inject, signal, viewChild } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  FormControl,
  FormGroupDirective,
  NgForm,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { ErrorStateMatcher } from '@angular/material/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { finalize } from 'rxjs';

import { apiErrorMessage } from '../shared/api-error';
import { PASSWORD_MIN_LENGTH } from '../shared/auth';
import { AuthService } from '../shared/auth-service';

// Mensaje exacto del backend cuando la contraseña actual no coincide.
const INCORRECT_CURRENT_PASSWORD = 'La contraseña actual es incorrecta';

type PasswordField = 'current_password' | 'new_password' | 'confirm_password';

// Compara campos entre sí: la repetición tiene que coincidir con la nueva y la nueva tiene que
// ser distinta de la actual. Solo compara campos ya cargados; los vacíos los marca required.
function passwordsValidator(group: AbstractControl): ValidationErrors | null {
  const { current_password, new_password, confirm_password } = group.value;
  const errors: ValidationErrors = {};
  if (confirm_password && confirm_password !== new_password) errors['mismatch'] = true;
  if (current_password && new_password && current_password === new_password) {
    errors['sameAsCurrent'] = true;
  }
  return Object.keys(errors).length > 0 ? errors : null;
}

// Los errores del grupo no invalidan el control, así que mat-form-field no lo pinta en rojo:
// este matcher también mira el error del grupo que corresponde a ese campo.
class GroupErrorMatcher implements ErrorStateMatcher {
  constructor(private groupError: string) {}

  isErrorState(control: FormControl | null, form: FormGroupDirective | NgForm | null): boolean {
    if (!control || !(control.touched || form?.submitted)) return false;
    return control.invalid || !!control.parent?.hasError(this.groupError);
  }
}

@Component({
  selector: 'app-change-password',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSnackBarModule,
  ],
  templateUrl: './change-password.html',
  styleUrl: './change-password.css',
})
export class ChangePassword {
  private fb = inject(FormBuilder);

  protected readonly form = this.fb.nonNullable.group(
    {
      current_password: ['', Validators.required],
      new_password: ['', [Validators.required, Validators.minLength(PASSWORD_MIN_LENGTH)]],
      confirm_password: ['', Validators.required],
    },
    { validators: passwordsValidator },
  );

  protected readonly minLength = PASSWORD_MIN_LENGTH;
  protected readonly newPasswordMatcher = new GroupErrorMatcher('sameAsCurrent');
  protected readonly confirmPasswordMatcher = new GroupErrorMatcher('mismatch');
  protected readonly visible = signal<Record<PasswordField, boolean>>({
    current_password: false,
    new_password: false,
    confirm_password: false,
  });
  protected readonly saving = signal(false);
  protected readonly errorMessage = signal('');

  // resetForm() también limpia el estado "enviado", para que los campos vacíos no queden en rojo.
  private readonly formDirective = viewChild.required(FormGroupDirective);

  constructor(
    private authService: AuthService,
    private snackBar: MatSnackBar,
  ) {}

  protected toggleVisibility(field: PasswordField): void {
    this.visible.update((current) => ({ ...current, [field]: !current[field] }));
  }

  protected submit(): void {
    if (this.saving()) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving.set(true);
    this.errorMessage.set('');

    const value = this.form.getRawValue();
    this.authService
      .changePassword(value.current_password, value.new_password)
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: () => {
          this.snackBar.open('Contraseña actualizada. Cerramos tus otras sesiones.', 'Cerrar', {
            duration: 4000,
          });
          this.formDirective().resetForm();
        },
        error: (err) => {
          const message = apiErrorMessage(
            err,
            'No se pudo cambiar la contraseña. Intentá de nuevo.',
          );
          this.errorMessage.set(message);
          if (message === INCORRECT_CURRENT_PASSWORD) {
            this.form.controls.current_password.setErrors({ incorrect: true });
          }
        },
      });
  }
}
