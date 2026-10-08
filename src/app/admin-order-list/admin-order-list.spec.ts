import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { environment } from '../../environments/environment';
import { Order } from '../shared/order';
import { AdminOrderList } from './admin-order-list';

describe('AdminOrderList', () => {
  let fixture: ComponentFixture<AdminOrderList>;
  let http: HttpTestingController;
  let order: Order;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminOrderList],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminOrderList);
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

  async function load(orders: Order[] = [order]): Promise<void> {
    fixture.detectChanges();
    http.expectOne(`${environment.apiUrl}/orders`).flush(orders);
    await fixture.whenStable();
  }

  function button(text: string, root: ParentNode = fixture.nativeElement): HTMLButtonElement {
    const result = Array.from(root.querySelectorAll<HTMLButtonElement>('button')).find((element) =>
      element.textContent?.includes(text),
    );
    expect(result).toBeTruthy();
    return result!;
  }

  async function confirmCancellation(): Promise<void> {
    button('Cancelar pedido').click();
    await fixture.whenStable();
    button('Sí, cancelar', document).click();
    await vi.waitFor(() => expect(document.querySelector('mat-dialog-container')).toBeNull());
    await fixture.whenStable();
  }

  it('muestra el nombre y teléfono del cliente', async () => {
    await load();
    expect(fixture.nativeElement.querySelector('.customer-name').textContent).toContain(
      'María Pérez',
    );
    expect(fixture.nativeElement.querySelector('.customer-phone').textContent).toContain(
      '11 5555-1234',
    );
  });

  it('filtra por nombre en memoria sin hacer otra petición', async () => {
    await load([order, { ...order, id: 'other', customer: { ...order.customer!, name: 'Juan' } }]);
    const input: HTMLInputElement = fixture.nativeElement.querySelector('input');
    input.value = '  MARÍA  ';
    input.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelectorAll('.order-card')).toHaveLength(1);
    expect(fixture.nativeElement.querySelector('.order-card').textContent).toContain('María Pérez');
    http.expectNone(`${environment.apiUrl}/orders`);

    input.value = 'inexistente';
    input.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain('No se encontraron pedidos');
  });

  it('abre WhatsApp con el mensaje y el teléfono normalizado en otra pestaña', async () => {
    const open = vi.spyOn(window, 'open').mockReturnValue(null);
    await load();
    const whatsapp: HTMLButtonElement = fixture.nativeElement.querySelector(
      '.orders-cards .whatsapp-action button',
    );
    whatsapp.click();
    const message = 'Hola María Pérez, te escribimos de TiendaBox por tu pedido #abcd1234.';
    expect(open).toHaveBeenCalledWith(
      `https://wa.me/5491155551234?text=${encodeURIComponent(message)}`,
      '_blank',
      'noopener,noreferrer',
    );
  });

  it.each([null, 'sin dígitos'])(
    'deshabilita WhatsApp para un teléfono inválido: %s',
    async (phone) => {
      order.customer!.phone = phone;
      await load();
      expect(fixture.nativeElement.querySelector('.whatsapp-action button').disabled).toBe(true);
      expect(fixture.nativeElement.querySelector('.whatsapp-action').getAttribute('tabindex')).toBe(
        '0',
      );
    },
  );

  it('tolera un cliente eliminado', async () => {
    order.customer = null;
    await load();
    expect(fixture.nativeElement.textContent).toContain('Cliente eliminado');
    expect(fixture.nativeElement.querySelector('.whatsapp-action button').disabled).toBe(true);
  });

  it('confirma y cancela un pedido en preparación, actualizando la fila localmente', async () => {
    await load();
    await confirmCancellation();
    const request = http.expectOne(`${environment.apiUrl}/order/${order.id}/cancel`);
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual({});
    expect(button('Cancelar pedido').disabled).toBe(true);
    expect(button('Marcar como').disabled).toBe(true);
    const updated: Partial<Order> = { ...order, status: 'cancelado' };
    delete updated.customer;
    request.flush(updated);
    await fixture.whenStable();
    const card: HTMLElement = fixture.nativeElement.querySelector('.order-card');
    expect(card.textContent).toContain('Cancelado');
    expect(card.textContent).toContain('María Pérez');
    expect(card.textContent).not.toContain('Cancelar pedido');
    http.expectNone(`${environment.apiUrl}/orders`);
  });

  it('no cancela si se descarta el diálogo', async () => {
    await load();
    button('Cancelar pedido').click();
    await fixture.whenStable();
    button('No, volver', document).click();
    await vi.waitFor(() => expect(document.querySelector('mat-dialog-container')).toBeNull());
    await fixture.whenStable();
    http.expectNone(`${environment.apiUrl}/order/${order.id}/cancel`);
    expect(fixture.nativeElement.querySelector('.order-card').textContent).toContain(
      'En preparación',
    );
  });

  it('permite reintentar y mantiene el pedido si la cancelación falla', async () => {
    await load();
    await confirmCancellation();
    http
      .expectOne(`${environment.apiUrl}/order/${order.id}/cancel`)
      .flush({}, { status: 500, statusText: 'Server Error' });
    await fixture.whenStable();
    expect(button('Cancelar pedido').disabled).toBe(false);
    expect(fixture.nativeElement.textContent).toContain('No se pudo cancelar el pedido');
    expect(fixture.nativeElement.querySelector('.order-card').textContent).toContain(
      'En preparación',
    );
  });

  it.each(['entregado', 'cancelado'] as const)(
    'oculta la cancelación en estado %s',
    async (status) => {
      order.status = status;
      await load();
      expect(fixture.nativeElement.querySelector('.order-card').textContent).not.toContain(
        'Cancelar pedido',
      );
    },
  );

  it('bloquea cancelar mientras avanza el estado', async () => {
    await load();
    button('Marcar como').click();
    await fixture.whenStable();
    expect(button('Cancelar pedido').disabled).toBe(true);
    const request = http.expectOne(`${environment.apiUrl}/order/${order.id}/status`);
    expect(request.request.body).toEqual({ status: 'listo_para_retirar' });
    const updated: Partial<Order> = { ...order, status: 'listo_para_retirar' };
    delete updated.customer;
    request.flush(updated);
    await fixture.whenStable();
    expect(button('Cancelar pedido').disabled).toBe(false);
    expect(fixture.nativeElement.querySelector('.customer-name').textContent).toContain(
      'María Pérez',
    );
    expect(fixture.nativeElement.querySelector('.whatsapp-action button').disabled).toBe(false);
  });

  it('no cancela si el pedido se entregó mientras la confirmación estaba abierta', async () => {
    order.status = 'listo_para_retirar';
    await load();
    button('Cancelar pedido').click();
    await fixture.whenStable();
    button('Marcar como').click();
    http
      .expectOne(`${environment.apiUrl}/order/${order.id}/status`)
      .flush({ ...order, status: 'entregado' });
    await fixture.whenStable();
    button('Sí, cancelar', document).click();
    await vi.waitFor(() => expect(document.querySelector('mat-dialog-container')).toBeNull());
    await fixture.whenStable();
    http.expectNone(`${environment.apiUrl}/order/${order.id}/cancel`);
    expect(fixture.nativeElement.querySelector('.order-card').textContent).toContain('Entregado');
  });
});
