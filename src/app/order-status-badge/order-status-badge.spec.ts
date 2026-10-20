import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { OrderStatus } from '../shared/order';
import { OrderStatusBadge } from './order-status-badge';

describe('OrderStatusBadge', () => {
  let fixture: ComponentFixture<OrderStatusBadge>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OrderStatusBadge],
    }).compileComponents();

    fixture = TestBed.createComponent(OrderStatusBadge);
  });

  const labels: [OrderStatus, string][] = [
    ['pendiente', 'Pendiente'],
    ['confirmado', 'Confirmado'],
    ['en_preparacion', 'En preparación'],
    ['listo_para_retirar', 'Listo para retirar'],
    ['entregado', 'Entregado'],
    ['cancelado', 'Cancelado'],
  ];

  it.each(labels)('muestra "%s" como "%s"', async (status, label) => {
    fixture.componentRef.setInput('status', status);
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('mat-chip').textContent.trim()).toBe(label);
  });
});
