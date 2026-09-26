import { Component, OnInit, signal } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';

import { Order } from '../shared/order';
import { OrderService } from '../shared/order-service';
import { OrderStatusBadge } from '../order-status-badge/order-status-badge';

@Component({
  selector: 'app-order-list',
  imports: [
    CurrencyPipe,
    DatePipe,
    RouterLink,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTableModule,
    OrderStatusBadge,
  ],
  templateUrl: './order-list.html',
  styleUrl: './order-list.css',
})
export class OrderList implements OnInit {
  protected readonly loading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly orders = signal<Order[]>([]);

  protected readonly displayedColumns = ['id', 'date', 'status', 'items', 'total', 'actions'];

  constructor(private orderService: OrderService) {}

  ngOnInit(): void {
    this.loadOrders();
  }

  protected loadOrders(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    this.orderService.getMyOrders().subscribe({
      next: (orders) => {
        // Del más reciente al más antiguo.
        orders.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        this.orders.set(orders);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.errorMessage.set('No se pudieron cargar los pedidos. Intentá de nuevo más tarde.');
      },
    });
  }
}
