import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TestBed, ComponentFixture } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { environment } from '../../environments/environment';
import { Order, OrderStatus } from '../shared/order';
import { AuthService } from '../shared/auth-service';
import { OrderDetail } from './order-detail';

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
});
