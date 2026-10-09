import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { ProductList } from './product-list';
import { AuthService } from '../shared/auth-service';
import { Product } from '../shared/product';
import { environment } from '../../environments/environment';

const stock: Product = {
  id: 'stock',
  name: 'Notebook',
  description: null,
  image_url: null,
  type: 'stock',
  price: 100,
  stock: 12,
  category_id: 'cat',
  brand_id: 'brand',
  is_active: true,
};
const soldOut: Product = { ...stock, id: 'empty', name: 'Agotado', stock: 0, price: 200 };
const custom: Product = {
  ...stock,
  id: 'custom',
  name: 'Encargo',
  type: 'encargo',
  stock: 0,
  price: null,
};

describe('ProductList', () => {
  let http: HttpTestingController;
  let client: boolean;
  let loggedIn: boolean;
  beforeEach(async () => {
    client = true;
    loggedIn = true;
    await TestBed.configureTestingModule({
      imports: [ProductList],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: { isCliente: () => client, isLoggedIn: () => loggedIn } },
      ],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  async function render(products = [stock, soldOut, custom]) {
    const fixture = TestBed.createComponent(ProductList);
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelectorAll('.skeleton-card')).toHaveLength(6);
    http.expectOne(environment.apiUrl + '/categories').flush([{ id: 'cat', name: 'Notebooks' }]);
    http.expectOne(environment.apiUrl + '/brands').flush([{ id: 'brand', name: 'Marca' }]);
    http.expectOne(environment.apiUrl + '/products').flush(products);
    await fixture.whenStable();
    return fixture;
  }

  it('enables stock and encargo, disables exhausted stock and uses the existing cart endpoint', async () => {
    const fixture = await render();
    const cards = fixture.nativeElement.querySelectorAll('.product-card');
    expect(cards[0].textContent).toContain('12 disponibles');
    expect(cards[0].querySelector('button').disabled).toBe(false);
    expect(cards[1].querySelector('button').disabled).toBe(true);
    expect(cards[2].querySelector('button').disabled).toBe(false);
    expect(cards[2].textContent).toContain('Consultar precio');
    expect(cards[2].textContent).toContain('Pedir cotización');
    expect(cards[2].textContent).not.toMatch(/Sin stock|0 disponibles|\$0/);
    cards[2].querySelector('button').click();
    const request = http.expectOne(environment.apiUrl + '/cart/items');
    expect(request.request.body).toEqual({ product_id: 'custom', quantity: 1 });
    request.flush({ item_count: 1, items: [] });
  });

  it('searches and sorts in memory, leaving unpriced products last in both directions', async () => {
    const fixture = await render([custom, stock, soldOut]);
    const component = fixture.componentInstance;
    component['sort'].set('price-asc');
    expect(component['visibleProducts']().map((p) => p.id)).toEqual(['stock', 'empty', 'custom']);
    component['sort'].set('price-desc');
    expect(component['visibleProducts']().map((p) => p.id)).toEqual(['empty', 'stock', 'custom']);
    component['sort'].set('name');
    expect(component['visibleProducts']().map((p) => p.id)).toEqual(['empty', 'custom', 'stock']);
    component['sort'].set('recent');
    expect(component['visibleProducts']().map((p) => p.id)).toEqual(['custom', 'stock', 'empty']);
    component['search'].set(' NOTE ');
    expect(component['visibleProducts']()).toEqual([stock]);
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain('1 resultado');
    expect(fixture.nativeElement.querySelector('mat-chip').textContent).toContain('Nombre:');
    component['search'].set('no existe');
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain('No encontramos productos');
    component.clearFilters();
    expect(component['visibleProducts']()).toHaveLength(3);
    http.expectNone(environment.apiUrl + '/products');
  });

  it('preserves category API filters and removable chips', async () => {
    const fixture = await render();
    fixture.componentInstance.onCategoryChange('cat');
    const request = http.expectOne((req) => req.url === environment.apiUrl + '/products');
    expect(request.request.params.get('category_id')).toBe('cat');
    request.flush([stock]);
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('mat-chip').textContent).toContain(
      'Categoría: Notebooks',
    );
    fixture.nativeElement.querySelector('[aria-label="Quitar categoría"]').click();
    const unfiltered = http.expectOne(environment.apiUrl + '/products');
    expect(unfiltered.request.params.keys()).toEqual([]);
    unfiltered.flush([stock, custom]);
  });

  it('shows login for visitors and a distinct empty catalog', async () => {
    loggedIn = false;
    client = false;
    const fixture = await render([stock, custom]);
    expect(fixture.nativeElement.querySelectorAll('.card-action a[href="/login"]')).toHaveLength(2);
    fixture.componentInstance['products'].set([]);
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain('Todavía no hay productos');
    expect(fixture.nativeElement.textContent).not.toContain('Limpiar filtros');
  });

  it('retries loading after an error', async () => {
    const fixture = TestBed.createComponent(ProductList);
    await fixture.whenStable();
    http.expectOne(environment.apiUrl + '/categories').flush([]);
    http.expectOne(environment.apiUrl + '/brands').flush([]);
    http
      .expectOne(environment.apiUrl + '/products')
      .flush({}, { status: 500, statusText: 'Error' });
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain('Reintentar');
    fixture.nativeElement.querySelector('.state-container button').click();
    http.expectOne(environment.apiUrl + '/categories').flush([]);
    http.expectOne(environment.apiUrl + '/brands').flush([]);
    http.expectOne(environment.apiUrl + '/products').flush([stock]);
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelectorAll('.product-card')).toHaveLength(1);
  });
});
