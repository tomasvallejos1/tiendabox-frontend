import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, OnInit, signal } from '@angular/core';
import { CurrencyPipe, DatePipe, Location, LowerCasePipe } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';

import { Order } from '../shared/order';
import { buildQuoteWhatsAppUrl, buildWhatsAppUrl } from '../shared/whatsapp';
import { hasPrice, summarizeOrderItems } from '../shared/order-summary';
import { ConfirmDialog, ConfirmDialogData } from '../confirm-dialog/confirm-dialog';
import { OrderService } from '../shared/order-service';
import { nextStatus, ORDER_STATUS_LABELS } from '../shared/order-status';
import { AuthService } from '../shared/auth-service';
import { OrderStatusBadge } from '../order-status-badge/order-status-badge';
import { ProductTypeBadge } from '../product-type-badge/product-type-badge';

@Component({
  selector: 'app-order-detail',
  imports: [
    CurrencyPipe,
    DatePipe,
    LowerCasePipe,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatDialogModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
    MatTableModule,
    OrderStatusBadge,
    ProductTypeBadge,
  ],
  templateUrl: './order-detail.html',
  styleUrl: './order-detail.css',
})
export class OrderDetail implements OnInit {
  protected readonly loading = signal(true);
  protected readonly loadFailed = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly order = signal<Order | null>(null);
  protected readonly advancing = signal(false);
  protected readonly nextOrderStatus = computed(() => {
    const order = this.order();
    return order ? nextStatus(order.status) : null;
  });
  protected readonly statusLabels = ORDER_STATUS_LABELS;
  protected readonly summary = computed(() => summarizeOrderItems(this.order()?.items ?? []));
  protected readonly hasPrice = hasPrice;
  protected readonly storeWhatsAppUrl = computed(() => {
    const order = this.order();
    return order ? buildQuoteWhatsAppUrl(order.id) : null;
  });

  protected subtotal(unitPrice: number | null, quantity: number): number | null {
    if (!hasPrice(unitPrice) || !Number.isInteger(quantity) || quantity <= 0) return null;
    const subtotal = unitPrice * quantity;
    return hasPrice(subtotal) ? subtotal : null;
  }
  protected readonly cancelling = signal(false);

  protected readonly displayedColumns = ['product', 'quantity', 'unitPrice', 'subtotal'];

  constructor(
    private route: ActivatedRoute,
    private orderService: OrderService,
    protected readonly authService: AuthService,
    private dialog: MatDialog,
    private location: Location,
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.loadOrder(id);
  }

  protected goBack(): void {
    this.location.back();
  }

  protected advanceStatus(): void {
    const order = this.order();
    const next = this.nextOrderStatus();
    if (!this.authService.isOwner() || !order || !next || this.advancing() || this.cancelling()) {
      return;
    }

    this.advancing.set(true);
    this.errorMessage.set(null);
    this.orderService.changeStatus(order.id, next).subscribe({
      next: (updated) => {
        this.order.update((current) => (current ? { ...current, ...updated } : updated));
        this.advancing.set(false);
      },
      error: () => {
        this.advancing.set(false);
        this.errorMessage.set('No se pudo actualizar el estado. Intentá de nuevo.');
      },
    });
  }

  protected get canCancel(): boolean {
    const order = this.order();
    if (!order) return false;
    if (this.authService.isOwner()) {
      return order.status !== 'entregado' && order.status !== 'cancelado';
    }
    return this.authService.isCliente() && order.status === 'pendiente';
  }

  protected taxStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      consumidor_final: 'Consumidor final',
      responsable_inscripto: 'Responsable inscripto',
      monotributo: 'Monotributo',
      exento: 'Exento',
    };
    return labels[status] ?? status;
  }

  protected whatsAppUrl(order: Order): string | null {
    const customer = order.customer;
    if (!customer) return null;
    const message = `Hola ${customer.name}, te escribimos de TiendaBox por tu pedido #${order.id.substring(0, 8)}.`;
    return buildWhatsAppUrl(customer.phone, message);
  }

  protected openWhatsApp(order: Order): void {
    if (!this.authService.isOwner()) return;
    const url = this.whatsAppUrl(order);
    if (url) window.open(url, '_blank', 'noopener,noreferrer');
  }

  protected cancelOrder(): void {
    const order = this.order();
    if (!order || !this.canCancel || this.cancelling() || this.advancing()) return;

    const data: ConfirmDialogData = {
      title: 'Cancelar pedido',
      message: `¿Estás seguro de que querés cancelar el pedido #${order.id.substring(0, 8)}?`,
      confirmLabel: 'Sí, cancelar',
      cancelLabel: 'No, volver',
    };

    this.dialog
      .open<ConfirmDialog, ConfirmDialogData, boolean>(ConfirmDialog, {
        data,
        width: '400px',
        maxWidth: '95vw',
      })
      .afterClosed()
      .subscribe((confirmed) => {
        if (!confirmed || !this.canCancel || this.cancelling() || this.advancing()) return;
        this.cancelling.set(true);
        this.errorMessage.set(null);

        this.orderService.cancelOrder(order.id).subscribe({
          next: (updated) => {
            this.order.update((current) => (current ? { ...current, ...updated } : updated));
            this.cancelling.set(false);
          },
          error: () => {
            this.cancelling.set(false);
            this.errorMessage.set('No se pudo cancelar el pedido. Intentá de nuevo.');
          },
        });
      });
  }

  private loadOrder(id: string): void {
    this.loading.set(true);
    this.loadFailed.set(false);
    this.errorMessage.set(null);

    this.orderService.getOrder(id).subscribe({
      next: (order) => {
        this.order.set(order);
        this.loading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);
        this.loadFailed.set(true);
        if (err.status === 403) {
          this.errorMessage.set('No tenés permiso para ver este pedido.');
        } else {
          this.errorMessage.set('No se pudo cargar el pedido. Intentá de nuevo más tarde.');
        }
      },
    });
  }
}
