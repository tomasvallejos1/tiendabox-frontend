import { describe, expect, it } from 'vitest';

import { environment } from '../../environments/environment';
import { Order } from './order';
import { buildCustomerOrderWhatsAppUrl, buildQuoteWhatsAppUrl, buildWhatsAppUrl } from './whatsapp';

describe('buildWhatsAppUrl', () => {
  it('arma el contacto de cotización con el número de la tienda y el pedido abreviado', () => {
    const message =
      'Hola, acabo de hacer el pedido #abcd1234 y quiero consultar por los productos a cotizar.';
    const url = buildQuoteWhatsAppUrl('abcd1234-5678');
    expect(url).toBe(buildWhatsAppUrl(environment.storeWhatsapp, message));
    expect(new URL(url!).searchParams.get('text')).toBe(message);
  });
  it.each([null, '', 'sin teléfono', ' + () - '])('ignora teléfonos sin dígitos: %s', (phone) => {
    expect(buildWhatsAppUrl(phone)).toBeNull();
  });

  it.each([
    ['11 5555-1234', '5491155551234'],
    ['+54 (11) 5555-1234', '5491155551234'],
    ['+54 9 11 5555-1234', '5491155551234'],
    ['351 555-1234', '5493515551234'],
  ])('normaliza %s sin duplicar el país ni el 9', (phone, expected) => {
    expect(buildWhatsAppUrl(phone)).toBe(`https://wa.me/${expected}`);
  });

  it('codifica el mensaje, incluidos espacios, acentos y caracteres de URL', () => {
    const message = 'Hola María, pedido #abcd1234. ¿Retiro & envío?';
    const url = new URL(buildWhatsAppUrl('1155551234', message)!);
    expect(url.pathname).toBe('/5491155551234');
    expect(url.searchParams.get('text')).toBe(message);
    expect(url.href).toBe(`https://wa.me/5491155551234?text=${encodeURIComponent(message)}`);
  });

  it('omite el parámetro cuando el mensaje está vacío', () => {
    expect(buildWhatsAppUrl('1155551234', '')).toBe('https://wa.me/5491155551234');
  });
});

describe('buildCustomerOrderWhatsAppUrl', () => {
  const order: Order = {
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
      address: null,
      government_id: null,
      tax_status: 'consumidor_final',
    },
  };

  it('saluda al cliente por su nombre con el pedido abreviado y su teléfono normalizado', () => {
    const url = new URL(buildCustomerOrderWhatsAppUrl(order)!);
    expect(url.pathname).toBe('/5491155551234');
    expect(url.searchParams.get('text')).toBe(
      'Hola María Pérez, te escribimos de TiendaBox por tu pedido #abcd1234.',
    );
  });

  it.each([
    ['un cliente eliminado', null],
    ['un cliente sin teléfono', { ...order.customer!, phone: null }],
    ['un teléfono sin dígitos', { ...order.customer!, phone: ' - ' }],
  ])('devuelve null para %s', (_, customer) => {
    expect(buildCustomerOrderWhatsAppUrl({ ...order, customer })).toBeNull();
  });
});
