import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { environment } from '../../environments/environment';
import { ChangePassword } from './change-password';

describe('ChangePassword', () => {
  let fixture: ComponentFixture<ChangePassword>;
  let http: HttpTestingController;
  const url = `${environment.apiUrl}/auth/password`;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChangePassword],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    fixture = TestBed.createComponent(ChangePassword);
    http = TestBed.inject(HttpTestingController);
    await fixture.whenStable();
  });

  afterEach(() => {
    http.verify();
    vi.restoreAllMocks();
  });

  function input(name: string): HTMLInputElement {
    return fixture.nativeElement.querySelector(`input[formControlName="${name}"]`);
  }

  function field(name: string): HTMLElement {
    return input(name).closest('mat-form-field')!;
  }

  function submitButton(): HTMLButtonElement {
    return fixture.nativeElement.querySelector('button[type="submit"]');
  }

  async function fill(current: string, next: string, confirm: string): Promise<void> {
    for (const [name, value] of [
      ['current_password', current],
      ['new_password', next],
      ['confirm_password', confirm],
    ]) {
      input(name).value = value;
      input(name).dispatchEvent(new Event('input'));
    }
    await fixture.whenStable();
  }

  async function submit(): Promise<void> {
    submitButton().click();
    await fixture.whenStable();
  }

  it('usa campos de contraseña con el autocompletado correcto y permite mostrarlos', async () => {
    expect(fixture.nativeElement.textContent).toContain('Cambiar contraseña');
    expect(input('current_password').autocomplete).toBe('current-password');
    expect(input('new_password').autocomplete).toBe('new-password');
    expect(input('confirm_password').autocomplete).toBe('new-password');
    for (const name of ['current_password', 'new_password', 'confirm_password']) {
      expect(input(name).type).toBe('password');
    }
    const eye: HTMLButtonElement = fixture.nativeElement.querySelector(
      'button[aria-label="Mostrar contraseña actual"]',
    );
    eye.click();
    await fixture.whenStable();
    expect(input('current_password').type).toBe('text');
    expect(input('new_password').type).toBe('password');
    expect(eye.getAttribute('aria-label')).toBe('Ocultar contraseña actual');
  });

  it.each([
    [
      'falta la actual',
      '',
      'nueva123',
      'nueva123',
      'current_password',
      'Ingresá tu contraseña actual',
    ],
    ['falta la nueva', 'vieja123', '', '', 'new_password', 'Ingresá la nueva contraseña'],
    [
      'falta repetirla',
      'vieja123',
      'nueva123',
      '',
      'confirm_password',
      'Repetí la nueva contraseña',
    ],
    [
      'la repetición no coincide',
      'vieja123',
      'nueva123',
      'nueva124',
      'confirm_password',
      'Las contraseñas no coinciden',
    ],
    [
      'la nueva es igual a la actual',
      'vieja123',
      'vieja123',
      'vieja123',
      'new_password',
      'Tiene que ser distinta de la actual',
    ],
    [
      'la nueva tiene menos de 6 caracteres',
      'vieja123',
      'corta',
      'corta',
      'new_password',
      'Mínimo 6',
    ],
  ])('no envía nada si %s', async (_, current, next, confirm, invalidField, message) => {
    await fill(current, next, confirm);
    await submit();
    http.expectNone(url);
    expect(field(invalidField).classList).toContain('mat-form-field-invalid');
    expect(field(invalidField).querySelector('mat-error')?.textContent).toContain(message);
  });

  it('cambia la contraseña con PUT, avisa que cerró las otras sesiones y vacía el formulario', async () => {
    const snackBar = vi.spyOn(fixture.debugElement.injector.get(MatSnackBar), 'open');
    await fill('vieja123', 'nueva123', 'nueva123');
    await submit();
    const request = http.expectOne(url);
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual({
      current_password: 'vieja123',
      new_password: 'nueva123',
    });
    request.flush(null, { status: 204, statusText: 'No Content' });
    await fixture.whenStable();

    expect(snackBar).toHaveBeenCalledWith(
      'Contraseña actualizada. Cerramos tus otras sesiones.',
      'Cerrar',
      expect.anything(),
    );
    expect(fixture.componentInstance['form'].getRawValue()).toEqual({
      current_password: '',
      new_password: '',
      confirm_password: '',
    });
    expect(fixture.nativeElement.querySelector('.mat-form-field-invalid')).toBeNull();
    expect(fixture.nativeElement.querySelector('[role="alert"]')).toBeNull();
  });

  it('muestra el error del backend y marca la contraseña actual como incorrecta', async () => {
    await fill('equivocada', 'nueva123', 'nueva123');
    await submit();
    http
      .expectOne(url)
      .flush(
        { error: 'La contraseña actual es incorrecta' },
        { status: 400, statusText: 'Bad Request' },
      );
    await fixture.whenStable();

    expect(fixture.nativeElement.querySelector('[role="alert"]').textContent).toContain(
      'La contraseña actual es incorrecta',
    );
    expect(fixture.componentInstance['form'].controls.current_password.hasError('incorrect')).toBe(
      true,
    );
    expect(field('current_password').classList).toContain('mat-form-field-invalid');
    expect(submitButton().disabled).toBe(false);
  });

  it('usa el mensaje genérico si la API no explica el error', async () => {
    await fill('vieja123', 'nueva123', 'nueva123');
    await submit();
    http.expectOne(url).flush(null, { status: 500, statusText: 'Server Error' });
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('[role="alert"]').textContent).toContain(
      'No se pudo cambiar la contraseña. Intentá de nuevo.',
    );
    expect(field('current_password').classList).not.toContain('mat-form-field-invalid');
  });

  it('deshabilita el botón mientras guarda y un doble click manda una sola request', async () => {
    await fill('vieja123', 'nueva123', 'nueva123');
    submitButton().click();
    submitButton().click();
    await fixture.whenStable();
    expect(submitButton().disabled).toBe(true);
    expect(submitButton().textContent).toContain('Guardando…');
    submitButton().click();
    const request = http.expectOne(url);
    request.flush(null, { status: 204, statusText: 'No Content' });
    await fixture.whenStable();
    expect(submitButton().disabled).toBe(false);
    expect(submitButton().textContent).toContain('Cambiar contraseña');
  });
});
