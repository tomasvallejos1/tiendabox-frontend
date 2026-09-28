import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, signal } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';

import { Order } from '../shared/order';
import { OrderService } from '../shared/order-service';
import { AuthService } from '../shared/auth-service';
import { OrderStatusBadge } from '../order-status-badge/order-status-badge';

@Component({
  selector: 'app-order-detail',
  imports: [
    CurrencyPipe,
    DatePipe,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTableModule,
    OrderStatusBadge,
  ],
  templateUrl: './order-detail.html',
  styleUrl: './order-detail.css',
})
export class OrderDetail implements OnInit {
  protected readonly loading = signal(true);
  protected readonly loadFailed = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly order = signal<Order | null>(null);

  protected readonly displayedColumns = ['product', 'quantity', 'unitPrice', 'subtotal'];

  constructor(
    private route: ActivatedRoute,
    private orderService: OrderService,
    private authService: AuthService,
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.loadOrder(id);
  }

  protected get canCancel(): boolean {
    return this.authService.isCliente() && this.order()?.status === 'pendiente';
  }

  protected cancelOrder(): void {
    const order = this.order();
    if (!order) return;

    if (!window.confirm('¿Estás seguro de que querés cancelar este pedido?')) return;

    this.orderService.cancelOrder(order.id).subscribe({
      next: (updated) => this.order.set(updated),
      error: () => this.errorMessage.set('No se pudo cancelar el pedido. Intentá de nuevo.'),
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
