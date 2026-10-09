import { TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { provideRouter } from '@angular/router';
import { describe, expect, it } from 'vitest';
import { buildQuoteWhatsAppUrl } from '../shared/whatsapp';
import { OrderConfirmationData, OrderConfirmationDialog } from './order-confirmation-dialog';

describe('OrderConfirmationDialog', () => {
  it.each(['stock', 'mixto', 'encargo'])('explica y desglosa un pedido %s', async (kind) => {
    const data: OrderConfirmationData = {
      orderId: 'abcd1234-5678',
      total: kind === 'encargo' ? 0 : 1200,
      hasEncargoItems: kind !== 'stock',
      quoteQuantity: kind === 'stock' ? 0 : 3,
      hasPricedItems: kind !== 'encargo',
    };
    await TestBed.configureTestingModule({
      imports: [OrderConfirmationDialog],
      providers: [
        provideRouter([]),
        {
          provide: MAT_DIALOG_DATA,
          useValue: data,
        },
        { provide: MatDialogRef, useValue: { close: () => {} } },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(OrderConfirmationDialog);
    await fixture.whenStable();
    const text = fixture.nativeElement.textContent;
    expect(text).toContain('WhatsApp para avisarte las novedades');
    const link: HTMLAnchorElement | null = fixture.nativeElement.querySelector(
      'a[href^="https://wa.me/"]',
    );
    if (kind !== 'stock') {
      expect(text).toContain('Productos a cotizar:3');
      expect(text).toContain('La compra de esos productos se coordina por ese medio');
      expect(link?.href).toBe(buildQuoteWhatsAppUrl(data.orderId));
      expect(link?.target).toBe('_blank');
      expect(link?.rel).toBe('noopener noreferrer');
    } else expect(link).toBeNull();
    if (kind === 'encargo') {
      expect(text).not.toContain('$0');
      expect(text).not.toContain('Total de productos con precio');
    } else expect(text).toContain('Total de productos con precio:');
  });
});
