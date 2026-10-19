import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TestBed, ComponentFixture } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Location } from '@angular/common';
import { SpyLocation } from '@angular/common/testing';

import { environment } from '../../environments/environment';
import { Order, OrderStatus } from '../shared/order';
import { AuthService } from '../shared/auth-service';
import { OrderDetail } from './order-detail';
import { buildQuoteWhatsAppUrl } from '../shared/whatsapp';

describe('OrderDetail', () => {
  let fixture: ComponentFixture<OrderDetail>;
  let http: HttpTestingController;
  let order: Order;
  const auth = { isOwner: vi.fn(() => true), isCliente: vi.fn(() => false) };

  beforeEach(async () => {
    auth.isOwner.mockReturnValue(true);
    auth.isCliente.mockReturnValue(false);
    await TestBed.configureTestingModule({
      imports: [OrderDetail],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: auth },
        { provide: Location, useClass: SpyLocation },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: convertToParamMap({ id: 'abcd1234-5678' }) } },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(OrderDetail);
    http = TestBed.inject(HttpTestingController);
    order = {
      id: 'abcd1234-5678',
      customer_id: 'customer-1',
      status: 'en_preparacion',
      delivery_type: 'retiro',
      delivery_address: null,
      total: 1200,
      created_at: '2026-10-08T12:00:00Z',
      items: [],
      customer: {
        id: 'customer-1',
        name: 'María Pérez',
        phone: '11 5555-1234',
        address: 'San Martín 123',
        government_id: '20123456789',
        tax_status: 'monotributo',
      },
    };
  });

  afterEach(() => {
    http.verify();
    vi.restoreAllMocks();
  });

  async function load(): Promise<void> {
    fixture.detectChanges();
    http.expectOne(`${environment.apiUrl}/order/${order.id}`).flush(order);
    await fixture.whenStable();
  }

  function button(text: string, root: ParentNode = fixture.nativeElement): HTMLButtonElement {
    const result = Array.from(root.querySelectorAll<HTMLButtonElement>('button')).find((element) =>
      element.textContent?.includes(text),
    );
    expect(result).toBeTruthy();
    return result!;
  }

  it('muestra todos los datos del cliente al dueño', async () => {
    await load();
    const text = fixture.nativeElement.querySelector('.customer-card').textContent;
    for (const value of [
      'María Pérez',
      '11 5555-1234',
      '20123456789',
      'Monotributo',
      'San Martín 123',
    ]) {
      expect(text).toContain(value);
    }
  });

  it.each(['mixto', 'encargo'])(
    'muestra precios pendientes y contacto con la tienda para %s',
    async (kind) => {
      auth.isOwner.mockReturnValue(false);
      auth.isCliente.mockReturnValue(true);
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
        product_name: 'Caja por encargo',
        type: 'encargo',
        unit_price: null,
        quantity: 2,
      };
      order.items = kind === 'encargo' ? [encargo] : [stock, encargo];
      order.total = kind === 'encargo' ? 0 : 1200;
      await load();
      const pending = fixture.nativeElement.querySelectorAll('.price-pending');
      expect(pending).toHaveLength(4);
      for (const price of pending) expect(price.textContent).toBe('A confirmar');
      const notice: HTMLElement = fixture.nativeElement.querySelector('.quote-notice');
      expect(notice.textContent).toContain(
        'El precio final de estos productos se acuerda por WhatsApp',
      );
      expect(notice.textContent).toContain('Te vamos a contactar');
      expect(notice.textContent).toContain('comprometerte a comprar');
      expect(notice.textContent).toContain('Productos a cotizar: 2');
      expect(fixture.nativeElement.querySelector('.owner-quote-notice')).toBeNull();
      expect(notice.querySelector('a')?.href).toBe(buildQuoteWhatsAppUrl(order.id));
      expect(notice.querySelector('a')?.textContent).toContain('Escribir a la tienda');
      if (kind === 'encargo') {
        expect(fixture.nativeElement.textContent).toContain('2 productos a cotizar');
        expect(fixture.nativeElement.textContent).not.toContain('$0');
      }
    },
  );

  it.each(['mixto', 'encargo'])(
    'oculta el aviso del cliente y muestra la cotización para el dueño en un pedido %s',
    async (kind) => {
      const encargo = {
        id: 'encargo',
        product_id: 'encargo',
        product_name: 'Caja por encargo',
        type: 'encargo',
        unit_price: null,
        quantity: 2,
      };
      order.items = [encargo];
      if (kind === 'mixto') {
        order.items.push({
          ...encargo,
          id: 'stock',
          product_id: 'stock',
          type: 'stock',
          unit_price: 1200,
          quantity: 1,
        });
      }
      await load();
      expect(fixture.nativeElement.querySelector('.quote-notice')).toBeNull();
      expect(fixture.nativeElement.textContent).not.toContain('Escribir a la tienda');
      expect(fixture.nativeElement.textContent).not.toContain('Te vamos a contactar');
      expect(fixture.nativeElement.textContent).not.toContain('comprometerte a comprar');
      const notice: HTMLElement = fixture.nativeElement.querySelector('.owner-quote-notice');
      expect(notice.textContent).toContain('Productos a cotizar: 2');
      expect(notice.textContent).toContain('Contactá al cliente por WhatsApp');
      expect(notice.querySelector('button, a')).toBeNull();
      expect(fixture.nativeElement.querySelectorAll('.whatsapp-action button')).toHaveLength(1);
    },
  );

  it('no muestra avisos de cotización si todos los productos tienen precio', async () => {
    order.items = [
      {
        id: 'stock',
        product_id: 'stock',
        product_name: 'Caja',
        type: 'stock',
        unit_price: 1200,
        quantity: 1,
      },
    ];
    await load();
    expect(fixture.nativeElement.querySelector('.quote-notice, .owner-quote-notice')).toBeNull();
  });

  it('vuelve usando el historial incluso mientras carga el pedido', async () => {
    const goBack = vi.spyOn(TestBed.inject(Location), 'back');
    fixture.detectChanges();
    const back = button('Volver');
    expect(back.querySelector('mat-icon')?.textContent).toBe('arrow_back');
    back.click();
    expect(goBack).toHaveBeenCalledOnce();
    http.expectOne(`${environment.apiUrl}/order/${order.id}`).flush(order);
    await fixture.whenStable();
  });

  it.each<[OrderStatus, OrderStatus, string]>([
    ['pendiente', 'confirmado', 'confirmado'],
    ['confirmado', 'en_preparacion', 'en preparación'],
    ['en_preparacion', 'listo_para_retirar', 'listo para retirar'],
    ['listo_para_retirar', 'entregado', 'entregado'],
  ])('avanza de %s a %s y actualiza el detalle con la respuesta', async (current, next, label) => {
    order.status = current;
    await load();
    button(`Marcar como ${label}`).click();
    await fixture.whenStable();
    expect(button('Marcar como').disabled).toBe(true);
    expect(button('Cancelar pedido').disabled).toBe(true);

    const request = http.expectOne(`${environment.apiUrl}/order/${order.id}/status`);
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual({ status: next });
    const updated: Partial<Order> = {
      ...order,
      status: next,
      delivery_type: 'envio',
      delivery_address: 'Nueva dirección',
    };
    delete updated.customer;
    request.flush(updated);
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('app-order-status-badge')?.textContent?.trim()).toBe(
      label.charAt(0).toUpperCase() + label.slice(1),
    );
    expect(fixture.nativeElement.querySelector('.customer-card').textContent).toContain(
      'María Pérez',
    );
    expect(fixture.nativeElement.querySelector('.delivery-address').textContent).toBe(
      'Nueva dirección',
    );
    if (next === 'entregado') {
      expect(fixture.nativeElement.querySelector('.status-actions button')).toBeNull();
      expect(fixture.nativeElement.querySelector('.closed-hint').textContent).toContain(
        'Pedido cerrado',
      );
    } else {
      expect(button('Marcar como').disabled).toBe(false);
      expect(button('Cancelar pedido').disabled).toBe(false);
    }
    http.expectNone(`${environment.apiUrl}/order/${order.id}`);
  });

  it.each(['entregado', 'cancelado'] as const)(
    'oculta el avance y muestra un texto tenue en estado %s',
    async (status) => {
      order.status = status;
      await load();
      expect(fixture.nativeElement.querySelector('.status-actions button')).toBeNull();
      expect(fixture.nativeElement.textContent).not.toContain('Marcar como');
      expect(fixture.nativeElement.querySelector('.closed-hint').textContent).toContain(
        'Pedido cerrado',
      );
    },
  );

  it('no muestra el avance del estado para un cliente', async () => {
    auth.isOwner.mockReturnValue(false);
    auth.isCliente.mockReturnValue(true);
    order.status = 'pendiente';
    await load();
    expect(fixture.nativeElement.querySelector('.status-actions')).toBeNull();
    expect(fixture.nativeElement.textContent).not.toContain('Marcar como');
  });

  it('conserva el estado y permite reintentar si falla el avance', async () => {
    await load();
    button('Marcar como listo para retirar').click();
    http
      .expectOne(`${environment.apiUrl}/order/${order.id}/status`)
      .flush({}, { status: 500, statusText: 'Server Error' });
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('app-order-status-badge').textContent).toContain(
      'En preparación',
    );
    expect(fixture.nativeElement.textContent).toContain('No se pudo actualizar el estado');
    expect(button('Cancelar pedido').disabled).toBe(false);
    expect(button('Marcar como listo para retirar').disabled).toBe(false);
    button('Marcar como listo para retirar').click();
    http
      .expectOne(`${environment.apiUrl}/order/${order.id}/status`)
      .flush({ ...order, status: 'listo_para_retirar' });
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('.action-error')).toBeNull();
    expect(button('Marcar como entregado').disabled).toBe(false);
  });

  it('oculta el bloque Cliente cuando el cliente ve su propio pedido', async () => {
    auth.isOwner.mockReturnValue(false);
    auth.isCliente.mockReturnValue(true);
    await load();
    expect(fixture.nativeElement.querySelector('.customer-card')).toBeNull();
    expect(fixture.nativeElement.querySelector('.whatsapp-action')).toBeNull();
  });

  it('abre el mismo enlace de WhatsApp desde el detalle', async () => {
    const open = vi.spyOn(window, 'open').mockReturnValue(null);
    await load();
    fixture.nativeElement.querySelector('.whatsapp-action button').click();
    const message = 'Hola María Pérez, te escribimos de TiendaBox por tu pedido #abcd1234.';
    expect(open).toHaveBeenCalledWith(
      `https://wa.me/5491155551234?text=${encodeURIComponent(message)}`,
      '_blank',
      'noopener,noreferrer',
    );
  });

  it('muestra los datos faltantes y deshabilita WhatsApp', async () => {
    order.customer = { ...order.customer!, phone: null, address: null, government_id: null };
    await load();
    const card: HTMLElement = fixture.nativeElement.querySelector('.customer-card');
    expect(card.textContent).toContain('Sin teléfono cargado');
    expect(card.textContent).toContain('Sin CUIT cargado');
    expect(card.textContent).toContain('Sin dirección cargada');
    expect(card.querySelector<HTMLButtonElement>('.whatsapp-action button')!.disabled).toBe(true);
  });

  it('tolera un cliente eliminado y conserva la cancelación del dueño', async () => {
    order.customer = null;
    await load();
    expect(fixture.nativeElement.querySelector('.customer-card').textContent).toContain(
      'Cliente eliminado',
    );
    expect(fixture.nativeElement.querySelector('.whatsapp-action button').disabled).toBe(true);
    expect(button('Cancelar pedido').disabled).toBe(false);
  });

  it.each([
    ['pendiente', true],
    ['confirmado', true],
    ['en_preparacion', true],
    ['listo_para_retirar', true],
    ['entregado', false],
    ['cancelado', false],
  ] as [OrderStatus, boolean][])('cancelación del dueño en %s: %s', async (status, allowed) => {
    order.status = status;
    await load();
    expect(fixture.nativeElement.textContent.includes('Cancelar pedido')).toBe(allowed);
  });

  it.each([
    ['pendiente', true],
    ['confirmado', false],
    ['en_preparacion', false],
    ['listo_para_retirar', false],
    ['entregado', false],
    ['cancelado', false],
  ] as [OrderStatus, boolean][])('cancelación del cliente en %s: %s', async (status, allowed) => {
    auth.isOwner.mockReturnValue(false);
    auth.isCliente.mockReturnValue(true);
    order.status = status;
    await load();
    expect(fixture.nativeElement.textContent.includes('Cancelar pedido')).toBe(allowed);
  });

  it.each(['owner', 'cliente'])('usa el mismo endpoint para cancelar como %s', async (role) => {
    auth.isOwner.mockReturnValue(role === 'owner');
    auth.isCliente.mockReturnValue(role === 'cliente');
    order.status = role === 'owner' ? 'en_preparacion' : 'pendiente';
    await load();
    button('Cancelar pedido').click();
    await fixture.whenStable();
    button('Sí, cancelar', document).click();
    await vi.waitFor(() => expect(document.querySelector('mat-dialog-container')).toBeNull());
    await fixture.whenStable();

    const request = http.expectOne(`${environment.apiUrl}/order/${order.id}/cancel`);
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual({});
    if (role === 'owner') expect(button('Marcar como').disabled).toBe(true);
    const updated: Partial<Order> = { ...order, status: 'cancelado' };
    delete updated.customer;
    request.flush(updated);
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain('Cancelado');
    expect(fixture.nativeElement.textContent).not.toContain('Cancelar pedido');
    if (role === 'owner') {
      expect(fixture.nativeElement.querySelector('.customer-card').textContent).toContain(
        'María Pérez',
      );
      expect(fixture.nativeElement.querySelector('.whatsapp-action button').disabled).toBe(false);
    }
  });

  it('no llama al endpoint cuando se descarta la confirmación', async () => {
    await load();
    button('Cancelar pedido').click();
    await fixture.whenStable();
    button('No, volver', document).click();
    await vi.waitFor(() => expect(document.querySelector('mat-dialog-container')).toBeNull());
    await fixture.whenStable();
    http.expectNone(`${environment.apiUrl}/order/${order.id}/cancel`);
  });

  it('no cancela si el pedido se entregó mientras la confirmación estaba abierta', async () => {
    order.status = 'listo_para_retirar';
    await load();
    button('Cancelar pedido').click();
    await fixture.whenStable();
    button('Marcar como entregado').click();
    http
      .expectOne(`${environment.apiUrl}/order/${order.id}/status`)
      .flush({ ...order, status: 'entregado' });
    await fixture.whenStable();
    button('Sí, cancelar', document).click();
    await vi.waitFor(() => expect(document.querySelector('mat-dialog-container')).toBeNull());
    await fixture.whenStable();
    http.expectNone(`${environment.apiUrl}/order/${order.id}/cancel`);
    expect(fixture.nativeElement.querySelector('.closed-hint').textContent).toContain(
      'Pedido cerrado',
    );
  });
});
