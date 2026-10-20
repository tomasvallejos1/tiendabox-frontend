import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';

import { environment } from '../../environments/environment';
import { BrandForm } from './brand-form';

describe('BrandForm', () => {
  let fixture: ComponentFixture<BrandForm>;
  let http: HttpTestingController;
  let router: Router;
  let id: string | null;

  beforeEach(async () => {
    id = null;
    await TestBed.configureTestingModule({
      imports: [BrandForm],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
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
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
  });

  afterEach(() => {
    http.verify();
    vi.restoreAllMocks();
  });

  async function render(): Promise<void> {
    fixture = TestBed.createComponent(BrandForm);
    await fixture.whenStable();
  }

  async function submit(): Promise<void> {
    fixture.nativeElement
      .querySelector('form')
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await fixture.whenStable();
  }

  it.each([
    { name: '', error: 'El nombre es obligatorio.' },
    { name: '   ', error: 'El nombre no puede estar vacío.' },
    { name: 'a'.repeat(101), error: 'Máximo 100 caracteres.' },
  ])('rechaza un nombre inválido: $error', async ({ name, error }) => {
    await render();
    fixture.componentInstance['form'].controls.name.setValue(name);
    await submit();
    expect(fixture.nativeElement.textContent).toContain(error);
    http.expectNone(() => true);
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('crea una marca con un nombre de 100 caracteres y vuelve al listado', async () => {
    await render();
    const payload = { name: 'a'.repeat(100), logo_url: 'https://example.com/logo.png' };
    fixture.componentInstance['form'].setValue(payload);
    await submit();
    const request = http.expectOne(`${environment.apiUrl}/brand`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(payload);
    expect(fixture.nativeElement.querySelector('button[type="submit"]').disabled).toBe(true);
    request.flush({ id: 'brand-1', ...payload });
    await fixture.whenStable();
    expect(router.navigate).toHaveBeenCalledExactlyOnceWith(['/admin/marcas']);
  });

  it('precarga la marca y guarda sus cambios con PUT sin crear otra', async () => {
    id = 'brand-1';
    await render();
    http
      .expectOne(`${environment.apiUrl}/brand/brand-1`)
      .flush({ id, name: 'Marca original', logo_url: null });
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('input[formControlName="name"]').value).toBe(
      'Marca original',
    );
    expect(fixture.nativeElement.querySelector('input[formControlName="logo_url"]').value).toBe('');
    fixture.componentInstance['form'].controls.name.setValue('Marca editada');
    await submit();
    const request = http.expectOne(`${environment.apiUrl}/brand/brand-1`);
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual({ name: 'Marca editada', logo_url: '' });
    http.expectNone(`${environment.apiUrl}/brand`);
    request.flush({ id, ...request.request.body });
    await fixture.whenStable();
    expect(router.navigate).toHaveBeenCalledExactlyOnceWith(['/admin/marcas']);
  });

  it('muestra el error de guardado y permite reintentar sin perder los datos', async () => {
    await render();
    fixture.componentInstance['form'].controls.name.setValue('Marca de prueba');
    await submit();
    http
      .expectOne(`${environment.apiUrl}/brand`)
      .flush({ message: 'La marca ya existe' }, { status: 409, statusText: 'Conflict' });
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('[role="alert"]').textContent).toContain(
      'La marca ya existe',
    );
    expect(fixture.nativeElement.querySelector('button[type="submit"]').disabled).toBe(false);
    expect(fixture.nativeElement.querySelector('input[formControlName="name"]').value).toBe(
      'Marca de prueba',
    );
    expect(router.navigate).not.toHaveBeenCalled();
  });
});
