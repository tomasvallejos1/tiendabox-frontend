import { Component, input } from '@angular/core';
import { MatChipsModule } from '@angular/material/chips';

import { OrderStatus } from '../shared/order';

const STATUS_CONFIG: Record<OrderStatus, { label: string; cssClass: string }> = {
  pendiente: { label: 'Pendiente', cssClass: 'status-pendiente' },
  confirmado: { label: 'Confirmado', cssClass: 'status-confirmado' },
  en_preparacion: { label: 'En preparación', cssClass: 'status-en-preparacion' },
  listo_para_retirar: { label: 'Listo para retirar', cssClass: 'status-listo' },
  entregado: { label: 'Entregado', cssClass: 'status-entregado' },
  cancelado: { label: 'Cancelado', cssClass: 'status-cancelado' },
};

@Component({
  selector: 'app-order-status-badge',
  imports: [MatChipsModule],
  templateUrl: './order-status-badge.html',
  styleUrl: './order-status-badge.css',
})
export class OrderStatusBadge {
  readonly status = input.required<OrderStatus>();

  protected get config() {
    return STATUS_CONFIG[this.status()];
  }
}
