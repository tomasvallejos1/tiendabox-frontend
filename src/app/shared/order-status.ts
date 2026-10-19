import { OrderStatus } from './order';

// El backend solo permite avanzar un paso por vez en este flujo.
export const ORDER_STATUS_FLOW: readonly OrderStatus[] = [
  'pendiente',
  'confirmado',
  'en_preparacion',
  'listo_para_retirar',
  'entregado',
];

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pendiente: 'Pendiente',
  confirmado: 'Confirmado',
  en_preparacion: 'En preparación',
  listo_para_retirar: 'Listo para retirar',
  entregado: 'Entregado',
  cancelado: 'Cancelado',
};

export function nextStatus(current: OrderStatus): OrderStatus | null {
  const index = ORDER_STATUS_FLOW.indexOf(current);
  if (index === -1 || index >= ORDER_STATUS_FLOW.length - 1) return null;
  return ORDER_STATUS_FLOW[index + 1];
}
