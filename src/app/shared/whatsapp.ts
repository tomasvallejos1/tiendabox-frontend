import { environment } from '../../environments/environment';

/**
 * Heurística para armar URLs de WhatsApp con números argentinos.
 * Asume que el teléfono incluye el código de área (sin el 15 local).
 * Ejemplo de entrada válida: "1155551234", "541155551234", "54 9 11 5555-1234".
 */
export function buildWhatsAppUrl(phone: string | null, message?: string): string | null {
  if (!phone) return null;

  // Quitar todo lo que no sea dígito.
  let digits = phone.replace(/\D/g, '');
  if (digits.length === 0) return null;

  // Si no empieza con 54 (código de país de Argentina), anteponerlo.
  if (!digits.startsWith('54')) {
    digits = '54' + digits;
  }

  // WhatsApp exige el 9 después del 54 para celulares argentinos.
  // Si después del "54" no viene un "9", insertarlo.
  if (digits.charAt(2) !== '9') {
    digits = '54' + '9' + digits.substring(2);
  }

  let url = `https://wa.me/${digits}`;
  if (message) {
    url += `?text=${encodeURIComponent(message)}`;
  }
  return url;
}

export function buildQuoteWhatsAppUrl(orderId: string): string | null {
  const message = `Hola, acabo de hacer el pedido #${orderId.substring(0, 8)} y quiero consultar por los productos a cotizar.`;
  return buildWhatsAppUrl(environment.storeWhatsapp, message);
}
