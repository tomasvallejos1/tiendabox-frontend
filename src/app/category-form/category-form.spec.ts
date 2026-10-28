import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';

import { environment } from '../../environments/environment';
import { CategoryForm } from './category-form';

describe('CategoryForm', () => {
  let fixture: ComponentFixture<CategoryForm>;
  let http: HttpTestingController;
  let router: Router;
  let id: string | null;

  beforeEach(async () => {
    id = null;
    await TestBed.configureTestingModule({
      imports: [CategoryForm],
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
    fixture = TestBed.createComponent(CategoryForm);
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

  it('crea una categoría con un nombre de 100 caracteres y vuelve al listado', async () => {
    await render();
    const payload = { name: 'a'.repeat(100), description: 'Categoría de prueba' };
    fixture.componentInstance['form'].setValue(payload);
    await submit();
    const request = http.expectOne(`${environment.apiUrl}/category`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(payload);
    expect(fixture.nativeElement.querySelector('button[type="submit"]').disabled).toBe(true);
    request.flush({ id: 'category-1', ...payload });
    await fixture.whenStable();
    expect(router.navigate).toHaveBeenCalledExactlyOnceWith(['/admin/categorias']);
  });

  it('precarga la categoría y guarda sus cambios con PUT sin crear otra', async () => {
    id = 'category-1';
    await render();
    http
      .expectOne(`${environment.apiUrl}/category/category-1`)
      .flush({ id, name: 'Categoría original', description: null });
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('input[formControlName="name"]').value).toBe(
      'Categoría original',
    );
    expect(fixture.nativeElement.querySelector('textarea').value).toBe('');
    fixture.componentInstance['form'].patchValue({
      name: 'Categoría editada',
      description: 'Descripción nueva',
    });
    await submit();
    const request = http.expectOne(`${environment.apiUrl}/category/category-1`);
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual({
      name: 'Categoría editada',
      description: 'Descripción nueva',
    });
    http.expectNone(`${environment.apiUrl}/category`);
    request.flush({ id, ...request.request.body });
    await fixture.whenStable();
    expect(router.navigate).toHaveBeenCalledExactlyOnceWith(['/admin/categorias']);
  });

  it('muestra el error de guardado y permite reintentar sin perder los datos', async () => {
    await render();
    fixture.componentInstance['form'].controls.name.setValue('Categoría de prueba');
    await submit();
    http
      .expectOne(`${environment.apiUrl}/category`)
      .flush({ error: 'La categoría ya existe' }, { status: 409, statusText: 'Conflict' });
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('[role="alert"]').textContent).toContain(
      'La categoría ya existe',
    );
    expect(fixture.nativeElement.querySelector('button[type="submit"]').disabled).toBe(false);
    expect(fixture.nativeElement.querySelector('input[formControlName="name"]').value).toBe(
      'Categoría de prueba',
    );
    expect(router.navigate).not.toHaveBeenCalled();
  });
});
