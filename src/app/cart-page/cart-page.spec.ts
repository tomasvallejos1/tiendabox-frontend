import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { provideRouter } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { environment } from '../../environments/environment';
import { OrderConfirmationDialog } from '../order-confirmation-dialog/order-confirmation-dialog';
import { AuthService } from '../shared/auth-service';
import { Cart, CartItem } from '../shared/cart';
import { Customer } from '../shared/customer';
import { CartPage } from './cart-page';

describe('CartPage', () => {
  let fixture: ComponentFixture<CartPage>;
  let http: HttpTestingController;
  const stock: CartItem = {
    id: 'item-stock',
    product_id: 'stock',
    name: 'Caja en stock',
    type: 'stock',
    quantity: 1,
    unit_price: 1200,
    subtotal: 1200,
    stock_available: 3,
    available: true,
    exceeds_stock: false,
  };
  const encargo: CartItem = {
    ...stock,
    id: 'item-encargo',
    product_id: 'encargo',
    name: 'Caja por encargo',
    type: 'encargo',
    quantity: 2,
    unit_price: null,
    subtotal: null,
    stock_available: null,
  };
  const customer: Customer = {
    id: 'customer-1',
    user_id: 'user-1',
    name: 'Cliente',
    phone: '1155551234',
    government_id: '20123456789',
    tax_status: 'consumidor_final',
    address: 'San Martín 123',
    created_at: '2026-10-09T12:00:00Z',
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CartPage],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: { getCustomerId: () => customer.id } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CartPage);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
    vi.restoreAllMocks();
  });

  async function load(items: CartItem[], profile = customer): Promise<void> {
    const cart: Cart = {
      id: 'cart-1',
      customer_id: customer.id,
      updated_at: '2026-10-09T12:00:00Z',
      items,
      item_count: items.reduce((count, item) => count + item.quantity, 0),
      total: items.some((item) => item.type === 'stock') ? 1200 : 0,
      has_encargo_items: items.some((item) => item.type === 'encargo'),
      has_unavailable_items: items.some((item) => !item.available),
    };
    fixture.detectChanges();
    http.expectOne(`${environment.apiUrl}/cart`).flush(cart);
    http.expectOne(`${environment.apiUrl}/customer/${customer.id}`).flush(profile);
    await fixture.whenStable();
  }

  function button(): HTMLButtonElement {
    return fixture.nativeElement.querySelector('.checkout-actions button');
  }

  it.each(['stock', 'mixto', 'encargo'])(
    'confirma un carrito %s y pasa al diálogo el desglose real del pedido',
    async (kind) => {
      const items = kind === 'stock' ? [stock] : kind === 'encargo' ? [encargo] : [stock, encargo];
      await load(items);
      expect(button().disabled).toBe(false);
      expect(button().textContent?.trim()).toBe(
        kind === 'encargo' ? 'Enviar pedido de cotización' : 'Confirmar pedido',
      );
      const text = fixture.nativeElement.querySelector('.summary-card').textContent;
      if (kind === 'encargo') {
        expect(text).toContain('2 productos a cotizar');
        expect(text).not.toContain('$0');
      }
      if (kind !== 'stock') {
        const section: HTMLElement = fixture.nativeElement.querySelector('.summary-section');
        expect(section.firstElementChild?.className).toBe('encargo-notice');
        expect(section.textContent).toContain('no implica pagar ni comprometerte');
      }
      fixture.componentInstance['form'].controls.delivery_type.setValue('retiro');
      await fixture.whenStable();
      button().click();
      const request = http.expectOne(`${environment.apiUrl}/order`);
      expect(request.request.body).toEqual({ delivery_type: 'retiro' });
      const open = vi.spyOn(fixture.debugElement.injector.get(MatDialog), 'open');
      request.flush({
        id: 'abcd1234-order',
        total: kind === 'encargo' ? 0 : 1200,
        items: items.map((item) => ({ ...item, product_name: item.name })),
      });
      await fixture.whenStable();
      expect(open).toHaveBeenCalledWith(
        OrderConfirmationDialog,
        expect.objectContaining({
          data: {
            orderId: 'abcd1234-order',
            total: kind === 'encargo' ? 0 : 1200,
            hasEncargoItems: kind !== 'stock',
            quoteQuantity: kind === 'stock' ? 0 : 2,
            hasPricedItems: kind !== 'encargo',
          },
        }),
      );
    },
  );

  it('no bloquea encargo por stock cero ni por banderas generales de disponibilidad', async () => {
    await load([{ ...encargo, available: false, exceeds_stock: true, stock_available: 0 }]);
    expect(button().disabled).toBe(false);
    expect(fixture.nativeElement.querySelector('.item-warning')).toBeNull();
    expect(fixture.nativeElement.querySelector('.item-card.unavailable')).toBeNull();
    expect(fixture.nativeElement.textContent).not.toContain('NaN');
  });

  it.each([
    { ...stock, available: false },
    { ...stock, exceeds_stock: true },
    { ...stock, quantity: 4 },
  ])('bloquea stock inactivo o cantidades que exceden el disponible', async (item) => {
    await load([item, encargo]);
    expect(button().disabled).toBe(true);
    expect(fixture.nativeElement.querySelector('.block-reason')).toBeTruthy();
    fixture.componentInstance['form'].controls.delivery_type.setValue('retiro');
    fixture.componentInstance['confirmOrder']();
    http.expectNone(`${environment.apiUrl}/order`);
  });

  it('permite cotizar con perfil incompleto y mantiene sus campos editables', async () => {
    await load([encargo], { ...customer, phone: null, government_id: null });
    expect(fixture.nativeElement.querySelector('.profile-card')).toBeTruthy();
    expect(button().disabled).toBe(false);
    expect(fixture.componentInstance['profileComplete']()).toBe(false);
  });

  it('valida entrega y exige una dirección no vacía solo para envío', async () => {
    await load([encargo]);
    button().click();
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain('Seleccioná un tipo de entrega');
    const form = fixture.componentInstance['form'];
    form.controls.delivery_type.setValue('envio');
    form.controls.delivery_address.setValue('   ');
    button().click();
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain('La dirección es obligatoria');
    http.expectNone(`${environment.apiUrl}/order`);
    form.controls.delivery_address.setValue('Otra dirección 456');
    button().click();
    http
      .expectOne(`${environment.apiUrl}/order`)
      .flush({ error: 'Stock insuficiente' }, { status: 400, statusText: 'Bad Request' });
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain('Stock insuficiente');
    expect(button().disabled).toBe(false);
  });
});
