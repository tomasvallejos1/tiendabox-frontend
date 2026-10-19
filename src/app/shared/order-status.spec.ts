import { describe, expect, it } from 'vitest';

import { OrderStatus } from './order';
import { nextStatus } from './order-status';

describe('nextStatus', () => {
  it.each<[OrderStatus, OrderStatus | null]>([
    ['pendiente', 'confirmado'],
    ['confirmado', 'en_preparacion'],
    ['en_preparacion', 'listo_para_retirar'],
    ['listo_para_retirar', 'entregado'],
    ['entregado', null],
    ['cancelado', null],
  ])('devuelve %s → %s', (current, expected) => {
    expect(nextStatus(current)).toBe(expected);
  });
});
