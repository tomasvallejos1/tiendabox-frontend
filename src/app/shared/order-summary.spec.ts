import { describe, expect, it } from 'vitest';
import { hasPrice, summarizeOrderItems } from './order-summary';

describe('summarizeOrderItems', () => {
  it('separa cantidades por encargo de importes conocidos aunque llegue un precio incorrecto', () => {
    const summary = summarizeOrderItems([
      { type: 'stock', unit_price: 1200, quantity: 2 },
      { type: 'encargo', unit_price: null, quantity: 3 },
      { type: 'encargo', unit_price: 5000, quantity: 2 },
    ]);
    expect(summary.total).toBe(2400);
    expect(summary.quoteQuantity).toBe(5);
    expect(summary.hasPricedItems).toBe(true);
    expect(summary.onlyEncargoItems).toBe(false);
  });

  it('distingue un precio legítimo de cero de uno pendiente', () => {
    expect(hasPrice(0)).toBe(true);
    expect(hasPrice(null)).toBe(false);
    expect(
      summarizeOrderItems([{ type: 'stock', unit_price: 0, quantity: 1 }]).hasPricedItems,
    ).toBe(true);
    expect(summarizeOrderItems([{ type: 'encargo', unit_price: null, quantity: 2 }])).toEqual({
      total: 0,
      quoteQuantity: 2,
      hasPricedItems: false,
      hasEncargoItems: true,
      onlyEncargoItems: true,
    });
  });

  it('conserva un subtotal null como pendiente y evita NaN, infinito y desbordamientos', () => {
    const summary = summarizeOrderItems([
      { type: 'stock', unit_price: 1200, quantity: 1, subtotal: null },
      { type: 'stock', unit_price: NaN, quantity: 1 },
      { type: 'stock', unit_price: Infinity, quantity: 1 },
      { type: 'stock', unit_price: Number.MAX_VALUE, quantity: 2 },
      { type: 'stock', unit_price: null, quantity: 1 },
      { type: 'stock', unit_price: 100, quantity: 2, subtotal: 200 },
    ]);
    expect(summary.total).toBe(200);
    expect(Number.isFinite(summary.total)).toBe(true);
  });
});
