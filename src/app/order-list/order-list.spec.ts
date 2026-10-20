import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { environment } from '../../environments/environment';
import { Order } from '../shared/order';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { OrderList } from './order-list';

describe('OrderList', () => {
  let fixture: ComponentFixture<OrderList>;
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OrderList],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(OrderList);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it.each(['stock', 'mixto', 'encargo'])(
    'muestra estado y cotización para un pedido %s',
    async (kind) => {
      const stock = {
        id: 'stock',
        product_id: 'stock',
        product_name: 'Caja',
        type: 'stock',
        unit_price: 1200,
        quantity: 1,
      };
      const encargo = {
        ...stock,
        id: 'encargo',
        product_id: 'encargo',
        type: 'encargo',
        unit_price: null,
        quantity: 2,
      };
      const order: Order = {
        id: 'abcd1234-5678',
        customer_id: 'customer',
        status: 'pendiente',
        delivery_type: 'retiro',
        delivery_address: null,
        created_at: '2026-10-09T12:00:00Z',
        customer: null,
        total: kind === 'encargo' ? 0 : 1200,
        items: kind === 'stock' ? [stock] : kind === 'encargo' ? [encargo] : [stock, encargo],
      };
      fixture.detectChanges();
      http.expectOne(`${environment.apiUrl}/orders/mine`).flush([order]);
      await fixture.whenStable();
      const card: HTMLElement = fixture.nativeElement.querySelector('.order-card');
      expect(card.querySelector('app-order-status-badge')).toBeTruthy();
      expect(card.querySelector('.quote-chip') !== null).toBe(kind !== 'stock');
      if (kind === 'encargo') {
        expect(card.textContent).toContain('2 productos a cotizar');
        expect(card.textContent).not.toContain('$0');
      }
    },
  );

  it('ordena del más reciente al más antiguo en cards y tabla', async () => {
    const order: Order = {
      id: 'oldest01',
      customer_id: 'customer-1',
      status: 'pendiente',
      delivery_type: 'retiro',
      delivery_address: null,
      total: 0,
      items: [],
      customer: null,
      created_at: '2026-10-05T10:00:00Z',
    };
    fixture.detectChanges();
    http
      .expectOne(`${environment.apiUrl}/orders/mine`)
      .flush([
        { ...order, id: 'middle01', created_at: '2026-10-05T12:00:00Z' },
        order,
        { ...order, id: 'newest01', created_at: '2026-10-05T10:00:00-03:00' },
      ]);
    await fixture.whenStable();
    for (const selector of ['.order-card .order-id', '.orders-table td.mat-column-id']) {
      const ids = Array.from(
        fixture.nativeElement.querySelectorAll(selector) as NodeListOf<HTMLElement>,
        (element) => element.textContent?.trim(),
      );
      expect(ids).toEqual(['#newest01', '#middle01', '#oldest01']);
    }
  });

  it('muestra el estado vacío con un acceso al catálogo cuando no hay pedidos', async () => {
    fixture.detectChanges();
    http.expectOne(`${environment.apiUrl}/orders/mine`).flush([]);
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain('No tenés pedidos todavía');
    expect(fixture.nativeElement.querySelector('.empty-state a').getAttribute('href')).toBe(
      '/productos',
    );
    expect(fixture.nativeElement.querySelector('.order-card')).toBeNull();
    expect(fixture.nativeElement.querySelector('mat-spinner')).toBeNull();
  });
});
