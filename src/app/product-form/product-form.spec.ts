import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { ProductForm } from './product-form';
import { environment } from '../../environments/environment';

describe('ProductForm images', () => {
  let http: HttpTestingController;
  let id: string | null;
  beforeEach(async () => {
    id = null;
    await TestBed.configureTestingModule({
      imports: [ProductForm],
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
    vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
  });
  afterEach(() => http.verify());

  it.each(['', 'http://example.com/a.jpg', 'https://example.com/a.jpg'])(
    'accepts and submits optional URL %s',
    async (url) => {
      const fixture = TestBed.createComponent(ProductForm);
      await fixture.whenStable();
      http.match(() => true).forEach((request) => request.flush([]));
      fixture.componentInstance['form'].patchValue({
        name: 'Producto',
        price: 100,
        stock: 3,
        category_id: 'cat',
        brand_id: 'brand',
        image_url: url,
      });
      fixture.componentInstance.submit();
      const request = http.expectOne(environment.apiUrl + '/product');
      expect(request.request.method).toBe('POST');
      expect(request.request.body.image_url).toBe(url || null);
      request.flush({ id: 'created', ...request.request.body });
    },
  );

  it('rejects unsupported prefixes and updates the preview live', async () => {
    const fixture = TestBed.createComponent(ProductForm);
    await fixture.whenStable();
    http.match(() => true).forEach((request) => request.flush([]));
    const input = fixture.nativeElement.querySelector('input[type=url]') as HTMLInputElement;
    input.value = 'ftp://example.com/a.jpg';
    input.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    expect(fixture.componentInstance['form'].controls.image_url.hasError('pattern')).toBe(true);
    input.value = 'https://example.com/a.jpg';
    input.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    expect(fixture.componentInstance['form'].controls.image_url.valid).toBe(true);
    expect(fixture.nativeElement.querySelector('app-product-image img').getAttribute('src')).toBe(
      input.value,
    );
    input.value = '';
    input.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('app-product-image img')).toBeNull();
  });

  it('loads and updates the existing image in edit mode', async () => {
    id = 'test-id';
    const fixture = TestBed.createComponent(ProductForm);
    await fixture.whenStable();
    http
      .match(() => true)
      .forEach((request) =>
        request.flush(
          request.request.url.endsWith('/product/test-id')
            ? {
                id,
                name: 'Producto',
                description: null,
                image_url: 'https://example.com/current.jpg',
                type: 'stock',
                price: 100,
                stock: 3,
                category_id: 'cat',
                brand_id: 'brand',
              }
            : [],
        ),
      );
    await fixture.whenStable();
    expect(fixture.componentInstance['form'].controls.image_url.value).toBe(
      'https://example.com/current.jpg',
    );
    fixture.componentInstance['form'].controls.image_url.setValue('');
    fixture.componentInstance.submit();
    const request = http.expectOne(environment.apiUrl + '/product/test-id');
    expect(request.request.method).toBe('PUT');
    expect(request.request.body.image_url).toBeNull();
    request.flush({ id, ...request.request.body });
  });
});
