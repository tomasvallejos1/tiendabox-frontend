import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';

import { environment } from '../../environments/environment';
import { AuthService } from '../shared/auth-service';
import { CartService } from '../shared/cart-service';
import { ProductWithNames } from '../shared/product';
import { ProductDetail } from './product-detail';

describe('ProductDetail', () => {
  let fixture: ComponentFixture<ProductDetail>;
  let http: HttpTestingController;
  const product: ProductWithNames = {
    id: 'product-1',
    name: 'Caja por encargo',
    description: 'Medidas a pedido',
    image_url: null,
    type: 'encargo',
    price: null,
    stock: 0,
    category_id: 'category-1',
    brand_id: 'brand-1',
    category_name: 'Cajas',
    brand_name: 'TiendaBox',
    is_active: true,
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProductDetail],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: { isCliente: () => true, isLoggedIn: () => true } },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: convertToParamMap({ id: product.id }) } },
        },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(ProductDetail);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  async function render(changes: Partial<ProductWithNames> = {}): Promise<void> {
    fixture.detectChanges();
    const request = http.expectOne(`${environment.apiUrl}/product/product-1`);
    expect(request.request.method).toBe('GET');
    request.flush({ ...product, ...changes });
    await fixture.whenStable();
  }

  it.each([null, 9999])(
    'oculta el precio de un encargo aunque la API devuelva %s',
    async (price) => {
      await render({ price });
      expect(fixture.nativeElement.querySelector('.price')).toBeNull();
      expect(fixture.nativeElement.querySelector('.price-block')).toBeNull();
      expect(fixture.nativeElement.querySelector('.encargo-block').textContent).toContain(
        'El precio se confirma al procesar el pedido.',
      );
      const button: HTMLButtonElement = fixture.nativeElement.querySelector('.add-button');
      expect(button.textContent).toContain('Agregar al carrito');
      expect(button.disabled).toBe(false);
    },
  );

  it('agrega el encargo con la cantidad elegida y actualiza el contador del carrito', async () => {
    await render();
    const input: HTMLInputElement = fixture.nativeElement.querySelector('input[type="number"]');
    input.value = '2';
    input.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    fixture.nativeElement.querySelector('.add-button').click();
    const request = http.expectOne(`${environment.apiUrl}/cart/items`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ product_id: 'product-1', quantity: 2 });
    request.flush({
      id: 'cart-1',
      customer_id: 'customer-1',
      updated_at: '2026-10-20T12:00:00Z',
      items: [],
      item_count: 2,
      total: 0,
      has_encargo_items: true,
      has_unavailable_items: false,
    });
    await fixture.whenStable();
    expect(TestBed.inject(CartService).itemCount()).toBe(2);
  });

  it('muestra el precio y deshabilita la compra de un producto sin stock', async () => {
    await render({ type: 'stock', price: 42.5, stock: 0 });
    expect(fixture.nativeElement.querySelector('.price').textContent).toContain('42.50');
    expect(fixture.nativeElement.querySelector('.encargo-block')).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Sin stock disponible');
    const button: HTMLButtonElement = fixture.nativeElement.querySelector('.add-button');
    expect(button.disabled).toBe(true);
    button.click();
    http.expectNone(`${environment.apiUrl}/cart/items`);
  });
});
