import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { Profile } from './profile';
import { AuthService } from '../shared/auth-service';
import { Customer } from '../shared/customer';
import { environment } from '../../environments/environment';

// El documento valido depende de la condicion fiscal: consumidor final acepta DNI (7 u 8)
// o CUIT/CUIL (11); el resto, solo CUIT. Cambiar la condicion revalida el valor ya cargado.
describe('Profile', () => {
  let http: HttpTestingController;

  const customer: Customer = {
    id: 'cus-1',
    user_id: 'user-1',
    name: 'Maria Gomez',
    government_id: null,
    tax_status: 'consumidor_final',
    phone: null,
    address: null,
    created_at: '2026-01-01T00:00:00.000Z',
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Profile],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: { getCustomerId: () => 'cus-1' } },
      ],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  // Crea el componente y responde la carga del perfil con el cliente indicado.
  async function render(saved: Partial<Customer> = {}) {
    const fixture = TestBed.createComponent(Profile);
    await fixture.whenStable();
    http.expectOne(`${environment.apiUrl}/customer/cus-1`).flush({ ...customer, ...saved });
    await fixture.whenStable();
    return fixture;
  }

  it('precarga los datos fiscales y de contacto del cliente en los campos visibles', async () => {
    const saved = {
      name: 'María Gómez',
      government_id: '20301234561',
      tax_status: 'monotributo',
      phone: '1155551234',
      address: 'San Martín 123',
    };
    const fixture = await render(saved);
    for (const field of ['name', 'government_id', 'phone', 'address'] as const) {
      expect(fixture.nativeElement.querySelector(`[formControlName="${field}"]`).value).toBe(
        saved[field],
      );
    }
    expect(fixture.nativeElement.querySelector('mat-select').textContent).toContain('Monotributo');
    expect(fixture.componentInstance['form'].getRawValue()).toEqual(saved);
  });

  it('impide guardar un documento inválido y envía los datos cuando se corrige', async () => {
    const fixture = await render({ tax_status: 'monotributo' });
    const input: HTMLInputElement = fixture.nativeElement.querySelector(
      '[formControlName="government_id"]',
    );
    input.value = '30123456';
    input.dispatchEvent(new Event('input'));
    fixture.nativeElement
      .querySelector('form')
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain('El CUIT debe tener 11 dígitos numéricos');
    http.expectNone(() => true);

    input.value = '20301234561';
    input.dispatchEvent(new Event('input'));
    fixture.nativeElement
      .querySelector('form')
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await fixture.whenStable();
    const request = http.expectOne(`${environment.apiUrl}/customer/cus-1`);
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual({
      name: customer.name,
      government_id: '20301234561',
      tax_status: 'monotributo',
      phone: null,
      address: null,
    });
    request.flush({ ...customer, ...request.request.body });
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('button[type="submit"]').disabled).toBe(false);
  });

  it.each([
    {
      body: { error: 'El CUIT debe tener 11 dígitos numéricos' },
      expected: 'El CUIT debe tener 11 dígitos numéricos',
    },
    { body: null, expected: 'No se pudo guardar el perfil. Intentá de nuevo.' },
  ])('muestra el error al guardar el perfil: $expected', async ({ body, expected }) => {
    const fixture = await render();
    fixture.nativeElement
      .querySelector('form')
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    const request = http.expectOne(`${environment.apiUrl}/customer/cus-1`);
    expect(request.request.method).toBe('PUT');
    request.flush(body, { status: 400, statusText: 'Bad Request' });
    await fixture.whenStable();

    expect(fixture.nativeElement.querySelector('.error-message').textContent).toContain(expected);
    expect(fixture.nativeElement.querySelector('button[type="submit"]').disabled).toBe(false);
  });

  it('changes the document validation and hint when the tax status changes', async () => {
    const fixture = await render();
    const form = fixture.componentInstance['form'];
    const governmentId = form.controls.government_id;
    const text = () => fixture.nativeElement.textContent as string;

    expect(text()).toContain('Documento');
    expect(text()).toContain('DNI o CUIT, sin puntos ni guiones');
    for (const valid of ['30123456', '5123456', '20301234561']) {
      governmentId.setValue(valid);
      expect(governmentId.valid).toBe(true);
    }
    governmentId.setValue('301234567');
    expect(governmentId.hasError('pattern')).toBe(true);

    governmentId.setValue('30123456');
    governmentId.markAsTouched();
    form.controls.tax_status.setValue('monotributo');
    await fixture.whenStable();
    expect(governmentId.hasError('pattern')).toBe(true);
    expect(text()).toContain('El CUIT debe tener 11 dígitos numéricos');
    governmentId.setValue('20301234561');
    await fixture.whenStable();
    expect(governmentId.valid).toBe(true);
    expect(text()).toContain('CUIT de 11 dígitos, sin guiones');
  });

  it('applies the CUIT rule to the saved tax status when the profile loads', async () => {
    const fixture = await render({ tax_status: 'exento', government_id: '30712345678' });
    const governmentId = fixture.componentInstance['form'].controls.government_id;

    expect(governmentId.valid).toBe(true);
    expect(fixture.nativeElement.textContent).toContain('CUIT de 11 dígitos, sin guiones');
    governmentId.setValue('30123456');
    expect(governmentId.hasError('pattern')).toBe(true);
  });

  it('accepts an empty document with any tax status', async () => {
    const fixture = await render();
    const form = fixture.componentInstance['form'];
    for (const taxStatus of [
      'consumidor_final',
      'responsable_inscripto',
      'monotributo',
      'exento',
    ]) {
      form.controls.tax_status.setValue(taxStatus);
      form.controls.government_id.setValue('');
      expect(form.controls.government_id.valid).toBe(true);
    }
  });

  it('shows the change password card below the profile data', async () => {
    const fixture = await render();
    const cards: HTMLElement[] = Array.from(fixture.nativeElement.querySelectorAll('mat-card'));
    expect(cards.map((card) => card.querySelector('mat-card-title')?.textContent?.trim())).toEqual([
      'Mi perfil',
      'Cambiar contraseña',
    ]);
    expect(cards[1].closest('app-change-password')).not.toBeNull();
    expect(cards[1].querySelector('input[autocomplete="current-password"]')).not.toBeNull();
  });
});
