import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { provideRouter } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { environment } from '../../environments/environment';
import { OrderConfirmationDialog } from '../order-confirmation-dialog/order-confirmation-dialog';
import { AuthService } from '../shared/auth-service';
import { Cart, CartItem } from '../shared/cart';
import { CartService } from '../shared/cart-service';
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
        {
          provide: AuthService,
          useValue: { getCustomerId: () => customer.id, isLoggedIn: () => true },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CartPage);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
    vi.restoreAllMocks();
  });

  function cartResponse(items: CartItem[]): Cart {
    return {
      id: 'cart-1',
      customer_id: customer.id,
      updated_at: '2026-10-09T12:00:00Z',
      items,
      item_count: items.reduce((count, item) => count + item.quantity, 0),
      total: items.reduce(
        (total, item) => total + (item.type === 'stock' ? (item.subtotal ?? 0) : 0),
        0,
      ),
      has_encargo_items: items.some((item) => item.type === 'encargo'),
      has_unavailable_items: items.some((item) => !item.available),
    };
  }

  async function load(items: CartItem[], profile = customer): Promise<void> {
    fixture.detectChanges();
    http.expectOne(`${environment.apiUrl}/cart`).flush(cartResponse(items));
    http.expectOne(`${environment.apiUrl}/customer/${customer.id}`).flush(profile);
    await fixture.whenStable();
  }

  function button(): HTMLButtonElement {
    return fixture.nativeElement.querySelector('.checkout-actions button');
  }

  function quantityButton(action: 'Sumar' | 'Restar', name = stock.name): HTMLButtonElement {
    return fixture.nativeElement.querySelector(
      `button[aria-label="${action} una unidad de ${name}"]`,
    );
  }

  it('suma una unidad con PUT y actualiza la cantidad, el total y el contador compartido', async () => {
    await load([stock]);
    const setCart = vi.spyOn(TestBed.inject(CartService), 'setCart');
    expect(fixture.nativeElement.querySelector('.total-amount').textContent).toContain('1,200.00');
    quantityButton('Sumar').click();
    const request = http.expectOne(`${environment.apiUrl}/cart/items/${stock.product_id}`);
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual({ quantity: 2 });
    expect(fixture.nativeElement.querySelector('.item-qty').textContent.trim()).toBe('1');
    const updatedCart = cartResponse([{ ...stock, quantity: 2, subtotal: 2400 }]);
    request.flush(updatedCart);
    await fixture.whenStable();

    expect(fixture.nativeElement.querySelector('.item-qty').textContent.trim()).toBe('2');
    expect(fixture.nativeElement.querySelector('.total-amount').textContent).toContain('2,400.00');
    expect(setCart).toHaveBeenCalledExactlyOnceWith(updatedCart);
    expect(TestBed.inject(CartService).itemCount()).toBe(2);
    expect(quantityButton('Sumar').disabled).toBe(false);
  });

  it('resta una unidad con PUT y deshabilita restar al llegar a uno', async () => {
    await load([{ ...stock, quantity: 2, subtotal: 2400 }]);
    quantityButton('Restar').click();
    const request = http.expectOne(`${environment.apiUrl}/cart/items/${stock.product_id}`);
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual({ quantity: 1 });
    request.flush(cartResponse([stock]));
    await fixture.whenStable();

    expect(fixture.nativeElement.querySelector('.item-qty').textContent.trim()).toBe('1');
    expect(quantityButton('Restar').disabled).toBe(true);
    quantityButton('Restar').click();
    http.expectNone(`${environment.apiUrl}/cart/items/${stock.product_id}`);
  });

  it('deshabilita sumar al alcanzar el stock y permite sumar productos por encargo con stock cero', async () => {
    await load([
      { ...stock, quantity: 2, subtotal: 2400 },
      { ...encargo, stock_available: 0 },
    ]);
    expect(quantityButton('Sumar').disabled).toBe(false);
    quantityButton('Sumar').click();
    http.expectOne(`${environment.apiUrl}/cart/items/${stock.product_id}`).flush(
      cartResponse([
        { ...stock, quantity: 3, subtotal: 3600 },
        { ...encargo, stock_available: 0 },
      ]),
    );
    await fixture.whenStable();

    expect(quantityButton('Sumar').disabled).toBe(true);
    quantityButton('Sumar').click();
    http.expectNone(`${environment.apiUrl}/cart/items/${stock.product_id}`);
    expect(quantityButton('Sumar', encargo.name).disabled).toBe(false);
    quantityButton('Sumar', encargo.name).click();
    const request = http.expectOne(`${environment.apiUrl}/cart/items/${encargo.product_id}`);
    expect(request.request.body).toEqual({ quantity: 3 });
    request.flush(
      cartResponse([
        { ...stock, quantity: 3, subtotal: 3600 },
        { ...encargo, quantity: 3, stock_available: 0 },
      ]),
    );
    await fixture.whenStable();
    expect(quantityButton('Sumar', encargo.name).disabled).toBe(false);
  });

  it.each([true, false])(
    'ajusta al stock disponible y elimina los avisos de exceso (exceeds_stock: %s)',
    async (exceeds_stock) => {
      await load([{ ...stock, quantity: 5, subtotal: 6000, exceeds_stock }]);
      expect(fixture.nativeElement.querySelector('.stock-warning')).toBeTruthy();
      expect(button().disabled).toBe(true);
      const adjust: HTMLButtonElement = fixture.nativeElement.querySelector('.adjust-quantity');
      expect(adjust.textContent.trim()).toBe('Ajustar a 3');
      adjust.click();
      const request = http.expectOne(`${environment.apiUrl}/cart/items/${stock.product_id}`);
      expect(request.request.method).toBe('PUT');
      expect(request.request.body).toEqual({ quantity: 3 });
      await fixture.whenStable();
      expect(adjust.disabled).toBe(true);
      request.flush(cartResponse([{ ...stock, quantity: 3, subtotal: 3600 }]));
      await fixture.whenStable();

      expect(fixture.nativeElement.querySelector('.stock-warning')).toBeNull();
      expect(fixture.nativeElement.querySelector('.adjust-quantity')).toBeNull();
      expect(fixture.nativeElement.querySelector('.block-reason')).toBeNull();
      expect(button().disabled).toBe(false);
    },
  );

  it('oculta el ajuste cuando no queda stock y conserva el aviso de no disponible', async () => {
    await load([{ ...stock, stock_available: 0, available: false, exceeds_stock: true }]);
    expect(fixture.nativeElement.querySelector('.adjust-quantity')).toBeNull();
    expect(fixture.nativeElement.querySelector('.unavailable-warning').textContent).toContain(
      'Ya no está disponible',
    );
    expect(quantityButton('Sumar').disabled).toBe(true);
  });

  it('muestra el error 400 de la API en el snackbar, conserva la cantidad y permite reintentar', async () => {
    await load([stock]);
    const open = vi.spyOn(fixture.debugElement.injector.get(MatSnackBar), 'open');
    quantityButton('Sumar').click();
    http
      .expectOne(`${environment.apiUrl}/cart/items/${stock.product_id}`)
      .flush(
        { error: 'Stock insuficiente. Disponible: 2' },
        { status: 400, statusText: 'Bad Request' },
      );
    await fixture.whenStable();

    expect(open).toHaveBeenCalledWith('Stock insuficiente. Disponible: 2', 'Cerrar', {
      duration: 3000,
    });
    expect(fixture.nativeElement.querySelector('.item-qty').textContent.trim()).toBe('1');
    expect(fixture.nativeElement.querySelector('.total-amount').textContent).toContain('1,200.00');
    expect(TestBed.inject(CartService).itemCount()).toBe(1);
    expect(quantityButton('Sumar').disabled).toBe(false);
    quantityButton('Sumar').click();
    http
      .expectOne(`${environment.apiUrl}/cart/items/${stock.product_id}`)
      .flush(cartResponse([{ ...stock, quantity: 2, subtotal: 2400 }]));
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('.item-qty').textContent.trim()).toBe('2');
  });

  it('envía un solo PUT ante un doble clic rápido y bloquea solo el ítem que se actualiza', async () => {
    await load([{ ...stock, quantity: 2, subtotal: 2400 }, encargo]);
    const plus = quantityButton('Sumar');
    plus.click();
    plus.click();
    const request = http.expectOne(`${environment.apiUrl}/cart/items/${stock.product_id}`);
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual({ quantity: 3 });
    await fixture.whenStable();

    expect(plus.disabled).toBe(true);
    expect(quantityButton('Restar').disabled).toBe(true);
    const removeButtons: NodeListOf<HTMLButtonElement> = fixture.nativeElement.querySelectorAll(
      'button[aria-label="Eliminar producto del carrito"]',
    );
    expect(removeButtons[0].disabled).toBe(true);
    expect(removeButtons[1].disabled).toBe(false);
    expect(quantityButton('Sumar', encargo.name).disabled).toBe(false);
    expect(quantityButton('Restar', encargo.name).disabled).toBe(false);
    request.flush(cartResponse([{ ...stock, quantity: 3, subtotal: 3600 }, encargo]));
    await fixture.whenStable();
    expect(quantityButton('Restar').disabled).toBe(false);
    expect(removeButtons[0].disabled).toBe(false);
  });

  it('bloquea los controles de cantidad mientras se elimina ese producto', async () => {
    await load([{ ...stock, quantity: 2, subtotal: 2400 }, encargo]);
    fixture.nativeElement
      .querySelector('button[aria-label="Eliminar producto del carrito"]')
      .click();
    const request = http.expectOne(`${environment.apiUrl}/cart/items/${stock.product_id}`);
    expect(request.request.method).toBe('DELETE');
    quantityButton('Sumar').click();
    http.expectNone(`${environment.apiUrl}/cart/items/${stock.product_id}`);
    await fixture.whenStable();
    expect(quantityButton('Sumar').disabled).toBe(true);
    expect(quantityButton('Restar').disabled).toBe(true);
    expect(quantityButton('Sumar', encargo.name).disabled).toBe(false);
    request.flush(cartResponse([encargo]));
    await fixture.whenStable();
  });

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

  it.each(['stock', 'mixto', 'encargo'])(
    'exige guardar el teléfono para confirmar un carrito %s sin exigir los datos opcionales',
    async (kind) => {
      const items = kind === 'stock' ? [stock] : kind === 'encargo' ? [encargo] : [stock, encargo];
      const profile = { ...customer, phone: null, name: '', government_id: null, tax_status: '' };
      await load(items, profile);
      fixture.componentInstance['form'].controls.delivery_type.setValue('retiro');
      await fixture.whenStable();

      expect(button().disabled).toBe(true);
      expect(fixture.nativeElement.querySelector('.block-reason').textContent).toContain(
        'Cargá tu teléfono para que podamos contactarte por tu pedido',
      );
      const profileCard: HTMLElement = fixture.nativeElement.querySelector('.profile-card');
      expect(profileCard.textContent).toContain(
        'Te vamos a escribir por WhatsApp para coordinar el retiro, el envío o la cotización',
      );
      expect(profileCard.textContent).toContain('Nombre (opcional)');
      expect(profileCard.textContent).toContain('Documento (opcional)');
      expect(profileCard.textContent).toContain('Condición fiscal (opcional)');
      const phone = profileCard.querySelector('input')!;
      expect(phone.getAttribute('formControlName')).toBe('phone');
      expect(phone.required).toBe(true);
      fixture.componentInstance['confirmOrder']();
      http.expectNone(`${environment.apiUrl}/order`);

      phone.value = '1155551234';
      phone.dispatchEvent(new Event('input'));
      fixture.componentInstance['profileForm'].controls.tax_status.setValue('');
      profileCard
        .querySelector('form')!
        .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      const request = http.expectOne(`${environment.apiUrl}/customer/${customer.id}`);
      expect(request.request.method).toBe('PUT');
      expect(request.request.body.phone).toBe('1155551234');
      expect(request.request.body.government_id).toBeNull();
      expect(request.request.body).not.toHaveProperty('name');
      expect(request.request.body).not.toHaveProperty('tax_status');
      expect(button().disabled).toBe(true);
      request.flush({ ...profile, phone: '1155551234' });
      await fixture.whenStable();

      expect(button().disabled).toBe(false);
      expect(fixture.nativeElement.querySelector('.profile-card')).toBeNull();
      expect(fixture.componentInstance['missingOptional']()).toEqual([
        'name',
        'government_id',
        'tax_status',
      ]);
    },
  );

  it('prioriza el teléfono sobre el stock y rechaza un teléfono con solo espacios', async () => {
    await load([{ ...stock, exceeds_stock: true }], { ...customer, phone: '   ' });
    expect(fixture.nativeElement.querySelector('.block-reason').textContent).toContain(
      'Cargá tu teléfono para que podamos contactarte por tu pedido',
    );
    fixture.componentInstance['saveProfile']();
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('.profile-card').textContent).toContain(
      'El teléfono es obligatorio',
    );
    http.expectNone(`${environment.apiUrl}/customer/${customer.id}`);
    http.expectNone(`${environment.apiUrl}/order`);
  });

  it('permite confirmar con teléfono sin documento ni condición fiscal y muestra errores reales del backend', async () => {
    await load([stock], { ...customer, government_id: null, tax_status: '' });
    expect(fixture.nativeElement.querySelector('.profile-card')).toBeNull();
    expect(button().disabled).toBe(false);
    fixture.componentInstance['form'].controls.delivery_type.setValue('retiro');
    await fixture.whenStable();
    button().click();
    http
      .expectOne(`${environment.apiUrl}/order`)
      .flush(
        { error: 'El teléfono es obligatorio para crear pedidos' },
        { status: 400, statusText: 'Bad Request' },
      );
    await fixture.whenStable();
    expect(
      fixture.nativeElement.querySelector('.checkout-card .error-message').textContent,
    ).toContain('El teléfono es obligatorio para crear pedidos');
    expect(button().disabled).toBe(false);
  });

  it('valida el documento opcional según la condición fiscal y conserva el teléfono al cambiar la entrega', async () => {
    await load([stock], { ...customer, phone: null, government_id: null });
    const form = fixture.componentInstance['profileForm'];
    form.controls.phone.setValue('1155551234');
    const document = form.controls.government_id;
    for (const valid of ['', '5123456', '30123456', '20301234561']) {
      document.setValue(valid);
      expect(document.valid).toBe(true);
    }
    document.setValue('301234567');
    expect(document.hasError('pattern')).toBe(true);
    document.setValue('30123456');
    document.markAsTouched();
    form.controls.tax_status.setValue('monotributo');
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('.profile-card').textContent).toContain(
      'El CUIT debe tener 11 dígitos numéricos',
    );
    document.setValue('20301234561');
    expect(document.valid).toBe(true);
    document.setValue('');
    expect(document.valid).toBe(true);
    fixture.componentInstance['form'].controls.delivery_type.setValue('envio');
    expect(form.controls.phone.value).toBe('1155551234');
    expect(form.controls.tax_status.value).toBe('monotributo');
    http.expectNone(`${environment.apiUrl}/order`);
  });

  it('acepta un DNI para consumidor final y lo rechaza al pasar a monotributo', async () => {
    await load([stock], { ...customer, phone: null, government_id: null });
    const form = fixture.componentInstance['profileForm'];
    const document = form.controls.government_id;
    const card = (): string => fixture.nativeElement.querySelector('.profile-card').textContent;
    document.setValue('30123456');
    document.markAsTouched();
    await fixture.whenStable();
    expect(document.valid).toBe(true);
    expect(card()).toContain('DNI o CUIT, sin puntos ni guiones');

    form.controls.tax_status.setValue('monotributo');
    await fixture.whenStable();
    expect(document.value).toBe('30123456');
    expect(document.hasError('pattern')).toBe(true);
    expect(card()).toContain('El CUIT debe tener 11 dígitos numéricos');
  });

  it('exige dirección solo para envío y permite completarla en los datos de entrega', async () => {
    await load([stock], { ...customer, address: null, government_id: null });
    const form = fixture.componentInstance['form'];
    expect(button().disabled).toBe(false);
    form.controls.delivery_type.setValue('envio');
    await fixture.whenStable();
    expect(button().disabled).toBe(true);
    expect(fixture.componentInstance['missingRequired']()).toEqual(['address']);
    expect(fixture.nativeElement.textContent).toContain('La dirección es obligatoria');
    form.controls.delivery_type.setValue('retiro');
    await fixture.whenStable();
    expect(button().disabled).toBe(false);
    expect(fixture.nativeElement.querySelector('.profile-card')).toBeNull();
    form.controls.delivery_type.setValue('envio');
    form.controls.delivery_address.setValue('Otra dirección 456');
    await fixture.whenStable();
    expect(button().disabled).toBe(false);
    expect(fixture.nativeElement.querySelector('.profile-card')).toBeNull();
    http.expectNone(`${environment.apiUrl}/customer/${customer.id}`);
  });

  it.each([
    {
      body: { error: 'El CUIT debe tener 11 dígitos numéricos' },
      expected: 'El CUIT debe tener 11 dígitos numéricos',
    },
    { body: null, expected: 'No se pudieron guardar tus datos. Intentá de nuevo.' },
  ])('muestra el error al guardar los datos del perfil: $expected', async ({ body, expected }) => {
    await load([encargo], { ...customer, phone: null, government_id: null });
    fixture.componentInstance['profileForm'].controls.phone.setValue('1155551234');
    fixture.componentInstance['profileForm'].controls.government_id.setValue('20123456789');
    fixture.nativeElement
      .querySelector('.profile-card form')
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    const request = http.expectOne(`${environment.apiUrl}/customer/${customer.id}`);
    expect(request.request.method).toBe('PUT');
    request.flush(body, { status: 400, statusText: 'Bad Request' });
    await fixture.whenStable();

    expect(
      fixture.nativeElement.querySelector('.profile-card .error-message').textContent,
    ).toContain(expected);
    expect(
      fixture.nativeElement.querySelector('.profile-card button[type="submit"]').disabled,
    ).toBe(false);
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
    await fixture.whenStable();
    button().click();
    http
      .expectOne(`${environment.apiUrl}/order`)
      .flush({ error: 'Stock insuficiente' }, { status: 400, statusText: 'Bad Request' });
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain('Stock insuficiente');
    expect(button().disabled).toBe(false);
  });
});
