import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { of } from 'rxjs';
import { CustomerForm } from './customer-form';
import { GeneratedPasswordDialog } from '../generated-password-dialog/generated-password-dialog';
import { environment } from '../../environments/environment';

describe('CustomerForm', () => {
  let http: HttpTestingController;
  let id: string | null;
  const open = vi.fn(() => ({ afterClosed: () => of(true) }));
  beforeEach(async () => {
    id = null;
    open.mockClear();
    await TestBed.configureTestingModule({
      imports: [CustomerForm],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: MatDialog, useValue: { open } },
        {
          provide: ActivatedRoute,
          useValue: {
            get snapshot() {
              return { paramMap: convertToParamMap(id ? { id } : {}) };
            },
          },
        },
      ],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
    vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
  });
  afterEach(() => http.verify());

  it.each(['local', 'generated', 'own'] as const)(
    'creates a %s customer with the right credentials',
    async (kind) => {
      const fixture = TestBed.createComponent(CustomerForm);
      await fixture.whenStable();
      fixture.componentInstance['form'].patchValue({
        name: 'Cliente',
        web_access: kind !== 'local',
        email: 'cliente@example.com',
        password: kind === 'own' ? 'Propia123!' : '',
      });
      fixture.componentInstance.submit();
      const request = http.expectOne(environment.apiUrl + '/customer');
      expect(request.request.method).toBe('POST');
      if (kind === 'local') {
        expect(request.request.body).not.toHaveProperty('email');
        expect(request.request.body).not.toHaveProperty('password');
      } else {
        expect(request.request.body.email).toBe('cliente@example.com');
        if (kind === 'own') expect(request.request.body.password).toBe('Propia123!');
        else expect(request.request.body).not.toHaveProperty('password');
      }
      request.flush({
        customer: { id: 'created' },
        generated_password: kind === 'generated' ? 'Generada123!' : null,
      });
      if (kind === 'generated')
        expect(open).toHaveBeenCalledWith(
          GeneratedPasswordDialog,
          expect.objectContaining({ data: { password: 'Generada123!' }, disableClose: true }),
        );
      else expect(open).not.toHaveBeenCalled();
      expect(TestBed.inject(Router).navigate).toHaveBeenCalledWith(['/admin/clientes']);
    },
  );

  it('requires valid email only with web access and validates CUIT', async () => {
    const fixture = TestBed.createComponent(CustomerForm);
    await fixture.whenStable();
    const form = fixture.componentInstance['form'];
    form.controls.name.setValue('Cliente');
    expect(form.valid).toBe(true);
    form.controls.web_access.setValue(true);
    expect(form.controls.email.hasError('required')).toBe(true);
    form.controls.email.setValue('incorrecto');
    expect(form.controls.email.hasError('email')).toBe(true);
    form.controls.web_access.setValue(false);
    expect(form.controls.email.valid).toBe(true);
    form.controls.government_id.setValue('123');
    expect(form.controls.government_id.invalid).toBe(true);
    form.controls.government_id.setValue('20123456789');
    expect(form.valid).toBe(true);
  });

  // El documento valido depende de la condicion fiscal: consumidor final acepta DNI (7 u 8)
  // o CUIT/CUIL (11); el resto, solo CUIT. Cambiar la condicion revalida el valor ya cargado.
  it('changes the document validation and hint when the tax status changes', async () => {
    const fixture = TestBed.createComponent(CustomerForm);
    await fixture.whenStable();
    const form = fixture.componentInstance['form'];
    const governmentId = form.controls.government_id;
    const field = () => fixture.nativeElement.textContent as string;

    expect(form.controls.tax_status.value).toBe('consumidor_final');
    expect(field()).toContain('Documento');
    expect(field()).toContain('DNI o CUIT, sin puntos ni guiones');
    for (const valid of ['30123456', '5123456', '20301234561']) {
      governmentId.setValue(valid);
      expect(governmentId.valid).toBe(true);
    }
    governmentId.setValue('301234567');
    expect(governmentId.hasError('pattern')).toBe(true);

    governmentId.setValue('30123456');
    governmentId.markAsTouched();
    form.controls.tax_status.setValue('responsable_inscripto');
    await fixture.whenStable();
    expect(governmentId.hasError('pattern')).toBe(true);
    expect(field()).toContain('El CUIT debe tener 11 dígitos numéricos');
    governmentId.setValue('30712345678');
    expect(governmentId.valid).toBe(true);
    await fixture.whenStable();
    expect(field()).toContain('CUIT de 11 dígitos, sin guiones');

    governmentId.setValue('30123456');
    form.controls.tax_status.setValue('consumidor_final');
    expect(governmentId.valid).toBe(true);
  });

  it.each(['consumidor_final', 'responsable_inscripto', 'monotributo', 'exento'])(
    'accepts an empty document with tax status %s',
    async (taxStatus) => {
      const fixture = TestBed.createComponent(CustomerForm);
      await fixture.whenStable();
      const form = fixture.componentInstance['form'];
      form.controls.tax_status.setValue(taxStatus);
      form.controls.government_id.setValue('');
      expect(form.controls.government_id.valid).toBe(true);
    },
  );

  it('applies the CUIT rule to a saved responsable inscripto customer', async () => {
    id = 'ri-id';
    const fixture = TestBed.createComponent(CustomerForm);
    await fixture.whenStable();
    http.expectOne(environment.apiUrl + '/customer/ri-id').flush({
      id,
      user_id: null,
      name: 'Empresa SA',
      tax_status: 'responsable_inscripto',
      government_id: '30712345678',
      phone: null,
      address: null,
    });
    await fixture.whenStable();
    const governmentId = fixture.componentInstance['form'].controls.government_id;
    expect(governmentId.valid).toBe(true);
    expect(fixture.nativeElement.textContent).toContain('CUIT de 11 dígitos, sin guiones');
    governmentId.setValue('30123456');
    expect(governmentId.hasError('pattern')).toBe(true);
  });

  it('edits only the commercial profile and explains local accounts', async () => {
    id = 'local-id';
    const fixture = TestBed.createComponent(CustomerForm);
    await fixture.whenStable();
    http.expectOne(environment.apiUrl + '/customer/local-id').flush({
      id,
      user_id: null,
      name: 'Local',
      tax_status: 'consumidor_final',
      government_id: null,
      phone: null,
      address: null,
    });
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain('Es un cliente de local');
    expect(fixture.nativeElement.querySelector('input[type=email]')).toBeNull();
    expect(fixture.nativeElement.querySelector('mat-checkbox')).toBeNull();
    fixture.componentInstance.submit();
    const request = http.expectOne(environment.apiUrl + '/customer/local-id');
    expect(request.request.method).toBe('PUT');
    expect(Object.keys(request.request.body).sort()).toEqual([
      'address',
      'government_id',
      'name',
      'phone',
      'tax_status',
    ]);
    request.flush({ id, ...request.request.body });
  });

  it('displays the backend error and allows retrying a failed save', async () => {
    const fixture = TestBed.createComponent(CustomerForm);
    await fixture.whenStable();
    fixture.componentInstance['form'].controls.name.setValue('Cliente');
    fixture.componentInstance.submit();
    http
      .expectOne(environment.apiUrl + '/customer')
      .flush({ error: 'CUIT ya registrado' }, { status: 409, statusText: 'Conflict' });
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain('CUIT ya registrado');
    expect(fixture.componentInstance['saving']()).toBe(false);
  });
});
