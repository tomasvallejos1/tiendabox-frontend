import { describe, expect, it } from 'vitest';

import { environment } from '../../environments/environment';
import { buildQuoteWhatsAppUrl, buildWhatsAppUrl } from './whatsapp';

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
