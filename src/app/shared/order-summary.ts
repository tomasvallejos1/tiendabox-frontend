interface SummaryItem {
  type: string | null;
  quantity: number;
  unit_price: number | null;
  subtotal?: number | null;
}

/** null representa un precio pendiente, no un producto gratuito. */
export function hasPrice(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

/** Suma únicamente importes conocidos; los productos por encargo se cuentan aparte. */
export function summarizeOrderItems(items: readonly SummaryItem[]) {
  let total = 0;
  let quoteQuantity = 0;
  let hasPricedItems = false;

  for (const item of items) {
    if (!Number.isInteger(item.quantity) || item.quantity <= 0) continue;
    if (item.type === 'encargo') {
      quoteQuantity += item.quantity;
      continue;
    }
    if (item.type !== 'stock' || !hasPrice(item.unit_price)) continue;
    const subtotal = 'subtotal' in item ? item.subtotal : item.unit_price * item.quantity;
    if (!hasPrice(subtotal) || !Number.isFinite(total + subtotal)) continue;
    hasPricedItems = true;
    total += subtotal;
  }

  return {
    total,
    quoteQuantity,
    hasPricedItems,
    hasEncargoItems: items.some((item) => item.type === 'encargo'),
    onlyEncargoItems: items.length > 0 && items.every((item) => item.type === 'encargo'),
  };
}
