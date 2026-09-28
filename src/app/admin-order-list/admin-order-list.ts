import { Component, OnInit, signal } from '@angular/core';
import { CurrencyPipe, DatePipe, LowerCasePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';

import { Order, OrderStatus } from '../shared/order';
import { OrderService } from '../shared/order-service';
import { OrderStatusBadge } from '../order-status-badge/order-status-badge';

// Flujo lineal de estados. El backend solo permite avanzar un paso por vez.
const FLUJO: OrderStatus[] = [
  'pendiente',
  'confirmado',
  'en_preparacion',
  'listo_para_retirar',
  'entregado',
];

const STATUS_LABELS: Record<OrderStatus, string> = {
  pendiente: 'Pendiente',
  confirmado: 'Confirmado',
  en_preparacion: 'En preparación',
  listo_para_retirar: 'Listo para retirar',
  entregado: 'Entregado',
  cancelado: 'Cancelado',
};

@Component({
  selector: 'app-admin-order-list',
  imports: [
    CurrencyPipe,
    DatePipe,
    LowerCasePipe,
    RouterLink,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    MatTableModule,
    OrderStatusBadge,
  ],
  templateUrl: './admin-order-list.html',
  styleUrl: './admin-order-list.css',
})
export class AdminOrderList implements OnInit {
  protected readonly loading = signal(true);
  protected readonly loadFailed = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly orders = signal<Order[]>([]);
  protected readonly selectedStatus = signal<string>('');

  // IDs de pedidos cuyo estado se está actualizando (para deshabilitar el botón de esa fila).
  protected readonly advancing = signal<Set<string>>(new Set());

  protected readonly displayedColumns = ['id', 'date', 'status', 'items', 'total', 'actions'];

  protected readonly filterOptions: { value: string; label: string }[] = [
    { value: '', label: 'Todos' },
    ...FLUJO.map((s) => ({ value: s, label: STATUS_LABELS[s] })),
    { value: 'cancelado', label: 'Cancelado' },
  ];

  constructor(private orderService: OrderService) {}

  ngOnInit(): void {
    this.loadOrders();
  }

  protected onFilterChange(status: string): void {
    this.selectedStatus.set(status);
    this.loadOrders();
  }

  protected nextStatus(order: Order): OrderStatus | null {
    const idx = FLUJO.indexOf(order.status);
    if (idx === -1 || idx >= FLUJO.length - 1) return null;
    return FLUJO[idx + 1];
  }

  protected nextStatusLabel(order: Order): string | null {
    const next = this.nextStatus(order);
    return next ? STATUS_LABELS[next] : null;
  }

  protected isFinalState(order: Order): boolean {
    return order.status === 'entregado' || order.status === 'cancelado';
  }

  protected isAdvancing(orderId: string): boolean {
    return this.advancing().has(orderId);
  }

  protected advanceStatus(order: Order): void {
    const next = this.nextStatus(order);
    if (!next) return;

    // Agregar al Set de ids en curso.
    this.advancing.update((set) => {
      const copy = new Set(set);
      copy.add(order.id);
      return copy;
    });

    this.orderService.changeStatus(order.id, next).subscribe({
      next: (updated) => {
        // Actualizar solo esa fila en el dataSource.
        this.orders.update((list) => list.map((o) => (o.id === updated.id ? updated : o)));
        this.removeAdvancing(order.id);
      },
      error: () => {
        this.removeAdvancing(order.id);
        this.errorMessage.set('No se pudo actualizar el estado. Intentá de nuevo.');
      },
    });
  }

  protected loadOrders(): void {
    this.loading.set(true);
    this.loadFailed.set(false);
    this.errorMessage.set(null);

    const status = this.selectedStatus() || undefined;

    this.orderService.getAllOrders(status).subscribe({
      next: (orders) => {
        orders.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        this.orders.set(orders);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.loadFailed.set(true);
        this.errorMessage.set('No se pudieron cargar los pedidos. Intentá de nuevo más tarde.');
      },
    });
  }

  private removeAdvancing(id: string): void {
    this.advancing.update((set) => {
      const copy = new Set(set);
      copy.delete(id);
      return copy;
    });
  }
}
