import { Component, OnInit, computed, signal } from '@angular/core';
import { CurrencyPipe, DatePipe, LowerCasePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';

import { Order, OrderStatus } from '../shared/order';
import { OrderService } from '../shared/order-service';
import { nextStatus, ORDER_STATUS_FLOW, ORDER_STATUS_LABELS } from '../shared/order-status';
import { OrderStatusBadge } from '../order-status-badge/order-status-badge';
import { buildWhatsAppUrl } from '../shared/whatsapp';
import { ConfirmDialog, ConfirmDialogData } from '../confirm-dialog/confirm-dialog';

@Component({
  selector: 'app-admin-order-list',
  imports: [
    CurrencyPipe,
    DatePipe,
    LowerCasePipe,
    RouterLink,
    MatButtonModule,
    MatCardModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatMenuModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    MatSnackBarModule,
    MatTableModule,
    MatTooltipModule,
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
  protected readonly customerFilter = signal('');
  protected readonly orderIdFilter = signal('');

  // IDs de pedidos cuyo estado se está actualizando (para deshabilitar el botón de esa fila).
  protected readonly advancing = signal<Set<string>>(new Set());

  // IDs de pedidos que se están cancelando.
  protected readonly cancelling = signal<Set<string>>(new Set());

  protected readonly filteredOrders = computed(() => {
    const customer = this.customerFilter().trim().toLowerCase();
    const orderId = this.orderIdFilter().trim().toLowerCase();
    return this.orders().filter(
      (order) =>
        (!customer || order.customer?.name?.toLowerCase().includes(customer)) &&
        (!orderId || order.id.toLowerCase().includes(orderId)),
    );
  });

  protected readonly displayedColumns = [
    'id',
    'customer',
    'date',
    'status',
    'items',
    'total',
    'actions',
  ];

  protected readonly filterOptions: { value: string; label: string }[] = [
    { value: '', label: 'Todos' },
    ...ORDER_STATUS_FLOW.map((s) => ({ value: s, label: ORDER_STATUS_LABELS[s] })),
    { value: 'cancelado', label: 'Cancelado' },
  ];

  constructor(
    private orderService: OrderService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
  ) {}

  ngOnInit(): void {
    this.loadOrders();
  }

  protected onFilterChange(status: string): void {
    this.selectedStatus.set(status);
    this.loadOrders();
  }

  protected onCustomerFilterChange(value: string): void {
    this.customerFilter.set(value);
  }

  protected nextStatus(order: Order): OrderStatus | null {
    return nextStatus(order.status);
  }

  protected nextStatusLabel(order: Order): string | null {
    const next = this.nextStatus(order);
    return next ? ORDER_STATUS_LABELS[next] : null;
  }

  /** Resumen de ítems por tipo, por ejemplo "2 en stock, 1 por encargo". */
  protected typeSummary(order: Order): string {
    const stock = order.items.filter((item) => item.type === 'stock').length;
    const encargo = order.items.filter((item) => item.type === 'encargo').length;

    const parts: string[] = [];
    if (stock > 0) parts.push(`${stock} en stock`);
    if (encargo > 0) parts.push(`${encargo} por encargo`);
    return parts.join(', ');
  }

  protected isFinalState(order: Order): boolean {
    return order.status === 'entregado' || order.status === 'cancelado';
  }

  protected canCancel(order: Order): boolean {
    return !this.isFinalState(order);
  }

  protected isAdvancing(orderId: string): boolean {
    return this.advancing().has(orderId);
  }

  protected isCancelling(orderId: string): boolean {
    return this.cancelling().has(orderId);
  }

  protected whatsAppUrl(order: Order): string | null {
    const customer = order.customer;
    if (!customer) return null;
    const shortId = order.id.substring(0, 8);
    const message = `Hola ${customer.name}, te escribimos de TiendaBox por tu pedido #${shortId}.`;
    return buildWhatsAppUrl(customer.phone, message);
  }

  protected whatsAppTooltip(order: Order): string {
    if (!this.whatsAppUrl(order)) return 'El cliente no tiene teléfono cargado';
    return 'Contactar por WhatsApp';
  }

  protected openWhatsApp(order: Order): void {
    const url = this.whatsAppUrl(order);
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  }

  protected advanceStatus(order: Order): void {
    const next = this.nextStatus(order);
    if (!next || this.isAdvancing(order.id) || this.isCancelling(order.id)) return;
    this.errorMessage.set(null);

    // Agregar al Set de ids en curso.
    this.advancing.update((set) => {
      const copy = new Set(set);
      copy.add(order.id);
      return copy;
    });

    this.orderService.changeStatus(order.id, next).subscribe({
      next: (updated) => {
        // Actualizar solo esa fila en el dataSource.
        this.orders.update((list) =>
          list.map((o) => (o.id === updated.id ? { ...o, ...updated } : o)),
        );
        this.removeAdvancing(order.id);
        this.snackBar.open(`Pedido actualizado: ${ORDER_STATUS_LABELS[updated.status]}`, 'Cerrar', {
          duration: 3000,
        });
      },
      error: (err) => {
        this.removeAdvancing(order.id);
        const message = err.error?.message || 'No se pudo actualizar el estado. Intentá de nuevo.';
        this.errorMessage.set(message);
        this.snackBar.open(message, 'Cerrar', { duration: 5000 });
      },
    });
  }

  protected cancelOrder(order: Order): void {
    if (!this.canCancel(order) || this.isAdvancing(order.id) || this.isCancelling(order.id)) return;

    const shortId = order.id.substring(0, 8);
    const data: ConfirmDialogData = {
      title: 'Cancelar pedido',
      message: `¿Estás seguro de que querés cancelar el pedido #${shortId}?`,
      confirmLabel: 'Sí, cancelar',
      cancelLabel: 'No, volver',
      isDestructive: true,
    };

    this.dialog
      .open<ConfirmDialog, ConfirmDialogData, boolean>(ConfirmDialog, {
        data,
        width: '400px',
        maxWidth: '95vw',
      })
      .afterClosed()
      .subscribe((confirmed) => {
        if (!confirmed || this.isAdvancing(order.id) || this.isCancelling(order.id)) return;
        const currentOrder = this.orders().find((item) => item.id === order.id);
        if (!currentOrder || !this.canCancel(currentOrder)) return;
        this.errorMessage.set(null);

        this.cancelling.update((set) => {
          const copy = new Set(set);
          copy.add(order.id);
          return copy;
        });

        this.orderService.cancelOrder(order.id).subscribe({
          next: (updated) => {
            this.orders.update((list) =>
              list.map((o) => (o.id === updated.id ? { ...o, ...updated } : o)),
            );
            this.removeCancelling(order.id);
            this.snackBar.open('Pedido cancelado', 'Cerrar', { duration: 3000 });
          },
          error: () => {
            this.removeCancelling(order.id);
            this.errorMessage.set('No se pudo cancelar el pedido. Intentá de nuevo.');
          },
        });
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
      error: (err) => {
        this.loading.set(false);
        this.loadFailed.set(true);
        this.errorMessage.set(
          err.error?.message || 'No se pudieron cargar los pedidos. Intentá de nuevo más tarde.',
        );
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

  private removeCancelling(id: string): void {
    this.cancelling.update((set) => {
      const copy = new Set(set);
      copy.delete(id);
      return copy;
    });
  }
}
